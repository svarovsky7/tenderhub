import { test, expect } from '@playwright/test';

test.describe('Sidebar Collapsed with Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.ant-layout-sider');

    // Collapse the sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);
  });

  test('should show popover menu on hover when collapsed', async ({ page }) => {
    // Hover over the menu item with children (e.g., Библиотеки)
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') }).first();
    await librariesMenuItem.hover();

    // Wait for popover to appear
    await page.waitForTimeout(500);

    // Check if popover is visible
    const popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();

    // Check if popover contains expected menu items
    const materialsItem = popover.locator('a[href="/libraries/materials"]').first();
    await expect(materialsItem).toBeVisible();

    const worksItem = popover.locator('a[href="/libraries/works"]');
    await expect(worksItem).toBeVisible();
  });

  test('should navigate through popover menu items', async ({ page }) => {
    // Hover over Библиотеки
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') });
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    // Click on Материалы in the popover
    const popover = page.locator('.ant-popover:visible');
    const materialsLink = popover.locator('a[href="/libraries/materials"]').first();
    await materialsLink.click();

    // Verify navigation
    await expect(page).toHaveURL(/\/libraries\/materials/);

    // Check that sidebar remains collapsed
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);
  });

  test('should show different popovers for different menu items', async ({ page }) => {
    // Test Коммерция submenu
    const commerceMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="shop"]') });
    await commerceMenuItem.hover();
    await page.waitForTimeout(500);

    let popover = page.locator('.ant-popover:visible');
    await expect(popover.locator('text=Коммерческие стоимости')).toBeVisible();
    await expect(popover.locator('text=Финансовые показатели')).toBeVisible();

    // Move away to hide popover
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    // Test Администрирование submenu
    const adminMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="setting"]') });
    await adminMenuItem.hover();
    await page.waitForTimeout(500);

    popover = page.locator('.ant-popover:visible');
    await expect(popover.locator('text=Тендеры')).toBeVisible();
    await expect(popover.locator('text=Пользователи')).toBeVisible();
  });

  test('should handle direct menu items without popover', async ({ page }) => {
    // Click on Dashboard (direct item, no submenu)
    const dashboardItem = page.locator('.ant-menu-item').filter({ has: page.locator('[aria-label="dashboard"]') });
    await dashboardItem.click();

    // Verify navigation
    await expect(page).toHaveURL(/\/dashboard/);

    // No popover should appear
    const popover = page.locator('.ant-popover:visible');
    await expect(popover).not.toBeVisible();
  });

  test('should hide popover when mouse leaves', async ({ page }) => {
    // Hover to show popover
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') });
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    // Verify popover is visible
    let popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();

    // Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    // Verify popover is hidden
    popover = page.locator('.ant-popover:visible');
    await expect(popover).not.toBeVisible();
  });
});