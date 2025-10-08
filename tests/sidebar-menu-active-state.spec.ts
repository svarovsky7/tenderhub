import { test, expect } from '@playwright/test';

test.describe('Sidebar Menu Active State', () => {
  test('should highlight "Шаблоны" when on templates page', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5176/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click on "Шаблоны" menu item
    await page.click('text=Шаблоны');

    // Wait for navigation
    await page.waitForURL('**/libraries/work-materials');

    // Check that the URL is correct
    expect(page.url()).toContain('/libraries/work-materials');

    // Check that "Шаблоны" menu item is highlighted/active
    const templatesMenuItem = page.locator('[role="menuitem"]').filter({ hasText: 'Шаблоны' });

    // The active menu item should have the 'ant-menu-item-selected' class
    await expect(templatesMenuItem).toHaveClass(/ant-menu-item-selected/);

    // Check that "Справочник" is NOT highlighted
    const librariesMenuItem = page.locator('[role="menuitem"]').filter({ hasText: 'Справочник' });
    await expect(librariesMenuItem).not.toHaveClass(/ant-menu-item-selected/);
  });

  test('should highlight "Справочник" when on libraries page', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5176/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click on "Справочник" menu item
    await page.click('text=Справочник');

    // Wait for navigation
    await page.waitForURL('**/libraries');

    // Check that the URL is correct
    expect(page.url()).toContain('/libraries');
    expect(page.url()).not.toContain('/libraries/work-materials');

    // Check that "Справочник" menu item is highlighted/active
    const librariesMenuItem = page.locator('[role="menuitem"]').filter({ hasText: 'Справочник' });
    await expect(librariesMenuItem).toHaveClass(/ant-menu-item-selected/);

    // Check that "Шаблоны" is NOT highlighted
    const templatesMenuItem = page.locator('[role="menuitem"]').filter({ hasText: 'Шаблоны' });
    await expect(templatesMenuItem).not.toHaveClass(/ant-menu-item-selected/);
  });
});
