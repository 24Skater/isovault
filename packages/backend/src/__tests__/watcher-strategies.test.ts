// jsdom v25+ has fully-ESM dependencies that ts-jest cannot transform in CJS mode.
// We mock the module here with a minimal DOM implementation that covers the
// subset of the API used by html-scrape.ts and filename.ts.
jest.mock('jsdom', () => {
  class MockDocument {
    private readonly html: string;
    private readonly base: string;

    constructor(html: string, base: string) {
      this.html = html;
      this.base = base;
    }

    querySelector(selector: string): { textContent: string; href: string } | null {
      if (!selector.startsWith('#')) return null;
      const id = selector.slice(1);

      // Match any opening tag that carries id="<id>" and capture inner text
      const tagRe = new RegExp(`<([\\w-]+)[^>]+id=["']${id}["'][^>]*>([^<]*)`, 'i');
      const tagMatch = tagRe.exec(this.html);
      if (!tagMatch) return null;
      const tag = tagMatch[1] ?? '';
      const textContent = tagMatch[2]?.trim() ?? '';

      // Look for href on the same element (href before or after the id attr)
      const hrefRe = new RegExp(
        `<${tag}[^>]+id=["']${id}["'][^>]*href=["']([^"']*)["']` +
          `|<${tag}[^>]+href=["']([^"']*)["'][^>]*id=["']${id}["']`,
        'i',
      );
      const hrefMatch = hrefRe.exec(this.html);
      const rawHref = hrefMatch?.[1] ?? hrefMatch?.[2] ?? '';
      const href = rawHref && this.base ? new URL(rawHref, this.base).href : rawHref;

      return { textContent, href };
    }

    querySelectorAll(selector: string): { getAttribute(attr: string): string | null }[] {
      if (selector !== 'a[href]') return [];
      const re = /<a\s[^>]*href=["']([^"']*)["'][^>]*>/gi;
      const out: { getAttribute(attr: string): string | null }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(this.html)) !== null) {
        const href = m[1] ?? '';
        out.push({ getAttribute: (attr: string) => (attr === 'href' ? href : null) });
      }
      return out;
    }
  }

  return {
    JSDOM: class {
      window: { document: MockDocument };
      constructor(html: string, options?: { url?: string }) {
        this.window = { document: new MockDocument(html, options?.url ?? '') };
      }
    },
  };
});

jest.mock('../utils/ssrf', () => ({ assertSafeUrl: jest.fn().mockResolvedValue(undefined) }));

import { runRssStrategy } from '../services/watcher-strategies/rss';
import { runHtmlScrapeStrategy } from '../services/watcher-strategies/html-scrape';
import { runJsonApiStrategy } from '../services/watcher-strategies/json-api';
import { runChecksumStrategy } from '../services/watcher-strategies/checksum';
import { runFilenameStrategy } from '../services/watcher-strategies/filename';
import { WatcherError } from '../errors/base';

const { assertSafeUrl } = jest.requireMock('../utils/ssrf') as { assertSafeUrl: jest.Mock };

function mockFetch(body: string, status = 200): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── RSS strategy ────────────────────────────────────────────────────────────

describe('runRssStrategy', () => {
  const rss2Feed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Ubuntu 24.04.1 LTS Release</title>
      <enclosure url="https://releases.ubuntu.com/24.04.1/ubuntu-24.04.1-desktop-amd64.iso" />
    </item>
  </channel>
</rss>`;

  const atomFeed = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Debian 12.5</title>
    <link rel="alternate" href="https://cdimage.debian.org/debian-cd/12.5.0/amd64/iso-cd/debian-12.5.0-amd64-netinst.iso"/>
  </entry>
</feed>`;

  it('extracts version and URL from RSS 2.0 feed with enclosure', async () => {
    mockFetch(rss2Feed);
    const result = await runRssStrategy({ feedUrl: 'https://example.com/feed.rss' });
    expect(result).not.toBeNull();
    expect(result?.versionString).toBe('24.04.1');
    expect(result?.downloadUrl).toBe(
      'https://releases.ubuntu.com/24.04.1/ubuntu-24.04.1-desktop-amd64.iso',
    );
  });

  it('extracts version and URL from Atom feed', async () => {
    mockFetch(atomFeed);
    const result = await runRssStrategy({ feedUrl: 'https://example.com/feed.atom' });
    expect(result).not.toBeNull();
    expect(result?.versionString).toBe('12.5');
    expect(result?.downloadUrl).toContain('debian-12.5.0');
  });

  it('applies custom versionRegex', async () => {
    mockFetch(rss2Feed);
    const result = await runRssStrategy({
      feedUrl: 'https://example.com/feed.rss',
      versionRegex: '(\\d+\\.\\d+)',
    });
    expect(result?.versionString).toBe('24.04');
  });

  it('returns null when feed has no items', async () => {
    mockFetch(`<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`);
    const result = await runRssStrategy({ feedUrl: 'https://example.com/feed.rss' });
    expect(result).toBeNull();
  });

  it('throws WatcherError on HTTP error', async () => {
    mockFetch('Not Found', 404);
    await expect(runRssStrategy({ feedUrl: 'https://example.com/feed.rss' })).rejects.toThrow(
      WatcherError,
    );
  });

  it('calls assertSafeUrl on feedUrl', async () => {
    mockFetch(rss2Feed);
    await runRssStrategy({ feedUrl: 'https://example.com/feed.rss' });
    expect(assertSafeUrl).toHaveBeenCalledWith('https://example.com/feed.rss');
  });
});

