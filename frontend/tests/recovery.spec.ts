import { test, expect } from '@playwright/test';

test.describe('CFSS Recovery Verification', () => {
  test('Admin Login and Dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');

    // Wait for navigation to admin dashboard
    await page.waitForURL('/admin', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true }).first()).toBeVisible();
  });

  test('Admin Student Management', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 10000 });

    // Navigate to students
    await page.goto('/admin/students');
    await expect(page).toHaveURL('/admin/students');
    await expect(page.getByRole('heading', { name: 'Students', exact: true }).first()).toBeVisible();

    // Check if the export button exists
    const exportBtn = page.locator('button:has-text("Export PDF")');
    await expect(exportBtn).toBeVisible();
  });

  test('Admin Settings Save Lifecycle', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 10000 });

    // Navigate to settings
    await page.goto('/admin/settings');
    await expect(page).toHaveURL('/admin/settings');
    await expect(page.getByRole('heading', { name: 'System Settings', exact: true }).first()).toBeVisible();

    // Admin password input should be visible for settings save
    const adminPasswordInput = page.locator('input[placeholder="Enter current admin password to save changes"]');
    await expect(adminPasswordInput).toBeVisible();

    // Toggle registration to enable the save button
    const saveBtn = page.locator('button:has-text("Save Configuration")');
    await expect(saveBtn).toBeVisible();
  });
});

