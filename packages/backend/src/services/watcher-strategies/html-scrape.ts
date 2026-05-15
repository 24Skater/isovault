import { JSDOM } from 'jsdom';
import { assertSafeUrl } from '../../utils/ssrf';
import { WatcherError } from '../../errors/base';
import type { WatchResult, HtmlScrapeWatchConfig } from '../../types';

export async function runHtmlScrapeStrategy(
  config: HtmlScrapeWatchConfig,
): Promise<WatchResult | null> {
  await assertSafeUrl(config.pageUrl);

  let html: string;
  try {
    const res = await fetch(config.pageUrl, {
      headers: { 'User-Agent': 'IsoVault/1.0' },
    });
    if (!res.ok) {
      throw new WatcherError(`HTML scrape fetch failed: HTTP ${res.status}`, config.pageUrl);
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof WatcherError) throw err;
    throw new WatcherError(`HTML scrape fetch error: ${(err as Error).message}`, config.pageUrl);
  }

  const dom = new JSDOM(html, { url: config.pageUrl });
  const document = dom.window.document;

  const versionEl = document.querySelector(config.versionSelector);
  if (!versionEl) return null;

  const rawText = versionEl.textContent?.trim() ?? '';
  const versionString = extractVersion(rawText, config.versionRegex);
  if (!versionString) return null;

  const linkEl = document.querySelector(config.downloadLinkSelector) as HTMLAnchorElement | null;
  if (!linkEl?.href) return null;

  // href is already resolved to absolute URL by JSDOM when url is set
  const downloadUrl = linkEl.href;
  await assertSafeUrl(downloadUrl);

  return { versionString, downloadUrl };
}

function extractVersion(text: string, pattern?: string): string | null {
  if (!text) return null;
  const regex = pattern ? new RegExp(pattern) : /(\d+\.\d+(?:\.\d+)*)/;
  const match = regex.exec(text);
  if (!match) return null;
  return match[1] ?? match[0];
}
