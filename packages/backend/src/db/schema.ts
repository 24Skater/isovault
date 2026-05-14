/**
 * Raw DB row types — these mirror the SQLite column layout exactly.
 * Numeric booleans (0/1) and JSON strings are NOT yet parsed here.
 * Use the mapper functions below to convert to domain types.
 */

export interface IsoDefinitionRow {
  id: string;
  name: string;
  family: string;
  architecture: string;
  description: string | null;
  tags: string; // JSON array
  source_url: string | null;
  checksum_url: string | null;
  checksum_algo: string;
  retention_count: number;
  retention_behavior: string;
  watch_enabled: number; // 0 | 1
  watch_strategy: string | null;
  watch_config: string | null; // JSON object
  watch_interval_minutes: number;
  watch_last_checked_at: string | null;
  watch_last_version_found: string | null;
  created_at: string;
  updated_at: string;
}

export interface IsoVersionRow {
  id: string;
  definition_id: string;
  version_string: string;
  release_date: string | null;
  filename: string;
  file_path: string;
  file_size_bytes: number | null;
  checksum: string | null;
  checksum_verified: number; // 0 | 1
  status: string;
  source_url: string;
  download_started_at: string | null;
  download_completed_at: string | null;
  archived_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DownloadJobRow {
  id: string;
  version_id: string;
  status: string;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  bytes_downloaded: number;
  bytes_total: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: string | null; // JSON object
  severity: string;
  created_at: string;
}

export interface WebhookRow {
  id: string;
  url: string;
  secret: string | null;
  events: string; // JSON array
  enabled: number; // 0 | 1
  last_fired_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface MigrationRow {
  id: number;
  name: string;
  applied_at: string;
}
