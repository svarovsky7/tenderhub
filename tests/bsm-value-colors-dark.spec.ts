import { test, expect } from '@playwright/test';

test.describe('БСМ Page - Value Colors in Dark Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');
  });

  test('should have colored values in statistics in dark theme', async ({ page }) => {
    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();
    await page.waitForTimeout(1500);

    // Select first tender
    const quickCard = page.locator('.quick-tender-card').first();
    if (await quickCard.isVisible()) {
      await quickCard.click();
      await page.waitForTimeout(1000);

      // Check "Материалов" value - should be blue #1890ff
      const materialsValue = page.locator('.bsm-stats-card .ant-col:nth-child(1) .ant-statistic-content').first();
      if (await materialsValue.count() > 0) {
        const color = await materialsValue.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('Materials value color (should be blue):', color);
        expect(color).toBe('rgb(24, 144, 255)');
      }

      // Check "Работ" value - should be green #52c41a
      const worksValue = page.locator('.bsm-stats-card .ant-col:nth-child(2) .ant-statistic-content').first();
      if (await worksValue.count() > 0) {
        const color = await worksValue.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('Works value color (should be green):', color);
        expect(color).toBe('rgb(82, 196, 26)');
      }

      // Check "Общая стоимость" value - should be purple #722ed1
      const totalValue = page.locator('text=Общая стоимость').locator('..').locator('.ant-statistic-content').first();
      if (await totalValue.count() > 0) {
        const color = await totalValue.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('Total value color (should be purple):', color);
        expect(color).toBe('rgb(114, 46, 209)');
      }
    }
  });
});
