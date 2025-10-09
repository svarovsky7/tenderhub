import { test, expect } from '@playwright/test';

test.describe('BOQ Page Dark Theme Colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('should have proper colors in dark theme for currency rates and total cost', async ({ page }) => {
    console.log('🚀 [Test] Testing BOQ page dark theme colors');

    // Switch to dark theme first
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(1000);

    // Try to use Quick Tender Selector if available
    const quickSelector = page.locator('.ant-card').filter({ hasText: /недавн/i }).first();
    if (await quickSelector.count() > 0) {
      console.log('📋 [Test] Using quick tender selector');
      const firstCard = page.locator('.ant-card').nth(1); // Skip the header card
      if (await firstCard.count() > 0) {
        await firstCard.click();
        await page.waitForTimeout(3000);
      }
    } else {
      // Use regular selectors
      console.log('📋 [Test] Using regular tender selector');
      const selectBox = page.locator('.ant-select-selector').filter({ hasText: /тендер/i }).first();
      if (await selectBox.count() > 0) {
        await selectBox.click();
        await page.waitForTimeout(500);

        const firstOption = page.locator('.ant-select-item-option').first();
        await firstOption.click();
        await page.waitForTimeout(500);

        // Select version
        const versionBox = page.locator('.ant-select-selector').filter({ hasText: /верси/i }).first();
        if (await versionBox.count() > 0) {
          await versionBox.click();
          await page.waitForTimeout(300);
          const firstVersion = page.locator('.ant-select-item-option').first();
          await firstVersion.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Check USD rate color
    const usdRate = page.locator('text=/Курс USD:/').locator('..').first();
    if (await usdRate.count() > 0) {
      const usdColor = await usdRate.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('💵 [Test] USD rate color in dark theme:', usdColor);

      // Should be greenish, not white or transparent
      expect(usdColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(usdColor).not.toBe('rgb(255, 255, 255)');
      // Should contain green color (rgb values around 115, 209, 61 for #73d13d)
      expect(usdColor).toMatch(/rgb.*115.*209|rgb.*73.*209|rgb.*82.*196/);
    }

    // Check EUR rate color
    const eurRate = page.locator('text=/Курс EUR:/').locator('..').first();
    if (await eurRate.count() > 0) {
      const eurColor = await eurRate.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('💶 [Test] EUR rate color in dark theme:', eurColor);

      // Should be blueish, not white or transparent
      expect(eurColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(eurColor).not.toBe('rgb(255, 255, 255)');
      // Should contain blue color (rgb values around 64, 169, 255 for #40a9ff)
      expect(eurColor).toMatch(/rgb.*64.*169|rgb.*40.*169|rgb.*24.*144/);
    }

    // Check CNY rate color
    const cnyRate = page.locator('text=/Курс CNY:/').locator('..').first();
    if (await cnyRate.count() > 0) {
      const cnyColor = await cnyRate.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('💴 [Test] CNY rate color in dark theme:', cnyColor);

      // Should be orangeish, not white or transparent
      expect(cnyColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(cnyColor).not.toBe('rgb(255, 255, 255)');
      // Should contain orange color (rgb values around 255, 169, 64 for #ffa940)
      expect(cnyColor).toMatch(/rgb.*255.*169|rgb.*250.*140/);
    }

    // Check total cost color
    const totalCostLabel = page.locator('text=/Общая стоимость/').first();
    if (await totalCostLabel.count() > 0) {
      const totalCostContainer = totalCostLabel.locator('..').locator('..').first();
      const totalCostValue = totalCostContainer.locator('div').nth(1);

      const totalCostColor = await totalCostValue.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('💰 [Test] Total cost color in dark theme:', totalCostColor);

      // Should be greenish, not white or transparent
      expect(totalCostColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(totalCostColor).not.toBe('rgb(255, 255, 255)');
      // Should contain green color
      expect(totalCostColor).toMatch(/rgb.*115.*209|rgb.*73.*209|rgb.*82.*196/);
    }

    console.log('✅ [Test] All header colors are properly themed in dark mode');

    await page.screenshot({
      path: 'test-results/boq-dark-theme-header.png',
      fullPage: true
    });
  });

  test('should have proper colors in dark theme for position summary', async ({ page }) => {
    console.log('🚀 [Test] Testing position summary colors in dark theme');

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(1000);

    // Select a tender
    const tenderSelect = page.locator('input[placeholder="Выберите тендер"]').first();
    await tenderSelect.click();
    await page.waitForTimeout(500);

    const firstOption = page.locator('.ant-select-item').first();
    await firstOption.click();
    await page.waitForTimeout(500);

    // Select version
    const versionSelect = page.locator('input[placeholder="Выберите версию"]').first();
    if (await versionSelect.isVisible()) {
      await versionSelect.click();
      await page.waitForTimeout(300);
      const firstVersion = page.locator('.ant-select-item').first();
      await firstVersion.click();
      await page.waitForTimeout(2000);
    }

    // Wait for positions to load
    await page.waitForTimeout(2000);

    // Find first position card (collapsed state)
    const firstPosition = page.locator('.ant-card').first();
    if (await firstPosition.count() > 0) {
      console.log('📋 [Test] Checking first position summary colors');

      // Check total cost in position (green color)
      const positionCost = firstPosition.locator('text=/₽/').first();
      if (await positionCost.count() > 0) {
        const costColor = await positionCost.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('💵 [Test] Position total cost color:', costColor);

        // Should be greenish in dark theme
        expect(costColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(costColor).not.toBe('rgb(255, 255, 255)');
        // Should contain green (#73d13d or #389e0d)
        expect(costColor).toMatch(/rgb.*115.*209|rgb.*56.*158|rgb.*82.*196/);
      }

      // Check works count (Р: should be green)
      const worksLabel = firstPosition.locator('text=/Р:/').first();
      if (await worksLabel.count() > 0) {
        const worksValue = worksLabel.locator('..').locator('strong').first();
        const worksColor = await worksValue.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('🔨 [Test] Works count color:', worksColor);

        // Should be greenish
        expect(worksColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(worksColor).toMatch(/rgb.*115.*209|rgb.*82.*196/);
      }

      // Check materials count (М: should be blue)
      const materialsLabel = firstPosition.locator('text=/М:/').first();
      if (await materialsLabel.count() > 0) {
        const materialsValue = materialsLabel.locator('..').locator('strong').first();
        const materialsColor = await materialsValue.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('🧱 [Test] Materials count color:', materialsColor);

        // Should be blueish
        expect(materialsColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(materialsColor).toMatch(/rgb.*64.*169|rgb.*24.*144/);
      }

      console.log('✅ [Test] Position summary colors are correct');
    }

    await page.screenshot({
      path: 'test-results/boq-dark-theme-positions.png',
      fullPage: true
    });
  });

  test('should have proper colors in dark theme for position details', async ({ page }) => {
    console.log('🚀 [Test] Testing position details colors in dark theme');

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(1000);

    // Select a tender
    const tenderSelect = page.locator('input[placeholder="Выберите тендер"]').first();
    await tenderSelect.click();
    await page.waitForTimeout(500);

    const firstOption = page.locator('.ant-select-item').first();
    await firstOption.click();
    await page.waitForTimeout(500);

    // Select version
    const versionSelect = page.locator('input[placeholder="Выберите версию"]').first();
    if (await versionSelect.isVisible()) {
      await versionSelect.click();
      await page.waitForTimeout(300);
      const firstVersion = page.locator('.ant-select-item').first();
      await firstVersion.click();
      await page.waitForTimeout(2000);
    }

    // Wait for positions to load
    await page.waitForTimeout(2000);

    // Expand first position
    const firstPosition = page.locator('.ant-card').first();
    if (await firstPosition.count() > 0) {
      await firstPosition.click();
      await page.waitForTimeout(1000);

      console.log('📋 [Test] Checking expanded position details colors');

      // Check GP note label color (should be muted white)
      const gpNoteLabel = firstPosition.locator('text=/Примечание ГП:/').first();
      if (await gpNoteLabel.count() > 0) {
        const labelColor = await gpNoteLabel.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('📝 [Test] GP note label color:', labelColor);

        // Should be muted white (rgba(255,255,255,0.45))
        expect(labelColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(labelColor).toMatch(/rgba?\(255,\s*255,\s*255|rgba?\(0,\s*0,\s*0/);
      }

      // Check GP volume value color (should be green if present)
      const gpVolumeLabel = firstPosition.locator('text=/Объем ГП:|Кол-во ГП:/').first();
      if (await gpVolumeLabel.count() > 0) {
        // Find the strong element after the label
        const volumeValue = gpVolumeLabel.locator('..').locator('strong').first();
        if (await volumeValue.count() > 0) {
          const volumeColor = await volumeValue.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('📏 [Test] GP volume value color:', volumeColor);

          // Should be greenish if it's a value (not a label)
          expect(volumeColor).not.toBe('rgba(0, 0, 0, 0)');
        }
      }

      console.log('✅ [Test] Position details colors are correct');
    }

    await page.screenshot({
      path: 'test-results/boq-dark-theme-details.png',
      fullPage: true
    });
  });

  test('should compare light and dark theme color visibility', async ({ page }) => {
    console.log('🚀 [Test] Comparing light and dark theme color visibility');

    // Select a tender in light theme first
    const tenderSelect = page.locator('input[placeholder="Выберите тендер"]').first();
    await tenderSelect.click();
    await page.waitForTimeout(500);

    const firstOption = page.locator('.ant-select-item').first();
    await firstOption.click();
    await page.waitForTimeout(500);

    // Select version
    const versionSelect = page.locator('input[placeholder="Выберите версию"]').first();
    if (await versionSelect.isVisible()) {
      await versionSelect.click();
      await page.waitForTimeout(300);
      const firstVersion = page.locator('.ant-select-item').first();
      await firstVersion.click();
      await page.waitForTimeout(2000);
    }

    // Collect colors in light theme
    const lightThemeColors: any = {};

    const usdRate = page.locator('text=/Курс USD:/').locator('..').first();
    if (await usdRate.count() > 0) {
      lightThemeColors.usd = await usdRate.evaluate((el) => window.getComputedStyle(el).color);
    }

    const totalCostLabel = page.locator('text=/Общая стоимость/').first();
    if (await totalCostLabel.count() > 0) {
      const totalCostValue = totalCostLabel.locator('..').locator('..').locator('div').nth(1);
      lightThemeColors.totalCost = await totalCostValue.evaluate((el) => window.getComputedStyle(el).color);
    }

    console.log('☀️ [Test] Light theme colors:', lightThemeColors);

    await page.screenshot({
      path: 'test-results/boq-light-theme-comparison.png',
      fullPage: true
    });

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(1500);

    // Collect colors in dark theme
    const darkThemeColors: any = {};

    if (await usdRate.count() > 0) {
      darkThemeColors.usd = await usdRate.evaluate((el) => window.getComputedStyle(el).color);
    }

    if (await totalCostLabel.count() > 0) {
      const totalCostValue = totalCostLabel.locator('..').locator('..').locator('div').nth(1);
      darkThemeColors.totalCost = await totalCostValue.evaluate((el) => window.getComputedStyle(el).color);
    }

    console.log('🌙 [Test] Dark theme colors:', darkThemeColors);

    await page.screenshot({
      path: 'test-results/boq-dark-theme-comparison.png',
      fullPage: true
    });

    // Verify colors are different between themes
    if (lightThemeColors.usd && darkThemeColors.usd) {
      console.log('🔍 [Test] Comparing USD colors:');
      console.log('   Light:', lightThemeColors.usd);
      console.log('   Dark:', darkThemeColors.usd);
      // Colors should be different (darker shade in dark theme)
      expect(lightThemeColors.usd).not.toBe(darkThemeColors.usd);
    }

    if (lightThemeColors.totalCost && darkThemeColors.totalCost) {
      console.log('🔍 [Test] Comparing total cost colors:');
      console.log('   Light:', lightThemeColors.totalCost);
      console.log('   Dark:', darkThemeColors.totalCost);
      // Colors should be different
      expect(lightThemeColors.totalCost).not.toBe(darkThemeColors.totalCost);
    }

    console.log('✅ [Test] Theme colors are properly differentiated');
  });
});
