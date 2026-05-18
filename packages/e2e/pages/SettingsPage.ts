import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.gotoViaNav('Settings', '**/settings');
  }

  heading(): Locator {
    return this.page.getByRole('heading', { name: /settings/i });
  }

  private rowByLabel(label: string): Locator {
    // <label> element is a direct child of the SettingRow root div
    return this.page.getByText(label, { exact: true }).locator('..');
  }

  async selectSection(section: string): Promise<void> {
    await this.page.getByRole('button', { name: section, exact: true }).click();
  }

  saveButton(label: string): Locator {
    return this.rowByLabel(label).getByRole('button', { name: /Save|Saving|Saved/ });
  }

  async fillNumberValue(label: string, value: number): Promise<void> {
    await this.rowByLabel(label).getByRole('spinbutton').fill(String(value));
  }

  async selectValue(label: string, option: string): Promise<void> {
    await this.rowByLabel(label).getByRole('combobox').selectOption(option);
  }

  async clickSave(label: string): Promise<void> {
    await this.saveButton(label).click();
  }

  savedConfirmation(label: string): Locator {
    return this.rowByLabel(label).getByRole('button', { name: 'Saved' });
  }
}
