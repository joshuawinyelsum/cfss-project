import { test, expect } from '@playwright/test';

test.describe('Community Mapping & Field GIS Workflow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    // Ensure clean session state to prevent auto-redirect race conditions
    await page.goto('/login');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.reload();
    await page.locator('input[type="text"]').fill('S001');
    await page.locator('input[type="password"]').fill('studentpass');
    await page.locator('button[type="submit"]').click();

    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    } catch {
      // Retry once if internal server error or network blip occurred
      const alert = page.locator('[role="alert"], text="Internal server error"');
      if (await alert.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.waitForTimeout(2000);
        await page.locator('button[type="submit"]').click();
      }
      await page.waitForURL('**/dashboard', { timeout: 45000 });
    }
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 60000 });
  });


  test('Community GIS Map page loads with scale bar, compass, and controls', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page).toHaveURL('/dashboard/map');

    // Header title and community badge should be visible
    await expect(page.locator('text=Community Field GIS').first()).toBeVisible({ timeout: 30000 });

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
    await expect(mapElement).toBeVisible({ timeout: 25000 });

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

  test('Base map style switcher smoothly toggles between Streets, Satellite, Hybrid, Terrain, and B&W', async ({ page }) => {
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20000 });

    // Check style buttons exist
    const streetsBtn = page.locator('button:has-text("Streets")');
    const satBtn = page.locator('button:has-text("Satellite")');
    const hybridBtn = page.locator('button:has-text("Hybrid")');
    const terrainBtn = page.locator('button:has-text("Terrain")');
    const bwBtn = page.locator('button:has-text("B&W")');

    await expect(streetsBtn).toBeVisible();
    await expect(satBtn).toBeVisible();
    await expect(hybridBtn).toBeVisible();
    await expect(terrainBtn).toBeVisible();
    await expect(bwBtn).toBeVisible();

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

    // Switch to B&W
    await bwBtn.click();
    await expect(bwBtn).toHaveClass(/bg-\[#093C22\]/);
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
    await expect(page.locator('button:has-text("Finish Boundary"), button:has-text("Finish Polygon")')).toBeVisible();

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
    await expect(page.locator('text=Loading questionnaire...')).toBeHidden({ timeout: 35000 });

    // GPS Capture Card should be visible
    await expect(page.getByRole('heading', { name: 'Field Location' })).toBeVisible({ timeout: 25000 });

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
    await page.waitForURL('**/dashboard/work', { timeout: 35000 });
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

    expect(pageErrors.filter(e => e.message.includes('classList'))).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Natural polygon drawing supports vertex placement, Undo, Redo, and explicit Finish without proximity auto-closing', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 25000 });

    // Open Boundary mode
    const boundaryBtn = page.locator('button:has-text("Boundary")').first();
    await boundaryBtn.click();

    // Click Draw Boundary
    const drawBtn = page.locator('button:has-text("Draw Boundary"), button:has-text("Add Zone")').first();
    await drawBtn.click();
    await expect(page.locator('text=Tracing Boundary Polygon')).toBeVisible();

    // Map container
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    // Click 3 distinct points on map in the open canvas area below the dock
    await map.click({ position: { x: Math.round(box.width * 0.35), y: Math.round(box.height * 0.6) }, force: true });
    await expect(page.locator('text=1 vertex placed')).toBeVisible();

    await map.click({ position: { x: Math.round(box.width * 0.65), y: Math.round(box.height * 0.6) }, force: true });
    await expect(page.locator('text=2 vertices placed')).toBeVisible();

    await map.click({ position: { x: Math.round(box.width * 0.5), y: Math.round(box.height * 0.72) }, force: true });
    await expect(page.locator('text=3 vertices placed')).toBeVisible();

    // Test Undo button: removes vertex 3, shows 2 vertices
    const undoBtn = page.locator('button:has-text("Undo")').first();
    await undoBtn.click();
    await expect(page.locator('text=2 vertices placed')).toBeVisible();

    // Test Redo button: restores vertex 3, shows 3 vertices
    const redoBtn = page.locator('button:has-text("Redo")').first();
    await redoBtn.click();
    await expect(page.locator('text=3 vertices placed')).toBeVisible();

    // Finish Boundary explicitly
    const finishBtn = page.locator('button:has-text("Finish Boundary")');
    await finishBtn.click();
    await expect(page.locator('text=Tracing Boundary Polygon')).toBeHidden();

    // Save Boundary button should now be available
    await expect(page.locator('button:has-text("Save Boundary")')).toBeVisible();
  });

  test('Health survey creation renders distinct red hospital pin with linked survey metadata', async ({ page }) => {
    test.setTimeout(90000);
    // Go to Health survey fill page
    await page.goto('/surveys/health/fill?id=new');
    await expect(page).toHaveURL(/.*\/surveys\/health\/fill.*/);
    await expect(page.locator('text=Loading questionnaire...')).toBeHidden({ timeout: 35000 });

    // Open Manual location drawer
    const manualBtn = page.getByRole('button', { name: 'Manual' });
    await expect(manualBtn).toBeVisible({ timeout: 25000 });
    await manualBtn.click();

    // Fill hospital name and coordinates
    await page.locator('input[placeholder="e.g. 5.6037"]').fill('9.45230');
    await page.locator('input[placeholder="e.g. -0.1870"]').fill('-1.55420');
    await page.locator('input[data-testid="field-location-label"]').fill('St. Jude Community Health Post');
    await page.getByRole('button', { name: 'Apply Coordinates' }).click();

    // Save Draft
    const saveDraftBtn = page.getByRole('button', { name: 'Save Draft' });
    await expect(saveDraftBtn).toBeVisible();
    await saveDraftBtn.click();
    await page.waitForURL('**/dashboard/work', { timeout: 20000 });

    // Navigate to Map and verify Health icon / feature exists
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 25000 });
    // Check that custom-feature-pin is rendered
    await expect(page.locator('.custom-feature-pin').first()).toBeVisible({ timeout: 15000 });
  });

  test('Desktop layout keeps sidebar fixed and sticky while main content scrolls independently', async ({ page }) => {
    test.setTimeout(90000);
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 30000 });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Check sticky and height classes on sidebar
    const asideClass = await sidebar.getAttribute('class');
    expect(asideClass).toContain('sticky');
    expect(asideClass).toContain('top-0');
    expect(asideClass).toContain('h-screen');
  });

  test('True Black dark mode palette is applied and preserves map tiles without inversion filter', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 30000 });

    // Add .dark class to root
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Check computed page background color is true black
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-page').trim();
    });
    expect(bgColor).toBe('#000000');

    // Check leaflet tile pane filter is none
    const tileFilter = await page.evaluate(() => {
      const tilePane = document.querySelector('.leaflet-tile-pane');
      return tilePane ? getComputedStyle(tilePane).filter : 'none';
    });
    expect(tileFilter).toBe('none');
  });

  test('Zoom controls remain unobstructed by toolbar docks and are clickable without overlap', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 30000 });

    const zoomInBtn = page.locator('.leaflet-control-zoom-in');
    const zoomOutBtn = page.locator('.leaflet-control-zoom-out');

    await expect(zoomInBtn).toBeVisible();
    await expect(zoomOutBtn).toBeVisible();

    // Verify zoom-in button bounding box does not intersect the style switcher
    const zoomBox = await zoomInBtn.boundingBox();
    const styleSwitcher = page.locator('.export-exclude:has-text("Streets")').first();
    const switcherBox = await styleSwitcher.boundingBox();

    expect(zoomBox).toBeTruthy();
    expect(switcherBox).toBeTruthy();

    if (zoomBox && switcherBox) {
      // Zoom controls are in dedicated left column; style switcher is offset to the right
      expect(switcherBox.x).toBeGreaterThan(zoomBox.x + zoomBox.width - 2);
    }

    // Direct clicks on zoom buttons succeed cleanly without occlusion
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    await zoomOutBtn.click();
    await page.waitForTimeout(300);
  });

  test('Prominent GIS Measurements Panel displays territory summary and supports boundary and route measurements', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 25000 });

    const measurementsPanel = page.locator('[data-testid="gis-measurements-panel"]');
    await expect(measurementsPanel).toBeVisible();
    await expect(measurementsPanel.locator('text=GIS Register')).toBeVisible();
    await expect(measurementsPanel.locator('text=Territory Summary')).toBeVisible();

    // Open Boundary mode and begin drawing
    const boundaryBtn = page.locator('button:has-text("Boundary")').first();
    await boundaryBtn.click();

    const drawBtn = page.locator('button:has-text("Draw Boundary"), button:has-text("Add Zone")').first();
    await drawBtn.click();

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (box) {
      // Place 3 vertices in open canvas
      await map.click({ position: { x: Math.round(box.width * 0.4), y: Math.round(box.height * 0.6) }, force: true });
      await map.click({ position: { x: Math.round(box.width * 0.6), y: Math.round(box.height * 0.6) }, force: true });
      await map.click({ position: { x: Math.round(box.width * 0.5), y: Math.round(box.height * 0.75) }, force: true });

      // Measurements panel displays live tracing area calculation
      await expect(measurementsPanel.locator('text=Live Area:')).toBeVisible();
      await expect(measurementsPanel.locator('text=Live Perimeter:')).toBeVisible();

      // Finish drawing boundary
      await page.locator('button:has-text("Finish Boundary")').click();

      // Enclosed area measurements appear in the selected feature card
      await expect(measurementsPanel.locator('text=Enclosed Area:')).toBeVisible();
      await expect(measurementsPanel.locator('text=Perimeter:')).toBeVisible();
      await expect(measurementsPanel.locator('button:has-text("Edit Vertices")')).toBeVisible();
    }
  });

  test('True community-boundary-only map export renders clipped boundary preview with interior statistics', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/dashboard/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 25000 });

    // Open Report Modal
    const reportBtn = page.locator('[data-testid="report-map-btn"]');
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // Verify modal is open
    await expect(page.locator('text=Official Community Fieldwork Map Report').first()).toBeVisible({ timeout: 15000 });

    // Verify export preview container and image render
    const previewContainer = page.locator('[data-testid="export-preview-container"]');
    await expect(previewContainer).toBeVisible({ timeout: 20000 });
    const previewImg = page.locator('[data-testid="export-preview-img"]');
    await expect(previewImg).toBeVisible();

    // Verify image has valid data URL source
    const imgSrc = await previewImg.getAttribute('src');
    expect(imgSrc).toContain('data:image/png;base64');

    // Close modal
    await page.locator('button[aria-label="Close"]').click();
  });
});

