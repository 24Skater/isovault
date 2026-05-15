import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DownloadsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoViaNav('Downloads', '**/downloads');
  }

  heading(): Locator {
    return this.page.getByText('Downloads', { exact: true }).first();
  }

  async selectTab(tab: 'Active' | 'Queued' | 'History'): Promise<void> {
    await this.page.getByRole('button', { name: tab, exact: true }).click();
  }

  emptyState(text: string): Locator {
    return this.page.getByText(text);
  }

  connectionStatus(): Locator {
    return this.page.getByText(/live|connecting/i);
  }
}
