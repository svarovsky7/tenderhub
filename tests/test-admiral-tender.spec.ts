import { test, expect } from '@playwright/test';

test.describe('Test Admiral Tender - Colors & Hover', () => {
  test('should find "ЖК Адмирал Версия 1" and test all colors and hover', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to BOQ page\n');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/admiral-1-dark-mode.png',
      fullPage: true
    });

    // Find tender with "ЖК Адмирал" in the name
    console.log('🔍 Step 3: Looking for "ЖК Адмирал Версия 1" tender...\n');

    // Get all tender cards and find the one with "ЖК Адмирал"
    const allTenderCards = page.locator('.ant-card');
    const tenderCount = await allTenderCards.count();
    console.log(`📋 Found ${tenderCount} tender cards total`);

    let admiralTender = null;
    let admiralIndex = -1;

    // Search through all tender cards
    for (let i = 0; i < tenderCount; i++) {
      const card = allTenderCards.nth(i);
      const text = await card.textContent();

      if (text && (text.includes('ЖК Адмирал') || text.includes('Адмирал'))) {
        console.log(`✅ Found Admiral tender at index ${i}`);
        console.log(`   Text preview: ${text.substring(0, 100)}...\n`);
        admiralTender = card;
        admiralIndex = i;
        break;
      }
    }

    if (!admiralTender) {
      console.log('❌ Admiral tender NOT FOUND!');
      console.log('Available tenders:');

      for (let i = 0; i < Math.min(tenderCount, 5); i++) {
        const card = allTenderCards.nth(i);
        const text = await card.textContent();
        console.log(`  [${i}] ${text?.substring(0, 80)}...`);
      }

      return;
    }

    // Click on Admiral tender
    await admiralTender.click();
    await page.waitForTimeout(3000);
    console.log('✅ Step 4: Clicked on Admiral tender\n');

    // Take screenshot after tender selection
    await page.screenshot({
      path: 'playwright-report/admiral-2-positions.png',
      fullPage: true
    });

    // Get all position cards
    const positionCards = page.locator('.ant-card');
    const positionCount = await positionCards.count();
    console.log(`📦 Step 5: Found ${positionCount} position cards\n`);

    if (positionCount > 0) {
      const firstPosition = positionCards.first();

      // Get all colored text elements
      const coloredElements = await firstPosition.evaluate((card) => {
        const elements = [];

        // Look for all elements with color classes
        const colorClasses = [
          'text-green-600', 'text-green-700', 'text-green-500',
          'text-blue-600', 'text-blue-700', 'text-blue-500',
          'text-orange-600', 'text-red-600', 'text-purple-600'
        ];

        colorClasses.forEach(colorClass => {
          const els = card.querySelectorAll(`.${colorClass}`);
          els.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
              const computed = window.getComputedStyle(el);
              elements.push({
                class: colorClass,
                text: text,
                color: computed.color,
                tag: el.tagName.toLowerCase()
              });
            }
          });
        });

        return elements;
      });

      console.log('🎨 COLORED ELEMENTS FOUND:', coloredElements.length, '\n');

      coloredElements.forEach((el, index) => {
        console.log(`[${index + 1}] ${el.class}`);
        console.log(`    Text: "${el.text}"`);
        console.log(`    Color: ${el.color}`);
        console.log(`    Tag: ${el.tag}`);

        // Parse RGB
        const match = el.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          const isWhite = r > 240 && g > 240 && b > 240;
          const hasColor = Math.abs(r - g) > 30 || Math.abs(r - b) > 30 || Math.abs(g - b) > 30;

          if (isWhite) {
            console.log(`    ❌ PROBLEM: Color is WHITE (${r}, ${g}, ${b}) - should be colored!`);
          } else if (hasColor) {
            console.log(`    ✅ GOOD: Has proper color (${r}, ${g}, ${b})`);
          } else {
            console.log(`    ⚠️ Gray-ish color (${r}, ${g}, ${b})`);
          }
        }
        console.log('');
      });

      // Expand first position
      console.log('\n📂 Step 6: Expanding first position...\n');
      await firstPosition.click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: 'playwright-report/admiral-3-expanded.png',
        fullPage: true
      });

      // Check for table rows
      const tableRows = page.locator('.custom-table .ant-table-tbody tr');
      const rowCount = await tableRows.count();
      console.log(`📊 Step 7: Found ${rowCount} table rows\n`);

      if (rowCount > 0) {
        const firstRow = tableRows.first();
        const firstCell = firstRow.locator('td').first();

        // Check cell color
        const cellColor = await firstCell.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        console.log('🎨 Table cell text color:', cellColor);

        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        };

        const cellRgb = parseRgb(cellColor);
        if (cellRgb) {
          const isHighContrast = cellRgb.r > 240 && cellRgb.g > 240 && cellRgb.b > 240;
          if (isHighContrast) {
            console.log('✅ Table text has HIGH CONTRAST\n');
          } else {
            console.log('⚠️ Table text contrast may need improvement\n');
          }
        }

        // Test hover
        console.log('🖱️ Step 8: Testing hover on table row...\n');

        const bgBefore = await firstCell.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        console.log('Background BEFORE hover:', bgBefore);

        await firstRow.hover();
        await page.waitForTimeout(500);

        const bgAfter = await firstCell.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        console.log('Background AFTER hover:', bgAfter);

        // Take screenshot with hover
        await page.screenshot({
          path: 'playwright-report/admiral-4-hover.png',
          fullPage: true
        });

        const bgBeforeRgb = parseRgb(bgBefore);
        const bgAfterRgb = parseRgb(bgAfter);

        if (bgBeforeRgb && bgAfterRgb) {
          const brightnessBefore = bgBeforeRgb.r + bgBeforeRgb.g + bgBeforeRgb.b;
          const brightnessAfter = bgAfterRgb.r + bgAfterRgb.g + bgAfterRgb.b;

          console.log(`\nBrightness comparison:`);
          console.log(`  Before: ${brightnessBefore} (R:${bgBeforeRgb.r} G:${bgBeforeRgb.g} B:${bgBeforeRgb.b})`);
          console.log(`  After:  ${brightnessAfter} (R:${bgAfterRgb.r} G:${bgAfterRgb.g} B:${bgAfterRgb.b})`);
          console.log(`  Change: ${brightnessAfter - brightnessBefore}\n`);

          if (brightnessAfter < brightnessBefore) {
            console.log('✅ SUCCESS: Row gets DARKER on hover!\n');
          } else if (brightnessAfter > brightnessBefore) {
            console.log('❌ PROBLEM: Row gets LIGHTER on hover (white highlight detected)\n');
          } else {
            console.log('⚠️ No brightness change on hover\n');
          }
        }

        // Check colored elements in table
        const tableColoredElements = await page.evaluate(() => {
          const elements = [];
          const rows = document.querySelectorAll('.custom-table .ant-table-tbody tr');

          rows.forEach((row, rowIndex) => {
            if (rowIndex < 3) { // Check first 3 rows
              const coloredCells = row.querySelectorAll('[class*="text-green"], [class*="text-blue"], [class*="text-orange"]');

              coloredCells.forEach(cell => {
                const text = cell.textContent?.trim();
                if (text) {
                  const computed = window.getComputedStyle(cell);
                  const classes = Array.from(cell.classList).join(' ');

                  elements.push({
                    rowIndex,
                    text,
                    color: computed.color,
                    classes
                  });
                }
              });
            }
          });

          return elements;
        });

        if (tableColoredElements.length > 0) {
          console.log('🎨 COLORED ELEMENTS IN TABLE:', tableColoredElements.length, '\n');
          tableColoredElements.forEach((el, index) => {
            console.log(`[${index + 1}] Row ${el.rowIndex}: "${el.text}"`);
            console.log(`    Color: ${el.color}`);
            console.log(`    Classes: ${el.classes}`);
            console.log('');
          });
        } else {
          console.log('⚠️ No colored elements found in table rows\n');
        }
      } else {
        console.log('⚠️ No table rows found in expanded position\n');
      }
    }

    console.log('✅ Test completed!\n');
    console.log('📸 Screenshots saved:\n');
    console.log('  - admiral-1-dark-mode.png');
    console.log('  - admiral-2-positions.png');
    console.log('  - admiral-3-expanded.png');
    console.log('  - admiral-4-hover.png\n');
  });
});
