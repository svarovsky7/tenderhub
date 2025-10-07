import { test, expect } from '@playwright/test';

test.describe('BOQ Inspect All Styles', () => {
  test('should inspect all text elements and their computed styles', async ({ page }) => {
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

    // Select first tender
    const tenderCards = page.locator('.ant-card');
    await tenderCards.first().click();
    await page.waitForTimeout(3000);
    console.log('📋 Selected tender\n');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/boq-styles-inspection.png',
      fullPage: true
    });

    // Get all text-containing elements and check their styles
    const textElements = await page.evaluate(() => {
      const elements = [];

      // Check all cards
      const cards = document.querySelectorAll('.ant-card');
      cards.forEach((card, index) => {
        const computed = window.getComputedStyle(card);
        elements.push({
          type: 'Card',
          index,
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          innerHTML: card.innerHTML.substring(0, 100)
        });
      });

      // Check all text with specific classes
      const textClasses = [
        '.text-gray-600',
        '.text-gray-700',
        '.text-gray-800',
        '.text-gray-900',
        '.ant-card-head-title',
        'span',
        'div',
        'p'
      ];

      textClasses.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach((el, index) => {
          if (index < 3) { // Limit to first 3 of each type
            const computed = window.getComputedStyle(el);
            const text = el.textContent?.substring(0, 50) || '';

            if (text.trim()) {
              elements.push({
                type: selector,
                index,
                text: text.trim(),
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                classList: Array.from(el.classList).join(' ')
              });
            }
          }
        });
      });

      return elements;
    });

    console.log('🔍 INSPECTING ALL TEXT ELEMENTS:\n');

    textElements.forEach((el, i) => {
      console.log(`[${i + 1}] ${el.type} #${el.index}`);
      if (el.text) {
        console.log(`   Text: "${el.text}"`);
      }
      console.log(`   Color: ${el.color}`);
      console.log(`   Background: ${el.backgroundColor}`);
      if (el.classList) {
        console.log(`   Classes: ${el.classList}`);
      }
      console.log('');
    });

    // Check if inline styles are overriding CSS
    const inlineStylesCheck = await page.evaluate(() => {
      const cards = document.querySelectorAll('.ant-card');
      const issues = [];

      cards.forEach((card, index) => {
        const inlineColor = (card as HTMLElement).style.color;
        const inlineBg = (card as HTMLElement).style.backgroundColor;

        if (inlineColor || inlineBg) {
          issues.push({
            cardIndex: index,
            inlineColor: inlineColor || 'none',
            inlineBackground: inlineBg || 'none'
          });
        }
      });

      return issues;
    });

    if (inlineStylesCheck.length > 0) {
      console.log('⚠️ FOUND INLINE STYLES (these override CSS!):\n');
      inlineStylesCheck.forEach(issue => {
        console.log(`Card #${issue.cardIndex}:`);
        console.log(`   Inline color: ${issue.inlineColor}`);
        console.log(`   Inline background: ${issue.inlineBackground}`);
        console.log('');
      });
    } else {
      console.log('✅ No problematic inline styles found\n');
    }

    console.log('✅ Inspection completed\n');
  });
});
