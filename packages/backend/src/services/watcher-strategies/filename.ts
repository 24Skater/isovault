import { JSDOM } from 'jsdom';
import { assertSafeUrl } from '../../utils/ssrf';
import { WatcherError } from '../../errors/base';
import type { WatchResult, FilenameWatchConfig } from '../../types';

export async function runFilenameStrategy(
  config: FilenameWatchConfig,
): Promise<WatchResult | null> {
  await assertSafeUrl(config.indexUrl);

  let html: string;
  try {
    const res = await fetch(config.indexUrl, {
      headers: { 'User-Agent': 'IsoVault/1.0' },
    });
    if (!res.ok) {
      throw new WatcherError(`Filename index fetch failed: HTTP ${res.status}`, config.indexUrl);
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof WatcherError) throw err;
    throw new WatcherError(
      `Filename index fetch error: ${(err as Error).message}`,
      config.indexUrl,
    );
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];

  const regex = new RegExp(config.filenameRegex);
  const matches: string[] = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href') ?? '';
    const match = regex.exec(href);
    if (match?.groups?.['version']) {
      matches.push(match.groups['version']);
    }
  }

  if (!matches.length) return null;

  // Take the last match (assumed to be the newest lexicographically)
  const versionString = matches[matches.length - 1];
  const downloadUrl = config.downloadUrlTemplate.replace('{version}', versionString);

  await assertSafeUrl(downloadUrl);

  return { versionString, downloadUrl };
}
