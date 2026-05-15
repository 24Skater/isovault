import { test, expect } from '../helpers/fixtures';
import { newApiContext, createDefinition, deleteDefinition, type SeedDefinition } from '../helpers/api';
import { AuditLogPage } from '../pages/AuditLogPage';
import type { APIRequestContext } from '@playwright/test';

test.describe('Audit Log', () => {
  test('loads with heading', async ({ page }) => {
    const auditLog = new AuditLogPage(page);
    await auditLog.goto();
    await expect(auditLog.heading()).toBeVisible();
  });
});

test.describe('Audit Log — with events', () => {
  let apiCtx: APIRequestContext;
  let seeded: SeedDefinition;

  test.beforeEach(async () => {
    apiCtx = await newApiContext();
    seeded = await createDefinition(apiCtx, {
      name: `E2E-Audit-${Date.now()}`,
      family: 'e2e',
    });
  });

  test.afterEach(async () => {
    try {
      await deleteDefinition(apiCtx, seeded.id);
    } catch {
      // already deleted
    }
    await apiCtx.dispose();
  });

  test('shows events after definition is created', async ({ page }) => {
    const auditLog = new AuditLogPage(page);
    await auditLog.goto();
    // At least one row should be visible after creating a definition
    await expect(auditLog.tableRows().first()).toBeVisible();
  });

  test('severity filter — info shows events', async ({ page }) => {
    const auditLog = new AuditLogPage(page);
    await auditLog.goto();
    await auditLog.selectSeverityFilter('info');
    await expect(auditLog.tableRows().first()).toBeVisible();
  });

  test('severity filter — critical hides info events', async ({ page }) => {
    const auditLog = new AuditLogPage(page);
    await auditLog.goto();
    await auditLog.selectSeverityFilter('critical');
    // definition.created is info, so filtering to critical should show nothing
    await expect(auditLog.emptyState()).toBeVisible();
  });

  test('event type filter narrows results', async ({ page }) => {
    const auditLog = new AuditLogPage(page);
    await auditLog.goto();
    // Filter to the exact event type — should still find rows
    await auditLog.fillEventTypeFilter('definition');
    await expect(auditLog.tableRows().first()).toBeVisible();
  });

  test('event type filter with no match shows empty state', async ({ page }) => {
    const auditLog = new AuditLogPage(page);
    await auditLog.goto();
    await auditLog.fillEventTypeFilter('zzz-no-event-type-xyz');
    await expect(auditLog.emptyState()).toBeVisible();
  });
});
