import cron from 'node-cron';
import config from '../config';
import { watcherService } from '../services/watcher';
import { logEvent } from '../services/audit';

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

    // DB backup — stub until Phase 4
    this.tasks.push(
      cron.schedule(config.scheduler.dbBackupCron, () => {
        logEvent('scheduler.db_backup_skipped', null, null, { reason: 'not_implemented' });
      }),
    );

    // Cleanup sweep — stub until Phase 4
    this.tasks.push(
      cron.schedule(config.scheduler.cleanupCron, () => {
        logEvent('scheduler.cleanup_skipped', null, null, { reason: 'not_implemented' });
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
