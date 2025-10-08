import { test, expect } from '@playwright/test';

test.describe('Dashboard - Value Colors in Dark Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should have colored values (numbers) in dark theme', async ({ page }) => {
    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();
    await page.waitForTimeout(1500);

    // Check first statistic value color - should be blue #1890ff = rgb(24, 144, 255)
    const firstValue = page.locator('.dashboard-stats-container .ant-col:nth-child(1) .ant-statistic-content').first();
    const firstColor = await firstValue.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('First value color (should be blue):', firstColor);

    // Check second statistic value color - should be green #52c41a = rgb(82, 196, 26)
    const secondValue = page.locator('.dashboard-stats-container .ant-col:nth-child(2) .ant-statistic-content').first();
    const secondColor = await secondValue.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('Second value color (should be green):', secondColor);

    // Check third statistic value color - should be purple #722ed1 = rgb(114, 46, 209)
    const thirdValue = page.locator('.dashboard-stats-container .ant-col:nth-child(3) .ant-statistic-content').first();
    const thirdColor = await thirdValue.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('Third value color (should be purple):', thirdColor);

    // Verify colors
    expect(firstColor).toBe('rgb(24, 144, 255)'); // Blue
    expect(secondColor).toBe('rgb(82, 196, 26)'); // Green
    expect(thirdColor).toBe('rgb(114, 46, 209)'); // Purple
  });
});
