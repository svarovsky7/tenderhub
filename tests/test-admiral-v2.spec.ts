import { test, expect } from '@playwright/test';

test.describe('Test Admiral Tender v2 - Full Flow', () => {
  test('should select Admiral tender and test colors', async ({ page }) => {
    // Start from dashboard
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to Dashboard\n');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Take screenshot of dashboard
    await page.screenshot({
      path: 'playwright-report/admiral-v2-1-dashboard.png',
      fullPage: true
    });

    // Look for QuickTenderSelector or tender selector
    const tenderSelector = page.locator('[class*="tender"], .ant-select, [placeholder*="тендер"]').first();
    const selectorExists = await tenderSelector.isVisible().catch(() => false);

    if (selectorExists) {
      console.log('✅ Found tender selector on dashboard\n');

      await tenderSelector.click();
      await page.waitForTimeout(500);

      // Look for "ЖК Адмирал" in dropdown
      const admiralOption = page.locator('.ant-select-item:has-text("Адмирал")').first();
      const admiralExists = await admiralOption.isVisible().catch(() => false);

      if (admiralExists) {
        await admiralOption.click();
        await page.waitForTimeout(1000);
        console.log('✅ Selected Admiral tender from dropdown\n');
      } else {
        console.log('⚠️ Admiral tender not found in dropdown\n');
      }
    }

    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 3: Navigated to BOQ page\n');

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/admiral-v2-2-boq-page.png',
      fullPage: true
    });

    // Check if there's a tender selector on BOQ page
    const boqTenderSelector = page.locator('.ant-select, [class*="tender-select"]').first();
    const boqSelectorExists = await boqTenderSelector.isVisible().catch(() => false);

    if (boqSelectorExists) {
      console.log('✅ Found tender selector on BOQ page\n');

      await boqTenderSelector.click();
      await page.waitForTimeout(500);

      // Look for Admiral
      const admiralOption = page.locator('text=/.*Адмирал.*/i').first();
      const admiralVisible = await admiralOption.isVisible().catch(() => false);

      if (admiralVisible) {
        console.log('✅ Found Admiral option\n');
        await admiralOption.click();
        await page.waitForTimeout(2000);

        // Take screenshot after selection
        await page.screenshot({
          path: 'playwright-report/admiral-v2-3-after-select.png',
          fullPage: true
        });
      } else {
        console.log('⚠️ Admiral option not visible in dropdown\n');

        // Show all available options
        const allOptions = await page.locator('.ant-select-item').allTextContents();
        console.log('Available options:', allOptions.slice(0, 10));
      }
    } else {
      console.log('⚠️ No tender selector found on BOQ page\n');

      // Check what's on the page
      const pageContent = await page.evaluate(() => {
        return {
          hasCards: document.querySelectorAll('.ant-card').length,
          hasTable: document.querySelectorAll('table').length,
          hasSelect: document.querySelectorAll('.ant-select').length,
          bodyText: document.body.textContent?.substring(0, 500)
        };
      });

      console.log('Page analysis:', pageContent);
    }

    // Get all cards - first is header, rest are position cards
    const allCards = page.locator('.ant-card');
    const totalCards = await allCards.count();
    console.log(`\n📦 Step 4: Found ${totalCards} total cards (including header)\n`);

    // Check second card (index 1) which should be first position
    if (totalCards > 1) {
      const card = allCards.nth(1);
      const text = await card.textContent();
      console.log(`📄 Second card text preview: "${text?.substring(0, 100)}..."\n`);

          // Check ALL text elements and their colors
          const allElements = await card.evaluate((el) => {
            const elements = [];
            const allTextNodes = el.querySelectorAll('span, div, p, strong');

            allTextNodes.forEach((node, idx) => {
              if (idx < 35) { // Limit to first 35 to catch materials count
                const text = node.textContent?.trim();
                if (text && text.length > 0) {
                  const computed = window.getComputedStyle(node);
                  const classList = Array.from(node.classList);

                  elements.push({
                    text: text.substring(0, 50),
                    color: computed.color,
                    classes: classList.join(' '),
                    tagName: node.tagName.toLowerCase()
                  });
                }
              }
            });

            return elements;
          });

          console.log(`🔍 First 35 text elements in position card:`);
          allElements.forEach((el, idx) => {
            console.log(`  [${idx + 1}] ${el.tagName}: "${el.text}"`);
            console.log(`      Color: ${el.color}`);
            if (el.classes) {
              console.log(`      Classes: ${el.classes}`);
            }
          });

      // Click to expand
      await card.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'playwright-report/admiral-v2-4-expanded-position.png',
        fullPage: true
      });
    }

    console.log('\n✅ Test completed!\n');
  });
});
