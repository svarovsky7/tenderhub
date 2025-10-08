import { test, expect } from '@playwright/test';

test.describe('Table Row Hover in Dark Theme', () => {
  test('should make rows darker on hover, not lighter', async ({ page }) => {
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

    // Select tender
    const tenderSelector = page.locator('.ant-select').first();
    const selectorExists = await tenderSelector.isVisible().catch(() => false);

    if (selectorExists) {
      await tenderSelector.click();
      await page.waitForTimeout(500);

      const admiralOption = page.locator('text=/.*Адмирал.*/i').first();
      const admiralVisible = await admiralOption.isVisible().catch(() => false);

      if (admiralVisible) {
        await admiralOption.click();
        await page.waitForTimeout(2000);
        console.log('✅ Selected Admiral tender\n');
      }
    }

    // Get position cards
    const allCards = page.locator('.ant-card');
    const totalCards = await allCards.count();

    if (totalCards > 1) {
      const card = allCards.nth(1); // First position card
      await card.click(); // Expand position
      await page.waitForTimeout(2000);
      console.log('📂 Expanded first position\n');

      // Find table rows
      const tableRows = page.locator('.custom-table .ant-table-tbody tr');
      const rowCount = await tableRows.count();
      console.log(`📊 Found ${rowCount} table rows\n`);

      if (rowCount > 0) {
        const firstRow = tableRows.first();
        const firstCell = firstRow.locator('td').first();

        // Get background BEFORE hover
        const bgBefore = await firstCell.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        console.log('Background BEFORE hover:', bgBefore);

        // Parse RGB
        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        };

        const bgBeforeRgb = parseRgb(bgBefore);
        if (bgBeforeRgb) {
          const brightnessBefore = bgBeforeRgb.r + bgBeforeRgb.g + bgBeforeRgb.b;
          console.log(`Brightness BEFORE: ${brightnessBefore} (R:${bgBeforeRgb.r} G:${bgBeforeRgb.g} B:${bgBeforeRgb.b})\n`);
        }

        // Hover over row
        await firstRow.hover();
        await page.waitForTimeout(500);

        // Get background AFTER hover
        const bgAfter = await firstCell.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        console.log('Background AFTER hover:', bgAfter);

        const bgAfterRgb = parseRgb(bgAfter);
        if (bgAfterRgb) {
          const brightnessAfter = bgAfterRgb.r + bgAfterRgb.g + bgAfterRgb.b;
          console.log(`Brightness AFTER: ${brightnessAfter} (R:${bgAfterRgb.r} G:${bgAfterRgb.g} B:${bgAfterRgb.b})\n`);
        }

        // Take screenshot with hover
        await page.screenshot({
          path: 'playwright-report/table-hover-check.png',
          fullPage: true
        });

        // Compare brightness
        if (bgBeforeRgb && bgAfterRgb) {
          const brightnessBefore = bgBeforeRgb.r + bgBeforeRgb.g + bgBeforeRgb.b;
          const brightnessAfter = bgAfterRgb.r + bgAfterRgb.g + bgAfterRgb.b;
          const change = brightnessAfter - brightnessBefore;

          console.log(`Brightness change: ${change}`);

          if (brightnessAfter < brightnessBefore) {
            console.log('✅ SUCCESS: Row gets DARKER on hover!\n');
          } else if (brightnessAfter > brightnessBefore) {
            console.log('❌ PROBLEM: Row gets LIGHTER on hover!\n');
            console.log(`   Change: +${change} (should be negative)\n`);
          } else {
            console.log('⚠️ No brightness change on hover\n');
          }
        }

        // Check CSS rules
        const cssRules = await page.evaluate(() => {
          const rules = [];
          for (let i = 0; i < document.styleSheets.length; i++) {
            try {
              const sheet = document.styleSheets[i];
              const cssRules = sheet.cssRules || sheet.rules;

              for (let j = 0; j < cssRules.length; j++) {
                const rule = cssRules[j] as CSSStyleRule;
                if (rule.selectorText &&
                    rule.selectorText.includes(':hover') &&
                    rule.selectorText.includes('tr')) {
                  rules.push({
                    selector: rule.selectorText,
                    background: rule.style.backgroundColor || rule.style.background
                  });
                }
              }
            } catch (e) {
              // Skip inaccessible sheets
            }
          }
          return rules;
        });

        console.log('\n📋 CSS HOVER RULES FOR TABLE ROWS:');
        cssRules.forEach((rule, index) => {
          console.log(`\n[${index + 1}] ${rule.selector}`);
          console.log(`    Background: ${rule.background || '(not set)'}`);
        });
      }
    }

    console.log('\n✅ Test completed!\n');
  });
});
