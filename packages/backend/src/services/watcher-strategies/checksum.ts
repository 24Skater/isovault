import { assertSafeUrl } from '../../utils/ssrf';
import { WatcherError } from '../../errors/base';
import type { WatchResult, ChecksumWatchConfig } from '../../types';

export async function runChecksumStrategy(
  config: ChecksumWatchConfig,
  lastVersionFound: string | null,
): Promise<WatchResult | null> {
  await assertSafeUrl(config.checksumUrl);

  let body: string;
  try {
    const res = await fetch(config.checksumUrl, {
      headers: { 'User-Agent': 'IsoVault/1.0' },
    });
    if (!res.ok) {
      throw new WatcherError(`Checksum fetch failed: HTTP ${res.status}`, config.checksumUrl);
    }
    body = await res.text();
  } catch (err) {
    if (err instanceof WatcherError) throw err;
    throw new WatcherError(`Checksum fetch error: ${(err as Error).message}`, config.checksumUrl);
  }

  // Extract the first hex token from the file (handles "hash  filename" format)
  const hexMatch = /^([0-9a-fA-F]{32,128})/m.exec(body.trim());
  if (!hexMatch) {
    throw new WatcherError('Could not parse checksum from response', config.checksumUrl);
  }

  const newChecksum = hexMatch[1].toLowerCase();

  // No change detected
  if (lastVersionFound && newChecksum === lastVersionFound.toLowerCase()) {
    return null;
  }

  return {
    versionString: newChecksum.slice(0, 12),
    downloadUrl: config.downloadUrl,
    checksum: newChecksum,
  };
}
