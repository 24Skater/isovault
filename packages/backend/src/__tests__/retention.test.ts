jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storage: {
      path: require('path').join(require('os').tmpdir(), 'isovault-ret-test-' + process.pid),
      alertThresholdPercent: 80,
    },
    security: { ssrfProtection: false, maxRedirects: 5 },
    retention: { defaultCount: 5, defaultBehavior: 'archive' },
    logging: { level: 'silent', retentionDays: 30 },
    server: { port: 3722, host: '0.0.0.0', corsOrigins: [] },
    database: { path: ':memory:' },
    downloads: {
      maxConcurrent: 2,
      retryMaxAttempts: 3,
      retryBaseDelaySeconds: 1,
      timeoutSeconds: 3600,
    },
    scheduler: {
      watcherCheckIntervalCron: '0 * * * *',
      dbBackupCron: '0 2 * * *',
      cleanupCron: '0 3 * * *',
    },
  },
}));

jest.mock('../websocket/hub', () => ({
  hub: { broadcast: jest.fn(), register: jest.fn(), unregister: jest.fn(), clientCount: 0 },
}));

jest.mock('../services/storage', () => ({
  moveFile: jest.fn(),
  deleteFile: jest.fn(),
  ensureDefinitionDir: jest.fn(),
  resolveVersionPath: jest.fn().mockReturnValue('/tmp/fake/file.iso'),
}));

import { initDb, closeDb, getDb } from '../db/client';
import { retentionService } from '../services/retention';
import { hub } from '../websocket/hub';

const { deleteFile } = jest.requireMock('../services/storage') as { deleteFile: jest.Mock };
const hubMock = hub as unknown as { broadcast: jest.Mock };

function insertDefinition(
  id: string,
  retentionCount: number,
  retentionBehavior: 'archive' | 'delete',
): void {
  getDb()
    .prepare(
      `INSERT INTO iso_definitions
         (id, name, family, checksum_algo, source_url, retention_count, retention_behavior,
          watch_enabled, created_at, updated_at)
       VALUES (?, ?, 'linux', 'sha256', 'https://example.com', ?, ?, 0,
               datetime('now'), datetime('now'))`,
    )
    .run(id, id, retentionCount, retentionBehavior);
}

function insertVersion(id: string, definitionId: string, status: string, secsAgo: number): void {
  getDb()
    .prepare(
      `INSERT INTO iso_versions
         (id, definition_id, version_string, filename, file_path, source_url,
          checksum_verified, status, created_at, updated_at)
       VALUES (?, ?, '1.0', 'file.iso', '/tmp/file.iso', 'https://example.com',
               0, ?, datetime('now', '-' || ? || ' seconds'), datetime('now'))`,
    )
    .run(id, definitionId, status, secsAgo);
}

beforeEach(() => {
  initDb(':memory:');
  jest.clearAllMocks();
});

afterEach(() => {
  closeDb();
});

describe('retentionService.applyRetention', () => {
  it('does nothing when active version count is within limit', () => {
    insertDefinition('def1', 3, 'archive');
    insertVersion('v1', 'def1', 'active', 300);
    insertVersion('v2', 'def1', 'active', 200);

    retentionService.applyRetention('def1');

    const rows = getDb()
      .prepare(`SELECT status FROM iso_versions WHERE definition_id = 'def1'`)
      .all() as { status: string }[];
    expect(rows.every((r) => r.status === 'active')).toBe(true);
    expect(hubMock.broadcast).not.toHaveBeenCalled();
  });

  it('archives excess versions when behavior is "archive"', () => {
    insertDefinition('def2', 2, 'archive');
    insertVersion('v1', 'def2', 'active', 600); // oldest
    insertVersion('v2', 'def2', 'active', 400);
    insertVersion('v3', 'def2', 'active', 200); // newest

    retentionService.applyRetention('def2');

    const rows = getDb()
      .prepare(
        `SELECT id, status FROM iso_versions WHERE definition_id = 'def2' ORDER BY created_at DESC`,
      )
      .all() as { id: string; status: string }[];

    expect(rows[0]).toMatchObject({ id: 'v3', status: 'active' });
    expect(rows[1]).toMatchObject({ id: 'v2', status: 'active' });
    expect(rows[2]).toMatchObject({ id: 'v1', status: 'archived' });

    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('deletes excess versions when behavior is "delete"', () => {
    insertDefinition('def3', 1, 'delete');
    insertVersion('v1', 'def3', 'active', 600);
    insertVersion('v2', 'def3', 'active', 300);

    retentionService.applyRetention('def3');

    const rows = getDb()
      .prepare(
        `SELECT id, status FROM iso_versions WHERE definition_id = 'def3' ORDER BY created_at DESC`,
      )
      .all() as { id: string; status: string }[];

    expect(rows[0]).toMatchObject({ id: 'v2', status: 'active' });
    expect(rows[1]).toMatchObject({ id: 'v1', status: 'deleted' });

    expect(deleteFile).toHaveBeenCalledTimes(1);
  });

  it('ignores non-active versions when counting', () => {
    insertDefinition('def4', 2, 'archive');
    insertVersion('v1', 'def4', 'active', 400);
    insertVersion('v2', 'def4', 'active', 300);
    insertVersion('vA', 'def4', 'archived', 200);
    insertVersion('vD', 'def4', 'deleted', 100);

    retentionService.applyRetention('def4');

    // Only 2 active, limit is 2 — nothing should be archived
    const archivedCount = (
      getDb()
        .prepare(
          `SELECT COUNT(*) as c FROM iso_versions WHERE definition_id='def4' AND status='archived'`,
        )
        .get() as { c: number }
    ).c;
    // The pre-existing 'archived' record is 'vA'; no new ones
    expect(archivedCount).toBe(1);
  });

  it('broadcasts retention.applied event with correct fields', () => {
    insertDefinition('def5', 1, 'archive');
    insertVersion('v1', 'def5', 'active', 400);
    insertVersion('v2', 'def5', 'active', 200);

    retentionService.applyRetention('def5');

    expect(hubMock.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'retention.applied',
        definitionId: 'def5',
        behavior: 'archive',
        affectedVersionIds: ['v1'],
      }),
    );
  });

  it('does nothing when definition does not exist', () => {
    // Should not throw
    retentionService.applyRetention('nonexistent');
    expect(hubMock.broadcast).not.toHaveBeenCalled();
  });

  it('keeps only the N most recently created active versions', () => {
    insertDefinition('def6', 2, 'archive');
    // Insert 5 active versions
    for (let i = 1; i <= 5; i++) {
      insertVersion(`v${i}`, 'def6', 'active', (6 - i) * 100);
    }

    retentionService.applyRetention('def6');

    const active = getDb()
      .prepare(`SELECT id FROM iso_versions WHERE definition_id='def6' AND status='active'`)
      .all() as { id: string }[];
    const archived = getDb()
      .prepare(`SELECT id FROM iso_versions WHERE definition_id='def6' AND status='archived'`)
      .all() as { id: string }[];

    expect(active).toHaveLength(2);
    expect(archived).toHaveLength(3);
  });
});