// ─── HTML scrape strategy ─────────────────────────────────────────────────────

describe('runHtmlScrapeStrategy', () => {
  const html = `<!DOCTYPE html>
<html>
  <body>
    <span id="version">Ubuntu 22.04.3 LTS</span>
    <a id="download" href="/22.04.3/ubuntu-22.04.3-desktop-amd64.iso">Download</a>
  </body>
</html>`;

  it('extracts version and absolute URL from HTML page', async () => {
    mockFetch(html);
    const result = await runHtmlScrapeStrategy({
      pageUrl: 'https://releases.ubuntu.com',
      versionSelector: '#version',
      downloadLinkSelector: '#download',
    });
    expect(result).not.toBeNull();
    expect(result?.versionString).toBe('22.04.3');
    expect(result?.downloadUrl).toContain('ubuntu-22.04.3-desktop-amd64.iso');
  });

  it('applies custom versionRegex', async () => {
    mockFetch(html);
    const result = await runHtmlScrapeStrategy({
      pageUrl: 'https://releases.ubuntu.com',
      versionSelector: '#version',
      downloadLinkSelector: '#download',
      versionRegex: '(\\d+\\.\\d+)',
    });
    expect(result?.versionString).toBe('22.04');
  });

  it('returns null when version selector matches nothing', async () => {
    mockFetch(html);
    const result = await runHtmlScrapeStrategy({
      pageUrl: 'https://releases.ubuntu.com',
      versionSelector: '#nonexistent',
      downloadLinkSelector: '#download',
    });
    expect(result).toBeNull();
  });

  it('throws WatcherError on HTTP error', async () => {
    mockFetch('', 500);
    await expect(
      runHtmlScrapeStrategy({
        pageUrl: 'https://example.com',
        versionSelector: '#v',
        downloadLinkSelector: '#dl',
      }),
    ).rejects.toThrow(WatcherError);
  });
});

// ─── JSON API strategy ────────────────────────────────────────────────────────

describe('runJsonApiStrategy', () => {
  it('extracts version and URL from flat JSON', async () => {
    mockFetch(
      JSON.stringify({
        tag_name: 'v2.0.1',
        browser_download_url: 'https://example.com/release.iso',
      }),
    );
    const result = await runJsonApiStrategy({
      apiUrl: 'https://api.example.com/releases/latest',
      versionPath: 'tag_name',
      downloadUrlPath: 'browser_download_url',
    });
    expect(result?.versionString).toBe('v2.0.1');
    expect(result?.downloadUrl).toBe('https://example.com/release.iso');
  });

  it('extracts version and URL from nested JSON using dot-path', async () => {
    mockFetch(
      JSON.stringify({
        release: { version: '5.0.0', assets: [{ url: 'https://example.com/v5.iso' }] },
      }),
    );
    const result = await runJsonApiStrategy({
      apiUrl: 'https://api.example.com/releases/latest',
      versionPath: 'release.version',
      downloadUrlPath: 'release.assets.0.url',
    });
    expect(result?.versionString).toBe('5.0.0');
    expect(result?.downloadUrl).toBe('https://example.com/v5.iso');
  });

  it('returns null when versionPath does not exist', async () => {
    mockFetch(JSON.stringify({ other: 'data' }));
    const result = await runJsonApiStrategy({
      apiUrl: 'https://api.example.com/releases/latest',
      versionPath: 'tag_name',
      downloadUrlPath: 'browser_download_url',
    });
    expect(result).toBeNull();
  });

  it('calls assertSafeUrl on apiUrl and downloadUrl', async () => {
    const dlUrl = 'https://example.com/file.iso';
    mockFetch(JSON.stringify({ tag: '1.0', url: dlUrl }));
    await runJsonApiStrategy({
      apiUrl: 'https://api.example.com/releases/latest',
      versionPath: 'tag',
      downloadUrlPath: 'url',
    });
    expect(assertSafeUrl).toHaveBeenCalledWith('https://api.example.com/releases/latest');
    expect(assertSafeUrl).toHaveBeenCalledWith(dlUrl);
  });

  it('throws WatcherError on HTTP error', async () => {
    mockFetch('{}', 403);
    await expect(
      runJsonApiStrategy({
        apiUrl: 'https://api.example.com/releases/latest',
        versionPath: 'tag',
        downloadUrlPath: 'url',
      }),
    ).rejects.toThrow(WatcherError);
  });
});

// ─── Checksum strategy ────────────────────────────────────────────────────────

