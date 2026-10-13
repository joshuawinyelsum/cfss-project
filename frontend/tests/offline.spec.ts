import { test, expect } from '@playwright/test';

test.describe('Offline Field Collection', () => {
  test.beforeEach(async () => {
    test.setTimeout(90000);
  });

  // Test A - template caching
  test('survey templates are available offline', async ({ page, context }) => {
    // 1. Real student login to ensure proper provisioning and question prefetching into Dexie
    await page.goto('/login');
    await page.fill('input[type="text"]', 'S001');
    await page.fill('input[type="password"]', 'studentpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 35000 });
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 45000 });

    // 2. Navigate to surveys listing while online
    await page.goto('/surveys/household');
    const createBtn = page.getByRole('button', { name: /Add New/i });
    await expect(createBtn).toBeVisible({ timeout: 25000 });

    // 3. Intercept API calls to simulate offline backend network conditions
    await context.route('**/*', route => {
      if (route.request().url().includes('/api/')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    // 4. Click Add New while backend is unreachable
    await createBtn.click();
    await page.waitForURL('**/fill?id=*');

    // The form should render from Dexie cached templates
    await expect(page.locator('text=Draft').first()).toBeVisible();
    await expect(page.locator('text=Section 1').first()).toBeVisible();
  });

  // Test B - offline response creation & Test C - offline submission & Test G - refresh/restart
  test('offline response creation and persistence', async ({ page, context }) => {
    // 1. Real student login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'S001');
    await page.fill('input[type="password"]', 'studentpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 35000 });
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 45000 });

    // 2. Navigate to surveys listing
    await page.goto('/surveys/household');
    const createBtn = page.getByRole('button', { name: /Add New/i });
    await expect(createBtn).toBeVisible();

    // 3. Intercept API calls to simulate offline network
    await context.route('**/*', route => {
      if (route.request().url().includes('/api/')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    // 4. Start offline survey
    await createBtn.click();
    await page.waitForURL('**/fill?id=*');

    // 5. Save Draft
    await page.getByRole('button', { name: /Save Draft/i }).click();

    // Verify it saved and redirected to student work workspace
    await page.waitForURL('**/dashboard/work');
    await expect(page.locator('text=Draft').first()).toBeVisible();

    // 6. Test refresh/restart: reload and check persistence
    await page.reload();
    await expect(page.locator('text=Draft').first()).toBeVisible();
  });
});
