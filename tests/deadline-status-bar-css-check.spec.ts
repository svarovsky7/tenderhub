import { test, expect } from '@playwright/test';

test.describe('DeadlineStatusBar CSS spacing check', () => {
  test('should verify header margin-bottom CSS values are equal', async ({ page }) => {
    test.setTimeout(60000);
    console.log('🚀 Starting CSS spacing check');

    // Check commercial costs page
    await page.goto('/commercial-costs');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to /commercial-costs');
    await page.waitForTimeout(1000);

    // Get header element
    const commercialHeader = page.locator('.commercial-page-header');
    await commercialHeader.waitFor({ timeout: 5000 });

    // Get computed styles
    const commercialStyles = await commercialHeader.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        marginBottom: styles.marginBottom,
        paddingBottom: styles.paddingBottom,
        borderRadius: styles.borderRadius,
      };
    });

    console.log('📊 /commercial-costs header styles:', commercialStyles);

    // Check financial page
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to /financial');
    await page.waitForTimeout(1000);

    // Get header element
    const financialHeader = page.locator('.financial-page-header');
    await financialHeader.waitFor({ timeout: 5000 });

    // Get computed styles
    const financialStyles = await financialHeader.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        marginBottom: styles.marginBottom,
        paddingBottom: styles.paddingBottom,
        borderRadius: styles.borderRadius,
      };
    });

    console.log('📊 /financial header styles:', financialStyles);

    // Compare margin-bottom values
    console.log(`\n📏 Comparison:`);
    console.log(`   /commercial-costs margin-bottom: ${commercialStyles.marginBottom}`);
    console.log(`   /financial margin-bottom: ${financialStyles.marginBottom}`);

    // Assert that margin-bottom values are equal
    expect(commercialStyles.marginBottom).toBe(financialStyles.marginBottom);

    if (commercialStyles.marginBottom === financialStyles.marginBottom) {
      console.log('✅ SUCCESS: margin-bottom values are equal!');
    } else {
      console.log('❌ FAIL: margin-bottom values are different!');
    }

    // Also compare border-radius for consistency
    console.log(`\n🎨 Border radius check:`);
    console.log(`   /commercial-costs: ${commercialStyles.borderRadius}`);
    console.log(`   /financial: ${financialStyles.borderRadius}`);

    // Border radius should be "16px 16px 0px 0px" (top left, top right, bottom right, bottom left)
    expect(commercialStyles.borderRadius).toContain('16px');
    expect(financialStyles.borderRadius).toContain('16px');

    console.log('✅ Test completed successfully!');
  });
});
