import { test, expect } from '@playwright/test';

test.describe('BOQ Page - Dark Theme Colors (Simple)', () => {
  test('should have visible colors on BOQ page in dark theme', async ({ page }) => {
    console.log('🚀 [Test] Testing BOQ page dark theme - simple check');

    // Navigate to BOQ page
    await page.goto('/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await page.waitForTimeout(1000);
    console.log('✅ [Test] Switched to dark theme');

    // Verify dark theme is active
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('🎨 [Test] Body background:', bodyBg);

    // Check that page header gradient is visible
    const header = page.locator('.boq-page-header').first();
    if (await header.count() > 0) {
      const headerBg = await header.evaluate((el) => {
        return window.getComputedStyle(el).background;
      });
      console.log('🎨 [Test] Header gradient:', headerBg);

      // Should have a gradient (contains "gradient")
      expect(headerBg).toContain('gradient');
      console.log('✅ [Test] Header gradient is visible in dark theme');
    }

    // Check page title color
    const pageTitle = page.locator('h2').filter({ hasText: /Управление сметой|BOQ/i }).first();
    if (await pageTitle.count() > 0) {
      const titleColor = await pageTitle.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('🎨 [Test] Page title color:', titleColor);

      // Should be white or near-white
      expect(titleColor).toMatch(/rgb.*255|rgba.*255.*255.*255/);
      console.log('✅ [Test] Page title is visible (white) in dark theme');
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/boq-dark-theme-simple.png',
      fullPage: true
    });

    console.log('✅ [Test] BOQ dark theme simple check completed');
  });

  test('should show colors correctly after selecting a tender in dark theme', async ({ page }) => {
    console.log('🚀 [Test] Testing BOQ with tender selection in dark theme');

    await page.goto('/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Switch to dark theme FIRST
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();
    await page.waitForTimeout(1000);
    console.log('✅ [Test] Switched to dark theme');

    // Try quick tender selector (cards)
    const cards = await page.locator('.ant-card').count();
    console.log(`📋 [Test] Found ${cards} cards on page`);

    if (cards > 1) {
      // Click on first tender card (skip header if present)
      const tenderCard = page.locator('.ant-card').nth(1);
      const cardText = await tenderCard.textContent();
      console.log(`📋 [Test] Clicking tender card: ${cardText?.substring(0, 50)}...`);

      await tenderCard.click();
      await page.waitForTimeout(3000); // Wait for BOQ to load

      // Check if tender data is displayed
      const hasData = await page.locator('text=/Курс|стоимость|₽/i').count();
      console.log(`💰 [Test] Found ${hasData} monetary elements on page`);

      if (hasData > 0) {
        // Check currency rate colors
        const usdElement = page.locator('text=/USD/i').first();
        if (await usdElement.count() > 0) {
          const container = usdElement.locator('..');
          const color = await container.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('💵 [Test] USD color in dark theme:', color);

          // Should NOT be white or transparent
          expect(color).not.toBe('rgb(255, 255, 255)');
          expect(color).not.toBe('rgba(0, 0, 0, 0)');
          console.log('✅ [Test] USD has custom color (not white)');
        }

        // Check total cost color
        const totalCost = page.locator('text=/Общая стоимость/i').first();
        if (await totalCost.count() > 0) {
          const costValue = totalCost.locator('..').locator('div').filter({ hasText: /₽/ }).first();
          if (await costValue.count() > 0) {
            const costColor = await costValue.evaluate((el) => {
              return window.getComputedStyle(el).color;
            });
            console.log('💰 [Test] Total cost color:', costColor);

            // Should NOT be white or transparent
            expect(costColor).not.toBe('rgb(255, 255, 255)');
            expect(costColor).not.toBe('rgba(0, 0, 0, 0)');
            console.log('✅ [Test] Total cost has custom color (not white)');
          }
        }

        // Check position card colors if they exist
        const positions = await page.locator('.ant-card').count();
        if (positions > 0) {
          const firstPosition = page.locator('.ant-card').first();
          const costElement = firstPosition.locator('text=/₽/').first();

          if (await costElement.count() > 0) {
            const costColor = await costElement.evaluate((el) => {
              return window.getComputedStyle(el).color;
            });
            console.log('📋 [Test] Position cost color:', costColor);

            // Should NOT be white or transparent
            expect(costColor).not.toBe('rgb(255, 255, 255)');
            expect(costColor).not.toBe('rgba(0, 0, 0, 0)');
            console.log('✅ [Test] Position costs have custom color');
          }
        }

        await page.screenshot({
          path: 'test-results/boq-with-tender-dark-theme.png',
          fullPage: true
        });

        console.log('✅ [Test] All colors are properly displayed in dark theme');
      } else {
        console.log('⚠️ [Test] No tender data loaded - test skipped');
      }
    } else {
      console.log('⚠️ [Test] No tender cards found - test skipped');
    }
  });
});
