import { test, expect } from '@playwright/test';

test.describe('Dashboard - Dark Theme Color Accents', () => {
  test('should have dark background with color accents in dark theme', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5176/dashboard');
    await page.waitForLoadState('networkidle');

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(page.getByRole('button', { name: /theme/i }));
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Check that statistic cards have dark backgrounds
    const statisticCards = page.locator('.dashboard-stats-container .ant-card');
    const cardCount = await statisticCards.count();

    expect(cardCount).toBeGreaterThan(0);

    // Check each card has dark background
    for (let i = 0; i < cardCount; i++) {
      const card = statisticCards.nth(i);
      const backgroundColor = await card.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Dark background should be approximately rgb(31, 31, 31) with some alpha
      // Check that it's NOT white (rgb(255, 255, 255))
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
      expect(backgroundColor).not.toContain('rgb(240, 242, 245)'); // Light gray
    }

    // Check that color accents are visible
    // "Всего тендеров" should have blue accent (#1890ff)
    const totalTendersValue = page.locator('text=Всего тендеров').locator('..').locator('.ant-statistic-content-value');
    if (await totalTendersValue.count() > 0) {
      const color = await totalTendersValue.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      // Blue color should be present (not default text color)
      expect(color).toContain('24, 144, 255'); // rgb(24, 144, 255) = #1890ff
    }

    // "Активные тендеры" should have green accent (#52c41a)
    const activeTendersValue = page.locator('text=Активные тендеры').locator('..').locator('.ant-statistic-content-value');
    if (await activeTendersValue.count() > 0) {
      const color = await activeTendersValue.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      // Green color should be present
      expect(color).toContain('82, 196, 26'); // rgb(82, 196, 26) = #52c41a
    }

    // "Общая стоимость" should have purple accent (#722ed1)
    const totalValueValue = page.locator('text=Общая стоимость').locator('..').locator('.ant-statistic-content-value');
    if (await totalValueValue.count() > 0) {
      const color = await totalValueValue.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      // Purple color should be present
      expect(color).toContain('114, 46, 209'); // rgb(114, 46, 209) = #722ed1
    }
  });
});
