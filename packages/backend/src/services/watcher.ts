import path from 'path';
import { getDb } from '../db/client';
import { downloadManager } from './download';
import { runStrategy } from './watcher-strategies';
import { logEvent } from './audit';
import { hub } from '../websocket/hub';
import { resolveVersionPath } from './storage';
import { createVersion } from './iso';
import { NotFoundError } from '../errors/base';
import type { IsoDefinitionRow, IsoVersionRow } from '../db/schema';
import type { WatchStrategy } from '../types';

class WatcherService {
  private running = false;

  async runDue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT * FROM iso_definitions
           WHERE watch_enabled = 1
             AND watch_strategy IS NOT NULL
             AND (
               watch_last_checked_at IS NULL
               OR datetime(watch_last_checked_at, '+' || watch_interval_minutes || ' minutes')
                  <= datetime('now')
             )`,
        )
        .all() as IsoDefinitionRow[];

      for (const row of rows) {
        await this.runOneRow(row);
      }
    } finally {
      this.running = false;
    }
  }

  async runOne(definitionId: string): Promise<void> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM iso_definitions WHERE id = ?').get(definitionId) as
      | IsoDefinitionRow
      | undefined;

    if (!row) throw new NotFoundError('IsoDefinition', definitionId);
    await this.runOneRow(row);
  }

  private async runOneRow(row: IsoDefinitionRow): Promise<void> {
    const definitionId = row.id;
    const now = new Date().toISOString();

    if (!row.watch_strategy || !row.watch_enabled) {
      return;
    }

    const watchConfig = row.watch_config
      ? (JSON.parse(row.watch_config) as Record<string, unknown>)
      : {};

    let result: Awaited<ReturnType<typeof runStrategy>>;
    try {
      result = await runStrategy(
        row.watch_strategy as WatchStrategy,
        watchConfig,
        row.watch_last_version_found,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logEvent(
        'watcher.check_failed',
        'definition',
        definitionId,
        {
          strategy: row.watch_strategy,
          error: msg,
        },
        'warn',
      );
      // Stamp check time even on failure so we don't hammer a broken endpoint
      getDb()
        .prepare(
          'UPDATE iso_definitions SET watch_last_checked_at = ?, updated_at = ? WHERE id = ?',
        )
        .run(now, now, definitionId);
      return;
    }

    // Stamp check time
    getDb()
      .prepare('UPDATE iso_definitions SET watch_last_checked_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, definitionId);

    if (!result) return;
    if (result.versionString === row.watch_last_version_found) return;

    const db = getDb();
    const { versionString, downloadUrl, checksum, releaseDate } = result;

    // Check for an existing version with the same string (don't duplicate)
    const existing = db
      .prepare('SELECT id FROM iso_versions WHERE definition_id = ? AND version_string = ?')
      .get(definitionId, versionString) as Pick<IsoVersionRow, 'id'> | undefined;

    if (!existing) {
      const filename = deriveFilename(downloadUrl, definitionId, versionString);
      const filePath = resolveVersionPath(definitionId, filename);

      const version = createVersion({
        definitionId,
        versionString,
        filename,
        filePath,
        sourceUrl: downloadUrl,
        releaseDate: releaseDate ?? null,
        checksum: checksum ?? null,
        status: 'pending',
      });

      // Enqueue download — swallow ConflictError (job already exists)
      try {
        await downloadManager.enqueue(version.id);
      } catch {
        // ConflictError or other non-critical enqueue failure
      }

      logEvent('watcher.version_detected', 'definition', definitionId, {
        versionString,
        downloadUrl,
      });

      hub.broadcast({
        type: 'version.detected',
        definitionId,
        versionString,
        downloadUrl,
        timestamp: now,
      });
    }

    // Update last-found version regardless
    db.prepare(
      'UPDATE iso_definitions SET watch_last_version_found = ?, updated_at = ? WHERE id = ?',
    ).run(versionString, now, definitionId);
  }
}

function deriveFilename(downloadUrl: string, definitionId: string, versionString: string): string {
  try {
    const basename = path.basename(new URL(downloadUrl).pathname);
    if (basename && basename !== '/') return basename;
  } catch {
    // invalid URL — use fallback
  }
  return `${definitionId}-${versionString}.iso`;
}

export const watcherService = new WatcherService();
