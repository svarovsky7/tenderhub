import { test, expect } from '@playwright/test';

test.describe('Sidebar Multiple Toggle Issues', () => {
  test('should handle multiple collapse/expand cycles without popover issues', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.ant-layout-sider');

    const sidebar = page.locator('.ant-layout-sider');

    // First cycle - collapse and expand
    console.log('🔄 Cycle 1: Collapse → Expand');

    // Collapse
    let collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/ant-layout-sider-collapsed/);

    // Test popover on collapsed state
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') }).first();
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    let popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();
    console.log('✅ Cycle 1: Popover works when collapsed');

    // Move mouse away to hide popover
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);

    // Expand
    let expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(300);
    await expect(sidebar).not.toHaveClass(/ant-layout-sider-collapsed/);

    // Check no popovers are stuck when expanded
    popover = page.locator('.ant-popover:visible');
    await expect(popover).not.toBeVisible();
    console.log('✅ Cycle 1: No stuck popovers when expanded');

    // Second cycle
    console.log('🔄 Cycle 2: Collapse → Test → Expand');

    // Collapse again
    collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Test different menu items
    const commerceMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="shop"]') });
    await commerceMenuItem.hover();
    await page.waitForTimeout(500);

    popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();
    console.log('✅ Cycle 2: Commerce popover appears');

    // Move to another menu item
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    // Should only show one popover
    const visiblePopovers = await page.locator('.ant-popover:visible').count();
    expect(visiblePopovers).toBeLessThanOrEqual(1);
    console.log('✅ Cycle 2: Only one popover visible at a time');

    // Expand again
    expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(300);

    // Check for stuck popovers
    popover = page.locator('.ant-popover:visible');
    await expect(popover).not.toBeVisible();
    console.log('✅ Cycle 2: No stuck popovers after expansion');

    // Third cycle - rapid toggling
    console.log('🔄 Cycle 3: Rapid toggling');

    // Rapid collapse-expand
    collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(200);

    expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(200);

    collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(200);

    expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(300);

    // Final check - no stuck popovers
    popover = page.locator('.ant-popover:visible');
    await expect(popover).not.toBeVisible();
    console.log('✅ Cycle 3: No issues after rapid toggling');

    // Test menu functionality after all cycles
    const worksMenuItem = page.locator('.ant-menu-item a[href="/libraries/works"]').first();
    await worksMenuItem.click();
    await expect(page).toHaveURL(/\/libraries\/works/);
    console.log('✅ Menu navigation still works after multiple cycles');

    console.log('🎉 All multiple toggle tests passed!');
  });

  test('should clean up popovers when switching between collapsed states', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.ant-layout-sider');

    // Collapse sidebar
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(300);

    // Hover to show popover
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') }).first();
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    // Popover should be visible
    let popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();

    // Expand while popover is visible
    const expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(300);

    // Popover should be hidden after expansion
    popover = page.locator('.ant-popover:visible');
    await expect(popover).not.toBeVisible();
    console.log('✅ Popover cleaned up when expanding');

    // Check DOM for any hidden but present popovers
    const allPopovers = await page.locator('.ant-popover').count();
    console.log(`ℹ️ Total popovers in DOM: ${allPopovers}`);

    if (allPopovers > 0) {
      // Check if they are properly hidden
      const hiddenPopovers = await page.locator('.ant-popover-hidden').count();
      console.log(`ℹ️ Hidden popovers: ${hiddenPopovers}`);
      expect(hiddenPopovers).toBe(allPopovers);
    }
  });
});