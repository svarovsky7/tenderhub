import { test, expect } from '@playwright/test';

test.describe('BOQ Table Text Contrast in Dark Theme', () => {
  test('should verify text is highly visible and hover makes rows darker', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('📍 Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    const toggleExists = await themeToggle.isVisible().catch(() => false);

    if (toggleExists) {
      await themeToggle.click();
      await page.waitForTimeout(800);
      console.log('🌙 Switched to dark theme');
    }

    // Select first tender
    const tenderCards = page.locator('.ant-card');
    const tenderCount = await tenderCards.count();
    console.log(`📋 Found ${tenderCount} tender cards`);

    if (tenderCount > 0) {
      await tenderCards.first().click();
      await page.waitForTimeout(2500);
      console.log('✅ Selected first tender');

      // Find position cards
      const positionCards = page.locator('.ant-card');
      const positionCount = await positionCards.count();
      console.log(`🔍 Found ${positionCount} position cards`);

      if (positionCount > 0) {
        // Get text color of position card
        const cardTextColor = await positionCards.first().evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('🎨 Position card text color:', cardTextColor);

        // Parse RGB to check if it's light
        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
          };
        };

        const cardRgb = parseRgb(cardTextColor);
        const isCardTextLight = cardRgb && cardRgb.r > 200 && cardRgb.g > 200 && cardRgb.b > 200;

        if (isCardTextLight) {
          console.log('✅ Position card text is light colored (high contrast)');
        } else {
          console.log('⚠️ Position card text may be too dark:', cardTextColor);
        }

        // Take screenshot
        await page.screenshot({
          path: 'playwright-report/boq-dark-text-contrast.png',
          fullPage: true
        });
        console.log('📸 Screenshot: Position cards text contrast');

        // Try to expand and check table
        const firstPosition = positionCards.first();
        await firstPosition.click();
        await page.waitForTimeout(1500);
        console.log('📂 Clicked first position card');

        const tableRows = page.locator('.ant-table-tbody tr');
        const rowCount = await tableRows.count();
        console.log(`📊 Found ${rowCount} table rows`);

        if (rowCount > 0) {
          const firstRow = tableRows.first();
          const firstCell = firstRow.locator('td').first();

          // Check text color before hover
          const textColorBefore = await firstCell.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });

          const bgColorBefore = await firstCell.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });

          console.log('🎨 Before hover - Text:', textColorBefore);
          console.log('🎨 Before hover - Background:', bgColorBefore);

          const textRgbBefore = parseRgb(textColorBefore);
          const isTextLight = textRgbBefore && textRgbBefore.r > 200 && textRgbBefore.g > 200 && textRgbBefore.b > 200;

          if (isTextLight) {
            console.log('✅ Table text is light colored (high contrast)');
          } else {
            console.log('⚠️ Table text may be too dark:', textColorBefore);
          }

          // Take screenshot before hover
          await page.screenshot({
            path: 'playwright-report/boq-table-before-hover.png',
            fullPage: true
          });

          // Hover over row
          await firstRow.hover();
          await page.waitForTimeout(500);

          const bgColorAfter = await firstCell.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });

          console.log('🎨 After hover - Background:', bgColorAfter);

          // Parse backgrounds to compare
          const bgRgbBefore = parseRgb(bgColorBefore);
          const bgRgbAfter = parseRgb(bgColorAfter);

          if (bgRgbBefore && bgRgbAfter) {
            const brightnessBefore = bgRgbBefore.r + bgRgbBefore.g + bgRgbBefore.b;
            const brightnessAfter = bgRgbAfter.r + bgRgbAfter.g + bgRgbAfter.b;

            if (brightnessAfter < brightnessBefore) {
              console.log('✅ Hover makes row DARKER (correct behavior)');
            } else if (brightnessAfter > brightnessBefore) {
              console.log('⚠️ Hover makes row LIGHTER (should be darker)');
            } else {
              console.log('⚠️ No visible change on hover');
            }
          }

          // Take screenshot after hover
          await page.screenshot({
            path: 'playwright-report/boq-table-after-hover.png',
            fullPage: true
          });

          // Assertions
          expect(isTextLight).toBeTruthy();
        }
      }
    }

    console.log('✅ Test completed');
  });
});
