-- Migration 001: Initial schema
-- All tables and indexes for the HomeLab ISO Manager

-- ─── ISO Definitions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iso_definitions (
  id                      TEXT    PRIMARY KEY,
  name                    TEXT    NOT NULL,
  family                  TEXT    NOT NULL,
  architecture            TEXT    NOT NULL DEFAULT 'x86_64',
  description             TEXT,
  tags                    TEXT    NOT NULL DEFAULT '[]',          -- JSON array: ["server","lts"]
  source_url              TEXT,
  checksum_url            TEXT,
  checksum_algo           TEXT    NOT NULL DEFAULT 'sha256',      -- sha256 | sha512 | md5
  retention_count         INTEGER NOT NULL DEFAULT 5,
  retention_behavior      TEXT    NOT NULL DEFAULT 'archive',     -- archive | delete
  watch_enabled           INTEGER NOT NULL DEFAULT 0,             -- 0 | 1
  watch_strategy          TEXT,                                   -- rss | html_scrape | json_api | checksum | filename
  watch_config            TEXT,                                   -- JSON: strategy-specific config
  watch_interval_minutes  INTEGER NOT NULL DEFAULT 360,
  watch_last_checked_at   TEXT,
  watch_last_version_found TEXT,
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── ISO Versions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iso_versions (
  id                    TEXT    PRIMARY KEY,
  definition_id         TEXT    NOT NULL REFERENCES iso_definitions(id) ON DELETE CASCADE,
  version_string        TEXT    NOT NULL,
  release_date          TEXT,
  filename              TEXT    NOT NULL,
  file_path             TEXT    NOT NULL,
  file_size_bytes       INTEGER,
  checksum              TEXT,
  checksum_verified     INTEGER NOT NULL DEFAULT 0,              -- 0 | 1
  status                TEXT    NOT NULL DEFAULT 'pending',      -- pending | downloading | active | archived | corrupt | deleted
  source_url            TEXT    NOT NULL,
  download_started_at   TEXT,
  download_completed_at TEXT,
  archived_at           TEXT,
  notes                 TEXT,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Download Jobs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS download_jobs (
  id                TEXT    PRIMARY KEY,
  version_id        TEXT    NOT NULL REFERENCES iso_versions(id) ON DELETE CASCADE,
  status            TEXT    NOT NULL DEFAULT 'queued',           -- queued | running | paused | completed | failed | cancelled
  priority          INTEGER NOT NULL DEFAULT 5,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 3,
  bytes_downloaded  INTEGER NOT NULL DEFAULT 0,
  bytes_total       INTEGER,
  error_message     TEXT,
  started_at        TEXT,
  completed_at      TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Audit Log ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT    PRIMARY KEY,
  event_type  TEXT    NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  payload     TEXT,                                              -- JSON blob
  severity    TEXT    NOT NULL DEFAULT 'info',                  -- info | warn | error | critical
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Webhooks ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhooks (
  id              TEXT    PRIMARY KEY,
  url             TEXT    NOT NULL,
  secret          TEXT,
  events          TEXT    NOT NULL DEFAULT '[]',                -- JSON array of event types
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_fired_at   TEXT,
  last_status_code INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── App Settings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_iso_versions_definition
  ON iso_versions (definition_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iso_versions_status
  ON iso_versions (status);

CREATE INDEX IF NOT EXISTS idx_download_jobs_status
  ON download_jobs (status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_created
  ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iso_definitions_family
  ON iso_definitions (family);

-- ─── Seed default settings ────────────────────────────────────────────────────

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('max_concurrent_downloads', '3'),
  ('default_retention_count', '5'),
  ('default_retention_behavior', 'archive'),
  ('storage_alert_threshold_percent', '80'),
  ('log_retention_days', '30');
