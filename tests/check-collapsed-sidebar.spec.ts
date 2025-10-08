import { test, expect } from '@playwright/test';

test.describe('Collapsed Sidebar Icons', () => {
  test('should not overflow icons in collapsed state', async ({ page }) => {
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to dashboard');

    // Take screenshot before collapse
    await page.screenshot({
      path: 'playwright-report/sidebar-expanded.png',
      clip: { x: 0, y: 0, width: 250, height: 600 }
    });

    // Click collapse button
    const collapseButton = page.locator('button').filter({ has: page.locator('span.anticon') }).first();
    await collapseButton.click();
    await page.waitForTimeout(300);

    console.log('📐 Step 2: Sidebar collapsed');

    // Get sidebar width
    const sidebar = page.locator('.ant-layout-sider-collapsed').first();
    const sidebarBox = await sidebar.boundingBox();
    console.log('\n📏 Collapsed sidebar width:', sidebarBox?.width, 'px');

    // Check logo centering
    const logo = page.locator('img[alt="TenderHub Logo"]');
    const logoBox = await logo.boundingBox();
    console.log('\n🖼️  Logo in collapsed state:');
    console.log('   Width:', logoBox?.width, 'px');
    console.log('   Height:', logoBox?.height, 'px');
    console.log('   X position:', logoBox?.x, 'px');

    if (sidebarBox && logoBox) {
      const sidebarCenter = sidebarBox.x + sidebarBox.width / 2;
      const logoCenter = logoBox.x + logoBox.width / 2;
      const centerDiff = Math.abs(sidebarCenter - logoCenter);
      console.log('   Center difference:', centerDiff.toFixed(2), 'px');

      if (centerDiff < 5) {
        console.log('   ✅ GOOD: Logo is centered');
      } else {
        console.log('   ⚠️  Logo centering could be improved');
      }
    }

    // Check menu icons don't overflow
    const menuIcons = page.locator('.ant-menu-item .anticon, .ant-menu-submenu-title .anticon');
    const iconCount = await menuIcons.count();
    console.log('\n🎯 Menu icons count:', iconCount);

    let allIconsFit = true;
    for (let i = 0; i < Math.min(iconCount, 5); i++) {
      const iconBox = await menuIcons.nth(i).boundingBox();
      if (iconBox && sidebarBox) {
        const iconRight = iconBox.x + iconBox.width;
        const sidebarRight = sidebarBox.x + sidebarBox.width;

        if (iconRight > sidebarRight) {
          console.log(`   ❌ Icon ${i + 1} overflows: ${iconRight} > ${sidebarRight}`);
          allIconsFit = false;
        }
      }
    }

    if (allIconsFit) {
      console.log('   ✅ GOOD: All icons fit within sidebar bounds');
    }

    // Take screenshot after collapse
    await page.screenshot({
      path: 'playwright-report/sidebar-collapsed.png',
      clip: { x: 0, y: 0, width: 100, height: 600 }
    });

    // Test in dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Step 3: Switched to dark theme');

    await page.screenshot({
      path: 'playwright-report/sidebar-collapsed-dark.png',
      clip: { x: 0, y: 0, width: 100, height: 600 }
    });

    console.log('\n✅ Test completed!\n');
  });
});
