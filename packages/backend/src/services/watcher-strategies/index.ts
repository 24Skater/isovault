import { WatcherError } from '../../errors/base';
import type { WatchStrategy, WatchResult } from '../../types';
import type {
  RssWatchConfig,
  HtmlScrapeWatchConfig,
  JsonApiWatchConfig,
  ChecksumWatchConfig,
  FilenameWatchConfig,
} from '../../types';
import { runRssStrategy } from './rss';
import { runHtmlScrapeStrategy } from './html-scrape';
import { runJsonApiStrategy } from './json-api';
import { runChecksumStrategy } from './checksum';
import { runFilenameStrategy } from './filename';

export async function runStrategy(
  strategy: WatchStrategy,
  config: Record<string, unknown>,
  lastVersionFound: string | null,
): Promise<WatchResult | null> {
  switch (strategy) {
    case 'rss':
      return runRssStrategy(config as unknown as RssWatchConfig);
    case 'html_scrape':
      return runHtmlScrapeStrategy(config as unknown as HtmlScrapeWatchConfig);
    case 'json_api':
      return runJsonApiStrategy(config as unknown as JsonApiWatchConfig);
    case 'checksum':
      return runChecksumStrategy(config as unknown as ChecksumWatchConfig, lastVersionFound);
    case 'filename':
      return runFilenameStrategy(config as unknown as FilenameWatchConfig);
    default:
      throw new WatcherError(`Unknown watch strategy: ${String(strategy)}`, '');
  }
}

export {
  runRssStrategy,
  runHtmlScrapeStrategy,
  runJsonApiStrategy,
  runChecksumStrategy,
  runFilenameStrategy,
};
