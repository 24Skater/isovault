import { test as base, BrowserContext } from '@playwright/test';
import { getApiKey } from './auth';

// Extend the default test so every browser context:
// 1. Seeds localStorage with the API key before page scripts run, bypassing
//    the login screen (the frontend reads isovault_api_key from localStorage).
// 2. Injects the Authorization header on all /api/* requests.
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({ context }, use) => {
    const apiKey = getApiKey();

    await context.addInitScript((key) => {
      localStorage.setItem('isovault_api_key', key);
    }, apiKey);

    await context.route('**/api/**', async (route) => {
      await route.continue({
        headers: {
          ...route.request().headers(),
          Authorization: `Bearer ${apiKey}`,
        },
      });
    });
    await use(context);
  },
});

export { expect } from '@playwright/test';
