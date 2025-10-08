import { test, expect } from '@playwright/test';

test.describe('Header and Sidebar Alignment', () => {
  test('should check heights of header and sidebar logo section', async ({ page }) => {
    // Navigate to any page
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to dashboard');

    // Get header height
    const header = page.locator('.page__header').first();
    const headerBox = await header.boundingBox();
    console.log('\n📏 Header:');
    console.log('   Height:', headerBox?.height || 'N/A');
    console.log('   Top:', headerBox?.y || 'N/A');

    // Get sidebar logo section height (parent div with border-bottom)
    const sidebarLogo = page.locator('.sidebar h4:has-text("TenderHub")').locator('..').locator('..').locator('..');
    const sidebarLogoBox = await sidebarLogo.boundingBox();
    console.log('\n📏 Sidebar Logo Section:');
    console.log('   Height:', sidebarLogoBox?.height || 'N/A');
    console.log('   Top:', sidebarLogoBox?.y || 'N/A');

    // Check computed styles
    const headerStyles = await header.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        height: computed.height,
        minHeight: computed.minHeight,
        padding: computed.padding,
        lineHeight: computed.lineHeight
      };
    });

    const sidebarStyles = await sidebarLogo.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        height: computed.height,
        minHeight: computed.minHeight,
        padding: computed.padding,
        paddingTop: computed.paddingTop,
        paddingBottom: computed.paddingBottom
      };
    });

    console.log('\n🎨 Header computed styles:');
    console.log('   Height:', headerStyles.height);
    console.log('   Min-height:', headerStyles.minHeight);
    console.log('   Padding:', headerStyles.padding);

    console.log('\n🎨 Sidebar logo computed styles:');
    console.log('   Height:', sidebarStyles.height);
    console.log('   Min-height:', sidebarStyles.minHeight);
    console.log('   Padding:', sidebarStyles.padding);
    console.log('   Padding top:', sidebarStyles.paddingTop);
    console.log('   Padding bottom:', sidebarStyles.paddingBottom);

    // Calculate difference
    if (headerBox && sidebarLogoBox) {
      const diff = Math.abs(headerBox.height - sidebarLogoBox.height);
      console.log('\n📐 Height Difference:', diff, 'px');

      if (diff > 1) {
        console.log('   ⚠️ Heights are NOT aligned (difference > 1px)');
      } else {
        console.log('   ✅ Heights are aligned');
      }
    }

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/header-alignment.png',
      fullPage: false
    });

    console.log('\n✅ Test completed!\n');
  });
});