describe('runChecksumStrategy', () => {
  const checksum = 'a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3';
  const checksumFile = `${checksum}  ubuntu-24.04-desktop-amd64.iso`;

  it('returns new version when checksum differs from last', async () => {
    mockFetch(checksumFile);
    const result = await runChecksumStrategy(
      {
        checksumUrl: 'https://example.com/SHA256SUMS',
        downloadUrl: 'https://example.com/file.iso',
        algorithm: 'sha256',
      },
      null,
    );
    expect(result).not.toBeNull();
    expect(result?.checksum).toBe(checksum);
    expect(result?.versionString).toBe(checksum.slice(0, 12));
    expect(result?.downloadUrl).toBe('https://example.com/file.iso');
  });

  it('returns null when checksum matches lastVersionFound', async () => {
    mockFetch(checksumFile);
    const result = await runChecksumStrategy(
      {
        checksumUrl: 'https://example.com/SHA256SUMS',
        downloadUrl: 'https://example.com/file.iso',
        algorithm: 'sha256',
      },
      checksum,
    );
    expect(result).toBeNull();
  });

  it('is case-insensitive for checksum comparison', async () => {
    mockFetch(checksumFile);
    const result = await runChecksumStrategy(
      {
        checksumUrl: 'https://example.com/SHA256SUMS',
        downloadUrl: 'https://example.com/file.iso',
        algorithm: 'sha256',
      },
      checksum.toUpperCase(),
    );
    expect(result).toBeNull();
  });

  it('throws WatcherError when response contains no hex token', async () => {
    mockFetch('no checksum here');
    await expect(
      runChecksumStrategy(
        {
          checksumUrl: 'https://example.com/SHA256SUMS',
          downloadUrl: 'https://example.com/file.iso',
          algorithm: 'sha256',
        },
        null,
      ),
    ).rejects.toThrow(WatcherError);
  });

  it('throws WatcherError on HTTP error', async () => {
    mockFetch('', 404);
    await expect(
      runChecksumStrategy(
        {
          checksumUrl: 'https://example.com/SHA256SUMS',
          downloadUrl: 'https://example.com/file.iso',
          algorithm: 'sha256',
        },
        null,
      ),
    ).rejects.toThrow(WatcherError);
  });
});

// ─── Filename strategy ────────────────────────────────────────────────────────

describe('runFilenameStrategy', () => {
  const html = `<!DOCTYPE html>
<html>
  <body>
    <a href="ubuntu-22.04.0-desktop-amd64.iso">22.04.0</a>
    <a href="ubuntu-22.04.1-desktop-amd64.iso">22.04.1</a>
    <a href="ubuntu-22.04.3-desktop-amd64.iso">22.04.3</a>
  </body>
</html>`;

  it('picks the last matching filename and builds download URL', async () => {
    mockFetch(html);
    const result = await runFilenameStrategy({
      indexUrl: 'https://releases.ubuntu.com/',
      filenameRegex: 'ubuntu-(?<version>\\d+\\.\\d+\\.\\d+)-desktop-amd64\\.iso',
      downloadUrlTemplate:
        'https://releases.ubuntu.com/{version}/ubuntu-{version}-desktop-amd64.iso',
    });
    expect(result).not.toBeNull();
    expect(result?.versionString).toBe('22.04.3');
    expect(result?.downloadUrl).toContain('22.04.3');
  });

  it('returns null when no anchors match the regex', async () => {
    mockFetch(`<html><body><a href="somefile.txt">txt</a></body></html>`);
    const result = await runFilenameStrategy({
      indexUrl: 'https://releases.ubuntu.com/',
      filenameRegex: 'ubuntu-(?<version>\\d+\\.\\d+\\.\\d+)-desktop-amd64\\.iso',
      downloadUrlTemplate:
        'https://releases.ubuntu.com/{version}/ubuntu-{version}-desktop-amd64.iso',
    });
    expect(result).toBeNull();
  });

  it('throws WatcherError on HTTP error', async () => {
    mockFetch('', 503);
    await expect(
      runFilenameStrategy({
        indexUrl: 'https://releases.ubuntu.com/',
        filenameRegex: 'ubuntu-(?<version>\\d+)-amd64\\.iso',
        downloadUrlTemplate: 'https://example.com/{version}.iso',
      }),
    ).rejects.toThrow(WatcherError);
  });

  it('calls assertSafeUrl on indexUrl and resolved downloadUrl', async () => {
    mockFetch(html);
    await runFilenameStrategy({
      indexUrl: 'https://releases.ubuntu.com/',
      filenameRegex: 'ubuntu-(?<version>\\d+\\.\\d+\\.\\d+)-desktop-amd64\\.iso',
      downloadUrlTemplate:
        'https://releases.ubuntu.com/{version}/ubuntu-{version}-desktop-amd64.iso',
    });
    expect(assertSafeUrl).toHaveBeenCalledWith('https://releases.ubuntu.com/');
    expect(assertSafeUrl).toHaveBeenCalledWith(expect.stringContaining('22.04.3'));
  });
});
