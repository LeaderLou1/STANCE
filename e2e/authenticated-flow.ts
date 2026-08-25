import { test, expect } from '@playwright/test';

test('authenticated user can open report modal and fill fields', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Since we are logged in via storageState, "New report" should be enabled
  const newReportButton = page.locator('button', { hasText: 'New report' });
  await expect(newReportButton).toBeEnabled();
  await newReportButton.click();

  // Verify modal is open
  await expect(page.locator('text=Report a Civic Issue')).toBeVisible();

  // Fill out test data
  await page.fill('input[name="title"]', 'Broken street sign on 5th Avenue');
  await page.fill('textarea[name="description"]', 'The stop sign is completely turned around and causing confusion.');
  await page.fill('input[name="zip_code"]', '10001');

  // Verify inputs captured data correctly
  await expect(page.locator('input[name="title"]')).toHaveValue('Broken street sign on 5th Avenue');
});