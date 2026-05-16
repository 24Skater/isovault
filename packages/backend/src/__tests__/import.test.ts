import path from 'path';
import os from 'os';
import fs from 'fs';
import { Readable } from 'stream';
import crypto from 'crypto';

const TEST_STORE = path.join(os.tmpdir(), `isovault-import-test-store-${process.pid}`);
const TEST_DB = path.join(os.tmpdir(), `isovault-jest-import-${process.pid}.sqlite3`);

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storage: {
      path: path.join(require('os').tmpdir(), `isovault-import-test-store-${process.pid}`),
      alertThresholdPercent: 80,
    },
    retention: { defaultCount: 5, defaultBehavior: 'archive' },
    logging: { level: 'silent', retentionDays: 30 },
    server: { port: 3724, host: '0.0.0.0', corsOrigins: [] },
    database: { path: ':memory:' },
    downloads: {
      maxConcurrent: 3,
      retryMaxAttempts: 3,
      retryBaseDelaySeconds: 30,
      timeoutSeconds: 3600,
    },
    scheduler: {
      watcherCheckIntervalCron: '0 * * * *',
      dbBackupCron: '0 2 * * *',
      cleanupCron: '0 3 * * *',
    },
    security: { ssrfProtection: true, maxRedirects: 5 },
  },
}));

