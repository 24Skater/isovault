import { assertSafeUrl } from '../../utils/ssrf';
import { WatcherError } from '../../errors/base';
import type { WatchResult, JsonApiWatchConfig } from '../../types';

export async function runJsonApiStrategy(config: JsonApiWatchConfig): Promise<WatchResult | null> {
  await assertSafeUrl(config.apiUrl);

  let json: unknown;
  try {
    const res = await fetch(config.apiUrl, {
      headers: {
        'User-Agent': 'IsoVault/1.0',
        Accept: 'application/json',
        ...config.headers,
      },
    });
    if (!res.ok) {
      throw new WatcherError(`JSON API fetch failed: HTTP ${res.status}`, config.apiUrl);
    }
    json = await res.json();
  } catch (err) {
    if (err instanceof WatcherError) throw err;
    throw new WatcherError(`JSON API fetch error: ${(err as Error).message}`, config.apiUrl);
  }

  const rawVersion = getNestedValue(json, config.versionPath);
  const rawUrl = getNestedValue(json, config.downloadUrlPath);

  if (rawVersion === undefined || rawVersion === null) return null;
  if (rawUrl === undefined || rawUrl === null) return null;

  const versionString = String(rawVersion);
  const downloadUrl = String(rawUrl);

  await assertSafeUrl(downloadUrl);

  return { versionString, downloadUrl };
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const index = Number(part);
    if (!Number.isNaN(index) && Array.isArray(current)) {
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}
