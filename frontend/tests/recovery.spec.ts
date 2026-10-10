import { test, expect } from '@playwright/test';

test.describe('CFSS Recovery Verification', () => {
  test('Admin Login and Dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');

    // Wait for navigation to admin dashboard
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Administrator Dashboard');
  });

  test('Admin Student Management', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin');

    // Navigate to students
    await page.click('a[href="/admin/students"]');
    await expect(page).toHaveURL('/admin/students');
    await expect(page.locator('h1')).toContainText('Student Management');

    // Check if the export button exists
    const exportBtn = page.locator('button:has-text("Export to PDF")');
    await expect(exportBtn).toBeVisible();
  });

  test('Admin Settings Save Lifecycle', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin');

    // Navigate to settings
    await page.click('a[href="/admin/settings"]');
    await expect(page).toHaveURL('/admin/settings');
    await expect(page.locator('h1')).toContainText('System Settings');

    // Admin password input should be visible for settings save
    const adminPasswordInput = page.locator('input[placeholder="Enter admin password to save settings"]');
    await expect(adminPasswordInput).toBeVisible();

    // Toggle registration to enable the save button
    const saveBtn = page.locator('button:has-text("Save Configuration")');
    await expect(saveBtn).toBeVisible();
  });
});

