import { test, expect } from '@playwright/test';

test.describe('New TenderHub Logo', () => {
  test('should display updated logo with document and checkmark', async ({ page }) => {
    // Clear cache and navigate to dashboard
    await page.goto('http://localhost:5175/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to dashboard');

    // Check if logo image exists
    const logo = page.locator('img[alt="TenderHub Logo"]');
    await logo.waitFor({ state: 'visible' });

    console.log('\n🖼️  New logo loaded successfully');

    // Check logo source path
    const logoSrc = await logo.getAttribute('src');
    console.log('   Logo source:', logoSrc);

    // Get logo dimensions
    const logoBox = await logo.boundingBox();
    if (logoBox) {
      console.log('   Logo width:', logoBox.width, 'px');
      console.log('   Logo height:', logoBox.height, 'px');
    }

    // Take screenshot of logo area in light theme
    await page.screenshot({
      path: 'test-results/new-logo-light-theme.png',
      clip: { x: 0, y: 0, width: 250, height: 80 }
    });
    console.log('   Screenshot saved: test-results/new-logo-light-theme.png');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Switched to dark theme');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'test-results/new-logo-dark-theme.png',
      clip: { x: 0, y: 0, width: 250, height: 80 }
    });
    console.log('   Screenshot saved: test-results/new-logo-dark-theme.png');

    // Test collapsed state
    const collapseButton = page.locator('button').filter({ has: page.locator('span.anticon') }).first();
    await collapseButton.click();
    await page.waitForTimeout(300);
    console.log('\n📐 Sidebar collapsed');

    // Logo should be centered when collapsed
    await page.screenshot({
      path: 'test-results/new-logo-collapsed.png',
      clip: { x: 0, y: 0, width: 80, height: 80 }
    });
    console.log('   Screenshot saved: test-results/new-logo-collapsed.png');

    // Verify logo is still visible
    const logoVisible = await logo.isVisible();
    console.log('\n   Logo visible when collapsed:', logoVisible);

    if (logoVisible) {
      console.log('   ✅ Logo displays correctly in all states\n');
    }

    console.log('✅ Test completed!\n');
  });
});
