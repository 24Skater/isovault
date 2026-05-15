import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/client';
import config from '../config';
import type { DownloadJob, ChecksumAlgorithm } from '../types';
import type { DownloadJobRow, IsoVersionRow } from '../db/schema';
import { hub } from '../websocket/hub';
import { assertSafeUrl } from '../utils/ssrf';
import { verifyFileChecksum } from '../utils/checksum';
import { moveFile, deleteFile } from './storage';
import { logEvent } from './audit';
import { ConflictError, NotFoundError, ChecksumMismatchError } from '../errors/base';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DequeueRow extends DownloadJobRow {
  source_url: string;
  file_path: string;
  checksum: string | null;
  checksum_algo: string;
  definition_id: string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function rowToJob(row: DownloadJobRow): DownloadJob {
  return {
    id: row.id,
    versionId: row.version_id,
    status: row.status as DownloadJob['status'],
    priority: row.priority,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    bytesDownloaded: row.bytes_downloaded,
    bytesTotal: row.bytes_total,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function partPath(jobId: string): string {
  return path.join(config.storage.path, 'downloads', `${jobId}.part`);
}

function ensureDownloadsDir(): void {
  fs.mkdirSync(path.join(config.storage.path, 'downloads'), { recursive: true });
}

// ─── DownloadManager ─────────────────────────────────────────────────────────

class DownloadManager {
  private readonly active = new Map<string, AbortController>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  // Reset any jobs that were mid-download when the process last died
  recoverStaleJobs(): void {
    ensureDownloadsDir();

    const db = getDb();
    db.prepare(
      `UPDATE download_jobs
       SET status = 'queued', started_at = NULL, error_message = 'Recovered after restart'
       WHERE status = 'running'`,
    ).run();

    // Remove orphaned .part files with no matching active job
    const dlDir = path.join(config.storage.path, 'downloads');
    if (!fs.existsSync(dlDir)) return;

    const activeIds = new Set(
      (
        db.prepare(`SELECT id FROM download_jobs WHERE status IN ('running', 'queued')`).all() as {
          id: string;
        }[]
      ).map((r) => r.id),
    );

    for (const file of fs.readdirSync(dlDir)) {
      if (!file.endsWith('.part')) continue;
      const jobId = file.slice(0, -5);
      if (!activeIds.has(jobId)) {
        deleteFile(path.join(dlDir, file));
      }
    }
  }

  async enqueue(versionId: string, priority = 5): Promise<DownloadJob> {
    const db = getDb();

    const version = db
      .prepare(`SELECT id, source_url FROM iso_versions WHERE id = ?`)
      .get(versionId) as Pick<IsoVersionRow, 'id' | 'source_url'> | undefined;

    if (!version) throw new NotFoundError('IsoVersion', versionId);

    const existing = db
      .prepare(
        `SELECT id FROM download_jobs
         WHERE version_id = ? AND status NOT IN ('completed', 'failed', 'cancelled')`,
      )
      .get(versionId);

    if (existing) {
      throw new ConflictError(`An active download job already exists for version ${versionId}`, {
        versionId,
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO download_jobs
         (id, version_id, status, priority, attempt_count, max_attempts, bytes_downloaded, created_at)
       VALUES (?, ?, 'queued', ?, 0, ?, 0, ?)`,
    ).run(id, versionId, priority, config.downloads.retryMaxAttempts, now);

    // Read before tick() — tick updates status to 'running' synchronously
    const job = rowToJob(
      db.prepare(`SELECT * FROM download_jobs WHERE id = ?`).get(id) as DownloadJobRow,
    );
    void this.tick();
    return job;
  }

  async tick(): Promise<void> {
    const available = config.downloads.maxConcurrent - this.active.size;
    if (available <= 0) return;

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT
           dj.id, dj.version_id, dj.status, dj.priority, dj.attempt_count, dj.max_attempts,
           dj.bytes_downloaded, dj.bytes_total, dj.error_message,
           dj.started_at, dj.completed_at, dj.created_at,
           iv.source_url, iv.file_path, iv.checksum, iv.definition_id,
           idef.checksum_algo
         FROM download_jobs dj
         JOIN iso_versions iv    ON iv.id   = dj.version_id
         JOIN iso_definitions idef ON idef.id = iv.definition_id
         WHERE dj.status = 'queued'
         ORDER BY dj.priority DESC, dj.created_at ASC
         LIMIT ?`,
      )
      .all(available) as DequeueRow[];

    const now = new Date().toISOString();
    for (const row of rows) {
      db.prepare(
        `UPDATE download_jobs
         SET status = 'running', started_at = ?, attempt_count = attempt_count + 1
         WHERE id = ?`,
      ).run(now, row.id);

      db.prepare(
        `UPDATE iso_versions SET status = 'downloading', download_started_at = ?, updated_at = ?
         WHERE id = ?`,
      ).run(now, now, row.version_id);

      const controller = new AbortController();
      this.active.set(row.id, controller);
      void this.executeJob({ ...row, attempt_count: row.attempt_count + 1 }, controller);
    }
  }

  private async executeJob(row: DequeueRow, controller: AbortController): Promise<void> {
    const { id: jobId, version_id: versionId, definition_id: definitionId } = row;
    const tmpPath = partPath(jobId);
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let bytesDownloaded = 0;
    let bytesTotal: number | null = null;
    let lastBytes = 0;
    let lastTime = Date.now();

    try {
      ensureDownloadsDir();
      await assertSafeUrl(row.source_url);

      const res = await fetch(row.source_url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'IsoVault/1.0' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const contentLength = res.headers.get('content-length');
      if (contentLength) {
        bytesTotal = parseInt(contentLength, 10);
        getDb()
          .prepare(`UPDATE download_jobs SET bytes_total = ? WHERE id = ?`)
          .run(bytesTotal, jobId);
      }

      if (!res.body) throw new Error('Response has no body');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeStream = Readable.fromWeb(res.body as any);
      const writeStream = fs.createWriteStream(tmpPath);

      progressInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        const speed = elapsed > 0 ? (bytesDownloaded - lastBytes) / elapsed : null;
        lastBytes = bytesDownloaded;
        lastTime = now;

        hub.broadcast({
          type: 'download.progress',
          jobId,
          versionId,
          definitionId,
          bytesDownloaded,
          bytesTotal,
          percent: bytesTotal ? Math.round((bytesDownloaded / bytesTotal) * 1000) / 10 : null,
          speedBytesPerSec: speed,
          etaSeconds:
            speed && bytesTotal && speed > 0
              ? Math.round((bytesTotal - bytesDownloaded) / speed)
              : null,
          timestamp: new Date().toISOString(),
        });
      }, 500);

      await new Promise<void>((resolve, reject) => {
        writeStream.on('error', reject);
        nodeStream.on('error', reject);
        nodeStream.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length;
        });
        nodeStream.pipe(writeStream);
        writeStream.on('finish', resolve);
      });

      clearInterval(progressInterval);
      progressInterval = null;

      getDb()
        .prepare(`UPDATE download_jobs SET bytes_downloaded = ?, bytes_total = ? WHERE id = ?`)
        .run(bytesDownloaded, bytesTotal ?? bytesDownloaded, jobId);

      // Checksum verification
      if (row.checksum) {
        await verifyFileChecksum(tmpPath, row.checksum_algo as ChecksumAlgorithm, row.checksum);
      }

      moveFile(tmpPath, row.file_path);

      const completedAt = new Date().toISOString();
      getDb()
        .prepare(
          `UPDATE download_jobs
           SET status = 'completed', completed_at = ?, bytes_downloaded = ?, bytes_total = ?
           WHERE id = ?`,
        )
        .run(completedAt, bytesDownloaded, bytesTotal ?? bytesDownloaded, jobId);

      getDb()
        .prepare(
          `UPDATE iso_versions
           SET status = 'active', download_completed_at = ?, checksum_verified = ?,
               file_size_bytes = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(completedAt, row.checksum ? 1 : 0, bytesDownloaded, completedAt, versionId);

      hub.broadcast({
        type: 'download.completed',
        jobId,
        versionId,
        definitionId,
        timestamp: completedAt,
      });

      logEvent('download.completed', 'iso_version', versionId, {
        jobId,
        bytesDownloaded,
        definitionId,
      });

      // Apply retention policy — lazy import avoids circular dependency
      void import('./retention').then(({ retentionService }) => {
        retentionService.applyRetention(definitionId);
      });
    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      deleteFile(tmpPath);

      if (controller.signal.aborted) {
        // cancel() already updated the DB — nothing more to do
        return;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      const db = getDb();
      const jobRow = db
        .prepare(`SELECT * FROM download_jobs WHERE id = ?`)
        .get(jobId) as DownloadJobRow;

      const isChecksumFailure = err instanceof ChecksumMismatchError;

      if (isChecksumFailure) {
        const now = new Date().toISOString();
        db.prepare(
          `UPDATE download_jobs SET status = 'failed', error_message = ? WHERE id = ?`,
        ).run(errorMessage, jobId);
        db.prepare(`UPDATE iso_versions SET status = 'corrupt', updated_at = ? WHERE id = ?`).run(
          now,
          versionId,
        );

        hub.broadcast({
          type: 'download.failed',
          jobId,
          versionId,
          errorCode: 'CHECKSUM_MISMATCH',
          errorMessage,
          timestamp: now,
        });
        logEvent('download.failed', 'iso_version', versionId, {
          jobId,
          reason: 'checksum_mismatch',
        });
      } else if (jobRow && jobRow.attempt_count < jobRow.max_attempts) {
        const delayMs = Math.min(
          config.downloads.retryBaseDelaySeconds * Math.pow(2, jobRow.attempt_count - 1) * 1000,
          600_000,
        );
        db.prepare(
          `UPDATE download_jobs SET status = 'queued', error_message = ? WHERE id = ?`,
        ).run(errorMessage, jobId);
        db.prepare(`UPDATE iso_versions SET status = 'pending', updated_at = ? WHERE id = ?`).run(
          new Date().toISOString(),
          versionId,
        );

        setTimeout(() => void this.tick(), delayMs);
      } else {
        const now = new Date().toISOString();
        db.prepare(
          `UPDATE download_jobs SET status = 'failed', error_message = ? WHERE id = ?`,
        ).run(errorMessage, jobId);
        db.prepare(`UPDATE iso_versions SET status = 'pending', updated_at = ? WHERE id = ?`).run(
          now,
          versionId,
        );

        hub.broadcast({
          type: 'download.failed',
          jobId,
          versionId,
          errorCode: 'DOWNLOAD_FAILED',
          errorMessage,
          timestamp: now,
        });
        logEvent('download.failed', 'iso_version', versionId, { jobId, errorMessage });
      }
    } finally {
      this.active.delete(jobId);
      void this.tick();
    }
  }

  cancel(jobId: string): void {
    const db = getDb();
    const job = db.prepare(`SELECT * FROM download_jobs WHERE id = ?`).get(jobId) as
      | DownloadJobRow
      | undefined;

    if (!job) throw new NotFoundError('DownloadJob', jobId);

    const terminal: string[] = ['completed', 'failed', 'cancelled'];
    if (terminal.includes(job.status)) return;

    const controller = this.active.get(jobId);
    if (controller) {
      controller.abort();
      this.active.delete(jobId);
    }

    db.prepare(`UPDATE download_jobs SET status = 'cancelled' WHERE id = ?`).run(jobId);
    deleteFile(partPath(jobId));
  }

  startPolling(): void {
    this.pollTimer = setInterval(() => void this.tick(), 2000);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

export const downloadManager = new DownloadManager();
