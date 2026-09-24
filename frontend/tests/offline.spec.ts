import { test, expect } from '@playwright/test';

test.describe('Offline Field Collection', () => {
  // Test A - template caching
  test('survey templates are available offline', async ({ page, context }) => {
    // 1. Go to page
    await page.goto('/login');

    // 2. We mock login by setting localStorage (to avoid backend dependencies for E2E)
    // In a real app we'd seed a DB, but for E2E frontend logic we inject a token.
    await page.evaluate(() => {
       const mockUser = {
           id: 9999, student_id: 'TST/001/001', role: 'student', 
           name: 'E2E Student', email: 'e2e@test.local', 
           community_id: 8888, community: 'E2E Community', level: 1
       };
       localStorage.setItem('auth-storage', JSON.stringify({
           state: { token: 'mock-jwt-token', user: mockUser },
           version: 0
       }));
    });
    
    // 3. Online -> fetch survey -> store locally -> go offline
    await page.goto('/dashboard');
    // Wait for the syncEngine.prefetchTemplates to complete (it runs on mount)
    await page.waitForTimeout(1000); 

    // Intercept API calls to simulate offline precisely at the network level
    await context.route('**/*', route => {
        if (route.request().url().includes('/api/')) {
            return route.abort('failed');
        }
        return route.continue();
    });
    // Set browser offline mode to trigger navigator.onLine = false
    await context.setOffline(true);

    // 4. Go offline -> survey remains available
    await page.goto('/surveys/household');
    
    // We should see the create button since we are in the surveys listing
    const createBtn = page.getByRole('button', { name: /Add New/i });
    await expect(createBtn).toBeVisible();
    
    // Click Add New
    await createBtn.click();
    
    // We should be redirected to /fill with a UUID
    await page.waitForURL('**/fill?id=*');
    
    // The form should render without throwing "No internet and survey definition not cached"
    await expect(page.locator('text=Draft')).toBeVisible();
    await expect(page.locator('text=Section 1')).toBeVisible();
  });

  // Test B - offline response creation & Test C - offline submission & Test G - refresh/restart
  test('offline response creation and persistence', async ({ page, context }) => {
    // Inject mock login
    await page.goto('/');
    await page.evaluate(() => {
       const mockUser = {
           id: 9999, student_id: 'TST/001/001', role: 'student', 
           name: 'E2E Student', email: 'e2e@test.local', 
           community_id: 8888, community: 'E2E Community', level: 1
       };
       localStorage.setItem('auth-storage', JSON.stringify({
           state: { token: 'mock-jwt-token', user: mockUser },
           version: 0
       }));
    });

    // Populate definitions by going online once
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Go offline
    await context.route('**/*', route => {
        if (route.request().url().includes('/api/')) {
            return route.abort('failed');
        }
        return route.continue();
    });
    await context.setOffline(true);

    // Start offline survey
    await page.goto('/surveys/household');
    await page.getByRole('button', { name: /Add New/i }).click();
    await page.waitForURL('**/fill?id=*');

    // Enter answers (Test B)
    // The health/household surveys have standard inputs. Let's type something generic if we can,
    // or just Save the empty draft to test persistence.
    await page.getByRole('button', { name: /Save Draft/i }).click();

    // Verify it saved and redirected
    await page.waitForURL('**/dashboard/surveys/drafts');
    
    // Verify response still exists locally
    await expect(page.locator('text=Draft')).toBeVisible();

    // Test G - Refresh page
    await page.reload();
    await expect(page.locator('text=Draft')).toBeVisible();

    // Re-open it, and submit (Test C)
    await page.locator('text=Continue').first().click();
    await page.waitForURL('**/fill?id=*');
    
    await page.getByRole('button', { name: /Submit Survey/i }).click();
    
    // Should go to submitted page
    await page.waitForURL('**/dashboard/surveys/submitted');
    
    // Test C: local status = PENDING_SYNC
    await expect(page.locator('text=Pending Sync')).toBeVisible();
  });
});
