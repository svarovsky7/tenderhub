import { test } from '@playwright/test';

test.describe('Label HTML Structure', () => {
  test('should inspect HTML structure of labels', async ({ page }) => {
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

    // Get full HTML of "Примечание Заказчика:" element
    const noteLabel = page.locator('text=/Примечание Заказчика:/').first();
    const noteLabelExists = await noteLabel.isVisible().catch(() => false);

    if (noteLabelExists) {
      const labelHtml = await noteLabel.evaluate((el) => {
        return {
          outerHTML: el.outerHTML,
          classList: Array.from(el.classList),
          computedColor: window.getComputedStyle(el).color,
          tag: el.tagName
        };
      });
      console.log('\n📝 "Примечание Заказчика:" element:');
      console.log('   HTML:', labelHtml.outerHTML);
      console.log('   Classes:', labelHtml.classList);
      console.log('   Tag:', labelHtml.tag);
      console.log('   Color:', labelHtml.computedColor);
    }

    // Get full HTML of "Ед. изм. Заказчика:" element
    const unitLabel = page.locator('text=/Ед\\. изм\\. Заказчика:/').first();
    const unitLabelExists = await unitLabel.isVisible().catch(() => false);

    if (unitLabelExists) {
      const labelHtml = await unitLabel.evaluate((el) => {
        return {
          outerHTML: el.outerHTML,
          classList: Array.from(el.classList),
          computedColor: window.getComputedStyle(el).color,
          tag: el.tagName
        };
      });
      console.log('\n📏 "Ед. изм. Заказчика:" element:');
      console.log('   HTML:', labelHtml.outerHTML);
      console.log('   Classes:', labelHtml.classList);
      console.log('   Tag:', labelHtml.tag);
      console.log('   Color:', labelHtml.computedColor);
    }
  });
});
