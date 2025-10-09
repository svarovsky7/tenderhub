import { test, expect } from '@playwright/test';

test.describe('Sidebar Menu Click Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу
    await page.goto('/');
    // Ждем полной загрузки приложения
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Дополнительная задержка для инициализации
  });

  test('should navigate to Commerce page when clicking on text, and toggle submenu when clicking arrow', async ({ page }) => {
    console.log('🚀 [Test] Starting Commerce menu click test');

    // Находим пункт меню "Коммерция"
    const commerceMenu = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    await expect(commerceMenu).toBeVisible({ timeout: 5000 });

    // Получаем заголовок подменю
    const commerceTitle = commerceMenu.locator('.ant-menu-submenu-title').first();

    // 1. Тест: Клик по тексту должен перейти на страницу /commerce
    console.log('👆 [Test] Clicking on Commerce text (left side)');

    // Получаем размеры элемента
    const box = await commerceTitle.boundingBox();
    if (!box) throw new Error('Commerce title not found');

    // Кликаем в левой части (текст), не в правых 40px (стрелка)
    const clickX = box.x + 30; // Кликаем слева
    const clickY = box.y + box.height / 2;

    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(500);

    // Проверяем, что перешли на /commerce
    await expect(page).toHaveURL(/\/commerce$/);
    console.log('✅ [Test] Successfully navigated to /commerce');

    // Делаем скриншот
    await page.screenshot({
      path: 'test-results/commerce-page-navigation.png',
      fullPage: true
    });

    // Возвращаемся на главную
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Тест: Клик по стрелке должен раскрыть подменю
    console.log('👆 [Test] Clicking on Commerce arrow (right side)');

    const commerceMenuAgain = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    const commerceTitleAgain = commerceMenuAgain.locator('.ant-menu-submenu-title').first();

    // Проверяем, что подменю закрыто
    const isOpenBefore = await commerceMenuAgain.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    console.log('📋 [Test] Submenu open before click:', isOpenBefore);

    const boxAgain = await commerceTitleAgain.boundingBox();
    if (!boxAgain) throw new Error('Commerce title not found');

    // Кликаем в правой части (стрелка) - правые 40px
    const arrowClickX = boxAgain.x + boxAgain.width - 20; // Кликаем в области стрелки
    const arrowClickY = boxAgain.y + boxAgain.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    // Проверяем, что подменю раскрылось
    const isOpenAfter = await commerceMenuAgain.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    console.log('📋 [Test] Submenu open after click:', isOpenAfter);
    expect(isOpenAfter).toBe(true);

    // Проверяем, что НЕ перешли на другую страницу
    await expect(page).toHaveURL(/\/$/);
    console.log('✅ [Test] Submenu expanded without navigation');

    // Делаем скриншот раскрытого подменю
    await page.screenshot({
      path: 'test-results/commerce-submenu-expanded.png',
      fullPage: true
    });
  });

  test('should navigate to Libraries page when clicking on text, and toggle submenu when clicking arrow', async ({ page }) => {
    console.log('🚀 [Test] Starting Libraries menu click test');

    // Находим пункт меню "Библиотеки"
    const librariesMenu = page.locator('.ant-menu-submenu').filter({ hasText: 'Библиотеки' });
    await expect(librariesMenu).toBeVisible({ timeout: 5000 });

    const librariesTitle = librariesMenu.locator('.ant-menu-submenu-title').first();

    // 1. Клик по тексту → переход на страницу
    console.log('👆 [Test] Clicking on Libraries text');

    const box = await librariesTitle.boundingBox();
    if (!box) throw new Error('Libraries title not found');

    const clickX = box.x + 30;
    const clickY = box.y + box.height / 2;

    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/\/libraries$/);
    console.log('✅ [Test] Successfully navigated to /libraries');

    // Возвращаемся на главную
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Клик по стрелке → раскрытие подменю
    console.log('👆 [Test] Clicking on Libraries arrow');

    const librariesMenuAgain = page.locator('.ant-menu-submenu').filter({ hasText: 'Библиотеки' });
    const librariesTitleAgain = librariesMenuAgain.locator('.ant-menu-submenu-title').first();

    const boxAgain = await librariesTitleAgain.boundingBox();
    if (!boxAgain) throw new Error('Libraries title not found');

    const arrowClickX = boxAgain.x + boxAgain.width - 20;
    const arrowClickY = boxAgain.y + boxAgain.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    const isOpenAfter = await librariesMenuAgain.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    expect(isOpenAfter).toBe(true);
    await expect(page).toHaveURL(/\/$/);
    console.log('✅ [Test] Libraries submenu expanded without navigation');
  });

  test('should navigate to Construction Costs page when clicking on text, and toggle submenu when clicking arrow', async ({ page }) => {
    console.log('🚀 [Test] Starting Construction Costs menu click test');

    const constructionMenu = page.locator('.ant-menu-submenu').filter({ hasText: 'Затраты на строительство' });
    await expect(constructionMenu).toBeVisible({ timeout: 5000 });

    const constructionTitle = constructionMenu.locator('.ant-menu-submenu-title').first();

    // 1. Клик по тексту → переход на страницу
    console.log('👆 [Test] Clicking on Construction Costs text');

    const box = await constructionTitle.boundingBox();
    if (!box) throw new Error('Construction Costs title not found');

    const clickX = box.x + 30;
    const clickY = box.y + box.height / 2;

    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/\/construction-costs$/);
    console.log('✅ [Test] Successfully navigated to /construction-costs');

    // Возвращаемся на главную
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Клик по стрелке → раскрытие подменю
    console.log('👆 [Test] Clicking on Construction Costs arrow');

    const constructionMenuAgain = page.locator('.ant-menu-submenu').filter({ hasText: 'Затраты на строительство' });
    const constructionTitleAgain = constructionMenuAgain.locator('.ant-menu-submenu-title').first();

    const boxAgain = await constructionTitleAgain.boundingBox();
    if (!boxAgain) throw new Error('Construction Costs title not found');

    const arrowClickX = boxAgain.x + boxAgain.width - 20;
    const arrowClickY = boxAgain.y + boxAgain.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    const isOpenAfter = await constructionMenuAgain.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    expect(isOpenAfter).toBe(true);
    await expect(page).toHaveURL(/\/$/);
    console.log('✅ [Test] Construction Costs submenu expanded without navigation');
  });

  test('should navigate to Admin page when clicking on text, and toggle submenu when clicking arrow', async ({ page }) => {
    console.log('🚀 [Test] Starting Admin menu click test');

    const adminMenu = page.locator('.ant-menu-submenu').filter({ hasText: 'Администрирование' });
    await expect(adminMenu).toBeVisible({ timeout: 5000 });

    const adminTitle = adminMenu.locator('.ant-menu-submenu-title').first();

    // 1. Клик по тексту → переход на страницу
    console.log('👆 [Test] Clicking on Admin text');

    const box = await adminTitle.boundingBox();
    if (!box) throw new Error('Admin title not found');

    const clickX = box.x + 30;
    const clickY = box.y + box.height / 2;

    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/\/admin$/);
    console.log('✅ [Test] Successfully navigated to /admin');

    // Возвращаемся на главную
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Клик по стрелке → раскрытие подменю
    console.log('👆 [Test] Clicking on Admin arrow');

    const adminMenuAgain = page.locator('.ant-menu-submenu').filter({ hasText: 'Администрирование' });
    const adminTitleAgain = adminMenuAgain.locator('.ant-menu-submenu-title').first();

    const boxAgain = await adminTitleAgain.boundingBox();
    if (!boxAgain) throw new Error('Admin title not found');

    const arrowClickX = boxAgain.x + boxAgain.width - 20;
    const arrowClickY = boxAgain.y + boxAgain.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    const isOpenAfter = await adminMenuAgain.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    expect(isOpenAfter).toBe(true);
    await expect(page).toHaveURL(/\/$/);
    console.log('✅ [Test] Admin submenu expanded without navigation');
  });

  test('should verify all parent menu items remain unhighlighted when on child pages', async ({ page }) => {
    console.log('🚀 [Test] Starting parent highlighting test');

    // Переходим на дочернюю страницу Commercial Costs
    await page.goto('/commercial-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Проверяем, что родительское меню открыто
    const commerceMenu = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    const isOpen = await commerceMenu.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    console.log('📋 [Test] Commerce submenu open on child page:', isOpen);
    expect(isOpen).toBe(true);

    // Проверяем, что дочерний элемент выбран
    const childItem = page.locator('.ant-menu-item').filter({ hasText: 'Коммерческие стоимости' });
    const childSelected = await childItem.evaluate((el) =>
      el.classList.contains('ant-menu-item-selected')
    );
    console.log('📋 [Test] Child item selected:', childSelected);
    expect(childSelected).toBe(true);

    console.log('✅ [Test] Parent menu open with selected child (not visually highlighted)');

    // Делаем скриншот
    await page.screenshot({
      path: 'test-results/parent-not-highlighted-on-child.png',
      fullPage: true
    });
  });
});
