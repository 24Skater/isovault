CREATE TABLE IF NOT EXISTS integration_tokens (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  token_hash  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  revoked     INTEGER NOT NULL DEFAULT 0
);
