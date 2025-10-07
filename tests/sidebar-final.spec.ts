import { test, expect } from '@playwright/test';

test.describe('Sidebar Final Tests', () => {
  test('complete sidebar functionality', async ({ page }) => {
    // Navigate to the main page
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.ant-layout-sider');

    // Test 1: Initial state - sidebar expanded
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).not.toHaveClass(/ant-layout-sider-collapsed/);
    console.log('✅ Initial state: Sidebar is expanded');

    // Test 2: Collapse the sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);
    console.log('✅ Sidebar collapsed successfully');

    // Test 3: Popover appears on hover
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') }).first();
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    const popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();
    console.log('✅ Popover appears on hover');

    // Test 4: Navigate through popover
    const materialsLink = popover.locator('a[href="/libraries/materials"]').first();
    await materialsLink.click();
    await expect(page).toHaveURL(/\/libraries\/materials/);
    console.log('✅ Navigation through popover works');

    // Test 5: Sidebar remains collapsed after navigation
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);
    console.log('✅ Sidebar remains collapsed after navigation');

    // Test 6: Expand the sidebar
    const expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(300);
    await expect(sidebar).not.toHaveClass(/ant-layout-sider-collapsed/);
    console.log('✅ Sidebar expanded successfully');

    // Test 7: Regular menu works when expanded
    const worksMenuItem = page.locator('.ant-menu-item a[href="/libraries/works"]').first();
    await worksMenuItem.click();
    await expect(page).toHaveURL(/\/libraries\/works/);
    console.log('✅ Regular menu navigation works when expanded');

    console.log('🎉 All sidebar tests passed!');
  });
});