jest.mock('../services/retention', () => ({
  retentionService: {
    applyRetention: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../websocket/hub', () => ({
  hub: { broadcast: jest.fn(), register: jest.fn(), unregister: jest.fn(), clientCount: 0 },
}));

// Audit fires webhooks async — mock dispatch so it doesn't hit the network
jest.mock('../services/webhook', () => ({
  dispatch: jest.fn().mockResolvedValue(undefined),
  listWebhooks: jest.fn().mockReturnValue({ webhooks: [], total: 0 }),
}));

import { initDb, closeDb } from '../db/client';
import { createDefinition } from '../services/iso';
import { importByPath, importByUpload } from '../services/import';
import { ValidationError } from '../errors/base';
import { retentionService } from '../services/retention';

const retentionMock = retentionService.applyRetention as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSourceFile(content = 'fake iso content'): string {
  const src = path.join(os.tmpdir(), `import-test-src-${Date.now()}-${Math.random()}.iso`);
  fs.writeFileSync(src, content);
  return src;
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function makeDefinition() {
  return createDefinition({
    name: `Import-Test-${Date.now()}-${Math.random()}`,
    family: 'testlinux',
    architecture: 'x86_64',
  });
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  initDb(TEST_DB);
  fs.mkdirSync(TEST_STORE, { recursive: true });
  jest.clearAllMocks();
  retentionMock.mockResolvedValue(undefined);
});

afterEach(() => {
  closeDb();
  try {
    fs.rmSync(TEST_STORE, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(TEST_DB);
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(`${TEST_DB}-wal`);
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(`${TEST_DB}-shm`);
  } catch {
    /* ignore */
  }
});

// ─── importByPath ─────────────────────────────────────────────────────────────

describe('importByPath', () => {
  it('imports a file and returns an active version', async () => {
    const def = makeDefinition();
    const content = 'ubuntu iso data';
    const src = makeSourceFile(content);

    const version = await importByPath({
      definitionId: def.id,
      sourcePath: src,
      versionString: '24.04',
      filename: 'ubuntu-24.04.iso',
    });

    expect(version.definitionId).toBe(def.id);
    expect(version.versionString).toBe('24.04');
    expect(version.filename).toBe('ubuntu-24.04.iso');
    expect(version.status).toBe('active');
    expect(version.sourceUrl).toBe('import://local');
    expect(version.checksumVerified).toBe(false);
    expect(version.fileSizeBytes).toBe(Buffer.byteLength(content));

    // Source file should still exist (copy, not move)
    expect(fs.existsSync(src)).toBe(true);

    // File should be present in the store
    expect(fs.existsSync(version.filePath)).toBe(true);

    fs.unlinkSync(src);
  });

  it('verifies checksum when provided and records it as verified', async () => {
    const def = makeDefinition();
    const content = 'fedora iso content';
    const src = makeSourceFile(content);
    const checksum = sha256(content);

    const version = await importByPath({
      definitionId: def.id,
      sourcePath: src,
      versionString: '40',
      checksum,
    });

    expect(version.checksum).toBe(checksum);
    expect(version.checksumVerified).toBe(true);

    fs.unlinkSync(src);
  });

  it('throws ValidationError when source file does not exist', async () => {
    const def = makeDefinition();
    await expect(
      importByPath({
        definitionId: def.id,
        sourcePath: '/nonexistent/file.iso',
        versionString: '1.0',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when source path is a directory', async () => {
    const def = makeDefinition();
    await expect(
      importByPath({
        definitionId: def.id,
        sourcePath: os.tmpdir(),
        versionString: '1.0',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when source is a symlink', async () => {
    const def = makeDefinition();
    const real = makeSourceFile('real content');
    const link = path.join(os.tmpdir(), `import-test-symlink-${Date.now()}.iso`);
    fs.symlinkSync(real, link);

    await expect(
      importByPath({
        definitionId: def.id,
        sourcePath: link,
        versionString: '1.0',
      }),
    ).rejects.toThrow(ValidationError);

    fs.unlinkSync(real);
    fs.unlinkSync(link);
  });

  it('throws ValidationError on checksum mismatch', async () => {
    const def = makeDefinition();
    const src = makeSourceFile('actual content');

    await expect(
      importByPath({
        definitionId: def.id,
        sourcePath: src,
        versionString: '1.0',
        checksum: 'a'.repeat(64), // wrong checksum
      }),
    ).rejects.toThrow(ValidationError);

    // Source file should be untouched
    expect(fs.existsSync(src)).toBe(true);
    fs.unlinkSync(src);
  });

  it('throws ValidationError when a file with the same name already exists', async () => {
    const def = makeDefinition();
    const content = 'duplicate iso';
    const src1 = makeSourceFile(content);
    const src2 = makeSourceFile(content);

    await importByPath({
      definitionId: def.id,
      sourcePath: src1,
      versionString: '1.0',
      filename: 'duplicate.iso',
    });

    await expect(
      importByPath({
        definitionId: def.id,
        sourcePath: src2,
        versionString: '1.1',
        filename: 'duplicate.iso',
      }),
    ).rejects.toThrow(ValidationError);

    fs.unlinkSync(src2);
  });

  it('sanitizes filename by stripping path separators', async () => {
    const def = makeDefinition();
    const src = makeSourceFile('safe content');

    const version = await importByPath({
      definitionId: def.id,
      sourcePath: src,
      versionString: '1.0',
      filename: '../../etc/passwd',
    });

    expect(version.filename).toBe('passwd');
    expect(fs.existsSync(version.filePath)).toBe(true);

    fs.unlinkSync(src);
  });

  it('uses source basename as filename when none provided', async () => {
    const def = makeDefinition();
    const src = makeSourceFile('content');
    // src ends with .iso

    const version = await importByPath({
      definitionId: def.id,
      sourcePath: src,
      versionString: '1.0',
    });

    expect(version.filename).toBe(path.basename(src));

    fs.unlinkSync(src);
  });

  it('applies retention after a successful import', async () => {
    const def = makeDefinition();
    const src = makeSourceFile('some content');

    await importByPath({
      definitionId: def.id,
      sourcePath: src,
      versionString: '1.0',
    });

    expect(retentionMock).toHaveBeenCalledWith(def.id);

    fs.unlinkSync(src);
  });
});

// ─── importByUpload ───────────────────────────────────────────────────────────

describe('importByUpload', () => {
  it('streams upload and returns an active version', async () => {
    const def = makeDefinition();
    const content = 'streamed iso data';
    const stream = Readable.from([Buffer.from(content)]);

    const version = await importByUpload({
      definitionId: def.id,
      filename: 'arch-2024.iso',
      stream,
      versionString: '2024.01',
    });

    expect(version.definitionId).toBe(def.id);
    expect(version.versionString).toBe('2024.01');
    expect(version.filename).toBe('arch-2024.iso');
    expect(version.status).toBe('active');
    expect(version.sourceUrl).toBe('import://local');
    expect(version.fileSizeBytes).toBe(Buffer.byteLength(content));
    expect(fs.existsSync(version.filePath)).toBe(true);
  });

  it('verifies checksum when provided', async () => {
    const def = makeDefinition();
    const content = 'verified upload content';
    const checksum = sha256(content);
    const stream = Readable.from([Buffer.from(content)]);

    const version = await importByUpload({
      definitionId: def.id,
      filename: 'debian.iso',
      stream,
      versionString: '12',
      checksum,
    });

    expect(version.checksumVerified).toBe(true);
    expect(version.checksum).toBe(checksum);
  });

  it('throws ValidationError on checksum mismatch and cleans up temp file', async () => {
    const def = makeDefinition();
    const content = 'mismatch content';
    const stream = Readable.from([Buffer.from(content)]);

    // Count .part files before
    const downloadsDir = path.join(TEST_STORE, 'downloads');

    await expect(
      importByUpload({
        definitionId: def.id,
        filename: 'bad.iso',
        stream,
        versionString: '1.0',
        checksum: 'b'.repeat(64),
      }),
    ).rejects.toThrow(ValidationError);

    // No leftover .part files
    if (fs.existsSync(downloadsDir)) {
      const parts = fs.readdirSync(downloadsDir).filter((f) => f.endsWith('.part'));
      expect(parts).toHaveLength(0);
    }
  });

  it('throws ValidationError when filename sanitizes to empty string', async () => {
    const def = makeDefinition();
    const stream = Readable.from([Buffer.from('data')]);

    await expect(
      importByUpload({
        definitionId: def.id,
        filename: '/',
        stream,
        versionString: '1.0',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('sanitizes filename from upload', async () => {
    const def = makeDefinition();
    const content = 'upload data';
    const stream = Readable.from([Buffer.from(content)]);

    const version = await importByUpload({
      definitionId: def.id,
      filename: '../sneaky/../../evil.iso',
      stream,
      versionString: '1.0',
    });

    expect(version.filename).toBe('evil.iso');
  });

  it('applies retention after a successful upload import', async () => {
    const def = makeDefinition();
    const stream = Readable.from([Buffer.from('retention test data')]);

    await importByUpload({
      definitionId: def.id,
      filename: 'retention.iso',
      stream,
      versionString: '1.0',
    });

    expect(retentionMock).toHaveBeenCalledWith(def.id);
  });
});
