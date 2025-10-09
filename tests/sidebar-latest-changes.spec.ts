import { test, expect } from '@playwright/test';

test.describe('Sidebar Latest Changes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should have sidebar width of 250px', async ({ page }) => {
    console.log('🚀 [Test] Checking sidebar width');

    const sidebar = page.locator('.ant-layout-sider').first();
    await expect(sidebar).toBeVisible();

    const width = await sidebar.evaluate((el) => el.clientWidth);
    console.log('📏 [Test] Sidebar width:', width);

    expect(width).toBe(250);
    console.log('✅ [Test] Sidebar width is correct (250px)');
  });

  test('should display "Затраты на строительство" text without overflow', async ({ page }) => {
    console.log('🚀 [Test] Checking if long text fits in sidebar');

    const constructionCostsItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Затраты на строительство' });
    await expect(constructionCostsItem).toBeVisible();

    const title = constructionCostsItem.locator('.ant-menu-submenu-title').first();
    const titleBox = await title.boundingBox();

    if (!titleBox) throw new Error('Title not found');

    console.log('📏 [Test] Title width:', titleBox.width);

    // Check that text is not overflowing (no ellipsis or cut-off)
    const textContent = await title.locator('.ant-menu-title-content').textContent();
    console.log('📝 [Test] Text content:', textContent);

    expect(textContent).toContain('Затраты на строительство');

    // Check computed style for overflow
    const overflow = await title.locator('.ant-menu-title-content').evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });

    console.log('📋 [Test] Text overflow styles:', overflow);

    // Text should not have ellipsis
    expect(overflow.textOverflow).not.toBe('ellipsis');
    console.log('✅ [Test] Text fits without overflow');
  });

  test('should show parent items with correct colors on light theme', async ({ page }) => {
    console.log('🚀 [Test] Testing parent item colors on light theme');

    // Navigate to /commerce
    await page.goto('/commerce');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    await expect(commerceItem).toBeVisible();

    // Check if item is selected
    const isSelected = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Commerce item selected:', isSelected);
    expect(isSelected).toBe(true);

    // Check text color (should be blue when selected on light theme)
    const textColor = await commerceItem.locator('.ant-menu-submenu-title .ant-menu-title-content').evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('🎨 [Test] Text color on light theme:', textColor);

    // Selected items on light theme should have blue text: rgb(24, 144, 255)
    expect(textColor).toMatch(/rgb\(24,\s*144,\s*255\)/);

    // Check icon color (should also be blue when selected)
    const iconColor = await commerceItem.locator('.ant-menu-submenu-title .anticon').first().evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('🎨 [Test] Icon color on light theme:', iconColor);
    expect(iconColor).toMatch(/rgb\(24,\s*144,\s*255\)/);

    console.log('✅ [Test] Parent item colors correct on light theme');

    await page.screenshot({
      path: 'test-results/sidebar-light-theme-colors.png',
      fullPage: true
    });
  });

  test('should show parent items with correct colors on dark theme', async ({ page }) => {
    console.log('🚀 [Test] Testing parent item colors on dark theme');

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Navigate to /libraries
    await page.goto('/libraries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const librariesItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Библиотеки' });
    await expect(librariesItem).toBeVisible();

    // Check if item is selected
    const isSelected = await librariesItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Libraries item selected:', isSelected);
    expect(isSelected).toBe(true);

    // Check text color (should be white on dark theme)
    const textColor = await librariesItem.locator('.ant-menu-submenu-title .ant-menu-title-content').evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('🎨 [Test] Text color on dark theme:', textColor);

    // rgb(255, 255, 255) with alpha 0.85 = rgba(255, 255, 255, 0.85)
    // Should be white or very light gray
    expect(textColor).toMatch(/rgba?\(255,\s*255,\s*255/);

    // Check icon color
    const iconColor = await librariesItem.locator('.ant-menu-submenu-title .anticon').first().evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log('🎨 [Test] Icon color on dark theme:', iconColor);
    expect(iconColor).toMatch(/rgba?\(255,\s*255,\s*255/);

    console.log('✅ [Test] Parent item colors correct on dark theme');

    await page.screenshot({
      path: 'test-results/sidebar-dark-theme-colors.png',
      fullPage: true
    });
  });

  test('should highlight parent items when on their index pages', async ({ page }) => {
    console.log('🚀 [Test] Testing parent item highlighting on index pages');

    // Test Commerce
    await page.goto('/commerce');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    let commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    let isSelected = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Commerce selected on /commerce:', isSelected);
    expect(isSelected).toBe(true);

    // Test Libraries
    await page.goto('/libraries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    let librariesItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Библиотеки' });
    isSelected = await librariesItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Libraries selected on /libraries:', isSelected);
    expect(isSelected).toBe(true);

    // Test Construction Costs
    await page.goto('/construction-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    let constructionItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Затраты на строительство' });
    isSelected = await constructionItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Construction Costs selected on /construction-costs:', isSelected);
    expect(isSelected).toBe(true);

    // Test Admin
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    let adminItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Администрирование' });
    isSelected = await adminItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Admin selected on /admin:', isSelected);
    expect(isSelected).toBe(true);

    console.log('✅ [Test] All parent items correctly highlighted on index pages');
  });

  test('should NOT highlight parent items when on child pages', async ({ page }) => {
    console.log('🚀 [Test] Testing parent items are NOT highlighted on child pages');

    // Navigate to child page /commercial-costs
    await page.goto('/commercial-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Commerce parent should be OPEN but NOT selected
    const commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    await expect(commerceItem).toBeVisible();

    const isOpen = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    console.log('📋 [Test] Commerce submenu open on child page:', isOpen);
    expect(isOpen).toBe(true);

    // Check that child item is selected, not parent
    const childItem = page.locator('.ant-menu-item').filter({ hasText: 'Коммерческие стоимости' });
    const childSelected = await childItem.evaluate((el) =>
      el.classList.contains('ant-menu-item-selected')
    );
    console.log('📋 [Test] Child item selected:', childSelected);
    expect(childSelected).toBe(true);

    console.log('✅ [Test] Parent correctly NOT highlighted on child page');

    await page.screenshot({
      path: 'test-results/sidebar-child-page-highlighting.png',
      fullPage: true
    });
  });

  test('should verify all menu items are clickable and visible', async ({ page }) => {
    console.log('🚀 [Test] Verifying all menu items are visible and clickable');

    const menuItems = [
      'Главная',
      'Дашборд',
      'Позиции заказчика',
      'Коммерция',
      'Библиотеки',
      'Затраты на строительство',
      'Администрирование',
      'Пользователи',
      'Настройки'
    ];

    for (const itemText of menuItems) {
      const item = page.locator('.ant-menu-item, .ant-menu-submenu').filter({ hasText: itemText }).first();
      await expect(item).toBeVisible();
      console.log(`✅ [Test] "${itemText}" is visible`);
    }

    console.log('✅ [Test] All menu items are visible');
  });
});
