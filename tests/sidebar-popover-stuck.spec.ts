import { test, expect } from '@playwright/test';

test.describe('Sidebar Popover Stuck Issue', () => {
  test('should not leave popover stuck after first collapse-expand cycle', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.ant-layout-sider');

    const sidebar = page.locator('.ant-layout-sider');

    console.log('📍 Initial state: Expanded');

    // First collapse
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(500);
    console.log('📍 State: Collapsed');

    // Hover over Libraries to show popover
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') }).first();
    await librariesMenuItem.hover();
    await page.waitForTimeout(700);

    let popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();
    console.log('✅ Popover visible when hovering');

    // Take screenshot while popover is visible
    await page.screenshot({ path: 'popover-visible-collapsed.png', fullPage: true });

    // Now expand WITHOUT moving mouse away from menu item
    const expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });
    await expandButton.click();
    await page.waitForTimeout(500);
    console.log('📍 State: Expanded (popover should be gone)');

    // Check if popover is stuck
    popover = page.locator('.ant-popover:visible');
    const isPopoverStuck = await popover.isVisible();

    if (isPopoverStuck) {
      console.log('❌ BUG DETECTED: Popover is stuck after expansion!');
      await page.screenshot({ path: 'popover-stuck-expanded.png', fullPage: true });

      // Get popover details
      const popoverCount = await page.locator('.ant-popover:visible').count();
      console.log(`   Stuck popovers count: ${popoverCount}`);

      // Check popover content
      const popoverContent = await popover.textContent();
      console.log(`   Popover content: ${popoverContent}`);
    } else {
      console.log('✅ Popover correctly hidden after expansion');
    }

    // Now collapse again
    await collapseButton.click();
    await page.waitForTimeout(500);
    console.log('📍 State: Collapsed again');

    // Try to hover on a different menu item
    const commerceMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="shop"]') });
    await commerceMenuItem.hover();
    await page.waitForTimeout(700);

    // Check how many popovers are visible
    const visiblePopovers = await page.locator('.ant-popover:visible').count();
    console.log(`ℹ️ Visible popovers after second collapse: ${visiblePopovers}`);

    if (visiblePopovers > 1) {
      console.log('❌ BUG: Multiple popovers visible!');
      await page.screenshot({ path: 'multiple-popovers.png', fullPage: true });
    } else if (visiblePopovers === 1) {
      console.log('✅ Only one popover visible');
    } else {
      console.log('⚠️ No popover visible when hovering');
    }

    // Final expand to check cleanup
    await expandButton.click();
    await page.waitForTimeout(500);

    const finalPopovers = await page.locator('.ant-popover:visible').count();
    console.log(`ℹ️ Final visible popovers after expansion: ${finalPopovers}`);

    expect(finalPopovers).toBe(0);
  });

  test('should handle hover state transitions correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.ant-layout-sider');

    // Collapse
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();
    await page.waitForTimeout(500);

    // Test hovering on menu item while clicking expand button
    const librariesMenuItem = page.locator('.ant-menu-submenu').filter({ has: page.locator('[aria-label="book"]') }).first();

    // Start hovering
    await librariesMenuItem.hover();
    await page.waitForTimeout(500);

    // Verify popover appeared
    let popover = page.locator('.ant-popover:visible');
    await expect(popover).toBeVisible();
    console.log('✅ Popover appeared on hover');

    // Keep hovering and click expand
    const expandButton = page.locator('button').filter({ has: page.locator('.anticon-menu-unfold') });

    // This simulates the problematic scenario: expanding while popover is open
    await Promise.all([
      expandButton.click(),
      page.waitForTimeout(100) // Small delay to let the click register
    ]);

    await page.waitForTimeout(500);

    // Check if popover was properly cleaned up
    popover = page.locator('.ant-popover:visible');
    const isVisible = await popover.isVisible();

    if (isVisible) {
      console.log('❌ Popover stuck after expanding while hovering!');

      // Try to force hide by moving mouse
      await page.mouse.move(0, 0);
      await page.waitForTimeout(500);

      const stillVisible = await popover.isVisible();
      if (stillVisible) {
        console.log('❌ Popover STILL stuck even after moving mouse!');
      } else {
        console.log('⚠️ Popover hidden only after moving mouse');
      }
    } else {
      console.log('✅ Popover properly cleaned up');
    }

    expect(isVisible).toBe(false);
  });
});