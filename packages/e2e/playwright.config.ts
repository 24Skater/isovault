import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env.e2e') });

const PORT = 3721;
const BASE_URL = `http://localhost:${PORT}`;
const DB_PATH = path.join(os.tmpdir(), 'isovault-e2e-test.sqlite3');
const STORE_PATH = path.join(os.tmpdir(), 'isovault-e2e-store');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI']
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'on-failure', outputFolder: 'playwright-report' }]],

  globalSetup: './global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: `node ${path.resolve(__dirname, '../../packages/backend/dist/server.js')}`,
    url: `${BASE_URL}/health`,
    reuseExistingServer: !process.env['CI'],
    timeout: 20_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: 'production',
      ISO_MANAGER_DB_PATH: DB_PATH,
      ISO_STORE_PATH: STORE_PATH,
      ISO_MANAGER_LOG_LEVEL: 'warn',
      ...(process.env['ISO_MANAGER_API_KEY']
        ? { ISO_MANAGER_API_KEY: process.env['ISO_MANAGER_API_KEY'] }
        : {}),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
