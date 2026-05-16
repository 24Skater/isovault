import fs from 'fs';
import path from 'path';
import { getDb } from '../db/client';
import { getSetting } from './settings';
import { logEvent } from './audit';
import config from '../config';

// How long to keep terminal download job records
const JOB_RETENTION_DAYS = 30;

export async function runCleanup(): Promise<void> {
  const results = {
    auditLogsDeleted: 0,
    downloadJobsDeleted: 0,
    partFilesDeleted: 0,
  };

  // ── 1. Audit log retention ────────────────────────────────────────────────
  const retentionDays = parseInt(getSetting('log_retention_days') ?? '30', 10);
  if (retentionDays > 0) {
    const { changes } = getDb()
      .prepare(
        `DELETE FROM audit_log
         WHERE created_at < datetime('now', '-' || ? || ' days')`,
      )
      .run(retentionDays);
    results.auditLogsDeleted = changes;
  }

  // ── 2. Completed/failed/cancelled download job pruning ────────────────────
  const { changes: jobChanges } = getDb()
    .prepare(
      `DELETE FROM download_jobs
       WHERE status IN ('completed', 'failed', 'cancelled')
         AND created_at < datetime('now', '-' || ? || ' days')`,
    )
    .run(JOB_RETENTION_DAYS);
  results.downloadJobsDeleted = jobChanges;

  // ── 3. Orphaned .part file cleanup ────────────────────────────────────────
  const downloadsDir = path.join(config.storage.path, 'downloads');
  if (fs.existsSync(downloadsDir)) {
    const activeIds = new Set(
      (
        getDb()
          .prepare(`SELECT id FROM download_jobs WHERE status IN ('running', 'queued')`)
          .all() as { id: string }[]
      ).map((r) => r.id),
    );

    for (const file of fs.readdirSync(downloadsDir)) {
      if (!file.endsWith('.part')) continue;
      const jobId = file.slice(0, -5);
      if (activeIds.has(jobId)) continue;
      try {
        fs.unlinkSync(path.join(downloadsDir, file));
        results.partFilesDeleted++;
      } catch {
        // Ignore races — file may already be gone
      }
    }
  }

  logEvent('scheduler.cleanup_completed', null, null, results);
}
