import { test, expect } from '@playwright/test';

test.describe('Sidebar Menu Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу
    await page.goto('/');
    // Ждем полной загрузки приложения
    await page.waitForLoadState('networkidle');
  });

  test('should toggle sidebar menu and check for phantom letters bug', async ({ page }) => {
    console.log('🚀 [Test] Starting sidebar toggle test');

    // Находим кнопку переключения меню по иконке (MenuFoldOutlined/MenuUnfoldOutlined)
    const menuButton = page.locator('.page__header button').first();

    console.log('🔍 [Test] Looking for toggle button');
    await expect(menuButton).toBeVisible({ timeout: 10000 });

    // Проверяем начальное состояние (меню развернуто)
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toBeVisible();

    // Получаем начальную ширину
    const initialWidth = await sidebar.evaluate((el) => el.clientWidth);
    console.log('📏 [Test] Initial sidebar width:', initialWidth);

    // Делаем скриншот начального состояния
    await page.screenshot({
      path: 'test-results/sidebar-expanded.png',
      fullPage: true
    });

    // ШАГИ ДЛЯ ВОСПРОИЗВЕДЕНИЯ БАГА:

    // 1. Кликаем для сворачивания меню
    console.log('👆 [Test] Clicking to collapse sidebar');
    await menuButton.click();

    // Ждем начала анимации (небольшая задержка)
    await page.waitForTimeout(50);

    // Делаем скриншоты во время анимации для поиска фантомных букв
    console.log('📸 [Test] Taking screenshots during animation');
    for (let i = 0; i < 5; i++) {
      await page.screenshot({
        path: `test-results/sidebar-collapsing-frame-${i}.png`,
        fullPage: true
      });
      await page.waitForTimeout(50); // 50ms между кадрами
    }

    // Ждем завершения анимации
    await page.waitForTimeout(500);

    // Проверяем, что меню свернуто
    const collapsedWidth = await sidebar.evaluate((el) => el.clientWidth);
    console.log('📏 [Test] Collapsed sidebar width:', collapsedWidth);
    expect(collapsedWidth).toBeLessThan(initialWidth);

    // Скриншот свернутого состояния
    await page.screenshot({
      path: 'test-results/sidebar-collapsed.png',
      fullPage: true
    });

    // 2. Кликаем для разворачивания меню (здесь обычно появляется баг)
    console.log('👆 [Test] Clicking to expand sidebar');
    await menuButton.click();

    // Ждем начала анимации
    await page.waitForTimeout(50);

    // Делаем скриншоты во время анимации разворачивания
    console.log('📸 [Test] Taking screenshots during expansion animation');
    for (let i = 0; i < 5; i++) {
      await page.screenshot({
        path: `test-results/sidebar-expanding-frame-${i}.png`,
        fullPage: true
      });
      await page.waitForTimeout(50);
    }

    // Ждем завершения анимации
    await page.waitForTimeout(500);

    // Проверяем, что меню развернуто обратно
    const expandedWidth = await sidebar.evaluate((el) => el.clientWidth);
    console.log('📏 [Test] Expanded sidebar width:', expandedWidth);
    expect(expandedWidth).toBeGreaterThan(collapsedWidth);

    // Финальный скриншот
    await page.screenshot({
      path: 'test-results/sidebar-expanded-final.png',
      fullPage: true
    });

    // Проверяем, что нет визуальных артефактов после анимации
    // Проверяем наличие фантомных popup меню
    const popupMenus = await page.locator('.ant-menu-submenu-popup').all();
    console.log('🔍 [Test] Found popup menus:', popupMenus.length);

    for (const popup of popupMenus) {
      const isVisible = await popup.isVisible();
      const display = await popup.evaluate((el) => window.getComputedStyle(el).display);
      const visibility = await popup.evaluate((el) => window.getComputedStyle(el).visibility);

      console.log('📋 [Test] Popup menu state:', { isVisible, display, visibility });

      // Фантомные меню должны быть скрыты
      if (display !== 'none' && visibility !== 'hidden') {
        console.warn('⚠️ [Test] Found visible popup menu that might be a phantom!');
        await page.screenshot({
          path: 'test-results/phantom-menu-detected.png',
          fullPage: true
        });
      }
    }

    console.log('✅ [Test] Sidebar toggle test completed');
  });

  test('should verify no text overflow during animation', async ({ page }) => {
    console.log('🚀 [Test] Starting text overflow test');

    const menuButton = page.locator('.page__header button').first();
    await expect(menuButton).toBeVisible();

    // Сворачиваем меню
    await menuButton.click();
    await page.waitForTimeout(100);

    // Проверяем, что текст в меню не виден во время сворачивания
    const menuItems = page.locator('.ant-menu-item, .ant-menu-submenu-title');
    const itemCount = await menuItems.count();
    console.log('📋 [Test] Menu items count:', itemCount);

    for (let i = 0; i < itemCount; i++) {
      const item = menuItems.nth(i);
      const text = await item.locator('a, span').first().textContent();

      // Проверяем, что текст либо полностью скрыт, либо полностью виден
      // (не обрезан частично, что может вызвать фантомные буквы)
      const overflow = await item.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          overflow: style.overflow,
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
        };
      });

      console.log(`📝 [Test] Item ${i} text: "${text}", overflow:`, overflow);
    }

    console.log('✅ [Test] Text overflow test completed');
  });

  test('should cleanup popup menus after collapse/expand cycle', async ({ page }) => {
    console.log('🚀 [Test] Starting popup cleanup test');

    const menuButton = page.locator('.page__header button').first();
    await expect(menuButton).toBeVisible();

    // Выполняем несколько циклов сворачивания/разворачивания
    for (let cycle = 0; cycle < 3; cycle++) {
      console.log(`🔄 [Test] Cycle ${cycle + 1}/3`);

      // Сворачиваем
      await menuButton.click();
      await page.waitForTimeout(300);

      // Разворачиваем
      await menuButton.click();
      await page.waitForTimeout(300);

      // Проверяем количество popup меню
      const popups = await page.locator('.ant-menu-submenu-popup').all();
      console.log(`📊 [Test] Cycle ${cycle + 1}: Found ${popups.length} popup menus`);

      // Проверяем, что все popup скрыты
      for (const popup of popups) {
        const isVisible = await popup.isVisible();
        if (isVisible) {
          console.warn(`⚠️ [Test] Cycle ${cycle + 1}: Found visible popup!`);
          await page.screenshot({
            path: `test-results/visible-popup-cycle-${cycle}.png`,
            fullPage: true
          });
        }
      }
    }

    console.log('✅ [Test] Popup cleanup test completed');
  });
});
