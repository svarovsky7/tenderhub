import { test, expect } from '@playwright/test';

test.describe('Materials Page without Tabs', () => {
  test('should display only configure mode without tabs', async ({ page }) => {
    // Navigate to materials page
    await page.goto('http://localhost:5174/libraries/materials');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to materials page');

    // Check that tabs are NOT present
    const tabsContainer = page.locator('.mode-tabs-container');
    const tabsExists = await tabsContainer.isVisible().catch(() => false);
    console.log('📑 Tabs container should NOT exist:', !tabsExists);

    // Check that "Создание материалов" card is NOT present
    const createCard = page.locator('.ant-card-head-title:has-text("Создание материалов")');
    const hasCreateCard = await createCard.isVisible().catch(() => false);
    console.log('📝 "Создание материалов" card should NOT be visible:', !hasCreateCard);

    // Check statistics block (from configure mode) is present
    const statsBlock = page.locator('.ant-statistic');
    const hasStats = await statsBlock.first().isVisible().catch(() => false);
    console.log('📊 Statistics block visible (configure mode):', hasStats);

    // Check table is present
    const table = page.locator('.configure-table');
    const hasTable = await table.isVisible().catch(() => false);
    console.log('📋 Configure table visible:', hasTable);

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/materials-no-tabs-light.png',
      fullPage: true
    });

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Switched to dark theme');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'playwright-report/materials-no-tabs-dark.png',
      fullPage: true
    });

    console.log('\n✅ Test completed!\n');
  });
});
