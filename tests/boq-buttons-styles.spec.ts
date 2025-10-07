import { test, expect } from '@playwright/test';

test.describe('BOQ Page Buttons Styles and Behavior', () => {
  test('should verify buttons have correct styles in light theme', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('📍 Navigated to BOQ page (light theme)');

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

    console.log('🎨 Light theme - "К дашборду" button styles:', dashboardStyles);

    // Get computed styles for "Обновить" button
    const refreshStyles = await refreshButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderColor: computed.borderColor,
      };
    });

    console.log('🎨 Light theme - "Обновить" button styles:', refreshStyles);

    // Verify "К дашборду" has transparent background
    const isDashboardTransparent =
      dashboardStyles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
      dashboardStyles.backgroundColor === 'transparent';

    if (isDashboardTransparent) {
      console.log('✅ "К дашборду" button has transparent background');
    } else {
      console.log('⚠️ "К дашборду" button background:', dashboardStyles.backgroundColor);
    }

    // Verify "Обновить" has white background
    const isRefreshWhite =
      refreshStyles.backgroundColor.includes('255, 255, 255') ||
      refreshStyles.backgroundColor === 'rgb(255, 255, 255)';

    if (isRefreshWhite) {
      console.log('✅ "Обновить" button has white background');
    } else {
      console.log('⚠️ "Обновить" button background:', refreshStyles.backgroundColor);
    }

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/boq-buttons-light-theme.png',
      fullPage: true
    });

    expect(isDashboardTransparent).toBeTruthy();
    expect(isRefreshWhite).toBeTruthy();
  });

  test('should verify buttons have correct styles in dark theme', async ({ page }) => {
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

    // Find buttons by text
    const dashboardButton = page.locator('button:has-text("К дашборду")').first();
    const refreshButton = page.locator('button:has-text("Обновить")').first();

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

    console.log('🎨 Dark theme - "К дашборду" button styles:', dashboardStyles);

    // Get computed styles for "Обновить" button
    const refreshStyles = await refreshButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderColor: computed.borderColor,
      };
    });

    console.log('🎨 Dark theme - "Обновить" button styles:', refreshStyles);

    // Verify "К дашборду" has transparent background in dark theme
    const isDashboardTransparent =
      dashboardStyles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
      dashboardStyles.backgroundColor === 'transparent';

    // Verify "Обновить" has white background in dark theme (same as light theme)
    const isRefreshWhite =
      refreshStyles.backgroundColor.includes('255, 255, 255') ||
      refreshStyles.backgroundColor === 'rgba(255, 255, 255, 0.95)';

    console.log('✅ Dark theme button verification complete');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/boq-buttons-dark-theme.png',
      fullPage: true
    });

    expect(isDashboardTransparent).toBeTruthy();
    expect(isRefreshWhite).toBeTruthy();
  });

  test('should verify button hover behavior in light theme', async ({ page }) => {
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('📍 Testing button hover behavior in light theme');

    const dashboardButton = page.locator('button:has-text("К дашборду")').first();

    // Hover over button
    await dashboardButton.hover();
    await page.waitForTimeout(500);

    // Get styles after hover
    const hoverStyles = await dashboardButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        transform: computed.transform,
        boxShadow: computed.boxShadow,
      };
    });

    console.log('🎨 Hover styles for "К дашборду":', hoverStyles);

    // Verify blue text color on hover (like commercial-costs)
    const hasBlueText = hoverStyles.color.includes('24, 144, 255') ||
                        hoverStyles.color === 'rgb(24, 144, 255)';

    if (hasBlueText) {
      console.log('✅ Button has blue text on hover in light theme');
    } else {
      console.log('⚠️ Expected blue text on hover, got:', hoverStyles.color);
    }

    // Take screenshot of hover state
    await page.screenshot({
      path: 'playwright-report/boq-button-hover-light.png',
      fullPage: true
    });

    expect(hasBlueText).toBeTruthy();
  });

  test('should verify button hover behavior in dark theme', async ({ page }) => {
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    console.log('📍 Testing button hover behavior in dark theme');

    const dashboardButton = page.locator('button:has-text("К дашборду")').first();

    // Hover over button
    await dashboardButton.hover();
    await page.waitForTimeout(500);

    // Get styles after hover
    const hoverStyles = await dashboardButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        transform: computed.transform,
        boxShadow: computed.boxShadow,
        borderColor: computed.borderColor,
      };
    });

    console.log('🎨 Dark theme hover styles for "К дашборду":', hoverStyles);

    // Verify transform (button lifts up)
    const hasTransform = hoverStyles.transform !== 'none';

    // Verify blue text color on hover (lighter blue #4da8ff)
    const hasBlueText = hoverStyles.color.includes('77, 168, 255') ||
                        hoverStyles.color === 'rgb(77, 168, 255)';

    if (hasTransform) {
      console.log('✅ Button has transform on hover');
    } else {
      console.log('⚠️ No transform detected');
    }

    if (hasBlueText) {
      console.log('✅ Button has blue text on hover in dark theme');
    } else {
      console.log('⚠️ Expected blue text on hover, got:', hoverStyles.color);
    }

    // Take screenshot of hover state
    await page.screenshot({
      path: 'playwright-report/boq-button-hover-dark.png',
      fullPage: true
    });

    expect(hasTransform).toBeTruthy();
    expect(hasBlueText).toBeTruthy();
  });

  test('should verify buttons are clickable and functional', async ({ page }) => {
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('📍 Testing button click functionality');

    const dashboardButton = page.locator('button:has-text("К дашборду")').first();
    const refreshButton = page.locator('button:has-text("Обновить")').first();

    // Test dashboard button click
    await dashboardButton.click();
    await page.waitForTimeout(1000);

    // Check if navigated to dashboard
    const currentUrl = page.url();
    console.log('🔗 Current URL after click:', currentUrl);

    expect(currentUrl).toContain('/dashboard');

    // Navigate back to BOQ
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test refresh button click
    console.log('🔄 Testing refresh button');
    await refreshButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ All button click tests passed');
  });
});
