import { test, expect } from '@playwright/test';

test.describe('BOQ Full Flow - Text Color Check', () => {
  test('should select tender, wait for rows to load, and check text color in dark theme', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    const toggleExists = await themeToggle.isVisible().catch(() => false);

    if (toggleExists) {
      await themeToggle.click();
      await page.waitForTimeout(800);
      console.log('🌙 Step 2: Switched to dark theme');
    }

    // Take screenshot of tender selection screen
    await page.screenshot({
      path: 'playwright-report/step1-tender-selection.png',
      fullPage: true
    });

    // Count tender cards
    const tenderCards = page.locator('.ant-card');
    const tenderCount = await tenderCards.count();
    console.log(`📋 Step 3: Found ${tenderCount} tender cards`);

    if (tenderCount === 0) {
      console.log('❌ No tenders found! Test cannot continue.');
      return;
    }

    // Click on first tender
    await tenderCards.first().click();
    console.log('👆 Step 4: Clicked on first tender');

    // Wait for positions to load - increase timeout
    await page.waitForTimeout(3000);

    // Take screenshot after tender selection
    await page.screenshot({
      path: 'playwright-report/step2-after-tender-selection.png',
      fullPage: true
    });

    // Check position cards
    const positionCards = page.locator('.ant-card');
    const positionCount = await positionCards.count();
    console.log(`📦 Step 5: Found ${positionCount} position cards after tender selection`);

    if (positionCount === 0) {
      console.log('❌ No position cards found! Test cannot continue.');
      return;
    }

    // Get the first position card and check its text color
    const firstPositionCard = positionCards.first();
    const cardTextColor = await firstPositionCard.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    const cardBgColor = await firstPositionCard.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('🎨 Position card text color:', cardTextColor);
    console.log('🎨 Position card background color:', cardBgColor);

    // Check if card is collapsed or expanded
    const cardContent = firstPositionCard.locator('.ant-card-body');
    const isVisible = await cardContent.isVisible();
    console.log('📂 Position card content visible:', isVisible);

    // Click to expand the position
    await firstPositionCard.click();
    console.log('👆 Step 6: Clicked on first position card to expand');

    // Wait for expansion animation and content to load
    await page.waitForTimeout(2000);

    // Take screenshot after expanding
    await page.screenshot({
      path: 'playwright-report/step3-position-expanded.png',
      fullPage: true
    });

    // Now look for table rows
    const tableRows = page.locator('.custom-table .ant-table-tbody tr');
    const rowCount = await tableRows.count();
    console.log(`📊 Step 7: Found ${rowCount} table rows`);

    if (rowCount === 0) {
      console.log('⚠️ No table rows found yet. Waiting longer...');
      await page.waitForTimeout(3000);

      const rowCountRetry = await tableRows.count();
      console.log(`📊 After additional wait: Found ${rowCountRetry} table rows`);

      if (rowCountRetry === 0) {
        console.log('❌ Still no rows found. Checking if table exists...');

        const tableExists = await page.locator('.custom-table').isVisible().catch(() => false);
        console.log('🔍 Table element exists:', tableExists);

        const allElements = await page.evaluate(() => {
          const body = document.querySelector('.ant-card-body');
          return body ? body.innerHTML.substring(0, 500) : 'Card body not found';
        });
        console.log('🔍 Card body content preview:', allElements);

        return;
      }
    }

    // Check text color of first row
    if (rowCount > 0) {
      const firstRow = tableRows.first();
      const firstCell = firstRow.locator('td').first();

      const cellTextColor = await firstCell.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      const cellBgColor = await firstCell.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('🎨 Table cell text color:', cellTextColor);
      console.log('🎨 Table cell background color:', cellBgColor);

      // Parse RGB values
      const parseRgb = (color: string) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      };

      const textRgb = parseRgb(cellTextColor);

      if (textRgb) {
        console.log(`🎨 RGB values: R=${textRgb.r}, G=${textRgb.g}, B=${textRgb.b}`);

        const isHighContrast = textRgb.r > 240 && textRgb.g > 240 && textRgb.b > 240;
        if (isHighContrast) {
          console.log('✅ Text color is VERY LIGHT (almost white) - HIGH CONTRAST!');
        } else if (textRgb.r > 200 && textRgb.g > 200 && textRgb.b > 200) {
          console.log('✅ Text color is light - good contrast');
        } else {
          console.log('⚠️ Text color may still be too dark - needs more contrast');
        }
      }

      // Take screenshot of table with rows
      await page.screenshot({
        path: 'playwright-report/step4-table-with-rows.png',
        fullPage: true
      });

      // Now test hover effect
      console.log('🖱️ Step 8: Testing hover effect...');

      const bgBefore = await firstCell.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      await firstRow.hover();
      await page.waitForTimeout(500);

      const bgAfter = await firstCell.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('🎨 Background BEFORE hover:', bgBefore);
      console.log('🎨 Background AFTER hover:', bgAfter);

      const bgBeforeRgb = parseRgb(bgBefore);
      const bgAfterRgb = parseRgb(bgAfter);

      if (bgBeforeRgb && bgAfterRgb) {
        const brightnessBefore = bgBeforeRgb.r + bgBeforeRgb.g + bgBeforeRgb.b;
        const brightnessAfter = bgAfterRgb.r + bgAfterRgb.g + bgAfterRgb.b;

        console.log(`📊 Brightness BEFORE: ${brightnessBefore}, AFTER: ${brightnessAfter}`);

        if (brightnessAfter < brightnessBefore) {
          console.log('✅ SUCCESS: Hover makes row DARKER (correct!)');
        } else if (brightnessAfter > brightnessBefore) {
          console.log('❌ PROBLEM: Hover makes row LIGHTER (should be darker!)');
        } else {
          console.log('⚠️ WARNING: No brightness change detected on hover');
        }
      }

      // Take screenshot with hover
      await page.screenshot({
        path: 'playwright-report/step5-row-hover.png',
        fullPage: true
      });
    }

    console.log('\n✅ Test completed! Check screenshots in playwright-report/\n');
  });
});
