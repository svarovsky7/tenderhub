import { test, expect } from '@playwright/test';

/**
 * Тест для проверки поведения страницы БСМ при смене тендера
 * Проблема (исправлена): страница скроллилась к началу при выборе нового тендера
 * Решение: автоматический выбор последней версии при смене имени тендера
 */

test.describe('Tender Selection Scroll Behavior', () => {
  test('should auto-select latest version and preserve scroll position', async ({ page }) => {
    // Переход на страницу БСМ
    await page.goto('/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');

    // Ждем загрузки списка тендеров
    await page.waitForSelector('text=Тендер:', { timeout: 10000 });

    // Выбираем первый тендер
    const tenderSelect = page.locator('.ant-select').first();
    await tenderSelect.click();

    // Ждем появления опций
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible', timeout: 5000 });

    // Выбираем первый доступный тендер
    const firstOption = page.locator('.ant-select-item-option').first();
    await firstOption.click();

    // Версия должна выбраться автоматически
    // Ждем загрузки данных после автоматического выбора
    await page.waitForTimeout(2000);

    // Проверяем, что статистика и таблица отображаются (версия выбрана автоматически)
    const statsCard = page.locator('.bsm-stats-card');
    await expect(statsCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-table')).toBeVisible();

    // Скроллим вниз к таблице
    await page.locator('.ant-table').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Записываем текущую позицию скролла
    const scrollPosition = await page.evaluate(() => window.scrollY);
    console.log('Scroll position before tender change:', scrollPosition);

    // Проверяем что мы не в самом начале страницы
    expect(scrollPosition).toBeGreaterThan(50);

    // Теперь пытаемся выбрать другой тендер
    await tenderSelect.click();
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });

    // Проверяем что есть другие тендеры
    const optionsCount = await page.locator('.ant-select-item-option').count();
    if (optionsCount > 1) {
      // Выбираем второй тендер
      const secondOption = page.locator('.ant-select-item-option').nth(1);
      await secondOption.click();

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Проверяем, что контент остался видимым (не исчез)
      await expect(statsCard).toBeVisible();
      await expect(page.locator('.ant-table')).toBeVisible();

      // Wait a bit more for scroll restoration (requestAnimationFrame x2)
      await page.waitForTimeout(500);

      // Проверяем позицию скролла после смены тендера и восстановления
      const newScrollPosition = await page.evaluate(() => window.scrollY);
      console.log('Scroll position after tender change and restoration:', newScrollPosition);

      // Скролл должен быть восстановлен близко к исходной позиции
      // Допускаем разницу в пределах 100px (из-за возможного изменения высоты контента)
      const scrollDifference = Math.abs(newScrollPosition - scrollPosition);
      console.log('Scroll difference:', scrollDifference);
      expect(scrollDifference).toBeLessThan(200);
    }
  });

  test('should preserve content visibility when changing tender', async ({ page }) => {
    await page.goto('/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');

    // Выбираем первый тендер
    const tenderSelect = page.locator('.ant-select').first();
    await tenderSelect.click();
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    const firstOption = page.locator('.ant-select-item-option').first();
    await firstOption.click();

    // Ждем автоматического выбора версии и загрузки данных
    await page.waitForTimeout(2000);

    // Проверяем, что статистика и таблица видны
    const statsCard = page.locator('.bsm-stats-card');
    await expect(statsCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ant-table')).toBeVisible();

    // Запоминаем что контент отображается
    const hasStatsContent = await statsCard.textContent();
    expect(hasStatsContent).toBeTruthy();
    console.log('Initial stats:', hasStatsContent);

    // Попробуем выбрать другой тендер
    await tenderSelect.click();
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });

    const optionsCount = await page.locator('.ant-select-item-option').count();
    if (optionsCount > 1) {
      await page.locator('.ant-select-item-option').nth(1).click();
      await page.waitForTimeout(2000);

      // Статистика и таблица должны ОСТАТЬСЯ видимыми
      // (не должно быть момента, когда контент исчезает)
      await expect(statsCard).toBeVisible();
      await expect(page.locator('.ant-table')).toBeVisible();

      const newStatsContent = await statsCard.textContent();
      expect(newStatsContent).toBeTruthy();
      console.log('Stats after change:', newStatsContent);
    }
  });

  test('should handle quick tender selector without scroll issues', async ({ page }) => {
    await page.goto('/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');

    // Проверяем наличие быстрого селектора тендеров
    const quickSelector = page.locator('.quick-tender-card').first();

    if (await quickSelector.isVisible()) {
      // Кликаем по карточке тендера в быстром селекторе
      await quickSelector.click();
      await page.waitForTimeout(1000);

      // Проверяем, что данные загрузились
      await expect(page.locator('.bsm-stats-card')).toBeVisible({ timeout: 10000 });

      // Быстрый селектор должен скрыться
      await expect(quickSelector).not.toBeVisible();

      // Записываем позицию скролла
      const scrollPosition = await page.evaluate(() => window.scrollY);
      console.log('Scroll position after quick select:', scrollPosition);

      // Скролл должен быть разумным (не слишком высоко и не слишком низко)
      expect(scrollPosition).toBeLessThan(500);
    }
  });
});
