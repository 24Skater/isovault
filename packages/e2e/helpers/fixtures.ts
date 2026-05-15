import { test as base, BrowserContext } from '@playwright/test';
import { getApiKey } from './auth';

// Extend the default test so every browser context automatically injects
// the Authorization header on all /api/* requests. This lets the SPA
// communicate with the backend without modifying any frontend source code.
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({ context }, use) => {
    const apiKey = getApiKey();
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
