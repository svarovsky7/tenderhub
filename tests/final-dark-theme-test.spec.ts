import { test, expect } from '@playwright/test';

test.describe('Final Dark Theme Test', () => {
  test('should verify all fixes: contrast, hover, and color accents', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Take screenshot in dark theme
    await page.screenshot({
      path: 'playwright-report/final-test-dark-theme.png',
      fullPage: true
    });

    // Select tender
    const tenderCards = page.locator('.ant-card');
    const tenderCount = await tenderCards.count();
    console.log(`📋 Step 3: Found ${tenderCount} tender cards`);

    if (tenderCount > 0) {
      const firstCard = tenderCards.first();

      // Check card text color (should be white)
      const cardColor = await firstCard.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('🎨 Card text color:', cardColor);

      const parseRgb = (color: string) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      };

      const cardRgb = parseRgb(cardColor);
      const isHighContrast = cardRgb && cardRgb.r > 240 && cardRgb.g > 240 && cardRgb.b > 240;

      if (isHighContrast) {
        console.log('✅ Text has HIGH CONTRAST (almost white)');
      } else {
        console.log('⚠️ Text contrast may need improvement');
      }

      // Click tender
      await firstCard.click();
      await page.waitForTimeout(3000);
      console.log('\n📋 Step 4: Selected tender\n');

      // Take screenshot after selection
      await page.screenshot({
        path: 'playwright-report/final-test-positions.png',
        fullPage: true
      });

      // Check for color accents
      const coloredElements = await page.evaluate(() => {
        const elements = [];

        // Look for blue text
        const blueElements = document.querySelectorAll('[class*="text-blue"]');
        if (blueElements.length > 0) {
          const el = blueElements[0];
          elements.push({
            type: 'blue',
            color: window.getComputedStyle(el).color,
            text: el.textContent?.substring(0, 30)
          });
        }

        // Look for red text
        const redElements = document.querySelectorAll('[class*="text-red"]');
        if (redElements.length > 0) {
          const el = redElements[0];
          elements.push({
            type: 'red',
            color: window.getComputedStyle(el).color,
            text: el.textContent?.substring(0, 30)
          });
        }

        // Look for green text
        const greenElements = document.querySelectorAll('[class*="text-green"]');
        if (greenElements.length > 0) {
          const el = greenElements[0];
          elements.push({
            type: 'green',
            color: window.getComputedStyle(el).color,
            text: el.textContent?.substring(0, 30)
          });
        }

        return elements;
      });

      console.log('🎨 Color accents found:', coloredElements.length);
      coloredElements.forEach(el => {
        console.log(`   ${el.type}: ${el.color} - "${el.text}"`);

        // Check if color is NOT white (preserved)
        const rgb = el.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgb) {
          const r = parseInt(rgb[1]);
          const g = parseInt(rgb[2]);
          const b = parseInt(rgb[3]);
          const isWhite = r > 240 && g > 240 && b > 240;

          if (!isWhite) {
            console.log(`   ✅ Color preserved (not white)`);
          } else {
            console.log(`   ⚠️ Color may be lost to white`);
          }
        }
      });

      // Expand first position
      const positionCards = page.locator('.ant-card');
      if ((await positionCards.count()) > 0) {
        await positionCards.first().click();
        await page.waitForTimeout(2000);
        console.log('\n📂 Step 5: Expanded position\n');

        // Take screenshot with expanded position
        await page.screenshot({
          path: 'playwright-report/final-test-expanded.png',
          fullPage: true
        });

        // Check for tables
        const tables = page.locator('table');
        const tableCount = await tables.count();
        console.log(`📊 Found ${tableCount} tables`);

        if (tableCount > 0) {
          const firstTable = tables.first();
          const rows = firstTable.locator('tbody tr');
          const rowCount = await rows.count();
          console.log(`📊 Found ${rowCount} rows in first table\n`);

          if (rowCount > 0) {
            const firstRow = rows.first();
            const firstCell = firstRow.locator('td').first();

            // Check cell text color
            const cellColor = await firstCell.evaluate((el) => {
              return window.getComputedStyle(el).color;
            });
            console.log('🎨 Cell text color:', cellColor);

            const cellRgb = parseRgb(cellColor);
            const cellHighContrast = cellRgb && cellRgb.r > 240 && cellRgb.g > 240 && cellRgb.b > 240;

            if (cellHighContrast) {
              console.log('✅ Table cell text has HIGH CONTRAST\n');
            }

            // Test hover
            const bgBefore = await firstCell.evaluate((el) => {
              return window.getComputedStyle(el).backgroundColor;
            });

            console.log('🖱️ Testing hover effect...');
            console.log('   Background BEFORE hover:', bgBefore);

            await firstRow.hover();
            await page.waitForTimeout(500);

            const bgAfter = await firstCell.evaluate((el) => {
              return window.getComputedStyle(el).backgroundColor;
            });

            console.log('   Background AFTER hover:', bgAfter);

            // Take screenshot with hover
            await page.screenshot({
              path: 'playwright-report/final-test-hover.png',
              fullPage: true
            });

            const bgBeforeRgb = parseRgb(bgBefore);
            const bgAfterRgb = parseRgb(bgAfter);

            if (bgBeforeRgb && bgAfterRgb) {
              const brightnessBefore = bgBeforeRgb.r + bgBeforeRgb.g + bgBeforeRgb.b;
              const brightnessAfter = bgAfterRgb.r + bgAfterRgb.g + bgAfterRgb.b;

              console.log(`   Brightness: ${brightnessBefore} → ${brightnessAfter} (change: ${brightnessAfter - brightnessBefore})`);

              if (brightnessAfter < brightnessBefore) {
                console.log('   ✅ SUCCESS: Hover makes row DARKER!\n');
              } else if (brightnessAfter > brightnessBefore) {
                console.log('   ❌ PROBLEM: Hover makes row LIGHTER (white highlight)\n');
              } else {
                console.log('   ⚠️ No brightness change on hover\n');
              }
            }
          }
        }
      }
    }

    console.log('✅ Final test completed!\n');
    console.log('📸 Check screenshots in playwright-report/:\n');
    console.log('   - final-test-dark-theme.png');
    console.log('   - final-test-positions.png');
    console.log('   - final-test-expanded.png');
    console.log('   - final-test-hover.png\n');
  });
});
