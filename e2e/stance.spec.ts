import { test, expect } from '@playwright/test';

test.describe('STANCE Core Application Flows', () => {
  test('loads public homepage and street-sign hero', async ({ page }) => {
    await page.goto('/');

    // Verify brand header and street-sign hero placard are visible
    await expect(page.locator('header').getByText('STANCE', { exact: true })).toBeVisible();
    await expect(page.locator('#hero-title')).toHaveText(/Report it\.\s*Get it seen\./i);

    // Verify the three-step pilot overview renders
    await expect(page.locator('#steps-title')).toHaveText(/What happens after you report/i);
  });

  test('opens the issue report modal from the homepage', async ({ page }) => {
    await page.goto('/');

    const reportButton = page.locator('button', { hasText: 'Report a problem' }).first();
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    // Verify modal or form container opens up
    await expect(page.locator('div[role="dialog"], form').first()).toBeVisible();
  });
});