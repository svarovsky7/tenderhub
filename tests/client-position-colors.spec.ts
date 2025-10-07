import { test, expect } from '@playwright/test';

test.describe('Client Position Cards - Colors & Hover', () => {
  test('should check all color accents and hover behavior in dark theme', async ({ page }) => {
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

    // Select tender
    const tenderCards = page.locator('.ant-card');
    const tenderCount = await tenderCards.count();
    console.log(`📋 Step 3: Found ${tenderCount} tender cards`);

    if (tenderCount > 0) {
      await tenderCards.first().click();
      await page.waitForTimeout(3000);
      console.log('✅ Selected tender\n');

      // Take screenshot
      await page.screenshot({
        path: 'playwright-report/position-cards-overview.png',
        fullPage: true
      });

      // Get all position cards
      const positionCards = page.locator('.ant-card');
      const positionCount = await positionCards.count();
      console.log(`📦 Step 4: Found ${positionCount} position cards\n`);

      if (positionCount > 0) {
        const firstCard = positionCards.first();

        // Get ALL text elements in the card and their colors
        const allTextElements = await firstCard.evaluate((card) => {
          const elements = [];

          // Get all elements with text
          const allNodes = card.querySelectorAll('*');

          allNodes.forEach((node) => {
            const text = node.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
              const computed = window.getComputedStyle(node);
              const classList = Array.from(node.classList);

              elements.push({
                tag: node.tagName.toLowerCase(),
                text: text,
                color: computed.color,
                classes: classList.join(' '),
                hasColorClass: classList.some(c =>
                  c.includes('text-blue') ||
                  c.includes('text-red') ||
                  c.includes('text-green') ||
                  c.includes('text-orange') ||
                  c.includes('text-yellow') ||
                  c.includes('text-purple')
                )
              });
            }
          });

          return elements;
        });

        console.log('🔍 ALL TEXT ELEMENTS IN POSITION CARD:\n');

        allTextElements.forEach((el, index) => {
          console.log(`[${index + 1}] ${el.tag} "${el.text.substring(0, 50)}"`);
          console.log(`    Color: ${el.color}`);
          console.log(`    Classes: ${el.classes || '(none)'}`);

          if (el.hasColorClass) {
            console.log(`    ✅ HAS COLOR CLASS`);
          }

          // Parse RGB to check if it's white
          const match = el.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            const isWhite = r > 240 && g > 240 && b > 240;
            const isColored = (r > g + 30 || g > r + 30 || b > r + 30); // Has color variation

            if (isWhite) {
              console.log(`    ⚠️ COLOR IS WHITE (${r}, ${g}, ${b})`);
            } else if (isColored) {
              console.log(`    ✅ HAS COLOR (${r}, ${g}, ${b})`);
            }
          }
          console.log('');
        });

        // Check for specific elements
        console.log('\n🎯 CHECKING SPECIFIC ELEMENTS:\n');

        // Check "Доп" button
        const dopButton = firstCard.locator('button:has-text("Доп")');
        const dopExists = await dopButton.isVisible().catch(() => false);

        if (dopExists) {
          const dopColor = await dopButton.evaluate((el) => {
            return window.getComputedStyle(el).color;
          });
          console.log('🔵 "Доп" button color:', dopColor);
        } else {
          console.log('⚠️ "Доп" button not found');
        }

        // Look for numbers (likely costs/quantities)
        const numberElements = await firstCard.evaluate((card) => {
          const numbers = [];
          const allText = card.querySelectorAll('*');

          allText.forEach((el) => {
            const text = el.textContent?.trim() || '';
            // Check if contains numbers with spaces (like "1 234.56" or "123 456")
            if (/\d+[\s,]\d+|\d+\.\d+/.test(text) && text.length < 50) {
              const computed = window.getComputedStyle(el);
              numbers.push({
                text: text,
                color: computed.color,
                tag: el.tagName.toLowerCase(),
                classes: Array.from(el.classList).join(' ')
              });
            }
          });

          return numbers;
        });

        console.log('\n💰 NUMBERS/COSTS FOUND:', numberElements.length);
        numberElements.forEach((num, index) => {
          console.log(`[${index + 1}] ${num.text}`);
          console.log(`    Color: ${num.color}`);
          console.log(`    Tag: ${num.tag}`);
          console.log(`    Classes: ${num.classes || '(none)'}`);
          console.log('');
        });

        // Test hover effect on card
        console.log('\n🖱️ TESTING HOVER ON POSITION CARD:\n');

        const cardBgBefore = await firstCard.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        console.log('Background BEFORE hover:', cardBgBefore);

        // Hover over card
        await firstCard.hover();
        await page.waitForTimeout(500);

        const cardBgAfter = await firstCard.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        console.log('Background AFTER hover:', cardBgAfter);

        // Take screenshot with hover
        await page.screenshot({
          path: 'playwright-report/position-card-hover.png',
          fullPage: true
        });

        // Parse RGB
        const parseRgb = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        };

        const bgBefore = parseRgb(cardBgBefore);
        const bgAfter = parseRgb(cardBgAfter);

        if (bgBefore && bgAfter) {
          const brightnessBefore = bgBefore.r + bgBefore.g + bgBefore.b;
          const brightnessAfter = bgAfter.r + bgAfter.g + bgAfter.b;

          console.log(`\nBrightness: ${brightnessBefore} → ${brightnessAfter}`);
          console.log(`Change: ${brightnessAfter - brightnessBefore}`);

          if (brightnessAfter > brightnessBefore) {
            console.log('❌ PROBLEM: Card gets LIGHTER on hover (white highlight)\n');
          } else if (brightnessAfter < brightnessBefore) {
            console.log('✅ GOOD: Card gets DARKER on hover\n');
          } else {
            console.log('⚠️ No change on hover\n');
          }
        }

        // Look for hover CSS rules
        const hoverRules = await page.evaluate(() => {
          const rules = [];
          for (let i = 0; i < document.styleSheets.length; i++) {
            try {
              const sheet = document.styleSheets[i];
              const cssRules = sheet.cssRules || sheet.rules;

              for (let j = 0; j < cssRules.length; j++) {
                const rule = cssRules[j] as CSSStyleRule;
                if (rule.selectorText &&
                    rule.selectorText.includes(':hover') &&
                    rule.selectorText.includes('.ant-card')) {
                  rules.push({
                    selector: rule.selectorText,
                    styles: rule.style.cssText
                  });
                }
              }
            } catch (e) {
              // Skip inaccessible sheets
            }
          }
          return rules;
        });

        console.log('\n📋 HOVER CSS RULES FOR .ant-card:', hoverRules.length);
        hoverRules.forEach((rule, index) => {
          console.log(`\n[${index + 1}] ${rule.selector}`);
          console.log(`    ${rule.styles}`);
        });

      }
    }

    console.log('\n✅ Test completed!\n');
  });
});
