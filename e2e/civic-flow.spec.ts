import { test, expect } from '@playwright/test';

test('stance app loads and renders street-sign pilot homepage', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // 1. Check that the STANCE branding and pilot label are visible in the header
  await expect(page.locator('header').getByText('STANCE', { exact: true })).toBeVisible();
  await expect(page.locator('header').getByText('Early pilot', { exact: true })).toBeVisible();

  // 2. Verify the primary "Report a problem" buttons are present
  const reportButton = page.locator('button', { hasText: 'Report a problem' }).first();
  await expect(reportButton).toBeVisible();

  // 3. Verify the street-sign hero headline and pilot sections render
  await expect(page.locator('#hero-title')).toHaveText(/Report it\.\s*Get it seen\./i);
  await expect(page.locator('#steps-title')).toHaveText(/What happens after you report/i);
  await expect(page.locator('#status-title')).toHaveText(/Where the pilot stands/i);
});