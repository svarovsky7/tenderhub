import { test, expect } from '@playwright/test';

test.describe('Sidebar Collapse/Expand Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('http://localhost:5173/');
    // Wait for the sidebar to be visible
    await page.waitForSelector('.ant-layout-sider');
  });

  test('should toggle sidebar collapse state', async ({ page }) => {
    // Check initial state - sidebar should be expanded
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toHaveClass(/ant-layout-sider-light/);
    await expect(sidebar).not.toHaveClass(/ant-layout-sider-collapsed/);

    // Find and click the collapse button
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Check collapsed state
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);

    // Click to expand
    const expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Check expanded state
    await expect(sidebar).not.toHaveClass(/ant-layout-sider-collapsed/);
  });

  test('should show popup menu on hover when collapsed', async ({ page }) => {
    // Collapse the sidebar first
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Hover over menu item with submenu (e.g., Libraries)
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Библиотеки' }).first();
    await librariesMenuItem.hover();

    // Wait for popup menu to appear
    await page.waitForTimeout(200);

    // Check if popup submenu is visible
    const popupMenu = page.locator('.ant-menu-submenu-popup').filter({ hasText: 'Материалы' });
    await expect(popupMenu).toBeVisible();

    // Click on a submenu item
    const materialsLink = popupMenu.locator('a', { hasText: 'Материалы' });
    await materialsLink.click();

    // Verify navigation occurred
    await expect(page).toHaveURL(/\/libraries\/materials/);
  });

  test('should navigate through collapsed menu items', async ({ page }) => {
    // Collapse the sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Test navigation for multiple menu items
    const testCases = [
      {
        menuText: 'Коммерция',
        submenuText: 'Финансовые показатели',
        expectedUrl: /\/financial/
      },
      {
        menuText: 'Затраты на строительство',
        submenuText: 'Затраты тендера',
        expectedUrl: /\/construction-costs\/tender/
      },
      {
        menuText: 'Администрирование',
        submenuText: 'Тендеры',
        expectedUrl: /\/tenders/
      }
    ];

    for (const testCase of testCases) {
      // Hover over parent menu item
      const parentMenuItem = page.locator('.ant-menu-submenu').filter({ hasText: testCase.menuText }).first();
      await parentMenuItem.hover();
      await page.waitForTimeout(200);

      // Click on submenu item
      const popupMenu = page.locator('.ant-menu-submenu-popup').filter({ hasText: testCase.submenuText });
      const submenuLink = popupMenu.locator('a', { hasText: testCase.submenuText });

      // Check if submenu is visible and clickable
      await expect(submenuLink).toBeVisible();
      await submenuLink.click();

      // Verify navigation
      await expect(page).toHaveURL(testCase.expectedUrl);

      // Go back to main page for next test
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('.ant-layout-sider-collapsed');
    }
  });

  test('should maintain menu state after navigation', async ({ page }) => {
    // Collapse the sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Navigate to a page through collapsed menu
    const adminMenuItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Администрирование' }).first();
    await adminMenuItem.hover();
    await page.waitForTimeout(200);

    const popupMenu = page.locator('.ant-menu-submenu-popup').filter({ hasText: 'Пользователи' });
    const usersLink = popupMenu.locator('a', { hasText: 'Пользователи' });
    await usersLink.click();

    // Check that sidebar remains collapsed after navigation
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);
  });

  test('should not have visual glitches during hover', async ({ page }) => {
    // Collapse the sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Rapidly hover over multiple menu items
    const menuItems = await page.locator('.ant-menu-submenu').all();

    for (let i = 0; i < Math.min(3, menuItems.length); i++) {
      await menuItems[i].hover();
      await page.waitForTimeout(100);

      // Check that only one popup is visible at a time
      const visiblePopups = await page.locator('.ant-menu-submenu-popup:visible').count();
      expect(visiblePopups).toBeLessThanOrEqual(1);
    }

    // Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    // Check that no popups remain visible
    const remainingPopups = await page.locator('.ant-menu-submenu-popup:visible').count();
    expect(remainingPopups).toBe(0);
  });

  test('should handle direct navigation items in collapsed state', async ({ page }) => {
    // Collapse the sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Click on a direct navigation item (no submenu)
    const dashboardItem = page.locator('.ant-menu-item').filter({ hasText: 'Дашборд' }).first();
    await dashboardItem.click();

    // Verify navigation
    await expect(page).toHaveURL(/\/dashboard/);

    // Sidebar should remain collapsed
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);
  });
});