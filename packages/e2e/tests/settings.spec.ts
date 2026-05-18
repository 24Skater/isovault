import { test, expect } from '../helpers/fixtures';
import { newApiContext, getSettings, setSetting } from '../helpers/api';
import { SettingsPage } from '../pages/SettingsPage';
import type { APIRequestContext } from '@playwright/test';

test.describe('Settings', () => {
  test('loads with heading', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await expect(settings.heading()).toBeVisible();
  });

  test('shows all setting labels', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    // General section (default)
    await expect(page.getByText('Max Concurrent Downloads', { exact: true })).toBeVisible();
    await expect(page.getByText('Default Retention Count', { exact: true })).toBeVisible();
    await expect(page.getByText('Default Retention Behavior', { exact: true })).toBeVisible();

    // Storage section
    await settings.selectSection('Storage');
    await expect(page.getByText('Storage Alert Threshold (%)', { exact: true })).toBeVisible();

    // Advanced section
    await settings.selectSection('Advanced');
    await expect(page.getByText('Log Retention Days', { exact: true })).toBeVisible();
  });
});

test.describe('Settings — save and restore', () => {
  let apiCtx: APIRequestContext;
  let originalValue: string;

  const SETTING_KEY = 'max_concurrent_downloads';
  const SETTING_LABEL = 'Max Concurrent Downloads';

  test.beforeEach(async () => {
    apiCtx = await newApiContext();
    const all = await getSettings(apiCtx);
    const setting = all.find((s) => s.key === SETTING_KEY);
    originalValue = setting?.value ?? '3';
  });

  test.afterEach(async () => {
    // Restore original value
    await setSetting(apiCtx, SETTING_KEY, originalValue);
    await apiCtx.dispose();
  });

  test('can change a number setting and see Saved confirmation', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const newValue = parseInt(originalValue, 10) === 2 ? 3 : 2;
    await settings.fillNumberValue(SETTING_LABEL, newValue);
    await settings.clickSave(SETTING_LABEL);

    await expect(settings.savedConfirmation(SETTING_LABEL)).toBeVisible();
  });

  test('saved value persists after page reload', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const newValue = parseInt(originalValue, 10) === 2 ? 3 : 2;
    await settings.fillNumberValue(SETTING_LABEL, newValue);
    await settings.clickSave(SETTING_LABEL);
    await expect(settings.savedConfirmation(SETTING_LABEL)).toBeVisible();

    // Reload and verify via API
    const updated = await getSettings(apiCtx);
    const setting = updated.find((s) => s.key === SETTING_KEY);
    expect(setting?.value).toBe(String(newValue));
  });
});

test.describe('Settings — select field', () => {
  let apiCtx: APIRequestContext;
  let originalValue: string;

  const SETTING_KEY = 'default_retention_behavior';
  const SETTING_LABEL = 'Default Retention Behavior';

  test.beforeEach(async () => {
    apiCtx = await newApiContext();
    const all = await getSettings(apiCtx);
    const setting = all.find((s) => s.key === SETTING_KEY);
    originalValue = setting?.value ?? 'archive';
  });

  test.afterEach(async () => {
    await setSetting(apiCtx, SETTING_KEY, originalValue);
    await apiCtx.dispose();
  });

  test('can change a select setting and save', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    const newOption = originalValue === 'archive' ? 'delete' : 'archive';
    await settings.selectValue(SETTING_LABEL, newOption);
    await settings.clickSave(SETTING_LABEL);

    await expect(settings.savedConfirmation(SETTING_LABEL)).toBeVisible();
  });
});
