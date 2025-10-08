import { test } from '@playwright/test';

test.describe('Applied Styles Check', () => {
  test('should check all applied CSS rules', async ({ page }) => {
    await page.goto('http://localhost:5174/boq?tender=736dc11c-33dc-4fce-a7ee-c477abb8b694');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);

    // Expand first position
    const firstCard = page.locator('.ant-card').nth(1);
    await firstCard.click();
    await page.waitForTimeout(2000);

    // Get all computed styles for the label
    const noteLabel = page.locator('text=/Примечание Заказчика:/').first();
    const noteLabelExists = await noteLabel.isVisible().catch(() => false);

    if (noteLabelExists) {
      const styles = await noteLabel.evaluate((el) => {
        const computed = window.getComputedStyle(el);

        // Get all CSS rules that match this element
        const matchingRules: string[] = [];
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules || [])) {
              if (rule instanceof CSSStyleRule) {
                if (el.matches(rule.selectorText)) {
                  matchingRules.push(`${rule.selectorText} { ${rule.style.color ? 'color: ' + rule.style.color : 'no color'} }`);
                }
              }
            }
          } catch (e) {
            // Skip CORS-restricted stylesheets
          }
        }

        return {
          computedColor: computed.color,
          computedOpacity: computed.opacity,
          matchingRules: matchingRules.slice(0, 20), // Limit to first 20
          inlineStyle: (el as HTMLElement).style.color
        };
      });

      console.log('\n📝 "Примечание Заказчика:" applied styles:');
      console.log('   Computed color:', styles.computedColor);
      console.log('   Computed opacity:', styles.computedOpacity);
      console.log('   Inline style color:', styles.inlineStyle || 'none');
      console.log('\n   Matching CSS rules:');
      styles.matchingRules.forEach((rule, i) => {
        console.log(`   ${i + 1}. ${rule}`);
      });
    }
  });
});
