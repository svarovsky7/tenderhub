import { test, expect } from '@playwright/test';

test.describe('Dashboard - Header Text Colors in Dark Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should have colored text in header statistics in dark theme', async ({ page }) => {
    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();
    await page.waitForTimeout(1500); // Wait for theme transition and re-render

    // Debug: Check container classes
    const containerClasses = await page.locator('.dashboard-stats-container').first().getAttribute('class');
    console.log('Container classes:', containerClasses);

    // Check "Всего тендеров" title color - should be blue #1890ff = rgb(24, 144, 255)
    const totalTendersTitle = page.locator('text=Всего тендеров').first();
    if (await totalTendersTitle.count() > 0) {
      const color = await totalTendersTitle.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log('Total tenders title color:', color);

      // Should be blue (#1890ff = rgb(24, 144, 255))
      expect(color).toBe('rgb(24, 144, 255)');
    }

    // Check "Активные тендеры" title color - should be green #52c41a = rgb(82, 196, 26)
    const activeTendersTitle = page.locator('text=Активные тендеры').first();
    if (await activeTendersTitle.count() > 0) {
      const color = await activeTendersTitle.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log('Active tenders title color:', color);

      // Should be green (#52c41a = rgb(82, 196, 26))
      expect(color).toBe('rgb(82, 196, 26)');
    }

    // Check "Общая стоимость" title color - should be purple #722ed1 = rgb(114, 46, 209)
    const totalValueTitle = page.locator('text=Общая стоимость').first();
    if (await totalValueTitle.count() > 0) {
      const color = await totalValueTitle.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log('Total value title color:', color);

      // Should be purple (#722ed1 = rgb(114, 46, 209))
      expect(color).toBe('rgb(114, 46, 209)');
    }
  });
});
