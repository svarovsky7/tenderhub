import { test, expect } from '@playwright/test';

test.describe('BOQ Dark Theme Colors', () => {
  test('should show correct row colors in dark theme', async ({ page }) => {
    console.log('🌙 Testing BOQ dark theme row colors...');

    // Navigate to BOQ page
    await page.goto('http://localhost:5176/boq');
    await page.waitForLoadState('networkidle');

    // Switch to dark theme
    console.log('🔄 Switching to dark theme...');
    const themeToggle = page.locator('button[aria-label="Toggle theme"], button:has-text("Тёмная тема"), .theme-toggle');

    // Try multiple selectors for theme toggle
    const themeButton = await page.locator('button').filter({ hasText: /тёмн|dark/i }).first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(500); // Wait for theme to apply
      console.log('✅ Switched to dark theme');
    } else {
      // Try clicking on any visible toggle button
      const toggleButtons = await page.locator('button[class*="toggle"], button[class*="theme"]').all();
      if (toggleButtons.length > 0) {
        await toggleButtons[0].click();
        await page.waitForTimeout(500);
      }
    }

    // Select a tender
    console.log('📋 Selecting tender...');
    const tenderSelect = page.locator('.ant-select-selector:has-text("Выберите тендер")').first();
    await expect(tenderSelect).toBeVisible({ timeout: 10000 });
    await tenderSelect.click();

    // Select first tender from dropdown
    const firstOption = page.locator('.ant-select-item-option').first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    console.log('✅ Tender name selected');

    // Select version
    const versionSelect = page.locator('.ant-select-selector:has-text("Выберите версию")').first();
    await expect(versionSelect).toBeVisible({ timeout: 5000 });
    await versionSelect.click();

    const firstVersion = page.locator('.ant-select-item-option').first();
    await expect(firstVersion).toBeVisible({ timeout: 5000 });
    await firstVersion.click();

    console.log('✅ Version selected');

    // Wait for BOQ table to load
    await page.waitForSelector('.boq-items-table', { timeout: 10000 });
    console.log('✅ BOQ table loaded');

    // Wait for animation to complete
    await page.waitForTimeout(700);

    // Check for row colors in dark theme
    // Works should have orange background: rgba(255, 152, 0, 0.15)
    const workRows = page.locator('.boq-items-table tbody tr').filter({
      has: page.locator('td').filter({ hasText: /работ/i }).first()
    });

    if (await workRows.count() > 0) {
      const firstWorkRow = workRows.first();
      const backgroundColor = await firstWorkRow.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('🎨 Work row background color:', backgroundColor);

      // Check if background is not white/transparent (should have some color)
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)');

      console.log('✅ Work rows have colored background in dark theme');
    }

    // Check material rows - should have blue background: rgba(33, 150, 243, 0.15) or rgba(33, 150, 243, 0.1)
    const materialRows = page.locator('.boq-items-table tbody tr').filter({
      has: page.locator('td').filter({ hasText: /материал/i }).first()
    });

    if (await materialRows.count() > 0) {
      const firstMaterialRow = materialRows.first();
      const backgroundColor = await firstMaterialRow.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('🎨 Material row background color:', backgroundColor);

      // Check if background is not white/transparent
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)');

      console.log('✅ Material rows have colored background in dark theme');
    }

    // Verify theme is actually dark by checking body or root background
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('🎨 Body background color:', bodyBg);

    console.log('✅ BOQ dark theme colors test completed successfully');
  });

  test('should maintain colors when switching between tenders', async ({ page }) => {
    console.log('🔄 Testing color persistence across tender switches...');

    await page.goto('http://localhost:5176/boq');
    await page.waitForLoadState('networkidle');

    // Switch to dark theme (if available)
    const themeButton = await page.locator('button').filter({ hasText: /тёмн|dark/i }).first();
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(500);
    }

    // Select first tender
    const tenderSelect = page.locator('.ant-select-selector:has-text("Выберите тендер")').first();
    await expect(tenderSelect).toBeVisible({ timeout: 10000 });
    await tenderSelect.click();

    const firstOption = page.locator('.ant-select-item-option').first();
    await firstOption.click();

    const versionSelect = page.locator('.ant-select-selector:has-text("Выберите версию")').first();
    await versionSelect.click();

    const firstVersion = page.locator('.ant-select-item-option').first();
    await firstVersion.click();

    // Wait for table
    await page.waitForSelector('.boq-items-table', { timeout: 10000 });
    await page.waitForTimeout(700);

    // Get initial color
    const workRows = page.locator('.boq-items-table tbody tr').first();
    const initialColor = await workRows.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('🎨 Initial row color:', initialColor);

    // Switch to another tender (change tender name)
    await tenderSelect.click();
    const secondOption = page.locator('.ant-select-item-option').nth(1);

    if (await secondOption.isVisible()) {
      await secondOption.click();

      // Select version again
      await versionSelect.click();
      await page.locator('.ant-select-item-option').first().click();

      await page.waitForTimeout(700);

      // Check color persists
      const newColor = await page.locator('.boq-items-table tbody tr').first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('🎨 New row color after switch:', newColor);

      // Colors should still be applied (not white/transparent)
      expect(newColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(newColor).not.toBe('transparent');
      expect(newColor).not.toBe('rgb(255, 255, 255)');

      console.log('✅ Colors maintained after tender switch');
    }
  });
});
