/**
 * Standalone screenshot script for IsoVault README.
 * Starts the backend with a fixed API key, seeds demo data,
 * and captures screenshots via Playwright with auth header injection.
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import os from 'os';

const PORT    = 3721;
const BASE    = `http://localhost:${PORT}`;
const API_KEY = 'readme-screenshot-key';
const DOCS    = resolve(process.cwd(), '../../docs');
const DB      = join(os.tmpdir(), `isovault-ss-${Date.now()}.sqlite3`);
const STORE   = join(os.tmpdir(), `isovault-ss-store-${Date.now()}`);

mkdirSync(DOCS, { recursive: true });
mkdirSync(STORE, { recursive: true });

// ── Start backend ─────────────────────────────────────────────────────────────
console.log('Starting backend...');
const server = spawn(
  'node',
  [resolve(process.cwd(), '../../packages/backend/dist/server.js')],
  {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      ISO_MANAGER_DB_PATH: DB,
      ISO_STORE_PATH: STORE,
      ISO_MANAGER_LOG_LEVEL: 'error',
      ISO_MANAGER_API_KEY: API_KEY,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

server.stderr.on('data', (d) => {
  const msg = d.toString();
  if (!msg.includes('"level":20')) process.stderr.write(msg); // suppress debug
});

// Wait until /health responds
let ready = false;
for (let i = 0; i < 20; i++) {
  await sleep(500);
  try {
    const r = await fetch(`${BASE}/health`);
    if (r.ok) { ready = true; break; }
  } catch {}
}
if (!ready) { console.error('Server did not start'); server.kill(); process.exit(1); }
console.log('Backend ready.');

// ── Seed demo data ────────────────────────────────────────────────────────────
const H = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

const definitions = [
  {
    name: 'Ubuntu 24.04 LTS', family: 'ubuntu', architecture: 'x86_64',
    checksumAlgo: 'sha256', retentionCount: 3, retentionBehavior: 'archive',
    watchEnabled: true, watchStrategy: 'html_scrape', watchIntervalMinutes: 1440,
    watchConfig: { pageUrl: 'https://releases.ubuntu.com/noble/', versionSelector: 'h1', downloadLinkSelector: 'a[href$=".iso"]' },
    tags: ['linux', 'debian-based'],
  },
  {
    name: 'Fedora Workstation 40', family: 'fedora', architecture: 'x86_64',
    checksumAlgo: 'sha256', retentionCount: 2, retentionBehavior: 'delete',
    watchEnabled: true, watchStrategy: 'rss', watchIntervalMinutes: 720,
    watchConfig: { feedUrl: 'https://fedoramagazine.org/feed/' },
    tags: ['linux', 'rpm-based'],
  },
  {
    name: 'Debian 12 Bookworm', family: 'debian', architecture: 'x86_64',
    checksumAlgo: 'sha512', retentionCount: 5, retentionBehavior: 'archive',
    watchEnabled: false, watchStrategy: 'checksum', watchIntervalMinutes: 2880,
    watchConfig: { checksumUrl: 'https://cdimage.debian.org/SHA512SUMS', downloadUrl: 'https://cdimage.debian.org/debian-12-amd64-netinst.iso', algorithm: 'sha512' },
    tags: ['linux', 'stable'],
  },
  {
    name: 'Arch Linux', family: 'arch', architecture: 'x86_64',
    checksumAlgo: 'sha256', retentionCount: 1, retentionBehavior: 'delete',
    watchEnabled: true, watchStrategy: 'filename', watchIntervalMinutes: 360,
    watchConfig: { indexUrl: 'https://mirrors.edge.kernel.org/archlinux/iso/', filenameRegex: 'archlinux-(\\d{4}\\.\\d{2}\\.\\d{2})-x86_64\\.iso', downloadUrlTemplate: 'https://mirrors.edge.kernel.org/archlinux/iso/{version}/archlinux-{version}-x86_64.iso' },
    tags: ['linux', 'rolling'],
  },
  {
    name: 'Rocky Linux 9', family: 'rocky', architecture: 'x86_64',
    checksumAlgo: 'sha256', retentionCount: 2, retentionBehavior: 'archive',
    watchEnabled: true, watchStrategy: 'json_api', watchIntervalMinutes: 1440,
    watchConfig: { apiUrl: 'https://dl.rockylinux.org/pub/rocky/9/isos/x86_64/CHECKSUM', versionPath: 'version', downloadUrlPath: 'download_url' },
    tags: ['linux', 'enterprise'],
  },
];

console.log('Seeding definitions...');
const ids = [];
for (const def of definitions) {
  const r = await fetch(`${BASE}/api/definitions`, { method: 'POST', headers: H, body: JSON.stringify(def) });
  if (r.ok) { const d = await r.json(); ids.push(d.id); }
}
console.log(`Created ${ids.length} definitions.`);

// ── Launch browser ────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page    = await ctx.newPage();

// Inject auth header for all API calls
await page.route('**/api/**', async (route) => {
  const headers = { ...route.request().headers(), authorization: `Bearer ${API_KEY}` };
  await route.continue({ headers });
});

async function shoot(name) {
  await sleep(900);
  await page.screenshot({ path: join(DOCS, `${name}.png`), fullPage: false });
  console.log(`    saved ${name}.png`);
}

async function nav(linkText) {
  await page.click(`text=${linkText}`);
  await page.waitForLoadState('networkidle');
}

// Load the SPA once, then navigate via React Router links
console.log('  → loading app...');
await page.goto(BASE, { waitUntil: 'networkidle' });
await sleep(600);

console.log('  → dashboard');
await shoot('screenshot-dashboard');

console.log('  → catalog');
await nav('Catalog');
await shoot('screenshot-catalog');

console.log('  → downloads');
await nav('Downloads');
await shoot('screenshot-downloads');

console.log('  → audit log');
await nav('Audit Log');
await shoot('screenshot-audit');

await browser.close();
server.kill();
console.log(`\nScreenshots saved to ${DOCS}/`);
