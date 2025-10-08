import { test, expect } from '@playwright/test';

test.describe('Tender Selection Block in Dark Theme', () => {
  test('should check if tender selection area has dark background in dark theme', async ({ page }) => {
    // Navigate to commercial costs page
    await page.goto('http://localhost:5174/commercial-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to commercial costs page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Wait for page to render
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/tender-selection-1-dark.png',
      fullPage: true
    });

    // Find tender selection block
    const tenderSelectionBlock = page.locator('.tender-selection-block').first();
    const blockExists = await tenderSelectionBlock.isVisible().catch(() => false);

    if (blockExists) {
      const blockStyles = await tenderSelectionBlock.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          background: computed.background,
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          borderTopColor: computed.borderTopColor
        };
      });

      console.log('📦 Tender selection block styles:');
      console.log('   Background:', blockStyles.background.substring(0, 100) + '...');
      console.log('   Background color:', blockStyles.backgroundColor);
      console.log('   Border color:', blockStyles.borderColor);
      console.log('   Border top color:', blockStyles.borderTopColor);

      // Parse RGB from background color
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

      const bgRgb = parseRgb(blockStyles.backgroundColor);
      if (bgRgb) {
        const brightness = bgRgb.r + bgRgb.g + bgRgb.b;
        console.log(`\n   Background RGB: (${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`);
        console.log(`   Background brightness: ${brightness}`);
        console.log(`   Background alpha: ${bgRgb.a}\n`);

        // Check if background is dark (brightness should be low)
        if (brightness < 200) {
          console.log('   ✅ GOOD: Background is DARK\n');
        } else {
          console.log('   ❌ PROBLEM: Background is LIGHT/WHITE\n');
        }
      }

      const borderRgb = parseRgb(blockStyles.borderTopColor);
      if (borderRgb) {
        const brightness = borderRgb.r + borderRgb.g + borderRgb.b;
        console.log(`   Border RGB: (${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b})`);
        console.log(`   Border brightness: ${brightness}\n`);

        if (brightness < 300) {
          console.log('   ✅ GOOD: Border is DARK\n');
        } else {
          console.log('   ❌ PROBLEM: Border is LIGHT/WHITE\n');
        }
      }

      // Check "Тендер:" label text color
      const tenderLabel = tenderSelectionBlock.locator('.tender-label-text').first();
      const tenderLabelExists = await tenderLabel.isVisible().catch(() => false);

      if (tenderLabelExists) {
        const labelColor = await tenderLabel.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        console.log('🏷️ "Тендер:" label color:', labelColor);

        const labelRgb = parseRgb(labelColor);
        if (labelRgb) {
          const brightness = labelRgb.r + labelRgb.g + labelRgb.b;
          console.log(`   Label RGB: (${labelRgb.r}, ${labelRgb.g}, ${labelRgb.b})`);
          console.log(`   Label brightness: ${brightness}\n`);

          if (brightness > 500) {
            console.log('   ✅ GOOD: Label text is LIGHT (visible on dark background)\n');
          } else {
            console.log('   ❌ PROBLEM: Label text is DARK (not visible on dark background)\n');
          }
        }
      }

      // Check all text-gray-800 elements inside the block
      const grayTextElements = await tenderSelectionBlock.locator('.text-gray-800').all();
      console.log(`📝 Found ${grayTextElements.length} .text-gray-800 elements\n`);

      for (let i = 0; i < Math.min(grayTextElements.length, 3); i++) {
        const el = grayTextElements[i];
        const color = await el.evaluate((elem) => {
          return window.getComputedStyle(elem).color;
        });
        const text = await el.textContent();

        console.log(`   [${i + 1}] Text: "${text?.substring(0, 50)}..."`);
        console.log(`       Color: ${color}`);

        const rgb = parseRgb(color);
        if (rgb) {
          const brightness = rgb.r + rgb.g + rgb.b;
          console.log(`       Brightness: ${brightness}`);
          if (brightness > 500) {
            console.log(`       ✅ GOOD: Text is LIGHT\n`);
          } else {
            console.log(`       ❌ PROBLEM: Text is DARK\n`);
          }
        }
      }

    } else {
      console.log('❌ Tender selection block not found\n');
    }

    console.log('\n✅ Test completed!\n');
  });
});
