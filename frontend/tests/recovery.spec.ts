import { test, expect } from '@playwright/test';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CfssAdmin2026!SecureKey';

test.describe('CFSS Recovery Verification', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('Admin Login and Dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to admin dashboard
    await page.waitForURL('/admin', { timeout: 35000 });
    await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true }).first()).toBeVisible({ timeout: 15000 });
  });

  test('Admin Login Invalid Credentials Shows Clear Message', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Should surface the clear error message, not raw 401 status string
    await expect(page.locator('text=Incorrect admin credentials').first()).toBeVisible({ timeout: 10000 });
  });

  test('Admin Login Rejects Insecure Legacy Default Credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');

    // Default 'admin' password must be rejected now that active credentials are secure
    await expect(page.locator('text=Incorrect admin credentials').first()).toBeVisible({ timeout: 10000 });
  });

  test('Admin Communities Loading and Creation Form', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 35000 });

    // Navigate to communities
    await page.goto('/admin/communities');
    await expect(page).toHaveURL('/admin/communities');
    await expect(page.getByRole('heading', { name: 'Communities', exact: true }).first()).toBeVisible();

    // Verify Add Community button opens modal
    await page.click('button:has-text("+ Add Community")');
    await expect(page.locator('text=Add New Community').first()).toBeVisible();
    await page.click('button:has-text("Cancel")');
  });

  test('Admin Students Preview Report Modal', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 35000 });

    // Navigate to students
    await page.goto('/admin/students');
    await expect(page).toHaveURL('/admin/students');
    await expect(page.getByRole('heading', { name: 'Students', exact: true }).first()).toBeVisible();

    // Verify Export PDF button exists
    const exportBtn = page.locator('button:has-text("Export PDF")');
    await expect(exportBtn).toBeVisible();

    // Click Preview Report
    const previewBtn = page.locator('button:has-text("Preview Report")');
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Verify A4 Preview Modal is visible
    await expect(page.locator('text=Student Enrollment Report — Print Preview').first()).toBeVisible();
    await expect(page.locator('text=Official Student Fieldwork & Community Enrollment Report').first()).toBeVisible();

    // Close preview modal
    await page.click('button:has-text("✕")');
  });

  test('Admin Whitelist Management and Concurrent Lists', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 35000 });

    // Navigate to whitelist
    await page.goto('/admin/whitelist');
    await expect(page).toHaveURL('/admin/whitelist');
    await expect(page.getByRole('heading', { name: 'Whitelist Management', exact: true }).first()).toBeVisible();
    await expect(page.locator('text=Manage Whitelists').first()).toBeVisible();
  });

  test('Admin Settings Save Lifecycle', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 35000 });

    // Navigate to settings
    await page.goto('/admin/settings');
    await expect(page).toHaveURL('/admin/settings');
    await expect(page.locator('text=System Settings').first()).toBeVisible();

    // Admin password input should be visible for settings save
    const adminPasswordInput = page.locator('input[placeholder="Enter current admin password to save changes"]');
    await expect(adminPasswordInput).toBeVisible();

    // Save Configuration button should be visible
    const saveBtn = page.locator('button:has-text("Save Configuration")');
    await expect(saveBtn).toBeVisible();
  });
});

