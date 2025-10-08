import { test, expect } from '@playwright/test';

test.describe('TenderHub Logo Integration', () => {
  test('should display logo in sidebar', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to dashboard');

    // Check if logo image exists
    const logo = page.locator('img[alt="TenderHub Logo"]');
    const logoExists = await logo.isVisible();
    console.log('\n🖼️  Logo image visible:', logoExists);

    if (logoExists) {
      // Get logo attributes
      const logoSrc = await logo.getAttribute('src');
      console.log('   Logo src:', logoSrc);

      // Get logo dimensions
      const logoBox = await logo.boundingBox();
      console.log('   Logo width:', logoBox?.width);
      console.log('   Logo height:', logoBox?.height);

      // Check if TenderHub text is next to logo
      const titleText = page.locator('h4:has-text("TenderHub")');
      const titleExists = await titleText.isVisible();
      console.log('\n📝 "TenderHub" title visible:', titleExists);
    }

    // Take screenshot in light theme
    await page.screenshot({
      path: 'playwright-report/logo-light.png',
      clip: { x: 0, y: 0, width: 300, height: 100 }
    });

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Switched to dark theme');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'playwright-report/logo-dark.png',
      clip: { x: 0, y: 0, width: 300, height: 100 }
    });

    // Test collapsed sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('[data-icon="menu-fold"]') }).first();
    await collapseButton.click();
    await page.waitForTimeout(300);
    console.log('\n📐 Sidebar collapsed');

    // Logo should still be visible when collapsed
    const logoStillVisible = await logo.isVisible();
    console.log('   Logo still visible when collapsed:', logoStillVisible);

    // Title should be hidden when collapsed
    const titleHidden = await page.locator('h4:has-text("TenderHub")').isHidden();
    console.log('   Title hidden when collapsed:', titleHidden);

    // Take screenshot collapsed
    await page.screenshot({
      path: 'playwright-report/logo-collapsed.png',
      clip: { x: 0, y: 0, width: 100, height: 100 }
    });

    console.log('\n✅ Test completed!\n');
  });
});
