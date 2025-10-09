import { test, expect } from '@playwright/test';

test.describe('Commercial Costs Header Visual Check', () => {
  test('should check header border-radius visually', async ({ page }) => {
    test.setTimeout(60000);
    console.log('🚀 Checking Commercial Costs header');

    await page.goto('/commercial-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/commercial-costs-full.png',
      fullPage: true
    });

    // Get header element
    const header = page.locator('.commercial-page-header');
    await header.waitFor({ timeout: 5000 });

    // Get computed styles
    const styles = await header.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        borderRadius: computed.borderRadius,
        borderTopLeftRadius: computed.borderTopLeftRadius,
        borderTopRightRadius: computed.borderTopRightRadius,
        borderBottomLeftRadius: computed.borderBottomLeftRadius,
        borderBottomRightRadius: computed.borderBottomRightRadius,
        overflow: computed.overflow,
      };
    });

    console.log('📊 Header border-radius styles:', styles);

    // Take screenshot of header only
    await header.screenshot({
      path: 'tests/screenshots/commercial-costs-header.png'
    });

    console.log('✅ Screenshots saved');
  });
});
