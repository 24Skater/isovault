import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  // Navigate to root then click the sidebar nav link.
  // Direct navigation to sub-routes (e.g. /catalog) would 404 because the
  // server has no SPA fallback handler — the app must boot from /.
  protected async gotoViaNav(navLabel: string, urlPattern: string): Promise<void> {
    await this.page.goto('/');
    await this.page.getByText('IsoVault').first().waitFor({ state: 'visible' });
    await this.page.getByRole('link', { name: navLabel, exact: true }).click();
    await this.page.waitForURL(urlPattern);
  }
}
