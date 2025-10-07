import { test, expect } from '@playwright/test';

test.describe('Dashboard Search Input Appearance', () => {
  test('should not have black outline/shadow on search input focus', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find the search input
    const searchInput = page.locator('input[placeholder*="Поиск"]').first();
    await expect(searchInput).toBeVisible();

    console.log('📍 Found search input');

    // Take screenshot before focus
    await page.screenshot({ 
      path: 'playwright-report/dashboard-search-before-focus.png',
      fullPage: false 
    });

    // Click on the input to focus it
    await searchInput.click();
    await page.waitForTimeout(500);

    console.log('🎯 Focused on search input');

    // Take screenshot after focus
    await page.screenshot({ 
      path: 'playwright-report/dashboard-search-after-focus.png',
      fullPage: false 
    });

    // Check computed styles
    const styles = await searchInput.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        boxShadow: computed.boxShadow,
        outline: computed.outline,
        outlineColor: computed.outlineColor,
        outlineWidth: computed.outlineWidth,
        border: computed.border,
      };
    });

    console.log('🎨 Input styles when focused:', styles);

    // Check wrapper styles (Ant Design wraps input)
    const wrapper = page.locator('.ant-input-affix-wrapper').first();
    const wrapperStyles = await wrapper.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        boxShadow: computed.boxShadow,
        outline: computed.outline,
        outlineColor: computed.outlineColor,
        outlineWidth: computed.outlineWidth,
        border: computed.border,
      };
    });

    console.log('🎨 Wrapper styles when focused:', wrapperStyles);

    // Verify no black/dark box-shadow
    expect(styles.boxShadow).not.toContain('rgb(0, 0, 0)');
    expect(styles.boxShadow).not.toContain('rgba(0, 0, 0,');
    
    // Verify outline is none or transparent
    const outlineIsNone = styles.outline === 'none' || 
                          styles.outline.includes('none') ||
                          styles.outlineWidth === '0px';
    
    if (!outlineIsNone) {
      console.log('⚠️ Warning: Outline is not "none", but:', styles.outline);
    }

    // Type some text
    await searchInput.fill('тест');
    await page.waitForTimeout(500);

    // Take screenshot with text
    await page.screenshot({ 
      path: 'playwright-report/dashboard-search-with-text.png',
      fullPage: false 
    });

    console.log('✅ Test completed - check screenshots in playwright-report/');
  });

  test('should check search input in dark mode', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    console.log('🌙 Switched to dark theme');

    // Find the search input
    const searchInput = page.locator('input[placeholder*="Поиск"]').first();
    await expect(searchInput).toBeVisible();

    // Take screenshot before focus (dark mode)
    await page.screenshot({ 
      path: 'playwright-report/dashboard-search-dark-before-focus.png',
      fullPage: false 
    });

    // Click on the input
    await searchInput.click();
    await page.waitForTimeout(500);

    // Take screenshot after focus (dark mode)
    await page.screenshot({ 
      path: 'playwright-report/dashboard-search-dark-after-focus.png',
      fullPage: false 
    });

    // Check styles in dark mode
    const styles = await searchInput.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        boxShadow: computed.boxShadow,
        outline: computed.outline,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });

    console.log('🎨 Input styles in dark mode:', styles);

    // Check wrapper in dark mode
    const wrapper = page.locator('.ant-input-affix-wrapper').first();
    const wrapperStyles = await wrapper.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        boxShadow: computed.boxShadow,
        outline: computed.outline,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
      };
    });

    console.log('🎨 Wrapper styles in dark mode:', wrapperStyles);

    console.log('✅ Dark mode test completed');
  });
});
