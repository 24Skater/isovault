import type { PaginatedResponse } from './definitions';

// ─── Types (mirrored from backend) ────────────────────────────────────────────

export type DownloadJobStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadJob {
  id: string;
  versionId: string;
  status: DownloadJobStatus;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  bytesDownloaded: number;
  bytesTotal: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WsDownloadProgressEvent {
  type: 'download.progress';
  jobId: string;
  versionId: string;
  definitionId: string;
  bytesDownloaded: number;
  bytesTotal: number | null;
  percent: number | null;
  speedBytesPerSec: number | null;
  etaSeconds: number | null;
  timestamp: string;
}

export interface WsDownloadCompletedEvent {
  type: 'download.completed';
  jobId: string;
  versionId: string;
  definitionId: string;
  timestamp: string;
}

export interface WsDownloadFailedEvent {
  type: 'download.failed';
  jobId: string;
  versionId: string;
  errorCode: string;
  errorMessage: string;
  timestamp: string;
}

export interface WsVersionDetectedEvent {
  type: 'version.detected';
  definitionId: string;
  versionString: string;
  downloadUrl: string;
  timestamp: string;
}

export interface WsRetentionAppliedEvent {
  type: 'retention.applied';
  definitionId: string;
  behavior: 'archive' | 'delete';
  affectedVersionIds: string[];
  timestamp: string;
}

export type WsEvent =
  | WsDownloadProgressEvent
  | WsDownloadCompletedEvent
  | WsDownloadFailedEvent
  | WsVersionDetectedEvent
  | WsRetentionAppliedEvent;

// ─── API helpers ──────────────────────────────────────────────────────────────

import { request } from './client';

// ─── Downloads API ────────────────────────────────────────────────────────────

export async function fetchDownloadJobs(params: {
  status?: DownloadJobStatus;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedResponse<DownloadJob>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const q = qs.toString() ? `?${qs.toString()}` : '';
  return request<PaginatedResponse<DownloadJob>>(`/downloads${q}`);
}

export async function fetchDownloadJob(id: string): Promise<DownloadJob> {
  return request<DownloadJob>(`/downloads/${id}`);
}

export async function enqueueDownload(
  versionId: string,
  priority = 5,
): Promise<DownloadJob> {
  return request<DownloadJob>('/downloads', {
    method: 'POST',
    body: JSON.stringify({ versionId, priority }),
  });
}

export async function cancelDownload(id: string): Promise<void> {
  return request<void>(`/downloads/${id}`, { method: 'DELETE' });
}
