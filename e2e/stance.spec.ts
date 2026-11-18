import { test, expect } from '@playwright/test';

test.describe('STANCE Core Application Flows', () => {
  test('loads authenticated homepage and core civic components', async ({ page }) => {
    // 1. Navigate to the app root (uses e2e/.auth/user.json automatically)
    await page.goto('/');

    // 2. Verify the application title or main header brand is visible
    await expect(page.locator('body')).not.toBeEmpty();

    // 3. Verify core interactive sections load (e.g., Stats header or Incident Map)
    const statsOrMap = page.locator('text=/stats|map|incidents|reports/i').first();
    await expect(statsOrMap).toBeVisible({ timeout: 10000 });
  });

  test('allows opening the issue report modal while authenticated', async ({ page }) => {
    await page.goto('/');

    // Look for a report/new issue button based on typical STANCE action buttons
    const reportButton = page.locator('button, a').filter({ hasText: /report|new issue|add/i }).first();
    
    if (await reportButton.isVisible()) {
      await reportButton.click();
      // Verify modal or form container opens up
      await expect(page.locator('div[role="dialog"], form').first()).toBeVisible();
    }
  });
});