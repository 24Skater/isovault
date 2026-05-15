import { test, expect } from '../helpers/fixtures';
import { DownloadsPage } from '../pages/DownloadsPage';

test.describe('Downloads', () => {
  test('loads with heading', async ({ page }) => {
    const downloads = new DownloadsPage(page);
    await downloads.goto();
    await expect(downloads.heading()).toBeVisible();
  });

  test('shows Active tab empty state by default', async ({ page }) => {
    const downloads = new DownloadsPage(page);
    await downloads.goto();
    await expect(downloads.emptyState('No active downloads.')).toBeVisible();
  });

  test('can switch to Queued tab', async ({ page }) => {
    const downloads = new DownloadsPage(page);
    await downloads.goto();
    await downloads.selectTab('Queued');
    await expect(downloads.emptyState('No queued downloads.')).toBeVisible();
  });

  test('can switch to History tab', async ({ page }) => {
    const downloads = new DownloadsPage(page);
    await downloads.goto();
    await downloads.selectTab('History');
    await expect(downloads.emptyState('No download history.')).toBeVisible();
  });

  test('shows SSE connection status', async ({ page }) => {
    const downloads = new DownloadsPage(page);
    await downloads.goto();
    await expect(downloads.connectionStatus()).toBeVisible();
  });
});
