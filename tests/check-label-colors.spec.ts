import { test, expect } from '@playwright/test';

test.describe('Label Colors in Dark Theme', () => {
  test('should check if labels have dimmer color than content in dark theme', async ({ page }) => {
    // Navigate to BOQ page with specific tender
    await page.goto('http://localhost:5174/boq?tender=736dc11c-33dc-4fce-a7ee-c477abb8b694');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to BOQ page with tender');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Wait for positions to load
    await page.waitForTimeout(2000);

    // Take screenshot before expanding
    await page.screenshot({
      path: 'playwright-report/label-colors-1-initial.png',
      fullPage: true
    });

    // Find and expand first position card
    const firstCard = page.locator('.ant-card').nth(1); // Skip header card
    await firstCard.click();
    await page.waitForTimeout(2000);
    console.log('📂 Expanded first position\n');

    // Take screenshot after expanding
    await page.screenshot({
      path: 'playwright-report/label-colors-2-expanded.png',
      fullPage: true
    });

    // Check "Примечание Заказчика:" label color
    const noteLabel = page.locator('text=/Примечание Заказчика:/').first();
    const noteLabelExists = await noteLabel.isVisible().catch(() => false);

    if (noteLabelExists) {
      const labelColor = await noteLabel.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('📝 "Примечание Заказчика:" label color:', labelColor);

      // Find the note content (next sibling or nearby)
      const noteContent = firstCard.locator('text=/Примечание Заказчика:/../.. strong').first();
      const noteContentExists = await noteContent.isVisible().catch(() => false);

      if (noteContentExists) {
        const contentColor = await noteContent.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('📝 Note content color:', contentColor);

        // Parse RGB values
        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (!match) return null;
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
          };
        };

        const labelRgb = parseRgb(labelColor);
        const contentRgb = parseRgb(contentColor);

        if (labelRgb && contentRgb) {
          const labelBrightness = labelRgb.r + labelRgb.g + labelRgb.b;
          const contentBrightness = contentRgb.r + contentRgb.g + contentRgb.b;

          console.log(`   Label brightness: ${labelBrightness} (alpha: ${labelRgb.a})`);
          console.log(`   Content brightness: ${contentBrightness} (alpha: ${contentRgb.a})`);

          if (labelBrightness < contentBrightness) {
            console.log('   ✅ GOOD: Label is dimmer than content\n');
          } else {
            console.log('   ❌ PROBLEM: Label is NOT dimmer than content\n');
          }
        }
      }
    } else {
      console.log('⚠️ "Примечание Заказчика:" label not found in first position');
    }

    // Check "Ед. изм. Заказчика:" label color
    const unitLabel = page.locator('text=/Ед\\. изм\\. Заказчика:/').first();
    const unitLabelExists = await unitLabel.isVisible().catch(() => false);

    if (unitLabelExists) {
      const labelColor = await unitLabel.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('📏 "Ед. изм. Заказчика:" label color:', labelColor);

      // Find the unit content
      const unitContent = firstCard.locator('text=/Ед\\. изм\\. Заказчика:/../.. strong').first();
      const unitContentExists = await unitContent.isVisible().catch(() => false);

      if (unitContentExists) {
        const contentColor = await unitContent.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log('📏 Unit content color:', contentColor);

        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (!match) return null;
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] ? parseFloat(match[4]) : 1
          };
        };

        const labelRgb = parseRgb(labelColor);
        const contentRgb = parseRgb(contentColor);

        if (labelRgb && contentRgb) {
          const labelBrightness = labelRgb.r + labelRgb.g + labelRgb.b;
          const contentBrightness = contentRgb.r + contentRgb.g + contentRgb.b;

          console.log(`   Label brightness: ${labelBrightness} (alpha: ${labelRgb.a})`);
          console.log(`   Content brightness: ${contentBrightness} (alpha: ${contentRgb.a})`);

          if (labelBrightness < contentBrightness) {
            console.log('   ✅ GOOD: Label is dimmer than content\n');
          } else {
            console.log('   ❌ PROBLEM: Label is NOT dimmer than content\n');
          }
        }
      }
    } else {
      console.log('⚠️ "Ед. изм. Заказчика:" label not found in first position');
    }

    console.log('\n✅ Test completed!\n');
  });
});
