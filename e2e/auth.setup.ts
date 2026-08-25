import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const authFile = 'e2e/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  // Go to your app login page or trigger your AuthPanel modal
  await page.goto('http://localhost:3000');

  // Look for your auth trigger button (adjust selector based on your AuthPanel UI)
  const signInButton = page.locator('button', { hasText: /sign in/i });
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }

  // Fill in Supabase email/password inputs
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || '');
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || '');
  
  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for session storage or UI change indicating successful login
  await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 10000 });

  // Save signed-in state to storage
  await page.context().storageState({ path: authFile });
});