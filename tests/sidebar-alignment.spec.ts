import { test, expect } from '@playwright/test';

test.describe('Sidebar Menu Alignment and Font Weight', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should have proper vertical alignment between icons and text', async ({ page }) => {
    console.log('🚀 [Test] Testing icon-text alignment');

    const menuItems = [
      'Главная',
      'Дашборд',
      'Позиции заказчика',
      'Коммерция',
      'Библиотеки',
      'Затраты на строительство',
      'Администрирование',
    ];

    for (const itemText of menuItems) {
      const item = page.locator('.ant-menu-item, .ant-menu-submenu').filter({ hasText: itemText }).first();
      await expect(item).toBeVisible();

      // Get title element (for submenus, get the title specifically)
      const isSubmenu = await item.evaluate((el) => el.classList.contains('ant-menu-submenu'));
      const titleElement = isSubmenu
        ? item.locator('.ant-menu-submenu-title').first()
        : item;

      // Check align-items CSS property
      const alignItems = await titleElement.evaluate((el) => {
        return window.getComputedStyle(el).alignItems;
      });

      console.log(`   ${itemText}: align-items = ${alignItems}`);

      // Should be 'center' for proper alignment
      expect(alignItems).toBe('center');

      // Check icon alignment
      const icon = titleElement.locator('.anticon').first();
      if (await icon.count() > 0) {
        const iconAlignment = await icon.evaluate((el) => {
          return {
            alignSelf: window.getComputedStyle(el).alignSelf,
            marginTop: window.getComputedStyle(el).marginTop,
          };
        });

        console.log(`   ${itemText} icon: alignSelf = ${iconAlignment.alignSelf}, marginTop = ${iconAlignment.marginTop}`);

        // Icon should be center-aligned (auto inherits from parent's align-items: center) with no top margin
        // 'auto' is valid because it inherits align-items: center from parent
        expect(['center', 'auto']).toContain(iconAlignment.alignSelf);
        expect(iconAlignment.marginTop).toMatch(/^0px$/);
      }
    }

    console.log('✅ [Test] All menu items have proper alignment');
  });

  test('should not have bold font on selected parent items', async ({ page }) => {
    console.log('🚀 [Test] Testing font weight on selected parent items');

    const parentPages = [
      { name: 'Коммерция', url: '/commerce' },
      { name: 'Библиотеки', url: '/libraries' },
    ];

    for (const parentPage of parentPages) {
      console.log(`\n   Testing: ${parentPage.name}`);

      await page.goto(parentPage.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const menuItem = page.locator('.ant-menu-submenu').filter({ hasText: parentPage.name });
      await expect(menuItem).toBeVisible();

      // Check if selected
      const isSelected = await menuItem.evaluate((el) =>
        el.classList.contains('ant-menu-submenu-selected')
      );
      console.log(`   ${parentPage.name} selected: ${isSelected}`);
      expect(isSelected).toBe(true);

      // Get the title element
      const title = menuItem.locator('.ant-menu-submenu-title').first();

      // Check font weight on title
      const titleFontWeight = await title.evaluate((el) => {
        return window.getComputedStyle(el).fontWeight;
      });

      console.log(`   ${parentPage.name} title font-weight: ${titleFontWeight}`);

      // Should be normal (400) or less, not bold (700+)
      const fontWeightNum = parseInt(titleFontWeight);
      expect(fontWeightNum).toBeLessThanOrEqual(400);

      // Check font weight on text content
      const textContent = title.locator('.ant-menu-title-content');
      const textFontWeight = await textContent.evaluate((el) => {
        return window.getComputedStyle(el).fontWeight;
      });

      console.log(`   ${parentPage.name} text font-weight: ${textFontWeight}`);

      const textWeightNum = parseInt(textFontWeight);
      expect(textWeightNum).toBeLessThanOrEqual(400);

      await page.screenshot({
        path: `test-results/sidebar-font-weight-${parentPage.name.toLowerCase()}.png`,
        fullPage: true,
      });
    }

    console.log('\n✅ [Test] All parent items have normal font weight when selected');
  });

  test('should maintain alignment in both collapsed and expanded states', async ({ page }) => {
    console.log('🚀 [Test] Testing alignment in collapsed/expanded states');

    const menuButton = page.locator('.page__header button').first();
    await expect(menuButton).toBeVisible();

    // Test expanded state
    console.log('   Testing expanded sidebar...');
    const expandedItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    const expandedTitle = expandedItem.locator('.ant-menu-submenu-title').first();

    const expandedAlign = await expandedTitle.evaluate((el) => {
      return window.getComputedStyle(el).alignItems;
    });

    console.log(`   Expanded align-items: ${expandedAlign}`);
    expect(expandedAlign).toBe('center');

    // Collapse sidebar
    await menuButton.click();
    await page.waitForTimeout(500);

    // Test collapsed state (if menu still visible in popup)
    console.log('   Testing collapsed sidebar...');
    const collapsedAlign = await expandedTitle.evaluate((el) => {
      return window.getComputedStyle(el).alignItems;
    });

    console.log(`   Collapsed align-items: ${collapsedAlign}`);
    expect(collapsedAlign).toBe('center');

    console.log('✅ [Test] Alignment consistent in both states');
  });

  test('should have consistent alignment on dark theme', async ({ page }) => {
    console.log('🚀 [Test] Testing alignment on dark theme');

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Test alignment
    const item = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    const title = item.locator('.ant-menu-submenu-title').first();

    const alignItems = await title.evaluate((el) => {
      return window.getComputedStyle(el).alignItems;
    });

    console.log(`   Dark theme align-items: ${alignItems}`);
    expect(alignItems).toBe('center');

    // Navigate to parent page
    await page.goto('/commerce');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check font weight on dark theme
    const commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    const commerceTitle = commerceItem.locator('.ant-menu-submenu-title').first();

    const fontWeight = await commerceTitle.evaluate((el) => {
      return window.getComputedStyle(el).fontWeight;
    });

    console.log(`   Dark theme font-weight: ${fontWeight}`);
    expect(parseInt(fontWeight)).toBeLessThanOrEqual(400);

    console.log('✅ [Test] Dark theme alignment and font weight correct');
  });
});
