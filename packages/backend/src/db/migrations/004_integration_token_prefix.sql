ALTER TABLE integration_tokens ADD COLUMN token_prefix TEXT;
CREATE INDEX IF NOT EXISTS idx_integration_tokens_prefix ON integration_tokens(token_prefix);
