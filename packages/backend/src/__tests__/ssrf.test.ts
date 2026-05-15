import { promises as dnsPromises } from 'dns';

// jest.mock is hoisted — use require() and process inside the factory
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storage: {
      path: require('path').join(require('os').tmpdir(), 'isovault-ssrf-test-' + process.pid),
      alertThresholdPercent: 80,
    },
    security: { ssrfProtection: true, maxRedirects: 5 },
    retention: { defaultCount: 5, defaultBehavior: 'archive' },
    logging: { level: 'silent', retentionDays: 30 },
    server: { port: 3721, host: '0.0.0.0', corsOrigins: [] },
    database: { path: ':memory:' },
    downloads: {
      maxConcurrent: 3,
      retryMaxAttempts: 3,
      retryBaseDelaySeconds: 30,
      timeoutSeconds: 3600,
    },
    scheduler: {
      watcherCheckIntervalCron: '0 * * * *',
      dbBackupCron: '0 2 * * *',
      cleanupCron: '0 3 * * *',
    },
  },
}));

import { assertSafeUrl } from '../utils/ssrf';
import { SsrfBlockedError, ValidationError } from '../errors/base';

// ─── helpers ──────────────────────────────────────────────────────────────────

function mockDns(address: string, family: 4 | 6 = 4): void {
  jest
    .spyOn(dnsPromises, 'lookup')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockResolvedValueOnce([{ address, family }] as any);
}

afterEach(() => jest.restoreAllMocks());

// ─── valid URLs ───────────────────────────────────────────────────────────────

describe('assertSafeUrl — valid URLs', () => {
  it('allows a public IPv4 address (1.1.1.1)', async () => {
    mockDns('1.1.1.1', 4);
    await expect(assertSafeUrl('https://example.com/file.iso')).resolves.toBeUndefined();
  });

  it('allows a public IPv4 literal in the URL', async () => {
    await expect(assertSafeUrl('https://1.1.1.1/file.iso')).resolves.toBeUndefined();
  });
});

// ─── blocked private ranges ───────────────────────────────────────────────────

describe('assertSafeUrl — blocked private IPv4 ranges', () => {
  it('blocks 127.0.0.1 (loopback)', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/file.iso')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 10.0.0.1 (RFC 1918)', async () => {
    await expect(assertSafeUrl('http://10.0.0.1/file.iso')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 172.16.0.1 (RFC 1918)', async () => {
    await expect(assertSafeUrl('http://172.16.0.1/file.iso')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 192.168.1.100 (RFC 1918)', async () => {
    await expect(assertSafeUrl('http://192.168.1.100/file.iso')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks 169.254.169.254 (cloud metadata)', async () => {
    await expect(assertSafeUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it('blocks hostname that resolves to a private IP', async () => {
    mockDns('10.0.0.5', 4);
    await expect(assertSafeUrl('https://internal.corp/file.iso')).rejects.toThrow(SsrfBlockedError);
  });
});

// ─── blocked IPv6 ranges ──────────────────────────────────────────────────────

describe('assertSafeUrl — blocked IPv6', () => {
  it('blocks ::1 (IPv6 loopback)', async () => {
    await expect(assertSafeUrl('http://[::1]/file.iso')).rejects.toThrow(SsrfBlockedError);
  });
});

// ─── invalid inputs ───────────────────────────────────────────────────────────

describe('assertSafeUrl — invalid inputs', () => {
  it('throws ValidationError for a malformed URL', async () => {
    await expect(assertSafeUrl('not a url')).rejects.toThrow(ValidationError);
  });

  it('blocks non-http schemes (ftp://)', async () => {
    await expect(assertSafeUrl('ftp://example.com/file.iso')).rejects.toThrow(SsrfBlockedError);
  });

  it('blocks non-http schemes (file://)', async () => {
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toThrow(SsrfBlockedError);
  });
});
