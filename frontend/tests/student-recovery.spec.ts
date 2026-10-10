import { test, expect } from '@playwright/test';

test.describe('Student Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'S001');
    await page.fill('input[type="password"]', 'studentpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL('/dashboard');
    // Wait for the DashboardLayout to finish provisioning and render the page
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 15000 });
  });

  test('Student Settings Load Successfully', async ({ page }) => {
    // Navigate via the URL to avoid mobile menu locator ambiguity
    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');
    
    // It should not get stuck on 'Loading settings'
    // Let's assert a setting form element exists
    await expect(page.locator('text=Appearance').first()).toBeVisible({ timeout: 10000 });
  });
});
