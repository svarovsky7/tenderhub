import { test, expect } from '@playwright/test';

test.describe('BOQ Page', () => {
  test('should load BOQ page successfully', async ({ page }) => {
    console.log('Navigating to BOQ page...');

    // Navigate to BOQ page
    await page.goto('http://localhost:5176/boq');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if page loaded
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toBeTruthy();

    // Check if tender selector is visible
    const tenderSelector = page.locator('text=Тендер:');
    await expect(tenderSelector).toBeVisible({ timeout: 10000 });

    console.log('✅ BOQ page loaded successfully');
  });

  test('should show tender selection dropdowns', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5176/boq');

    // Wait for tenders to load
    await page.waitForSelector('text=Тендер:', { timeout: 10000 });

    // Check tender name dropdown
    const tenderDropdown = page.locator('.ant-select-selector:has-text("Выберите тендер")');
    await expect(tenderDropdown).toBeVisible();

    // Check version dropdown (should be disabled initially)
    const versionDropdown = page.locator('.ant-select-selector:has-text("Выберите версию")');
    await expect(versionDropdown).toBeVisible();

    console.log('✅ Tender selection dropdowns are visible');
  });
});
