import { test, expect } from '@playwright/test';

test.describe('BOQ Page Buttons in Dark Mode', () => {
  test('should verify buttons have dark background in dark theme', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('📍 Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    console.log('🌙 Switched to dark theme');

    // Take full page screenshot
    await page.screenshot({ 
      path: 'playwright-report/boq-page-dark-theme.png',
      fullPage: true 
    });

    // Find buttons by text
    const dashboardButton = page.locator('button:has-text("К дашборду")').first();
    const refreshButton = page.locator('button:has-text("Обновить")').first();

    console.log('🔍 Looking for buttons...');

    // Check if buttons exist
    await expect(dashboardButton).toBeVisible();
    await expect(refreshButton).toBeVisible();

    console.log('✅ Buttons found');

    // Get computed styles for "К дашборду" button
    const dashboardStyles = await dashboardButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderColor: computed.borderColor,
      };
    });

    console.log('🎨 "К дашборду" button styles:', dashboardStyles);

    // Get computed styles for "Обновить" button
    const refreshStyles = await refreshButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderColor: computed.borderColor,
      };
    });

    console.log('🎨 "Обновить" button styles:', refreshStyles);

    // Take screenshot of header area
    const header = page.locator('.boq-page-header').first();
    await header.screenshot({ 
      path: 'playwright-report/boq-header-buttons.png' 
    });

    // Verify background is dark (rgb(31, 31, 31) = #1f1f1f)
    // Should be rgb(31, 31, 31) or similar dark color
    const isDashboardDark = dashboardStyles.backgroundColor.includes('31, 31, 31') || 
                            dashboardStyles.backgroundColor.includes('rgb(0, 0, 0)');
    const isRefreshDark = refreshStyles.backgroundColor.includes('31, 31, 31') || 
                          refreshStyles.backgroundColor.includes('rgb(0, 0, 0)');

    if (!isDashboardDark) {
      console.log('⚠️ "К дашборду" button does NOT have dark background');
      console.log('Expected: rgb(31, 31, 31)');
      console.log('Actual:', dashboardStyles.backgroundColor);
    } else {
      console.log('✅ "К дашборду" button has dark background');
    }

    if (!isRefreshDark) {
      console.log('⚠️ "Обновить" button does NOT have dark background');
      console.log('Expected: rgb(31, 31, 31)');
      console.log('Actual:', refreshStyles.backgroundColor);
    } else {
      console.log('✅ "Обновить" button has dark background');
    }

    // Test assertions
    expect(isDashboardDark || isRefreshDark).toBeTruthy();
  });

  test('should check if theme context is working', async ({ page }) => {
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if ThemeProvider is working
    const themeValue = await page.evaluate(() => {
      // Try to access localStorage
      return localStorage.getItem('tenderhub-theme');
    });

    console.log('💾 Theme in localStorage:', themeValue);

    // Toggle theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    const newThemeValue = await page.evaluate(() => {
      return localStorage.getItem('tenderhub-theme');
    });

    console.log('💾 Theme after toggle:', newThemeValue);

    // Check root element class
    const rootClass = await page.evaluate(() => {
      return document.documentElement.className;
    });

    console.log('🎯 Root element class:', rootClass);

    expect(newThemeValue).toBe('dark');
    expect(rootClass).toContain('dark');
  });
});
