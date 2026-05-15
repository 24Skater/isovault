import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CatalogPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoViaNav('Catalog', '**/catalog');
  }

  heading(): Locator {
    return this.page.getByText('ISO Catalog', { exact: true });
  }

  rowByName(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: name });
  }

  async clickEdit(name: string): Promise<void> {
    await this.rowByName(name).getByRole('button', { name: 'Edit' }).click();
  }

  async clickDelete(name: string): Promise<void> {
    await this.rowByName(name).getByRole('button', { name: 'Delete' }).click();
  }

  async confirmDialog(confirmLabel: string): Promise<void> {
    // The ConfirmDialog renders over a full-screen backdrop.
    // The confirm button is the one matching confirmLabel (not "Cancel").
    await this.page
      .getByRole('button', { name: confirmLabel, exact: true })
      .last()
      .click();
  }

  async clickVersions(name: string): Promise<void> {
    await this.rowByName(name).getByRole('button', { name: 'Versions' }).click();
  }

  async clickAddDefinition(): Promise<void> {
    await this.page.getByRole('button', { name: /Add Definition/i }).click();
  }

  async fillModalField(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  async submitModal(): Promise<void> {
    await this.page
      .getByRole('button', { name: /Add Definition|Save Changes/i })
      .last()
      .click();
    // Wait for modal to close
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' }).catch(() => {
      // modal doesn't use role=dialog — wait for the form to disappear instead
    });
  }

  async search(query: string): Promise<void> {
    const input = this.page.getByPlaceholder(/Search by name/i);
    await input.fill(query);
    // Debounce is 350 ms — wait a bit longer to be safe
    await this.page.waitForTimeout(500);
  }

  emptyState(): Locator {
    return this.page.getByText(/No definitions/i);
  }
}
