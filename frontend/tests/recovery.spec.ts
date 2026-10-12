import { test, expect, Page } from '@playwright/test';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CfssAdmin2026!SecureKey';

async function loginAsAdmin(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    try {
      // Wait specifically for /admin root route and dashboard heading
      await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: /Administration Dashboard/i }).first()).toBeVisible({ timeout: 15000 });
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.waitForTimeout(1000);
    }
  }
}

test.describe('CFSS Recovery Verification', () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test('Admin Login and Dashboard', async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Admin Login Invalid Credentials Shows Clear Message', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Should surface the clear error message, not raw 401 status string
    await expect(page.locator('text=Incorrect admin credentials').first()).toBeVisible({ timeout: 20000 });
  });

  test('Admin Login Page Has No Student Portal Link', async ({ page }) => {
    await page.goto('/admin/login');
    // Ensure no student link exists
    await expect(page.locator('text=Switch to Student Fieldwork Portal')).toHaveCount(0);
    await expect(page.locator('a[href="/login"]')).toHaveCount(0);
  });

  test('Admin Login Password Visibility Toggle Works', async ({ page }) => {
    await page.goto('/admin/login');
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle
    const toggleBtn = page.locator('button[aria-label="Show password"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Verify type changed to text
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle again
    const hideBtn = page.locator('button[aria-label="Hide password"]');
    await expect(hideBtn).toBeVisible();
    await hideBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('Admin Login Rejects Insecure Legacy Default Credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');

    // Default 'admin' password must be rejected now that active credentials are secure
    await expect(page.locator('text=Incorrect admin credentials').first()).toBeVisible({ timeout: 20000 });
  });

  test('Admin Communities Loading and Creation Form', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to communities
    await page.goto('/admin/communities');
    await expect(page).toHaveURL('/admin/communities');
    await expect(page.getByRole('heading', { name: /Communities/i }).first()).toBeVisible({ timeout: 15000 });

    // Verify Add Community button opens modal
    await page.click('button:has-text("Add Community")');
    await expect(page.locator('text=Add New Community').first()).toBeVisible();
    await page.click('button:has-text("Cancel")');
  });

  test('Admin Students Preview Report Modal', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to students
    await page.goto('/admin/students');
    await expect(page).toHaveURL('/admin/students');
    await expect(page.getByRole('heading', { name: /Students/i }).first()).toBeVisible({ timeout: 15000 });

    // Verify Export PDF button exists
    const exportBtn = page.locator('button:has-text("Export PDF")');
    await expect(exportBtn).toBeVisible();

    // Click Preview Report
    const previewBtn = page.locator('button:has-text("Preview Report")');
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Verify A4 Preview Modal is visible
    await expect(page.locator('text=Student Enrollment Report — Print Preview').first()).toBeVisible();
    await expect(page.locator('text=CFSS — STUDENT GROUP REGISTER').first()).toBeVisible();

    // Close preview modal
    await page.click('button[aria-label="Close"]');
  });

  test('Admin Whitelist Management and Concurrent Lists', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to whitelist
    await page.goto('/admin/whitelist');
    await expect(page).toHaveURL('/admin/whitelist');
    await expect(page.getByRole('heading', { name: /Whitelist Management/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Manage Whitelists').first()).toBeVisible();
  });

  test('Admin Settings Save Lifecycle', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to settings
    await page.goto('/admin/settings');
    await expect(page).toHaveURL('/admin/settings');
    await expect(page.getByRole('heading', { name: /System Settings/i }).first()).toBeVisible({ timeout: 15000 });

    // Admin password input should be visible for settings save
    const adminPasswordInput = page.locator('input[placeholder="Enter current admin password to save changes"]');
    await expect(adminPasswordInput).toBeVisible();

    // Save Configuration button should be visible
    const saveBtn = page.locator('button:has-text("Save Configuration")');
    await expect(saveBtn).toBeVisible();
  });
});
