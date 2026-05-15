import { test, expect } from '../helpers/fixtures';
import { ArchivePage } from '../pages/ArchivePage';

test.describe('Archive', () => {
  test('loads with heading', async ({ page }) => {
    const archive = new ArchivePage(page);
    await archive.goto();
    await expect(archive.heading()).toBeVisible();
  });

  test('shows empty state when no archived versions', async ({ page }) => {
    const archive = new ArchivePage(page);
    await archive.goto();
    await expect(archive.emptyState()).toBeVisible();
  });
});
