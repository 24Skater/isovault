import { promises as dnsPromises, type LookupAddress } from 'dns';
import config from '../config';
import { SsrfBlockedError, ValidationError } from '../errors/base';

// ─── CIDR helpers ─────────────────────────────────────────────────────────────

function ipv4ToUint32(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

// Blocked IPv4 CIDR ranges
const BLOCKED_V4_CIDRS: [number, number][] = [
  [0x7f000000, 8], //  127.0.0.0/8    loopback
  [0x0a000000, 8], //  10.0.0.0/8     RFC 1918
  [0xac100000, 12], // 172.16.0.0/12  RFC 1918
  [0xc0a80000, 16], // 192.168.0.0/16 RFC 1918
  [0xa9fe0000, 16], // 169.254.0.0/16 link-local / cloud metadata
  [0x64400000, 10], // 100.64.0.0/10  CGNAT shared space
  [0x00000000, 8], //  0.0.0.0/8      this-network
];

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const n = ipv4ToUint32(ip);
  return BLOCKED_V4_CIDRS.some(([network, bits]) => {
    const mask = ((0xffffffff << (32 - bits)) >>> 0) as number;
    return (n & mask) === ((network >>> 0) & mask);
  });
}

function isBlockedIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (addr === '::1') return true; // loopback
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // ULA fc00::/7
  if (/^fe[89ab]/.test(addr)) return true; // link-local fe80::/10
  return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ValidationError(`Invalid URL: ${rawUrl}`, 'url', rawUrl);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(rawUrl);
  }

  if (!config.security.ssrfProtection) return;

  const hostname = parsed.hostname;

  // IP literals — skip DNS, check directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isBlockedIPv4(hostname)) throw new SsrfBlockedError(rawUrl);
    return;
  }
  if (hostname.includes(':')) {
    if (isBlockedIPv6(hostname)) throw new SsrfBlockedError(rawUrl);
    return;
  }

  // Hostname — resolve all addresses and check each one
  let addresses: LookupAddress[];
  try {
    addresses = await dnsPromises.lookup(hostname, { all: true });
  } catch {
    throw new SsrfBlockedError(rawUrl);
  }

  for (const { address, family } of addresses) {
    if (family === 4 && isBlockedIPv4(address)) throw new SsrfBlockedError(rawUrl);
    if (family === 6 && isBlockedIPv6(address)) throw new SsrfBlockedError(rawUrl);
  }
}
