import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/client';
import { getStorageStats } from '../services/storage';
import { listEvents } from '../services/audit';

export async function statsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/stats ─────────────────────────────────────────────────────────
  fastify.get('/api/stats', async () => {
    const db = getDb();

    const { count: definitionCount } = db
      .prepare('SELECT COUNT(*) as count FROM iso_definitions')
      .get() as { count: number };

    const { count: activeVersionCount } = db
      .prepare(`SELECT COUNT(*) as count FROM iso_versions WHERE status = 'active'`)
      .get() as { count: number };

    const { count: archivedVersionCount } = db
      .prepare(`SELECT COUNT(*) as count FROM iso_versions WHERE status = 'archived'`)
      .get() as { count: number };

    const { count: runningDownloads } = db
      .prepare(`SELECT COUNT(*) as count FROM download_jobs WHERE status = 'running'`)
      .get() as { count: number };

    const { count: queuedDownloads } = db
      .prepare(`SELECT COUNT(*) as count FROM download_jobs WHERE status = 'queued'`)
      .get() as { count: number };

    const storage = getStorageStats();
    const { entries: recentEvents } = listEvents({ limit: 5 });

    return {
      definitions: definitionCount,
      versions: {
        active: activeVersionCount,
        archived: archivedVersionCount,
      },
      downloads: {
        running: runningDownloads,
        queued: queuedDownloads,
      },
      storage: {
        usedBytes: storage.usedBytes,
        freeBytes: storage.freeBytes,
        totalBytes: storage.totalBytes,
        alertThresholdPercent: storage.alertThresholdPercent,
      },
      recentEvents,
    };
  });
}
