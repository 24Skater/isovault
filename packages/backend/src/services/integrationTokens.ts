import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../db/client';
import type { IntegrationTokenRow } from '../db/schema';

const BCRYPT_ROUNDS = 10;
const PREFIX_LEN = 8; // non-secret lookup key stored in DB

// Cache: sha256(plaintext) → { tokenId, expiry }
const tokenCache = new Map<string, { tokenId: string; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface IntegrationToken {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface CreatedToken extends IntegrationToken {
  token: string; // plaintext — shown only once
}

function rowToToken(row: IntegrationTokenRow): IntegrationToken {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revoked: row.revoked === 1,
  };
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function evictCacheForToken(id: string): void {
  for (const [k, v] of tokenCache) {
    if (v.tokenId === id) {
      tokenCache.delete(k);
      break;
    }
  }
}

export async function createIntegrationToken(
  name: string,
  description?: string | null,
): Promise<CreatedToken> {
  const db = getDb();
  const id = crypto.randomUUID();
  const plain = crypto.randomBytes(32).toString('hex');
  const prefix = plain.slice(0, PREFIX_LEN);
  const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);

  db.prepare(
    `INSERT INTO integration_tokens (id, name, description, token_hash, token_prefix)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, name.trim(), description?.trim() ?? null, hash, prefix);

  const row = db
    .prepare('SELECT * FROM integration_tokens WHERE id = ?')
    .get(id) as IntegrationTokenRow;

  return { ...rowToToken(row), token: plain };
}

export function listIntegrationTokens(): IntegrationToken[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM integration_tokens ORDER BY created_at DESC')
    .all() as IntegrationTokenRow[];
  return rows.map(rowToToken);
}

export function revokeIntegrationToken(id: string): boolean {
  const db = getDb();
  const result = db
    .prepare('UPDATE integration_tokens SET revoked = 1 WHERE id = ? AND revoked = 0')
    .run(id);
  if (result.changes > 0) {
    evictCacheForToken(id);
  }
  return result.changes > 0;
}

export function deleteIntegrationToken(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM integration_tokens WHERE id = ?').run(id);
  if (result.changes > 0) {
    evictCacheForToken(id);
  }
  return result.changes > 0;
}

export async function verifyIntegrationToken(plain: string): Promise<boolean> {
  const now = Date.now();
  const cacheKey = sha256(plain);

  const cached = tokenCache.get(cacheKey);
  if (cached && now < cached.expiry) return true;

  const prefix = plain.slice(0, PREFIX_LEN);
  const db = getDb();

  // Use the prefix index to narrow to at most one candidate row
  const row = db
    .prepare('SELECT * FROM integration_tokens WHERE token_prefix = ? AND revoked = 0')
    .get(prefix) as IntegrationTokenRow | undefined;

  if (!row) return false;

  const match = await bcrypt.compare(plain, row.token_hash);
  if (!match) return false;

  db.prepare("UPDATE integration_tokens SET last_used_at = datetime('now') WHERE id = ?").run(
    row.id,
  );
  tokenCache.set(cacheKey, { tokenId: row.id, expiry: now + CACHE_TTL_MS });
  return true;
}
