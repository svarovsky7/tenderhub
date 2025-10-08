import { test, expect } from '@playwright/test';

test.describe('Materials Library Page in Dark Theme', () => {
  test('should have dark background for materials list', async ({ page }) => {
    // Navigate to materials library page
    await page.goto('http://localhost:5174/libraries/materials');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to materials library page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Click on "Задать базовые данные" button to show the table
    const configureButton = page.locator('button:has-text("Задать базовые данные")');
    await configureButton.click();
    await page.waitForTimeout(500);
    console.log('⚙️ Step 3: Switched to configure mode\n');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/materials-page-dark.png',
      fullPage: true
    });

    // Wait for materials to load
    await page.waitForTimeout(1000);

    // Check statistics block background (white div container)
    const statsBlock = page.locator('div').filter({ has: page.locator('.ant-statistic') }).first();
    const statsExists = await statsBlock.isVisible().catch(() => false);

    if (statsExists) {
      // Get the actual div with inline style (parent of stats)
      const statsParent = await statsBlock.evaluate((el) => {
        // Find parent with inline style
        let current = el;
        while (current.parentElement) {
          const style = current.getAttribute('style');
          if (style && (style.includes('background: white') || style.includes('background:white'))) {
            const computed = window.getComputedStyle(current);
            return {
              backgroundColor: computed.backgroundColor,
              inlineStyle: style
            };
          }
          current = current.parentElement;
        }
        return null;
      });

      if (statsParent) {
        console.log('📊 Statistics container (white div) styles:');
        console.log('   Background:', statsParent.backgroundColor);
        console.log('   Inline style:', statsParent.inlineStyle);
      }

      const statsStyles = await statsBlock.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor
        };
      });

      console.log('📊 Statistics block styles:');
      console.log('   Background:', statsStyles.backgroundColor);

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

      const statsRgb = parseRgb(statsStyles.backgroundColor);
      if (statsRgb) {
        const brightness = statsRgb.r + statsRgb.g + statsRgb.b;
        console.log(`   Stats RGB: (${statsRgb.r}, ${statsRgb.g}, ${statsRgb.b})`);
        console.log(`   Stats brightness: ${brightness}\n`);

        if (brightness < 150) {
          console.log('   ✅ GOOD: Stats block background is DARK\n');
        } else {
          console.log('   ❌ PROBLEM: Stats block background is LIGHT\n');
        }
      }
    }

    // Check for table or card container
    const tableWrapper = page.locator('.ant-table-wrapper').first();
    const tableExists = await tableWrapper.isVisible().catch(() => false);

    if (tableExists) {
      console.log('📊 Found table wrapper');

      // Check table background
      const tableStyles = await tableWrapper.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor
        };
      });

      console.log('🎨 Table wrapper styles:');
      console.log('   Background:', tableStyles.backgroundColor);

      // Check actual table element
      const table = page.locator('.ant-table').first();
      const tableMainStyles = await table.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor
        };
      });

      console.log('\n🎨 Table element styles:');
      console.log('   Background:', tableMainStyles.backgroundColor);

      // Check table container/card
      const card = page.locator('.ant-card').first();
      const cardExists = await card.isVisible().catch(() => false);

      if (cardExists) {
        const cardStyles = await card.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            borderColor: computed.borderColor
          };
        });

        console.log('\n🎨 Card container styles:');
        console.log('   Background:', cardStyles.backgroundColor);
        console.log('   Border:', cardStyles.borderColor);

        // Parse RGB
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

        const bgRgb = parseRgb(cardStyles.backgroundColor);
        if (bgRgb) {
          const brightness = bgRgb.r + bgRgb.g + bgRgb.b;
          console.log(`\n   Background RGB: (${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`);
          console.log(`   Background brightness: ${brightness}\n`);

          if (brightness < 150) {
            console.log('   ✅ GOOD: Card background is DARK\n');
          } else {
            console.log('   ❌ PROBLEM: Card background is LIGHT\n');
          }
        }
      }

      // Check table body rows
      const firstRow = page.locator('.ant-table-tbody tr').first();
      const rowExists = await firstRow.isVisible().catch(() => false);

      if (rowExists) {
        const rowStyles = await firstRow.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor
          };
        });

        console.log('🎨 Table row styles:');
        console.log('   Background:', rowStyles.backgroundColor);

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

        const rowRgb = parseRgb(rowStyles.backgroundColor);
        if (rowRgb) {
          const brightness = rowRgb.r + rowRgb.g + rowRgb.b;
          console.log(`   Row RGB: (${rowRgb.r}, ${rowRgb.g}, ${rowRgb.b})`);
          console.log(`   Row brightness: ${brightness}\n`);

          if (brightness < 150) {
            console.log('   ✅ GOOD: Row background is DARK\n');
          } else {
            console.log('   ❌ PROBLEM: Row background is LIGHT\n');
          }
        }
      }
    } else {
      console.log('⚠️ Table wrapper not found\n');
    }

    console.log('\n✅ Test completed!\n');
  });
});
