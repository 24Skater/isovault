// ─── ISO Status ───────────────────────────────────────────────────────────────

export type IsoStatus = 'pending' | 'downloading' | 'active' | 'archived' | 'corrupt' | 'deleted';

export type DownloadJobStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type RetentionBehavior = 'archive' | 'delete';

export type WatchStrategy = 'rss' | 'html_scrape' | 'json_api' | 'checksum' | 'filename';

export type ChecksumAlgorithm = 'sha256' | 'sha512' | 'md5';

export type AuditSeverity = 'info' | 'warn' | 'error' | 'critical';

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface IsoDefinition {
  id: string;
  name: string;
  family: string;
  architecture: string;
  description: string | null;
  tags: string[]; // stored as JSON in DB
  sourceUrl: string | null;
  checksumUrl: string | null;
  checksumAlgo: ChecksumAlgorithm;
  retentionCount: number;
  retentionBehavior: RetentionBehavior;
  watchEnabled: boolean;
  watchStrategy: WatchStrategy | null;
  watchConfig: Record<string, unknown> | null; // stored as JSON in DB
  watchIntervalMinutes: number;
  watchLastCheckedAt: string | null;
  watchLastVersionFound: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IsoVersion {
  id: string;
  definitionId: string;
  versionString: string;
  releaseDate: string | null;
  filename: string;
  filePath: string;
  fileSizeBytes: number | null;
  checksum: string | null;
  checksumVerified: boolean;
  status: IsoStatus;
  sourceUrl: string;
  downloadStartedAt: string | null;
  downloadCompletedAt: string | null;
  archivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface AuditLogEntry {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null; // stored as JSON in DB
  severity: AuditSeverity;
  createdAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  secret: string | null;
  events: string[]; // stored as JSON in DB
  enabled: boolean;
  lastFiredAt: string | null;
  lastStatusCode: number | null;
  createdAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

// ─── API Request/Response types ───────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  requestId: string;
}

// ─── WebSocket event types ────────────────────────────────────────────────────

export type WsEventType =
  | 'download.progress'
  | 'download.completed'
  | 'download.failed'
  | 'download.cancelled'
  | 'version.detected'
  | 'integrity.failed'
  | 'retention.applied';

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

export type WsEvent = WsDownloadProgressEvent | WsDownloadCompletedEvent | WsDownloadFailedEvent;
