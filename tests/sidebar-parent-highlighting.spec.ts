import { test, expect } from '@playwright/test';

test.describe('Sidebar Parent Menu Highlighting with Expanded Submenu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should keep highlighting on Commerce parent when submenu is expanded', async ({ page }) => {
    console.log('🚀 [Test] Testing Commerce parent highlighting with expanded submenu');

    // Navigate to Commerce page
    await page.goto('/commerce');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    await expect(commerceItem).toBeVisible();

    // Verify it's selected
    const isSelectedBefore = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Commerce selected before expanding:', isSelectedBefore);
    expect(isSelectedBefore).toBe(true);

    // Check background color before expanding
    const titleBefore = commerceItem.locator('.ant-menu-submenu-title').first();
    const bgColorBefore = await titleBefore.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('🎨 [Test] Background color before expanding:', bgColorBefore);
    expect(bgColorBefore).toBe('rgb(230, 244, 255)'); // #e6f4ff

    // Click the arrow to expand submenu
    const box = await titleBefore.boundingBox();
    if (!box) throw new Error('Commerce title not found');

    const arrowClickX = box.x + box.width - 20;
    const arrowClickY = box.y + box.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    // Verify submenu is now open
    const isOpen = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    console.log('📋 [Test] Submenu is open:', isOpen);
    expect(isOpen).toBe(true);

    // Verify it's STILL selected
    const isSelectedAfter = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Commerce selected after expanding:', isSelectedAfter);
    expect(isSelectedAfter).toBe(true);

    // Check background color AFTER expanding - should still be highlighted
    const titleAfter = commerceItem.locator('.ant-menu-submenu-title').first();
    const bgColorAfter = await titleAfter.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('🎨 [Test] Background color after expanding:', bgColorAfter);
    expect(bgColorAfter).toBe('rgb(230, 244, 255)'); // #e6f4ff - MUST STAY THE SAME

    console.log('✅ [Test] Commerce parent highlighting works with expanded submenu');

    await page.screenshot({
      path: 'test-results/parent-highlighting-expanded.png',
      fullPage: true
    });
  });

  test('should keep highlighting on Libraries parent when submenu is expanded', async ({ page }) => {
    console.log('🚀 [Test] Testing Libraries parent highlighting with expanded submenu');

    await page.goto('/libraries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const librariesItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Библиотеки' });
    await expect(librariesItem).toBeVisible();

    const isSelectedBefore = await librariesItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    expect(isSelectedBefore).toBe(true);

    const titleBefore = librariesItem.locator('.ant-menu-submenu-title').first();
    const bgColorBefore = await titleBefore.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('🎨 [Test] Background before:', bgColorBefore);

    // Expand submenu
    const box = await titleBefore.boundingBox();
    if (!box) throw new Error('Libraries title not found');

    const arrowClickX = box.x + box.width - 20;
    const arrowClickY = box.y + box.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    const isOpen = await librariesItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    expect(isOpen).toBe(true);

    const isSelectedAfter = await librariesItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    expect(isSelectedAfter).toBe(true);

    const titleAfter = librariesItem.locator('.ant-menu-submenu-title').first();
    const bgColorAfter = await titleAfter.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('🎨 [Test] Background after:', bgColorAfter);
    expect(bgColorAfter).toBe('rgb(230, 244, 255)');

    console.log('✅ [Test] Libraries parent highlighting works with expanded submenu');
  });

  test('should NOT highlight parent when on child page with expanded submenu', async ({ page }) => {
    console.log('🚀 [Test] Testing parent NOT highlighted on child page');

    // Navigate to child page
    await page.goto('/commercial-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    await expect(commerceItem).toBeVisible();

    // Submenu should be open (auto-opened for child page)
    const isOpen = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    console.log('📋 [Test] Submenu is open on child page:', isOpen);
    expect(isOpen).toBe(true);

    // Parent should NOT have blue background (visual check, not class check)
    // Note: Ant Design adds 'ant-menu-submenu-selected' class when child is selected,
    // but our CSS removes the visual highlighting using :has()
    const commerceTitle = commerceItem.locator('.ant-menu-submenu-title').first();
    const parentBgColor = await commerceTitle.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('🎨 [Test] Parent background on child page:', parentBgColor);
    // Should NOT be the blue highlight color
    expect(parentBgColor).not.toBe('rgb(230, 244, 255)');

    // Child item should be selected
    const childItem = page.locator('.ant-menu-item').filter({ hasText: 'Коммерческие стоимости' });
    const isChildSelected = await childItem.evaluate((el) =>
      el.classList.contains('ant-menu-item-selected')
    );
    console.log('📋 [Test] Child item selected:', isChildSelected);
    expect(isChildSelected).toBe(true);

    console.log('✅ [Test] Parent correctly NOT highlighted on child page');
  });

  test('should maintain highlighting on dark theme with expanded submenu', async ({ page }) => {
    console.log('🚀 [Test] Testing parent highlighting on dark theme');

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    // Wait longer for theme CSS to be applied
    await page.waitForTimeout(1000);

    // Navigate to Commerce
    await page.goto('/commerce');
    await page.waitForLoadState('networkidle');
    // Wait for CSS to be fully applied after navigation
    await page.waitForTimeout(1000);

    const commerceItem = page.locator('.ant-menu-submenu').filter({ hasText: 'Коммерция' });
    await expect(commerceItem).toBeVisible();

    const isSelectedBefore = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    console.log('📋 [Test] Commerce selected in dark theme:', isSelectedBefore);
    expect(isSelectedBefore).toBe(true);

    const titleBefore = commerceItem.locator('.ant-menu-submenu-title').first();

    // Debug: Check all classes on the element
    const classes = await commerceItem.evaluate((el) => el.className);
    console.log('📋 [Test] Commerce item classes:', classes);

    const bgColorBefore = await titleBefore.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        // Check all background-related styles
        background: styles.background,
        // Check if any inline styles
        inlineStyle: (el as HTMLElement).style.backgroundColor
      };
    });
    console.log('🎨 [Test] Dark theme background details:', bgColorBefore);

    // Expand submenu
    const box = await titleBefore.boundingBox();
    if (!box) throw new Error('Commerce title not found');

    const arrowClickX = box.x + box.width - 20;
    const arrowClickY = box.y + box.height / 2;

    await page.mouse.click(arrowClickX, arrowClickY);
    await page.waitForTimeout(500);

    const isOpen = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-open')
    );
    expect(isOpen).toBe(true);

    const isSelectedAfter = await commerceItem.evaluate((el) =>
      el.classList.contains('ant-menu-submenu-selected')
    );
    expect(isSelectedAfter).toBe(true);

    const titleAfter = commerceItem.locator('.ant-menu-submenu-title').first();
    const bgColorAfter = await titleAfter.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('🎨 [Test] Dark theme background after expanding:', bgColorAfter);

    // Check for semi-transparent blue: rgba(24, 144, 255, 0.15)
    const bgString = String(bgColorAfter);
    const isCompletelyTransparent = bgString === 'rgba(0, 0, 0, 0)' || bgString === 'transparent';
    console.log('📋 [Test] Is background completely transparent?', isCompletelyTransparent);

    if (isCompletelyTransparent) {
      throw new Error(`Dark theme background is completely transparent. Expected rgba(24, 144, 255, 0.15) but got ${bgColorAfter}`);
    }

    // Should be semi-transparent blue
    expect(bgColorAfter).toMatch(/rgba?\(24,\s*144,\s*255/); // Should contain blue color

    console.log('✅ [Test] Dark theme parent highlighting works with expanded submenu');

    await page.screenshot({
      path: 'test-results/parent-highlighting-dark-theme.png',
      fullPage: true
    });
  });
});
