import { test, expect } from '@playwright/test';

test.describe('Nomenclatures Page in Admin', () => {
  test('should display nomenclatures page under admin menu', async ({ page }) => {
    // Navigate to nomenclatures page
    await page.goto('http://localhost:5174/admin/nomenclatures');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to nomenclatures page');

    // Check page title
    const pageTitle = page.locator('h2:has-text("Номенклатуры")');
    const hasTitleVisible = await pageTitle.isVisible();
    console.log('📝 "Номенклатуры" title visible:', hasTitleVisible);

    // Check description
    const description = page.locator('text=Создание и управление наименованиями материалов и работ');
    const hasDescription = await description.isVisible();
    console.log('📝 Description visible:', hasDescription);

    // Check materials card
    const materialsCard = page.locator('.ant-card-head-title:has-text("Создание материалов")');
    const hasMaterialsCard = await materialsCard.isVisible();
    console.log('📦 Materials creation card visible:', hasMaterialsCard);

    // Check works card
    const worksCard = page.locator('.ant-card-head-title:has-text("Создание работ")');
    const hasWorksCard = await worksCard.isVisible();
    console.log('🔧 Works creation card visible:', hasWorksCard);

    // Take screenshot in light theme
    await page.screenshot({
      path: 'playwright-report/nomenclatures-light.png',
      fullPage: true
    });

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Switched to dark theme');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'playwright-report/nomenclatures-dark.png',
      fullPage: true
    });

    // Check menu item is selected
    const menuItem = page.locator('.ant-menu-item-selected a:has-text("Номенклатуры")');
    const isMenuSelected = await menuItem.isVisible().catch(() => false);
    console.log('\n📍 Menu item "Номенклатуры" selected:', isMenuSelected);

    console.log('\n✅ Test completed!\n');
  });
});
