import { test, expect } from '../helpers/fixtures';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Dashboard', () => {
  test('loads with heading', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.heading()).toBeVisible();
  });

  test('shows Definitions stat card', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.statCard('Definitions')).toBeVisible();
  });

  test('shows Active Versions stat card', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.statCard('Active Versions')).toBeVisible();
  });

  test('shows Active Downloads stat card', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.statCard('Active Downloads')).toBeVisible();
  });

  test('shows storage section', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.storageSection()).toBeVisible();
  });

  test('shows recent events section', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.recentEventsSection()).toBeVisible();
  });
});
