import { test, expect } from '@playwright/test';

test.describe('Debug Sidebar', () => {
  test('debug collapsed menu', async ({ page }) => {
    // Navigate to the main page
    await page.goto('http://localhost:5173/');

    // Wait for the sidebar to be visible
    await page.waitForSelector('.ant-layout-sider');

    // Find and click the collapse button
    const collapseButton = page.locator('button').filter({ has: page.locator('.anticon-menu-fold') });
    await collapseButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Check if sidebar is collapsed
    const sidebar = page.locator('.ant-layout-sider');
    const isCollapsed = await sidebar.evaluate(el => el.classList.contains('ant-layout-sider-collapsed'));
    console.log('Sidebar collapsed:', isCollapsed);

    // Find all menu items with submenus
    const menuSubmenus = await page.locator('.ant-menu-submenu').all();
    console.log('Found submenu items:', menuSubmenus.length);

    // Try hovering over each submenu
    for (let i = 0; i < menuSubmenus.length; i++) {
      console.log(`Hovering over submenu ${i}`);
      await menuSubmenus[i].hover();
      await page.waitForTimeout(1000);

      // Check for any popup menus after hover
      const popups = await page.locator('.ant-menu-submenu-popup').count();
      console.log(`After hover ${i}: Popup menus found:`, popups);

      if (popups > 0) {
        const visiblePopups = await page.locator('.ant-menu-submenu-popup:visible').count();
        console.log(`Visible popup menus:`, visiblePopups);
        break;
      }
    }

    // Check DOM structure for vertical menu
    const verticalMenus = await page.locator('.ant-menu-vertical').count();
    console.log('Vertical menus:', verticalMenus);

    // Check for any trigger attributes
    const submenuTitles = await page.locator('.ant-menu-submenu-title').all();
    for (let i = 0; i < Math.min(3, submenuTitles.length); i++) {
      const title = submenuTitles[i];
      const text = await title.textContent();
      const hasPopup = await title.getAttribute('aria-haspopup');
      const expanded = await title.getAttribute('aria-expanded');
      console.log(`Submenu ${i} (${text}): haspopup=${hasPopup}, expanded=${expanded}`);
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'sidebar-debug.png', fullPage: true });

    // Also check the DOM structure
    const menuHTML = await page.locator('.ant-menu').first().innerHTML();
    console.log('Menu HTML structure (first 500 chars):', menuHTML.substring(0, 500));
  });
});