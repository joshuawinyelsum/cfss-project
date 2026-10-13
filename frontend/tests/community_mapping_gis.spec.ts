import { test, expect } from '@playwright/test';

test.describe('Community Mapping & Field GIS Workflow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    // Student login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'S001');
    await page.fill('input[type="password"]', 'studentpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 25000 });
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 45000 });
  });

  test('Community GIS Map page loads with scale bar, compass, and controls', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page).toHaveURL('/dashboard/map');

    // Header title and community badge should be visible
    await expect(page.locator('text=Community Field GIS').first()).toBeVisible({ timeout: 20000 });

    // Handle missing community coordinates modal if open
    const setupModalHeading = page.locator('text=Community Location Establishment');
    if (await setupModalHeading.isVisible()) {
      await page.fill('input[placeholder="e.g. 5.6037"]', '9.4523');
      await page.fill('input[placeholder="e.g. -0.1870"]', '-1.5542');
      await page.click('button:has-text("Save Coordinates")');
      await expect(setupModalHeading).toBeHidden({ timeout: 10000 });
    }

    // Leaflet map container should be present
    const mapElement = page.locator('.leaflet-container');
    await expect(mapElement).toBeVisible({ timeout: 15000 });

    // Scale control should be rendered
    const scaleControl = page.locator('.leaflet-control-scale');
    await expect(scaleControl).toBeVisible();

    // North compass arrow indicator should be rendered
    await expect(page.locator('[data-testid="compass-north"]')).toBeVisible();

    // GIS Register legend should be visible
    await expect(page.locator('text=GIS Register').first()).toBeVisible();
    await expect(page.locator('text=Households').first()).toBeVisible();

    // Mode toggles should be visible
    await expect(page.locator('button:has-text("Boundary")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Roads & Paths")').first()).toBeVisible();
  });

  test('Base map style switcher smoothly toggles between Streets, Satellite, Hybrid, and Terrain', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Check style buttons exist
    const streetsBtn = page.locator('button:has-text("Streets")');
    const satBtn = page.locator('button:has-text("Satellite")');
    const hybridBtn = page.locator('button:has-text("Hybrid")');
    const terrainBtn = page.locator('button:has-text("Terrain")');

    await expect(streetsBtn).toBeVisible();
    await expect(satBtn).toBeVisible();
    await expect(hybridBtn).toBeVisible();
    await expect(terrainBtn).toBeVisible();

    // Switch to Satellite
    await satBtn.click();
    await expect(satBtn).toHaveClass(/bg-\[#093C22\]/);
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Switch to Hybrid
    await hybridBtn.click();
    await expect(hybridBtn).toHaveClass(/bg-\[#093C22\]/);
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Switch to Terrain
    await terrainBtn.click();
    await expect(terrainBtn).toHaveClass(/bg-\[#093C22\]/);
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Switch back to Streets
    await streetsBtn.click();
    await expect(streetsBtn).toHaveClass(/bg-\[#093C22\]/);
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('Official Community Report Map print modal opens with institutional layout', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Click "Report Map" button
    const reportBtn = page.locator('button:has-text("Report Map")').first();
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // Verify Report Modal is open
    await expect(page.locator('text=Official Community Fieldwork Map Report').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=COMMUNITY & FIELD SURVEY SYSTEM (CFSS)').first()).toBeVisible();
    await expect(page.locator('text=Field Assets & Surveys Inventory').first()).toBeVisible();
    await expect(page.locator('button:has-text("Print Map")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Save PDF")').first()).toBeVisible();

    // Close the modal
    const closeBtn = page.locator('button[aria-label="Close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('text=Official Community Fieldwork Map Report')).toBeHidden({ timeout: 5000 });
  });

  test('Boundary workflow allows drawing, vertex editing, and cancel', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Activate Boundary mode
    const boundaryModeBtn = page.locator('button:has-text("Boundary")').first();
    await expect(boundaryModeBtn).toBeVisible();
    await boundaryModeBtn.click();

    // Verify boundary sub-toolbar appears
    await expect(page.locator('text=Community Territorial Boundary')).toBeVisible();

    // Check for drawing or editing actions
    const drawOrAddBtn = page.locator('button:has-text("Draw Boundary"), button:has-text("Add Zone")').first();
    await expect(drawOrAddBtn).toBeVisible();

    // Toggle draw action
    await drawOrAddBtn.click();
    await expect(page.locator('text=Tracing Boundary Polygon')).toBeVisible();
    await expect(page.locator('button:has-text("Finish Polygon")')).toBeVisible();

    // Cancel drawing
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(page.locator('text=Tracing Boundary Polygon')).toBeHidden();
  });

  test('Roads & Pathways workflow provides route classification and drawing options', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Activate Roads mode
    const roadsModeBtn = page.locator('button:has-text("Roads & Paths")').first();
    await expect(roadsModeBtn).toBeVisible();
    await roadsModeBtn.click();

    // Verify roads sub-toolbar appears
    await expect(page.locator('text=Roads & Pathways Mapping')).toBeVisible();
    await expect(page.locator('text=Major Road')).toBeVisible();
    await expect(page.locator('text=Local Road')).toBeVisible();
    await expect(page.locator('text=Footpath / Trail')).toBeVisible();

    // Check Draw Route Line button
    const drawRouteBtn = page.locator('button:has-text("Draw Route Line")');
    await expect(drawRouteBtn).toBeVisible();
    await drawRouteBtn.click();

    // Verify tracing route banner
    await expect(page.locator('button:has-text("Finish Route")')).toBeVisible();

    // Cancel drawing route
    await page.locator('button:has-text("Cancel")').first().click();
    await expect(page.locator('button:has-text("Finish Route")')).toBeHidden();
  });

  test('Survey Form renders GPS Capture widget, enforces facility validation for institutions, and saves', async ({ page }) => {
    // 1. Test Facility Validation on Education Survey
    await page.goto('/surveys/education/fill?id=new');
    await expect(page).toHaveURL(/.*\/surveys\/education\/fill.*/);

    // Verify mandatory School Name notice in Field Location
    await expect(page.locator('text=School / Institution Name')).toBeVisible({ timeout: 20000 });

    // Attempting to submit without school name shows error
    const submitBtn = page.getByRole('button', { name: 'Submit Survey' });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(page.locator('text=Facility Name Required').first()).toBeVisible({ timeout: 5000 });

    // 2. Test Household Survey coordinate entry
    await page.goto('/surveys/household/fill?id=new');
    await expect(page).toHaveURL(/.*\/surveys\/household\/fill.*/);

    // GPS Capture Card should be visible
    await expect(page.getByRole('heading', { name: 'Field Location' })).toBeVisible({ timeout: 20000 });

    // Toggle manual input drawer
    const manualBtn = page.getByRole('button', { name: 'Manual' });
    await expect(manualBtn).toBeVisible();
    await manualBtn.click();

    // Fill manual coordinates
    const latInput = page.locator('input[placeholder="e.g. 5.6037"]');
    const lngInput = page.locator('input[placeholder="e.g. -0.1870"]');
    await latInput.fill('9.45230');
    await lngInput.fill('-1.55420');

    // Enter a label note
    const labelInput = page.locator('input[data-testid="field-location-label"]');
    await labelInput.fill('Test Compound GPS Feature');

    // Apply coordinates
    await page.getByRole('button', { name: 'Apply Coordinates' }).click();

    // Verify coordinates badge is now displayed
    await expect(page.locator('text=9.45230°, -1.55420°').first()).toBeVisible({ timeout: 5000 });

    // Fill first field
    const headNameInput = page.locator('input[placeholder="Enter answer..."]').first();
    if (await headNameInput.isVisible()) {
      await headNameInput.fill('Kofi Mensah');
    }

    // Save survey draft
    const saveDraftBtn = page.getByRole('button', { name: 'Save Draft' });
    await expect(saveDraftBtn).toBeVisible();
    await saveDraftBtn.click();

    // Verify redirection to /dashboard/work after save
    await page.waitForURL('**/dashboard/work', { timeout: 15000 });
    await expect(page).toHaveURL(/.*\/dashboard\/work/);

    // Navigate back to the map to verify the map loads smoothly
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });
  });

  test('Missing-community geocoding lookup proxies through backend with OSM attribution', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Open Location Establishment Modal via Relocate / Set Center Location
    const relocateBtn = page.locator('button:has-text("Relocate"), button:has-text("Set Center Location")').first();
    await expect(relocateBtn).toBeVisible();
    await relocateBtn.click();

    // Verify modal header is visible
    await expect(page.locator('text=Community Location Establishment')).toBeVisible();

    // Search for settlement
    const searchInput = page.locator('input[placeholder="Enter town, village, or district..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Ejisu');

    // Trigger search
    const searchBtn = page.locator('button:has-text("Search")').first();
    await searchBtn.click();

    // Verify OpenStreetMap attribution is visible
    await expect(page.locator('text=OpenStreetMap Nominatim')).toBeVisible();

    // Verify matches found appears
    await expect(page.locator('text=Matches found:')).toBeVisible({ timeout: 15000 });

    // Verify Ejisu match item and Select button
    const selectBtn = page.locator('span:has-text("Select")').first();
    await expect(selectBtn).toBeVisible();
    await selectBtn.click();

    // Verify modal closes after selection
    await expect(page.locator('text=Community Location Establishment')).toBeHidden({ timeout: 10000 });
  });

  test('Map unmounts cleanly without classList or teardown errors when navigating away', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Navigate away to /dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 20000 });

    // Assert that no unhandled page errors occurred during unmount/teardown
    expect(pageErrors.filter(e => e.message.includes('classList'))).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
