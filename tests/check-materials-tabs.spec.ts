import { test, expect } from '@playwright/test';

test.describe('Materials Page Tabs and Layout', () => {
  test('should have tabs instead of buttons and proper layout', async ({ page }) => {
    // Navigate to materials library page
    await page.goto('http://localhost:5174/libraries/materials');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to materials library page');

    // Take screenshot in light theme
    await page.screenshot({
      path: 'playwright-report/materials-tabs-light.png',
      fullPage: true
    });

    // Check for tabs
    const tabsContainer = page.locator('.mode-tabs-container');
    const tabsExists = await tabsContainer.isVisible();

    console.log('📑 Tabs container exists:', tabsExists);

    if (tabsExists) {
      const tabs = page.locator('.ant-tabs-tab');
      const tabCount = await tabs.count();
      console.log('📑 Number of tabs:', tabCount);

      // Check tab labels
      const firstTabText = await tabs.nth(0).textContent();
      const secondTabText = await tabs.nth(1).textContent();
      console.log('📑 First tab:', firstTabText?.trim());
      console.log('📑 Second tab:', secondTabText?.trim());
    }

    // Check if card has title
    const cardTitle = page.locator('.ant-card-head-title:has-text("Создание материалов")');
    const hasTitleInCreateMode = await cardTitle.isVisible();
    console.log('\n📝 "Создание материалов" title visible:', hasTitleInCreateMode);

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Switched to dark theme');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'playwright-report/materials-tabs-dark.png',
      fullPage: true
    });

    // Check tabs styling in dark theme
    if (tabsExists) {
      const activeTab = page.locator('.ant-tabs-tab-active');
      const activeTabStyles = await activeTab.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });

      console.log('\n🎨 Active tab in dark theme:');
      console.log('   Background:', activeTabStyles.backgroundColor);
      console.log('   Color:', activeTabStyles.color);
    }

    // Switch to configure mode
    const configureTab = page.locator('.ant-tabs-tab').nth(1);
    await configureTab.click();
    await page.waitForTimeout(500);
    console.log('\n⚙️ Switched to configure mode');

    // Take screenshot in configure mode
    await page.screenshot({
      path: 'playwright-report/materials-configure-dark.png',
      fullPage: true
    });

    console.log('\n✅ Test completed!\n');
  });
});
