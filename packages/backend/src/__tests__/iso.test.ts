import path from 'path';
import os from 'os';
import fs from 'fs';

// jest.mock is hoisted — use require() and process inside the factory (both are allowed)
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storage: {
      path: require('os').tmpdir() + '/isovault-iso-test-store-' + process.pid,
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

import { initDb, closeDb } from '../db/client';
import {
  createDefinition,
  getDefinition,
  listDefinitions,
  updateDefinition,
  deleteDefinition,
  listVersions,
} from '../services/iso';
import { NotFoundError, ConflictError } from '../errors/base';

const TEST_DB = path.join(os.tmpdir(), `isovault-jest-iso-${process.pid}.sqlite3`);
const TEST_STORE = path.join(os.tmpdir(), `isovault-iso-test-store-${process.pid}`);

beforeAll(() => {
  initDb(TEST_DB);
});

afterAll(() => {
  closeDb();
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
  fs.rmSync(TEST_STORE, { recursive: true, force: true });
});

// ─── createDefinition ─────────────────────────────────────────────────────────

describe('createDefinition', () => {
  it('creates a definition and returns it with defaults applied', () => {
    const def = createDefinition({
      name: 'Ubuntu 24.04 LTS',
      family: 'ubuntu',
      architecture: 'x86_64',
    });

    expect(def.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(def.name).toBe('Ubuntu 24.04 LTS');
    expect(def.family).toBe('ubuntu');
    expect(def.architecture).toBe('x86_64');
    expect(def.tags).toEqual([]);
    expect(def.checksumAlgo).toBe('sha256');
    expect(def.retentionCount).toBe(5);
    expect(def.retentionBehavior).toBe('archive');
    expect(def.watchEnabled).toBe(false);
    expect(def.watchIntervalMinutes).toBe(60);
    expect(def.createdAt).toBeTruthy();
  });

  it('stores optional fields correctly', () => {
    const def = createDefinition({
      name: 'Debian 12',
      family: 'debian',
      architecture: 'aarch64',
      description: 'Bookworm',
      tags: ['server', 'arm'],
      sourceUrl: 'https://debian.org/iso',
      checksumAlgo: 'sha512',
      watchEnabled: true,
      watchStrategy: 'checksum',
      watchIntervalMinutes: 30,
    });

    expect(def.description).toBe('Bookworm');
    expect(def.tags).toEqual(['server', 'arm']);
    expect(def.sourceUrl).toBe('https://debian.org/iso');
    expect(def.checksumAlgo).toBe('sha512');
    expect(def.watchEnabled).toBe(true);
    expect(def.watchStrategy).toBe('checksum');
    expect(def.watchIntervalMinutes).toBe(30);
  });

  it('throws ConflictError when name already exists', () => {
    createDefinition({ name: 'Fedora 40', family: 'fedora', architecture: 'x86_64' });
    expect(() =>
      createDefinition({ name: 'Fedora 40', family: 'fedora', architecture: 'x86_64' }),
    ).toThrow(ConflictError);
  });
});

// ─── getDefinition ────────────────────────────────────────────────────────────

describe('getDefinition', () => {
  it('returns the definition by id', () => {
    const created = createDefinition({
      name: 'Alpine 3.20',
      family: 'alpine',
      architecture: 'x86_64',
    });
    const fetched = getDefinition(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe('Alpine 3.20');
  });

  it('throws NotFoundError for unknown id', () => {
    expect(() => getDefinition('00000000-0000-0000-0000-000000000000')).toThrow(NotFoundError);
  });
});

// ─── listDefinitions ──────────────────────────────────────────────────────────

describe('listDefinitions', () => {
  it('returns all definitions when no filters applied', () => {
    const { definitions, total } = listDefinitions({});
    expect(Array.isArray(definitions)).toBe(true);
    expect(total).toBeGreaterThan(0);
  });

  it('filters by family', () => {
    const family = 'archtest' + Date.now();
    createDefinition({ name: `Arch-${family}`, family, architecture: 'x86_64' });
    const { definitions, total } = listDefinitions({ family });
    expect(total).toBe(1);
    expect(definitions[0].family).toBe(family);
  });

  it('filters by search term', () => {
    const uniqueName = `SearchableISO-${Date.now()}`;
    createDefinition({ name: uniqueName, family: 'searchtest', architecture: 'x86_64' });
    const { definitions } = listDefinitions({ search: uniqueName.slice(0, 12) });
    expect(definitions.some((d) => d.name === uniqueName)).toBe(true);
  });

  it('paginates correctly', () => {
    const { definitions } = listDefinitions({ page: 1, limit: 2 });
    expect(definitions.length).toBeLessThanOrEqual(2);
  });
});

// ─── updateDefinition ─────────────────────────────────────────────────────────

describe('updateDefinition', () => {
  it('updates specified fields and preserves others', () => {
    const def = createDefinition({
      name: `Update-Test-${Date.now()}`,
      family: 'test',
      architecture: 'x86_64',
      tags: ['original'],
    });

    const updated = updateDefinition(def.id, { description: 'New desc', tags: ['updated'] });

    expect(updated.description).toBe('New desc');
    expect(updated.tags).toEqual(['updated']);
    expect(updated.name).toBe(def.name);
    expect(updated.family).toBe('test');
    expect(updated.updatedAt).not.toBe(def.updatedAt);
  });

  it('throws ConflictError when new name clashes with existing', () => {
    const def1 = createDefinition({
      name: `ConflictA-${Date.now()}`,
      family: 'c',
      architecture: 'x86_64',
    });
    const def2 = createDefinition({
      name: `ConflictB-${Date.now()}`,
      family: 'c',
      architecture: 'x86_64',
    });
    expect(() => updateDefinition(def2.id, { name: def1.name })).toThrow(ConflictError);
  });

  it('throws NotFoundError for unknown id', () => {
    expect(() =>
      updateDefinition('00000000-0000-0000-0000-000000000001', { description: 'x' }),
    ).toThrow(NotFoundError);
  });
});

// ─── deleteDefinition ─────────────────────────────────────────────────────────

describe('deleteDefinition', () => {
  it('removes the definition so it can no longer be found', () => {
    const def = createDefinition({
      name: `Delete-Test-${Date.now()}`,
      family: 'test',
      architecture: 'x86_64',
    });
    deleteDefinition(def.id);
    expect(() => getDefinition(def.id)).toThrow(NotFoundError);
  });

  it('throws NotFoundError for unknown id', () => {
    expect(() => deleteDefinition('00000000-0000-0000-0000-000000000002')).toThrow(NotFoundError);
  });
});

// ─── listVersions ─────────────────────────────────────────────────────────────

describe('listVersions', () => {
  it('returns empty list when definition has no versions', () => {
    const def = createDefinition({
      name: `Versions-Test-${Date.now()}`,
      family: 'test',
      architecture: 'x86_64',
    });
    const { versions, total } = listVersions(def.id, {});
    expect(versions).toEqual([]);
    expect(total).toBe(0);
  });

  it('throws NotFoundError when definition does not exist', () => {
    expect(() => listVersions('00000000-0000-0000-0000-000000000003', {})).toThrow(NotFoundError);
  });
});
