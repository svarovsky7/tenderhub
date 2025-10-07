import { test, expect } from '@playwright/test';

test.describe('BOQ Hover Color Check', () => {
  test('should check actual hover background color', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Switched to dark theme\n');

    // Select tender
    const tenderCards = page.locator('.ant-card');
    const tenderCount = await tenderCards.count();
    console.log(`📋 Found ${tenderCount} tender cards`);

    if (tenderCount > 0) {
      await tenderCards.first().click();
      await page.waitForTimeout(3000);
      console.log('✅ Selected tender\n');

      // Click on first position to expand
      const positionCards = page.locator('.ant-card');
      await positionCards.first().click();
      await page.waitForTimeout(2000);
      console.log('📂 Expanded position\n');

      // Look for any table rows
      const allRows = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        const rowInfo = [];

        tables.forEach((table, tableIndex) => {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((row, rowIndex) => {
            const classes = Array.from(row.classList).join(' ');
            rowInfo.push({
              tableIndex,
              rowIndex,
              classes,
              hasColorClass: classes.includes('bg-') || classes.includes('orange') || classes.includes('blue')
            });
          });
        });

        return rowInfo;
      });

      console.log('🔍 Found table rows:', allRows.length);
      if (allRows.length > 0) {
        console.log('📊 Row classes:', allRows);
      }

      // Try to find any row with colored background class
      const coloredRow = page.locator('tbody tr[class*="bg-"]').first();
      const coloredRowExists = await coloredRow.isVisible().catch(() => false);

      if (coloredRowExists) {
        console.log('✅ Found colored row\n');

        // Get background BEFORE hover
        const bgBefore = await coloredRow.locator('td').first().evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        console.log('🎨 Background BEFORE hover:', bgBefore);

        // Take screenshot before hover
        await page.screenshot({
          path: 'playwright-report/hover-before.png',
          fullPage: true
        });

        // Hover over the row
        await coloredRow.hover();
        await page.waitForTimeout(500);

        // Get background AFTER hover
        const bgAfter = await coloredRow.locator('td').first().evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        console.log('🎨 Background AFTER hover:', bgAfter);

        // Take screenshot after hover
        await page.screenshot({
          path: 'playwright-report/hover-after.png',
          fullPage: true
        });

        // Get ALL applied styles on hover
        const allStyles = await coloredRow.locator('td').first().evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            opacity: computed.opacity,
            filter: computed.filter
          };
        });

        console.log('🎨 ALL styles on hover:', allStyles);

        // Parse RGB
        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
          };
        };

        const bgBeforeRgb = parseRgb(bgBefore);
        const bgAfterRgb = parseRgb(bgAfter);

        if (bgBeforeRgb && bgAfterRgb) {
          const brightnessBefore = bgBeforeRgb.r + bgBeforeRgb.g + bgBeforeRgb.b;
          const brightnessAfter = bgAfterRgb.r + bgAfterRgb.g + bgAfterRgb.b;

          console.log('\n📊 Brightness comparison:');
          console.log(`   Before: ${brightnessBefore} (R:${bgBeforeRgb.r} G:${bgBeforeRgb.g} B:${bgBeforeRgb.b})`);
          console.log(`   After:  ${brightnessAfter} (R:${bgAfterRgb.r} G:${bgAfterRgb.g} B:${bgAfterRgb.b})`);
          console.log(`   Change: ${brightnessAfter - brightnessBefore}\n`);

          if (brightnessAfter < brightnessBefore) {
            console.log('✅ SUCCESS: Hover makes row DARKER');
          } else if (brightnessAfter > brightnessBefore) {
            console.log('❌ PROBLEM: Hover makes row LIGHTER (white highlight detected)');
            console.log('   This means CSS rule is NOT being applied!\n');
          } else {
            console.log('⚠️ No brightness change detected\n');
          }
        }

        // Check if there are other hover styles overriding
        const cssRules = await page.evaluate(() => {
          const rules = [];
          for (let i = 0; i < document.styleSheets.length; i++) {
            try {
              const sheet = document.styleSheets[i];
              const cssRules = sheet.cssRules || sheet.rules;

              for (let j = 0; j < cssRules.length; j++) {
                const rule = cssRules[j] as CSSStyleRule;
                if (rule.selectorText && rule.selectorText.includes(':hover') &&
                    (rule.selectorText.includes('tr') || rule.selectorText.includes('row'))) {
                  rules.push({
                    selector: rule.selectorText,
                    styles: rule.style.cssText
                  });
                }
              }
            } catch (e) {
              // Skip sheets we can't access
            }
          }
          return rules;
        });

        console.log('📋 Found hover CSS rules for rows:', cssRules.length);
        cssRules.forEach((rule, index) => {
          console.log(`\n[${index + 1}] ${rule.selector}`);
          console.log(`    ${rule.styles}`);
        });

      } else {
        console.log('⚠️ No colored rows found - table might be empty');

        // Try any row
        const anyRow = page.locator('tbody tr').first();
        const anyRowExists = await anyRow.isVisible().catch(() => false);

        if (anyRowExists) {
          console.log('✅ Found at least one row\n');

          const bgBefore = await anyRow.locator('td').first().evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });

          console.log('🎨 Row background (no hover):', bgBefore);

          await anyRow.hover();
          await page.waitForTimeout(500);

          const bgAfter = await anyRow.locator('td').first().evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });

          console.log('🎨 Row background (hover):', bgAfter);
        }
      }
    }

    console.log('\n✅ Test completed\n');
  });
});
