import { test, expect } from '@playwright/test';

test.describe('BOQ Client Positions - Dark Theme Colors', () => {
  test('should have visible colors in position cards in dark theme for ЖК Адмирал', async ({ page }) => {
    console.log('🚀 [Test] Testing client position colors in dark theme for ЖК Адмирал');

    // Go to BOQ page
    await page.goto('/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Switch to dark theme FIRST
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(1000);
    console.log('✅ [Test] Switched to dark theme');

    // Select tender using the tender selector dropdown
    console.log('🔍 [Test] Looking for tender name selector...');
    const tenderNameSelector = page.locator('.ant-select').first();
    await tenderNameSelector.click();
    await page.waitForTimeout(500);
    console.log('✅ [Test] Opened tender selector');

    // Try to find "ЖК Адмирал" or use first option
    await page.waitForSelector('.ant-select-item-option', { timeout: 3000 });
    const options = page.locator('.ant-select-item-option');
    const optionsCount = await options.count();
    console.log(`📋 [Test] Found ${optionsCount} tender options`);

    // Try to find "ЖК Адмирал"
    let found = false;
    for (let i = 0; i < Math.min(optionsCount, 10); i++) {
      const optionText = await options.nth(i).textContent();
      console.log(`  Option ${i + 1}: ${optionText}`);
      if (optionText?.toLowerCase().includes('адмирал') || optionText?.toLowerCase().includes('admiral')) {
        console.log(`✅ [Test] Found ЖК Адмирал at index ${i}`);
        await options.nth(i).click();
        found = true;
        break;
      }
    }

    if (!found && optionsCount > 0) {
      console.log('⚠️ [Test] ЖК Адмирал not found, selecting first tender');
      await options.first().click();
    }

    if (found || optionsCount > 0) {
      await page.waitForTimeout(1000);
      console.log('✅ [Test] Tender name selected');

      // Now select version (first version) - optional
      console.log('🔍 [Test] Looking for version selector...');
      const versionSelector = page.locator('.ant-select').nth(1);
      const versionVisible = await versionSelector.isVisible().catch(() => false);

      if (versionVisible) {
        console.log('✅ [Test] Version selector found, clicking...');
        await versionSelector.click();
        await page.waitForTimeout(500);

        // Wait for NEW version options to appear (dropdown opens fresh) - with longer timeout
        try {
          await page.waitForSelector('.ant-select-dropdown:visible .ant-select-item-option', { timeout: 2000 });
          const versionOptions = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
          const versionCount = await versionOptions.count();
          console.log(`📋 [Test] Found ${versionCount} version options`);

          if (versionCount > 0) {
            await versionOptions.first().click();
            console.log('✅ [Test] Version selected');
          }
        } catch (e) {
          console.log('⚠️ [Test] No version options found or dropdown did not open - continuing without version selection');
        }
      } else {
        console.log('⚠️ [Test] Version selector not visible - continuing without version');
      }

      await page.waitForTimeout(3000);
      console.log('✅ [Test] Tender fully selected');

      // Wait for position cards to load
      console.log('⏳ [Test] Waiting for position cards to load...');
      await page.waitForTimeout(4000);

      // Find position cards (client positions)
      const positionCards = page.locator('.ant-card').filter({ hasText: /₽/ });
      const positionsCount = await positionCards.count();
      console.log(`📋 [Test] Found ${positionsCount} position cards`);

      if (positionsCount > 0) {
        const firstPosition = positionCards.first();

        // Check total cost color in collapsed position card
        const totalCostElement = firstPosition.locator('text=/₽/').first();
        if (await totalCostElement.count() > 0) {
          const costColor = await totalCostElement.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('💰 [Test] Position total cost color:', costColor);

          // Should be greenish in dark theme, not white
          expect(costColor).not.toBe('rgb(255, 255, 255)');
          expect(costColor).not.toBe('rgba(0, 0, 0, 0)');
          expect(costColor).not.toBe('transparent');

          // Should match green color pattern
          expect(costColor).toMatch(/rgb.*115.*209|rgb.*73.*209|rgb.*56.*158|rgb.*82.*196/);
          console.log('✅ [Test] Total cost has proper green color in dark theme');
        }

        // Check works count (Р:) color
        const worksCount = firstPosition.locator('text=/Р:/');
        if (await worksCount.count() > 0) {
          const worksValue = worksCount.locator('..').locator('strong').first();
          const worksColor = await worksValue.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('🔨 [Test] Works count color:', worksColor);

          expect(worksColor).not.toBe('rgb(255, 255, 255)');
          expect(worksColor).toMatch(/rgb.*115.*209|rgb.*82.*196/);
          console.log('✅ [Test] Works count has proper green color');
        }

        // Check materials count (М:) color
        const materialsCount = firstPosition.locator('text=/М:/');
        if (await materialsCount.count() > 0) {
          const materialsValue = materialsCount.locator('..').locator('strong').first();
          const materialsColor = await materialsValue.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('🧱 [Test] Materials count color:', materialsColor);

          expect(materialsColor).not.toBe('rgb(255, 255, 255)');
          expect(materialsColor).toMatch(/rgb.*64.*169|rgb.*40.*169|rgb.*24.*144/);
          console.log('✅ [Test] Materials count has proper blue color');
        }

        // Now expand the position to check details
        console.log('📂 [Test] Expanding first position...');
        await firstPosition.click();
        await page.waitForTimeout(2000);

        // Check BOQ table total cost (ИТОГО row) - should be green in dark theme
        const tableTotalCost = page.locator('.boq-items-table tfoot .ant-typography').filter({ hasText: /₽/ }).first();
        if (await tableTotalCost.count() > 0) {
          const totalCostColor = await tableTotalCost.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('💰 [Test] BOQ table ИТОГО row total cost color:', totalCostColor);

          // Should be green (#73d13d in dark theme), not white
          expect(totalCostColor).not.toBe('rgb(255, 255, 255)');
          expect(totalCostColor).toMatch(/rgb.*115.*209|rgb.*73.*209/);
          console.log('✅ [Test] BOQ table total cost has proper green color in dark theme');
        }

        // Check Client note label color (should be gray in dark theme)
        const clientNoteLabel = firstPosition.locator('text=/Примечание Заказчика:/');
        if (await clientNoteLabel.count() > 0) {
          const labelColor = await clientNoteLabel.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          const labelWeight = await clientNoteLabel.evaluate((el) => {
            return window.getComputedStyle(el).fontWeight;
          });
          console.log('📝 [Test] Client note label color:', labelColor, 'weight:', labelWeight);

          // Should be gray (rgba(255,255,255,0.45) = rgb(115, 115, 115)), not bright white
          expect(labelColor).not.toBe('rgb(255, 255, 255)');
          expect(labelColor).toMatch(/rgba?\(115,\s*115,\s*115|rgba?\(255,\s*255,\s*255,\s*0\.4[0-9]/);
          expect(labelWeight).toBe('400'); // normal weight
          console.log('✅ [Test] Client note label has proper gray color and normal weight');
        }

        // Check Client note value color (should be white and bold in dark theme)
        const clientNoteValue = clientNoteLabel.locator('..').locator('span').last();
        if (await clientNoteValue.count() > 0) {
          const valueColor = await clientNoteValue.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          const valueWeight = await clientNoteValue.evaluate((el) => {
            return window.getComputedStyle(el).fontWeight;
          });
          console.log('📝 [Test] Client note value color:', valueColor, 'weight:', valueWeight);

          // Should be white (rgb(255, 255, 255)) and bold
          expect(valueColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
          expect(valueWeight).toBe('600'); // bold weight
          console.log('✅ [Test] Client note value has proper white color and bold weight');
        }

        // Check client quantity label color (should be gray in dark theme)
        const clientQtyLabel = firstPosition.locator('text=/Кол-во Заказчика:/');
        if (await clientQtyLabel.count() > 0) {
          const labelColor = await clientQtyLabel.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          const labelWeight = await clientQtyLabel.evaluate((el) => {
            return window.getComputedStyle(el).fontWeight;
          });
          console.log('📊 [Test] Client quantity label color:', labelColor, 'weight:', labelWeight);

          // Should be gray (rgba(255,255,255,0.45)), not bright white
          expect(labelColor).not.toBe('rgb(255, 255, 255)');
          expect(labelColor).toMatch(/rgba?\(115,\s*115,\s*115|rgba?\(255,\s*255,\s*255,\s*0\.4[0-9]/);
          expect(labelWeight).toBe('400'); // normal weight
          console.log('✅ [Test] Client quantity label has proper gray color and normal weight');
        }

        // Take screenshots
        await page.screenshot({
          path: 'test-results/boq-positions-collapsed-dark.png',
          fullPage: true
        });

        console.log('✅ [Test] All position colors are properly displayed in dark theme');
      } else {
        console.log('⚠️ [Test] No position cards found - test incomplete');
      }
    } else {
      console.log('⚠️ [Test] No tenders available - test skipped');
    }
  });

  test('should compare position colors between light and dark themes for ЖК Адмирал', async ({ page }) => {
    test.setTimeout(60000); // Увеличиваем таймаут до 60 секунд
    console.log('🚀 [Test] Comparing position colors in light vs dark themes for ЖК Адмирал');

    await page.goto('/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Select tender in light theme using selector
    console.log('🔍 [Test] Selecting tender...');
    const tenderNameSelector = page.locator('.ant-select').first();
    await tenderNameSelector.click();
    await page.waitForTimeout(500);

    await page.waitForSelector('.ant-select-item-option', { timeout: 3000 });
    const options = page.locator('.ant-select-item-option');
    const optionsCount = await options.count();

    let found = false;
    for (let i = 0; i < Math.min(optionsCount, 10); i++) {
      const optionText = await options.nth(i).textContent();
      if (optionText?.toLowerCase().includes('адмирал') || optionText?.toLowerCase().includes('admiral')) {
        await options.nth(i).click();
        found = true;
        break;
      }
    }

    if (!found && optionsCount > 0) {
      await options.first().click();
    }

    if (found || optionsCount > 0) {
      await page.waitForTimeout(1000);

      // Select version - optional
      const versionSelector = page.locator('.ant-select').nth(1);
      if (await versionSelector.isVisible().catch(() => false)) {
        await versionSelector.click();
        await page.waitForTimeout(500);

        // Wait for NEW version options to appear (dropdown opens fresh)
        try {
          await page.waitForSelector('.ant-select-dropdown:visible .ant-select-item-option', { timeout: 2000 });
          const versionOptions = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
          if (await versionOptions.count() > 0) {
            await versionOptions.first().click();
          }
        } catch (e) {
          console.log('⚠️ [Test] No version options - continuing without version selection');
        }
      }

      await page.waitForTimeout(3000);

      // Wait for positions to load
      console.log('⏳ [Test] Waiting for positions to load...');
      await page.waitForTimeout(4000);

      // Get colors in LIGHT theme
      const positionCards = page.locator('.ant-card').filter({ hasText: /₽/ });
      if (await positionCards.count() > 0) {
        const firstPosition = positionCards.first();

        const lightColors: any = {};

        // Get total cost color in light theme
        const totalCost = firstPosition.locator('text=/₽/').first();
        if (await totalCost.count() > 0) {
          lightColors.totalCost = await totalCost.evaluate((el) => window.getComputedStyle(el).color);
        }

        // Get works count color
        const worksValue = firstPosition.locator('text=/Р:/').locator('..').locator('strong').first();
        if (await worksValue.count() > 0) {
          lightColors.works = await worksValue.evaluate((el) => window.getComputedStyle(el).color);
        }

        // Get materials count color
        const materialsValue = firstPosition.locator('text=/М:/').locator('..').locator('strong').first();
        if (await materialsValue.count() > 0) {
          lightColors.materials = await materialsValue.evaluate((el) => window.getComputedStyle(el).color);
        }

        console.log('☀️ [Test] Light theme colors:', lightColors);

        await page.screenshot({
          path: 'test-results/boq-positions-light-theme.png',
          fullPage: true
        });

        // Switch to DARK theme
        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        await themeToggle.click();
        await page.waitForTimeout(1500);

        const darkColors: any = {};

        // Get total cost color in dark theme
        if (await totalCost.count() > 0) {
          darkColors.totalCost = await totalCost.evaluate((el) => window.getComputedStyle(el).color);
        }

        // Get works count color
        if (await worksValue.count() > 0) {
          darkColors.works = await worksValue.evaluate((el) => window.getComputedStyle(el).color);
        }

        // Get materials count color
        if (await materialsValue.count() > 0) {
          darkColors.materials = await materialsValue.evaluate((el) => window.getComputedStyle(el).color);
        }

        console.log('🌙 [Test] Dark theme colors:', darkColors);

        await page.screenshot({
          path: 'test-results/boq-positions-dark-theme.png',
          fullPage: true
        });

        // Verify colors are different between themes
        if (lightColors.totalCost && darkColors.totalCost) {
          console.log('🔍 [Test] Comparing total cost colors:');
          console.log('   Light:', lightColors.totalCost);
          console.log('   Dark:', darkColors.totalCost);
          expect(lightColors.totalCost).not.toBe(darkColors.totalCost);
          console.log('✅ [Test] Total cost colors are different between themes');
        }

        if (lightColors.works && darkColors.works) {
          console.log('🔍 [Test] Comparing works count colors:');
          console.log('   Light:', lightColors.works);
          console.log('   Dark:', darkColors.works);
          expect(lightColors.works).not.toBe(darkColors.works);
          console.log('✅ [Test] Works count colors are different between themes');
        }

        if (lightColors.materials && darkColors.materials) {
          console.log('🔍 [Test] Comparing materials count colors:');
          console.log('   Light:', lightColors.materials);
          console.log('   Dark:', darkColors.materials);
          expect(lightColors.materials).not.toBe(darkColors.materials);
          console.log('✅ [Test] Materials count colors are different between themes');
        }

        console.log('✅ [Test] ЖК Адмирал position colors properly adapt to theme changes');
      }
    }
  });
});
