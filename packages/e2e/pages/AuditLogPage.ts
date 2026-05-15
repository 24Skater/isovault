import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuditLogPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoViaNav('Audit Log', '**/audit');
  }

  heading(): Locator {
    return this.page.getByText('Audit Log', { exact: true });
  }

  tableRows(): Locator {
    return this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
  }

  emptyState(): Locator {
    return this.page.getByText('No events found.');
  }

  async selectSeverityFilter(severity: 'info' | 'warn' | 'error' | 'critical' | ''): Promise<void> {
    await this.page.getByRole('combobox').first().selectOption(severity);
    await this.page.waitForTimeout(300);
  }

  async fillEventTypeFilter(value: string): Promise<void> {
    await this.page.getByPlaceholder(/Filter by event type/i).fill(value);
    await this.page.waitForTimeout(300);
  }

  paginationNext(): Locator {
    return this.page.getByRole('button', { name: 'Next' });
  }

  paginationPrev(): Locator {
    return this.page.getByRole('button', { name: 'Prev' });
  }
}
