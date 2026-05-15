import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ArchivePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoViaNav('Archive', '**/archive');
  }

  heading(): Locator {
    return this.page.getByText('Archive', { exact: true }).first();
  }

  emptyState(): Locator {
    return this.page.getByText('No archived versions.');
  }

  definitionGroup(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  async clickRestore(versionString: string): Promise<void> {
    await this.page
      .getByText(versionString)
      .locator('..')
      .getByRole('button', { name: 'Restore' })
      .click();
  }

  async clickDelete(versionString: string): Promise<void> {
    await this.page
      .getByText(versionString)
      .locator('..')
      .getByRole('button', { name: 'Delete' })
      .click();
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByRole('button', { name: 'Delete' }).last().click();
  }
}
