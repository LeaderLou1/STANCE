import { test, expect } from '@playwright/test';

// Optional: Only needed if your playwright.config.ts does NOT already set storageState globally on the project
// test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Authenticated user flows', () => {
  test('loads protected dashboard content while signed in', async ({ page }) => {
    // 1. Navigate directly to a page that requires authentication
    await page.goto('/');

    // 2. Verify the user is authenticated (e.g., login prompt is hidden or user UI is visible)
    await expect(page.locator('input[type="email"]')).toBeHidden();

    // 3. Interact with a core feature (adjust selectors and routes to match STANCE)
    // Example: Open a modal or navigate to a subpage
    const actionButton = page.getByRole('button', { name: /new|create|post/i }).first();
    await expect(actionButton).toBeVisible();
    await actionButton.click();

    // 4. Assert the expected result appears on screen
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});