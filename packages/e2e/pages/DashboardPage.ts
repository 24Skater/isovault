import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.getByText('IsoVault').first().waitFor({ state: 'visible' });
  }

  heading(): Locator {
    return this.page.getByRole('heading', { name: /dashboard/i });
  }

  statCard(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  storageSection(): Locator {
    return this.page.getByText('Storage', { exact: true });
  }

  recentEventsSection(): Locator {
    return this.page.getByText('Recent Events', { exact: true });
  }
}
