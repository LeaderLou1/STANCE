import { test, expect } from '@playwright/test';

test('stance app loads and renders community workspace and public feed', async ({ page }) => {
  // 1. Navigate to your local server
  await page.goto('http://localhost:3000');

  // 2. Check that the STANCE branding is visible in the navbar
  await expect(page.locator('text=STANCE')).toBeVisible();

  // 3. Verify the workspace badge defaults correctly
  await expect(page.locator('text=resident workspace')).toBeVisible();

  // 4. Verify the "New report" button is present
  const newReportButton = page.locator('button', { hasText: 'New report' });
  await expect(newReportButton).toBeVisible();

  // 5. Verify the public record feed heading is rendered
  await expect(page.locator('text=Reports in your community')).toBeVisible();
});