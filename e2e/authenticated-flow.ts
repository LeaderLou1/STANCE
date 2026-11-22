import { test, expect } from '@playwright/test';

test('resident can open report modal and fill fields', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Click the primary "Report a problem" button
  const reportButton = page.locator('button', { hasText: 'Report a problem' }).first();
  await expect(reportButton).toBeEnabled();
  await reportButton.click();

  // Fill out test data
  await page.fill('input[name="title"]', 'Broken street sign on 5th Avenue');
  await page.fill('textarea[name="description"]', 'The stop sign is completely turned around and causing confusion.');

  // Verify inputs captured data correctly
  await expect(page.locator('input[name="title"]')).toHaveValue('Broken street sign on 5th Avenue');
});