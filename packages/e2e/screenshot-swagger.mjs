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
const DB      = join(os.tmpdir(), `isovault-swagger-${Date.now()}.sqlite3`);
const STORE   = join(os.tmpdir(), `isovault-swagger-store-${Date.now()}`);

mkdirSync(DOCS, { recursive: true });
mkdirSync(STORE, { recursive: true });

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
  if (!msg.includes('"level":20')) process.stderr.write(msg);
});

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

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page    = await ctx.newPage();

console.log('  → loading Swagger UI...');
await page.goto(`${BASE}/docs/`, { waitUntil: 'networkidle' });

// Wait for Swagger UI to fully render the operation list
await page.waitForSelector('.opblock', { timeout: 10000 });
await sleep(1200);

const outPath = join(DOCS, 'screenshot-swagger.png');
await page.screenshot({ path: outPath, fullPage: false });
console.log(`  saved screenshot-swagger.png`);

await browser.close();
server.kill();
console.log(`\nDone. Screenshot saved to ${outPath}`);
