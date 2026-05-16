import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { watcherService } from '../services/watcher';
import { runCleanup } from '../services/cleanup';
import { logEvent } from '../services/audit';
import { getDb } from '../db/client';

const MAX_BACKUPS = 7;

async function runDbBackup(): Promise<void> {
  const dbPath = config.database.path;
  if (dbPath === ':memory:') return;

  const backupDir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const destPath = path.join(backupDir, `iso-manager-${stamp}.sqlite3`);

  try {
    await getDb().backup(destPath);

    // Prune old backups — keep only the most recent MAX_BACKUPS
    const backups = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.sqlite3'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    for (const old of backups.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(backupDir, old.name));
    }

    logEvent('scheduler.db_backup_completed', null, null, { dest: destPath });
  } catch (err) {
    logEvent(
      'scheduler.db_backup_failed',
      null,
      null,
      { dest: destPath, message: err instanceof Error ? err.message : String(err) },
      'error',
    );
  }
}

class CronScheduler {
  private tasks: cron.ScheduledTask[] = [];

  start(): void {
    // Watcher sweep — run all due watchers
    this.tasks.push(
      cron.schedule(config.scheduler.watcherCheckIntervalCron, () => {
        void watcherService.runDue().catch((err: unknown) => {
          logEvent(
            'scheduler.watcher_error',
            null,
            null,
            { message: err instanceof Error ? err.message : String(err) },
            'error',
          );
        });
      }),
    );

    // DB backup
    this.tasks.push(
      cron.schedule(config.scheduler.dbBackupCron, () => {
        void runDbBackup();
      }),
    );

    // Cleanup sweep — audit log retention, stale job pruning, orphaned .part files
    this.tasks.push(
      cron.schedule(config.scheduler.cleanupCron, () => {
        void runCleanup().catch((err: unknown) => {
          logEvent(
            'scheduler.cleanup_error',
            null,
            null,
            { message: err instanceof Error ? err.message : String(err) },
            'error',
          );
        });
      }),
    );
  }

  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
  }
}

export const scheduler = new CronScheduler();
