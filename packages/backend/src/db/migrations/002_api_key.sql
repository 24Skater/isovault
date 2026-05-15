-- Migration 002: API key authentication
-- The api_key_hash entry in the settings table is managed by services/auth.ts.
-- It is intentionally excluded from ALLOWED_KEYS in routes/settings.ts
-- and must not be patched via the settings API.
-- No DDL changes required; the settings table already exists.
SELECT 1;
