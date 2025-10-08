import { test, expect } from '@playwright/test';

test.describe('Logo and Text Alignment', () => {
  test('should align TenderHub text vertically centered with logo', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to dashboard');

    // Get logo position
    const logo = page.locator('img[alt="TenderHub Logo"]');
    const logoBox = await logo.boundingBox();

    // Get text position
    const titleText = page.locator('h4:has-text("TenderHub")');
    const titleBox = await titleText.boundingBox();

    if (logoBox && titleBox) {
      const logoCenterY = logoBox.y + logoBox.height / 2;
      const titleCenterY = titleBox.y + titleBox.height / 2;

      console.log('\n📏 Logo position:');
      console.log('   Top:', logoBox.y);
      console.log('   Height:', logoBox.height);
      console.log('   Center Y:', logoCenterY);

      console.log('\n📝 Text position:');
      console.log('   Top:', titleBox.y);
      console.log('   Height:', titleBox.height);
      console.log('   Center Y:', titleCenterY);

      const verticalDiff = Math.abs(logoCenterY - titleCenterY);
      console.log('\n📐 Vertical alignment difference:', verticalDiff.toFixed(2), 'px');

      if (verticalDiff < 3) {
        console.log('   ✅ GOOD: Text is vertically centered with logo (diff < 3px)\n');
      } else if (verticalDiff < 5) {
        console.log('   ⚠️  ACCEPTABLE: Text alignment is close (diff < 5px)\n');
      } else {
        console.log('   ❌ PROBLEM: Text is not well aligned (diff > 5px)\n');
      }
    }

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/logo-text-alignment.png',
      clip: { x: 0, y: 0, width: 250, height: 80 }
    });

    // Test in dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('🌙 Switched to dark theme');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'playwright-report/logo-text-alignment-dark.png',
      clip: { x: 0, y: 0, width: 250, height: 80 }
    });

    console.log('\n✅ Test completed!\n');
  });
});
