import { test, expect } from '../helpers/fixtures';
import { newApiContext, createDefinition, deleteDefinition, type SeedDefinition } from '../helpers/api';
import { CatalogPage } from '../pages/CatalogPage';
import type { APIRequestContext } from '@playwright/test';

// ── UI-only tests (no pre-seeded data) ────────────────────────────────────────

test.describe('Catalog — add definition via UI', () => {
  const createdNames: string[] = [];

  test.afterEach(async () => {
    // Clean up any definitions created during this test
    const ctx = await newApiContext();
    for (const name of createdNames) {
      // Best-effort cleanup — ignore errors if already deleted
      const res = await ctx.get('/api/definitions?limit=100');
      if (res.ok()) {
        const body = await res.json() as { data: SeedDefinition[] };
        const def = body.data.find((d) => d.name === name);
        if (def) await deleteDefinition(ctx, def.id);
      }
    }
    createdNames.length = 0;
    await ctx.dispose();
  });

  test('can add a definition and see it in the list', async ({ page }) => {
    const name = `E2E-UI-Add-${Date.now()}`;
    createdNames.push(name);

    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.clickAddDefinition();
    await catalog.fillModalField('Name *', name);
    await catalog.fillModalField('Family *', 'e2e');
    await catalog.submitModal();

    await expect(catalog.rowByName(name)).toBeVisible();
  });
});

// ── API-seeded tests ──────────────────────────────────────────────────────────

test.describe('Catalog — seeded definitions', () => {
  let apiCtx: APIRequestContext;
  let seeded: SeedDefinition;

  test.beforeEach(async () => {
    apiCtx = await newApiContext();
    seeded = await createDefinition(apiCtx, {
      name: `E2E-Catalog-${Date.now()}`,
      family: 'e2e',
      architecture: 'x86_64',
    });
  });

  test.afterEach(async () => {
    try {
      await deleteDefinition(apiCtx, seeded.id);
    } catch {
      // definition may have been deleted during the test
    }
    await apiCtx.dispose();
  });

  test('definition appears in catalog list', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await expect(catalog.rowByName(seeded.name)).toBeVisible();
  });

  test('search filters by name', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.search(seeded.name);
    await expect(catalog.rowByName(seeded.name)).toBeVisible();
  });

  test('search with non-matching term shows empty state', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.search('zzz-no-match-xyz-e2e');
    await expect(catalog.emptyState()).toBeVisible();
  });

  test('can edit definition name', async ({ page }) => {
    const updatedName = `${seeded.name}-updated`;
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.clickEdit(seeded.name);
    // Clear and re-fill the name field
    await page.getByLabel('Name *').clear();
    await catalog.fillModalField('Name *', updatedName);
    await catalog.submitModal();

    await expect(catalog.rowByName(updatedName)).toBeVisible();
    // Update seeded name so afterEach cleanup can find it via API id (id unchanged)
    seeded = { ...seeded, name: updatedName };
  });

  test('can delete definition', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();
    await catalog.clickDelete(seeded.name);
    await catalog.confirmDialog('Delete');

    await expect(catalog.rowByName(seeded.name)).not.toBeVisible();
    // Mark as already deleted so afterEach skips
    seeded = { ...seeded, id: '' };
  });
});
