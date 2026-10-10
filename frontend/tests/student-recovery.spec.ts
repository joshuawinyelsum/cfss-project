import { test, expect } from '@playwright/test';

test.describe('Student Verification', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/login');
    await page.fill('input[type="text"]', 'S001');
    await page.fill('input[type="password"]', 'studentpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 25000 });
    // Wait for the DashboardLayout to finish provisioning and render the page
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 45000 });
  });

  test('Student Settings Load Successfully at /dashboard/settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL('/dashboard/settings');
    
    // It should not get stuck on 'Loading settings'
    await expect(page.locator('text=Appearance').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Account Security').first()).toBeVisible();
  });

  test('Student Settings Redirect from /settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL('**/dashboard/settings', { timeout: 15000 });
    await expect(page.locator('text=Appearance').first()).toBeVisible({ timeout: 15000 });
  });
});
