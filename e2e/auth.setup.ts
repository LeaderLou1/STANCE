import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const authFile = 'e2e/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const emailInput = page.locator('input[type="email"]');

  // If the email input is not already on screen, click the button that opens your AuthPanel
  if (!(await emailInput.isVisible())) {
    const signInButton = page
      .locator('button, a')
      .filter({ hasText: /sign in|log in|login|account/i })
      .first();

    await signInButton.waitFor({ state: 'visible', timeout: 10000 });
    await signInButton.click();
  }

  // Wait for the AuthPanel modal inputs to appear, then fill credentials
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  const email = process.env.TEST_USER_EMAIL || process.env.SUPABASE_TEST_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || process.env.SUPABASE_TEST_PASSWORD || '';

  if (!email || !password) {
    throw new Error('Missing test user credentials in environment variables.');
  }

  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Submit login form
  await page.locator('button[type="submit"]').click();

  // Wait for the login modal to close and authenticated UI to appear
  await expect(emailInput).toBeHidden({ timeout: 15000 });

  // Save signed-in state to storage
  await page.context().storageState({ path: authFile });
});