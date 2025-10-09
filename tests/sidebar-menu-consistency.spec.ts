import { test, expect } from '@playwright/test';

test.describe('Sidebar Menu Visual Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should have consistent styling for all menu items when selected', async ({ page }) => {
    console.log('🚀 [Test] Testing consistent menu item styling');

    const testPages = [
      { name: 'Главная', url: '/', menuText: 'Главная' },
      { name: 'Дашборд', url: '/dashboard', menuText: 'Дашборд' },
      { name: 'Позиции заказчика', url: '/boq', menuText: 'Позиции заказчика' },
      { name: 'Коммерция', url: '/commerce', menuText: 'Коммерция' },
      { name: 'Библиотеки', url: '/libraries', menuText: 'Библиотеки' },
      { name: 'Затраты на строительство', url: '/construction-costs', menuText: 'Затраты на строительство' },
      { name: 'Администрирование', url: '/admin', menuText: 'Администрирование' },
    ];

    const styles: Array<{
      page: string;
      backgroundColor: string;
      textColor: string;
      iconColor: string;
    }> = [];

    // Collect styles from each page
    for (const testPage of testPages) {
      console.log(`\n📋 [Test] Testing page: ${testPage.name}`);

      await page.goto(testPage.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Find the selected menu item (could be .ant-menu-item or .ant-menu-submenu)
      let selectedItem = page.locator('.ant-menu-item-selected').filter({ hasText: testPage.menuText }).first();
      let isRegularItem = await selectedItem.count() > 0;

      if (!isRegularItem) {
        // Check for submenu item
        selectedItem = page.locator('.ant-menu-submenu-selected').filter({ hasText: testPage.menuText }).first();
      }

      const itemCount = await selectedItem.count();
      console.log(`   Found selected item: ${itemCount > 0 ? 'YES' : 'NO'}`);

      if (itemCount === 0) {
        console.warn(`   ⚠️ No selected item found for ${testPage.name}`);
        continue;
      }

      // Get the title element (for regular items it's the item itself, for submenus it's the title)
      const titleElement = isRegularItem
        ? selectedItem
        : selectedItem.locator('.ant-menu-submenu-title').first();

      // Get background color
      const backgroundColor = await titleElement.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Get text color
      const textColor = await titleElement.locator('.ant-menu-title-content').evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Get icon color
      const iconColor = await titleElement.locator('.anticon').first().evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log(`   Background: ${backgroundColor}`);
      console.log(`   Text: ${textColor}`);
      console.log(`   Icon: ${iconColor}`);

      styles.push({
        page: testPage.name,
        backgroundColor,
        textColor,
        iconColor,
      });

      // Take screenshot
      await page.screenshot({
        path: `test-results/menu-selected-${testPage.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true,
      });
    }

    console.log('\n\n📊 [Test] Style Comparison:');
    console.log('─'.repeat(80));

    // Check if all backgrounds are the same
    const uniqueBackgrounds = [...new Set(styles.map(s => s.backgroundColor))];
    const uniqueTextColors = [...new Set(styles.map(s => s.textColor))];
    const uniqueIconColors = [...new Set(styles.map(s => s.iconColor))];

    console.log(`Unique background colors: ${uniqueBackgrounds.length}`);
    uniqueBackgrounds.forEach(bg => {
      const pages = styles.filter(s => s.backgroundColor === bg).map(s => s.page);
      console.log(`   ${bg} → ${pages.join(', ')}`);
    });

    console.log(`\nUnique text colors: ${uniqueTextColors.length}`);
    uniqueTextColors.forEach(color => {
      const pages = styles.filter(s => s.textColor === color).map(s => s.page);
      console.log(`   ${color} → ${pages.join(', ')}`);
    });

    console.log(`\nUnique icon colors: ${uniqueIconColors.length}`);
    uniqueIconColors.forEach(color => {
      const pages = styles.filter(s => s.iconColor === color).map(s => s.page);
      console.log(`   ${color} → ${pages.join(', ')}`);
    });

    // All items should have the same styling
    expect(uniqueBackgrounds.length).toBe(1);
    expect(uniqueTextColors.length).toBe(1);
    expect(uniqueIconColors.length).toBe(1);

    console.log('\n✅ [Test] All menu items have consistent styling!');
  });

  test('should have consistent styling on dark theme', async ({ page }) => {
    console.log('🚀 [Test] Testing dark theme consistency');

    const testPages = [
      { name: 'Главная', url: '/', menuText: 'Главная' },
      { name: 'Позиции заказчика', url: '/boq', menuText: 'Позиции заказчика' },
      { name: 'Коммерция', url: '/commerce', menuText: 'Коммерция' },
    ];

    const styles: Array<{
      page: string;
      backgroundColor: string;
      textColor: string;
    }> = [];

    for (const testPage of testPages) {
      // Load the page first
      await page.goto(testPage.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Find and click theme toggle
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await expect(themeToggle).toBeVisible();

      // Ensure dark theme is enabled
      const isChecked = await themeToggle.evaluate((el) => (el as HTMLInputElement).checked);
      if (!isChecked) {
        await themeToggle.click();
        // Wait for theme transition
        await page.waitForTimeout(800);
      }

      // Verify theme is actually dark by checking sidebar background
      const sidebarBg = await page.locator('.ant-layout-sider').first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log(`   ${testPage.name} sidebar bg: ${sidebarBg}`);

      let selectedItem = page.locator('.ant-menu-item-selected').filter({ hasText: testPage.menuText }).first();
      let isRegularItem = await selectedItem.count() > 0;

      if (!isRegularItem) {
        selectedItem = page.locator('.ant-menu-submenu-selected').filter({ hasText: testPage.menuText }).first();
      }

      const titleElement = isRegularItem
        ? selectedItem
        : selectedItem.locator('.ant-menu-submenu-title').first();

      const backgroundColor = await titleElement.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      const textColor = await titleElement.locator('.ant-menu-title-content').evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log(`${testPage.name}: bg=${backgroundColor}, text=${textColor}`);

      styles.push({
        page: testPage.name,
        backgroundColor,
        textColor,
      });
    }

    const uniqueBackgrounds = [...new Set(styles.map(s => s.backgroundColor))];
    const uniqueTextColors = [...new Set(styles.map(s => s.textColor))];

    console.log(`\nUnique backgrounds: ${uniqueBackgrounds.length}`);
    console.log(`Unique text colors: ${uniqueTextColors.length}`);

    expect(uniqueBackgrounds.length).toBe(1);
    expect(uniqueTextColors.length).toBe(1);

    console.log('✅ [Test] Dark theme styling is consistent');
  });
});
