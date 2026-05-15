import { parseStringPromise } from 'xml2js';
import { assertSafeUrl } from '../../utils/ssrf';
import { WatcherError } from '../../errors/base';
import type { WatchResult, RssWatchConfig } from '../../types';

export async function runRssStrategy(config: RssWatchConfig): Promise<WatchResult | null> {
  await assertSafeUrl(config.feedUrl);

  let body: string;
  try {
    const res = await fetch(config.feedUrl, {
      headers: { 'User-Agent': 'IsoVault/1.0' },
    });
    if (!res.ok) {
      throw new WatcherError(`RSS fetch failed: HTTP ${res.status}`, config.feedUrl);
    }
    body = await res.text();
  } catch (err) {
    if (err instanceof WatcherError) throw err;
    throw new WatcherError(`RSS fetch error: ${(err as Error).message}`, config.feedUrl);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = (await parseStringPromise(body, { explicitArray: true })) as Record<string, unknown>;
  } catch (err) {
    throw new WatcherError(`RSS parse error: ${(err as Error).message}`, config.feedUrl);
  }

  // Support both RSS 2.0 and Atom
  const items = extractItems(parsed);
  if (!items.length) return null;

  const first = items[0];
  const rawTitle = first.title ?? '';
  const downloadUrl = first.url ?? '';

  if (!downloadUrl) return null;

  const versionString = extractVersion(rawTitle, config.versionRegex);
  if (!versionString) return null;

  return { versionString, downloadUrl };
}

function extractItems(parsed: Record<string, unknown>): { title: string; url: string }[] {
  // RSS 2.0: rss.channel[0].item[]
  const rss = parsed['rss'] as Record<string, unknown> | undefined;
  if (rss) {
    const channels = rss['channel'] as Record<string, unknown>[] | undefined;
    const items = channels?.[0]?.['item'] as Record<string, unknown>[] | undefined;
    if (items?.length) {
      return items.map((item) => ({
        title: String((item['title'] as string[])?.[0] ?? ''),
        url: extractRssItemUrl(item),
      }));
    }
  }

  // Atom: feed.entry[]
  const feed = parsed['feed'] as Record<string, unknown> | undefined;
  if (feed) {
    const entries = feed['entry'] as Record<string, unknown>[] | undefined;
    if (entries?.length) {
      return entries.map((entry) => ({
        title: String(
          (entry['title'] as ({ _: string } | string)[])?.[0]?.[
            '_' as keyof (typeof entry)['title']
          ] ??
            (entry['title'] as string[])?.[0] ??
            '',
        ),
        url: extractAtomEntryUrl(entry),
      }));
    }
  }

  return [];
}

function extractRssItemUrl(item: Record<string, unknown>): string {
  // Prefer <enclosure url="...">
  const enclosures = item['enclosure'] as { $: { url: string } }[] | undefined;
  if (enclosures?.[0]?.['$']?.url) return enclosures[0]['$'].url;
  // Fallback to <link>
  const link = item['link'] as string[] | undefined;
  return link?.[0] ?? '';
}

function extractAtomEntryUrl(entry: Record<string, unknown>): string {
  const links = entry['link'] as { $: { href: string; rel?: string } }[] | undefined;
  if (!links?.length) return '';
  const alternate = links.find((l) => !l['$'].rel || l['$'].rel === 'alternate');
  return alternate?.['$'].href ?? links[0]['$'].href ?? '';
}

function extractVersion(text: string, pattern?: string): string | null {
  if (!text) return null;
  const regex = pattern ? new RegExp(pattern) : /(\d+\.\d+(?:\.\d+)*)/;
  const match = regex.exec(text);
  if (!match) return null;
  return match[1] ?? match[0];
}
