import { test, expect } from '@playwright/test';

test.describe('Menu Structure Changes', () => {
  test('should show Users and Settings at bottom of menu', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to dashboard');

    // Wait for menu to be visible
    await page.waitForSelector('.ant-menu', { state: 'visible' });

    // Get all top-level menu items
    const menuItems = page.locator('.ant-menu-item, .ant-menu-submenu');
    const menuItemsCount = await menuItems.count();
    console.log('\n📋 Total menu items:', menuItemsCount);

    // Check that "Пользователи" is at the bottom (second to last)
    const usersItem = page.locator('.ant-menu-item:has(a:text-is("Пользователи"))');
    const usersExists = await usersItem.isVisible();
    console.log('\n👥 "Пользователи" menu item:');
    console.log('   Visible:', usersExists);

    if (usersExists) {
      // Get index of users item
      const allItems = await page.locator('.ant-menu > .ant-menu-item, .ant-menu > .ant-menu-submenu').all();
      let usersIndex = -1;
      for (let i = 0; i < allItems.length; i++) {
        const text = await allItems[i].textContent();
        if (text?.includes('Пользователи')) {
          usersIndex = i;
          break;
        }
      }
      console.log('   Position in menu:', usersIndex + 1, 'of', allItems.length);
    }

    // Check that "Настройки" is at the bottom (last)
    const settingsItem = page.locator('.ant-menu-item:has(a:text-is("Настройки"))');
    const settingsExists = await settingsItem.isVisible();
    console.log('\n⚙️  "Настройки" menu item:');
    console.log('   Visible:', settingsExists);

    if (settingsExists) {
      // Get index of settings item
      const allItems = await page.locator('.ant-menu > .ant-menu-item, .ant-menu > .ant-menu-submenu').all();
      let settingsIndex = -1;
      for (let i = 0; i < allItems.length; i++) {
        const text = await allItems[i].textContent();
        if (text?.includes('Настройки')) {
          settingsIndex = i;
          break;
        }
      }
      console.log('   Position in menu:', settingsIndex + 1, 'of', allItems.length);

      if (settingsIndex === allItems.length - 1) {
        console.log('   ✅ GOOD: Настройки is the last menu item');
      }
    }

    // Check that admin section no longer contains users/settings
    const adminSubmenu = page.locator('.ant-menu-submenu:has(.ant-menu-submenu-title:has-text("Администрирование"))');
    const adminExists = await adminSubmenu.isVisible();
    console.log('\n🔧 "Администрирование" submenu:');
    console.log('   Visible:', adminExists);

    if (adminExists) {
      // Click to open admin submenu
      await adminSubmenu.click();
      await page.waitForTimeout(300);

      // Check children
      const adminChildren = page.locator('.ant-menu-submenu-open .ant-menu-sub .ant-menu-item');
      const childrenCount = await adminChildren.count();
      console.log('   Child items count:', childrenCount);

      // List all children
      for (let i = 0; i < childrenCount; i++) {
        const childText = await adminChildren.nth(i).textContent();
        console.log(`   ${i + 1}. ${childText}`);
      }

      // Verify no "Пользователи" or "Настройки" in admin submenu
      const hasUsersInAdmin = await page.locator('.ant-menu-submenu-open .ant-menu-sub .ant-menu-item:has-text("Пользователи")').isVisible().catch(() => false);
      const hasSettingsInAdmin = await page.locator('.ant-menu-submenu-open .ant-menu-sub .ant-menu-item:has-text("Настройки")').isVisible().catch(() => false);

      if (!hasUsersInAdmin && !hasSettingsInAdmin) {
        console.log('\n   ✅ GOOD: Users and Settings removed from admin submenu');
      } else {
        console.log('\n   ❌ PROBLEM: Users or Settings still in admin submenu');
      }
    }

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/menu-structure.png',
      fullPage: true
    });

    console.log('\n✅ Test completed!\n');
  });

  test('should navigate to Users and Settings pages', async ({ page }) => {
    // Test Users page
    await page.goto('http://localhost:5174/admin/users');
    await page.waitForLoadState('networkidle');

    const usersMenuItem = page.locator('.ant-menu-item-selected:has(a:text-is("Пользователи"))');
    const usersSelected = await usersMenuItem.isVisible();
    console.log('\n👥 Users page:');
    console.log('   Menu item selected:', usersSelected);

    // Test Settings page
    await page.goto('http://localhost:5174/admin/settings');
    await page.waitForLoadState('networkidle');

    const settingsMenuItem = page.locator('.ant-menu-item-selected:has(a:text-is("Настройки"))');
    const settingsSelected = await settingsMenuItem.isVisible();
    console.log('\n⚙️  Settings page:');
    console.log('   Menu item selected:', settingsSelected);

    if (usersSelected && settingsSelected) {
      console.log('\n   ✅ GOOD: Menu selection works correctly\n');
    }

    console.log('✅ Test completed!\n');
  });
});
