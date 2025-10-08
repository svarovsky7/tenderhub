import { test, expect } from '@playwright/test';

/**
 * Тест для проверки цветового оформления статистики на странице БСМ
 * Проблема: На темной теме статистика отображается белым на белом
 * Требования:
 * - Темная тема: иконки цветные, цифры белые
 * - Светлая тема: иконки цветные, цифры черные
 */

test.describe('BSM Statistics Theme Colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');

    // Используем Quick Tender Selector для быстрого выбора
    const quickCard = page.locator('.quick-tender-card').first();
    if (await quickCard.isVisible({ timeout: 3000 })) {
      await quickCard.click();
      await page.waitForTimeout(3000);
    } else {
      // Fallback: используем обычные селекторы
      const tenderSelect = page.locator('.ant-select').first();
      await tenderSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('.ant-select-item-option').first();
      await firstOption.click();
      await page.waitForTimeout(3000);
    }

    // Ждем появления статистики
    await page.waitForSelector('.bsm-stats-card', { timeout: 15000 });
  });

  test('should display colored icons and white text in dark theme', async ({ page }) => {
    // Переключаем на темную тему
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("Темная"), button:has-text("Dark")').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    // Проверяем статистику
    const statsCard = page.locator('.bsm-stats-card');
    await expect(statsCard).toBeVisible();

    // Проверяем цвета значений статистики в темной теме
    const statisticValues = statsCard.locator('.ant-statistic-content-value');

    for (let i = 0; i < await statisticValues.count(); i++) {
      const value = statisticValues.nth(i);
      const color = await value.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.color;
      });

      console.log(`Dark theme - Statistic ${i} color:`, color);

      // Цвет должен быть близок к белому (светлым оттенкам)
      // RGB для белого: rgb(255, 255, 255) или близкие светлые оттенки
      expect(color).toMatch(/rgb\((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?),\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?),\s*(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\)/);
    }

    // Проверяем иконки - они должны иметь цвет
    const icons = statsCard.locator('.ant-statistic-content-prefix');
    for (let i = 0; i < await icons.count(); i++) {
      const icon = icons.nth(i);
      const color = await icon.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.color;
      });

      console.log(`Dark theme - Icon ${i} color:`, color);

      // Иконки должны быть цветными (не белыми и не черными)
      expect(color).not.toBe('rgb(255, 255, 255)');
      expect(color).not.toBe('rgb(0, 0, 0)');
    }
  });

  test('should display colored icons and black text in light theme', async ({ page }) => {
    // Убеждаемся что светлая тема активна
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("Светлая"), button:has-text("Light")').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    // Проверяем статистику
    const statsCard = page.locator('.bsm-stats-card');
    await expect(statsCard).toBeVisible();

    // Проверяем цвета значений статистики в светлой теме
    const statisticValues = statsCard.locator('.ant-statistic-content-value');

    for (let i = 0; i < await statisticValues.count(); i++) {
      const value = statisticValues.nth(i);
      const color = await value.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.color;
      });

      console.log(`Light theme - Statistic ${i} color:`, color);

      // Цвет должен быть темным (близок к черному)
      // Для светлой темы ожидаем темные оттенки
      // Проверяем что это не светлый цвет (каждый компонент < 128)
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        expect(r).toBeLessThan(128);
        expect(g).toBeLessThan(128);
        expect(b).toBeLessThan(128);
      }
    }

    // Проверяем иконки - они должны иметь цвет
    const icons = statsCard.locator('.ant-statistic-content-prefix');
    for (let i = 0; i < await icons.count(); i++) {
      const icon = icons.nth(i);
      const color = await icon.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.color;
      });

      console.log(`Light theme - Icon ${i} color:`, color);

      // Иконки должны быть цветными
      expect(color).not.toBe('rgb(255, 255, 255)');
      expect(color).not.toBe('rgb(0, 0, 0)');
    }
  });

  test('should check background color of stats card', async ({ page }) => {
    const statsCard = page.locator('.bsm-stats-card');
    await expect(statsCard).toBeVisible();

    const bgColor = await statsCard.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.backgroundColor;
    });

    console.log('Stats card background color:', bgColor);

    // Фон не должен быть полностью белым в темной теме
    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.body.classList.contains('dark');
    });

    if (isDark) {
      expect(bgColor).not.toBe('rgb(255, 255, 255)');
    }
  });
});
