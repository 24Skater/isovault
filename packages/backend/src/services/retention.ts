import { getDb } from '../db/client';
import { deleteFile } from './storage';
import { logEvent } from './audit';
import { hub } from '../websocket/hub';
import type { IsoVersionRow } from '../db/schema';
import type { RetentionBehavior } from '../types';

class RetentionService {
  applyRetention(definitionId: string): void {
    const db = getDb();

    const def = db
      .prepare('SELECT retention_count, retention_behavior FROM iso_definitions WHERE id = ?')
      .get(definitionId) as { retention_count: number; retention_behavior: string } | undefined;

    if (!def) return;

    const retentionCount = def.retention_count;
    const retentionBehavior = def.retention_behavior as RetentionBehavior;

    const activeVersions = db
      .prepare(
        `SELECT * FROM iso_versions
         WHERE definition_id = ? AND status = 'active'
         ORDER BY created_at DESC`,
      )
      .all(definitionId) as IsoVersionRow[];

    const excess = activeVersions.slice(retentionCount);
    if (!excess.length) return;

    const now = new Date().toISOString();

    for (const version of excess) {
      if (retentionBehavior === 'archive') {
        db.prepare(
          `UPDATE iso_versions
           SET status = 'archived', archived_at = ?, updated_at = ?
           WHERE id = ?`,
        ).run(now, now, version.id);
      } else {
        db.prepare(`UPDATE iso_versions SET status = 'deleted', updated_at = ? WHERE id = ?`).run(
          now,
          version.id,
        );
        try {
          deleteFile(version.file_path);
        } catch {
          // File already gone — not a failure
        }
      }
    }

    const affectedVersionIds = excess.map((v) => v.id);
    const timestamp = now;

    hub.broadcast({
      type: 'retention.applied',
      definitionId,
      behavior: retentionBehavior,
      affectedVersionIds,
      timestamp,
    });

    logEvent('retention.applied', 'definition', definitionId, {
      behavior: retentionBehavior,
      count: excess.length,
      affectedVersionIds,
    });
  }
}

export const retentionService = new RetentionService();
