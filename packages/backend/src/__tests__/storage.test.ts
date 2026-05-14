import path from 'path';
import os from 'os';
import fs from 'fs';

// jest.mock is hoisted — use require() and process inside the factory (both are allowed)
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storage: {
      path: require('path').join(require('os').tmpdir(), 'isovault-storage-test-' + process.pid),
      alertThresholdPercent: 80,
    },
    retention: { defaultCount: 5, defaultBehavior: 'archive' },
    logging: { level: 'silent', retentionDays: 30 },
    server: { port: 3721, host: '0.0.0.0', corsOrigins: [] },
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

// Must import after the mock is in place
import {
  ensureDefinitionDir,
  resolveVersionPath,
  moveFile,
  deleteFile,
  getStorageStats,
} from '../services/storage';

// Compute the same path used in the mock (process.pid is constant per process)
const TEST_STORE = path.join(os.tmpdir(), `isovault-storage-test-${process.pid}`);

afterAll(() => {
  fs.rmSync(TEST_STORE, { recursive: true, force: true });
});

// ─── ensureDefinitionDir ──────────────────────────────────────────────────────

describe('ensureDefinitionDir', () => {
  it('creates the directory and returns its path', () => {
    const dir = ensureDefinitionDir('test-def-001');
    expect(dir).toBe(path.join(TEST_STORE, 'test-def-001'));
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('is idempotent — no error when called twice', () => {
    expect(() => {
      ensureDefinitionDir('test-def-001');
      ensureDefinitionDir('test-def-001');
    }).not.toThrow();
  });
});

// ─── resolveVersionPath ───────────────────────────────────────────────────────

describe('resolveVersionPath', () => {
  it('returns the correct nested path', () => {
    const resolved = resolveVersionPath('def-abc', 'ubuntu-24.04.iso');
    expect(resolved).toBe(path.join(TEST_STORE, 'def-abc', 'ubuntu-24.04.iso'));
  });
});

// ─── moveFile ─────────────────────────────────────────────────────────────────

describe('moveFile', () => {
  it('moves a file to the destination, creating subdirs as needed', () => {
    const src = path.join(TEST_STORE, 'move-src.txt');
    const dest = path.join(TEST_STORE, 'subdir', 'move-dest.txt');
    fs.mkdirSync(TEST_STORE, { recursive: true });
    fs.writeFileSync(src, 'hello');

    moveFile(src, dest);

    expect(fs.existsSync(src)).toBe(false);
    expect(fs.readFileSync(dest, 'utf-8')).toBe('hello');
  });
});

// ─── deleteFile ───────────────────────────────────────────────────────────────

describe('deleteFile', () => {
  it('deletes an existing file', () => {
    const filePath = path.join(TEST_STORE, 'to-delete.txt');
    fs.mkdirSync(TEST_STORE, { recursive: true });
    fs.writeFileSync(filePath, 'bye');

    deleteFile(filePath);

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('does not throw when file does not exist (ENOENT is silent)', () => {
    expect(() => deleteFile(path.join(TEST_STORE, 'ghost.txt'))).not.toThrow();
  });
});

// ─── getStorageStats ──────────────────────────────────────────────────────────

describe('getStorageStats', () => {
  it('returns stats with correct path and numeric usedBytes', () => {
    const stats = getStorageStats();
    expect(stats.storagePath).toBe(TEST_STORE);
    expect(typeof stats.usedBytes).toBe('number');
    expect(stats.usedBytes).toBeGreaterThanOrEqual(0);
    expect(stats.alertThresholdPercent).toBe(80);
  });
});
