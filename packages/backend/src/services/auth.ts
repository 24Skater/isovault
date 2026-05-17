import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getSetting, setSetting } from './settings';

const BCRYPT_ROUNDS = 12;
const API_KEY_SETTING = 'api_key_hash';

// In-memory cache for the verified token to avoid bcrypt on every request.
let cachedTokenHash: string | null = null;
let cacheExpiry = 0;

export async function initApiKey(): Promise<void> {
  const existing = getSetting(API_KEY_SETTING);
  if (existing) return;

  const envKey = process.env['ISO_MANAGER_API_KEY'] || undefined;
  const plainKey = envKey ?? crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(plainKey, BCRYPT_ROUNDS);
  setSetting(API_KEY_SETTING, hash);

  // Only print the auto-generated key — operator-supplied keys are already known.
  if (!envKey) {
    console.log(`[auth] API key (save this — shown once): ${plainKey}`);
  }
}

export async function verifyApiKey(plainKey: string): Promise<boolean> {
  const now = Date.now();
  const tokenHash = crypto.createHash('sha256').update(plainKey).digest('hex');

  if (cachedTokenHash === tokenHash && now < cacheExpiry) return true;

  const hash = getSetting(API_KEY_SETTING);
  if (!hash) return false;

  const valid = await bcrypt.compare(plainKey, hash);
  if (valid) {
    cachedTokenHash = tokenHash;
    cacheExpiry = now + 5 * 60 * 1000; // 5-minute cache
  }
  return valid;
}
