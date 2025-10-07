import { test, expect } from '@playwright/test';

test.describe('Expanded Position Background in Dark Theme', () => {
  test('should check if total cost area has dark background when position is expanded', async ({ page }) => {
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

    // Select Admiral tender
    const tenderSelector = page.locator('.ant-select').first();
    await tenderSelector.click();
    await page.waitForTimeout(500);

    const admiralOption = page.locator('text=/.*Адмирал.*/i').first();
    const admiralVisible = await admiralOption.isVisible().catch(() => false);

    if (admiralVisible) {
      await admiralOption.click();
      await page.waitForTimeout(3000);
      console.log('✅ Selected Admiral tender\n');
    } else {
      console.log('❌ Admiral tender not found');

      // Show available options
      const allOptions = await page.locator('.ant-select-item').allTextContents();
      console.log('Available tenders:', allOptions.slice(0, 10));
      return;
    }

    // Take screenshot after tender selection
    await page.screenshot({
      path: 'playwright-report/expanded-bg-1-positions.png',
      fullPage: true
    });

    // Find position cards (skip first which is header)
    const allCards = page.locator('.ant-card');
    const totalCards = await allCards.count();
    console.log(`📦 Found ${totalCards} total cards (including header)\n`);

    // Look for a position with money (total cost > 0)
    let foundPosition = false;
    for (let i = 1; i < Math.min(totalCards, 10); i++) {
      const card = allCards.nth(i);
      const text = await card.textContent();

      // Check if this card has total cost (look for ₽ symbol and non-zero value)
      if (text && text.includes('₽') && !text.includes('0 ₽')) {
        console.log(`💰 Found position with money at index ${i}`);
        console.log(`   Preview: "${text?.substring(0, 150)}..."\n`);

        // Click to expand
        await card.click();
        await page.waitForTimeout(2000);
        console.log('📂 Expanded position\n');

        // Wait for loading to complete (wait for table or empty state)
        await page.waitForTimeout(3000);

        // Take screenshot of expanded position
        await page.screenshot({
          path: 'playwright-report/expanded-bg-2-expanded.png',
          fullPage: true
        });

        // Check the background of expanded area
        const expandedArea = card.locator('.bg-gray-50').first();
        const expandedAreaExists = await expandedArea.isVisible().catch(() => false);

        if (expandedAreaExists) {
          const bgColor = await expandedArea.evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
          });

          console.log('🎨 Expanded area background color:', bgColor);

          // Parse RGB
          const parseRgb = (color: string) => {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!match) return null;
            return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
          };

          const rgb = parseRgb(bgColor);
          if (rgb) {
            console.log(`   RGB: (${rgb.r}, ${rgb.g}, ${rgb.b})`);
            const brightness = rgb.r + rgb.g + rgb.b;
            console.log(`   Brightness: ${brightness}`);

            // Check if it's white/light (brightness > 600 is considered light)
            if (brightness > 600) {
              console.log('   ❌ PROBLEM: Background is LIGHT/WHITE!\n');
            } else {
              console.log('   ✅ GOOD: Background is DARK\n');
            }

            // Check all text elements to find total cost
            const totalCostElements = await card.evaluate(() => {
              const elements = [];
              const allSpans = document.querySelectorAll('span, div');

              allSpans.forEach((span) => {
                const text = span.textContent?.trim() || '';
                if (text.includes('₽') && text.length < 50) {
                  const computed = window.getComputedStyle(span);
                  elements.push({
                    text,
                    color: computed.color,
                    bgColor: computed.backgroundColor,
                    classes: Array.from(span.classList).join(' ')
                  });
                }
              });

              return elements;
            });

            console.log('💰 Found elements with ₽ symbol:');
            totalCostElements.forEach((el, idx) => {
              console.log(`\n[${idx + 1}] "${el.text}"`);
              console.log(`    Text Color: ${el.color}`);
              console.log(`    BG Color: ${el.bgColor}`);
              console.log(`    Classes: ${el.classes || '(none)'}`);
            });
          }
        } else {
          console.log('⚠️ No .bg-gray-50 element found in expanded area');
        }

        foundPosition = true;
        break;
      }
    }

    if (!foundPosition) {
      console.log('❌ No position with money found in first 10 cards\n');
    }

    console.log('\n✅ Test completed!\n');
  });
});
