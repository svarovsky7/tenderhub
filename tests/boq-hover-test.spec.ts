import { test, expect } from '@playwright/test';

test.describe('BOQ Page Hover Test', () => {
  test('should capture BOQ page with row hover in dark theme', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('📍 Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    const toggleExists = await themeToggle.isVisible().catch(() => false);

    if (toggleExists) {
      await themeToggle.click();
      await page.waitForTimeout(800);
      console.log('🌙 Switched to dark theme');
    }

    // Take screenshot of tender selection screen
    await page.screenshot({
      path: 'playwright-report/boq-dark-tender-select.png',
      fullPage: true
    });
    console.log('📸 Screenshot: Tender selection in dark theme');

    // Try to select first tender
    const tenderCards = page.locator('.ant-card');
    const tenderCount = await tenderCards.count();
    console.log(`📋 Found ${tenderCount} tender cards`);

    if (tenderCount > 0) {
      await tenderCards.first().click();
      await page.waitForTimeout(2500);
      console.log('✅ Selected first tender');

      // Take screenshot with positions visible
      await page.screenshot({
        path: 'playwright-report/boq-dark-positions.png',
        fullPage: true
      });
      console.log('📸 Screenshot: Positions visible in dark theme');

      // Wait a bit more to ensure everything loaded
      await page.waitForTimeout(1000);

      // Try to find and expand a position card
      const positionCards = page.locator('.ant-card');
      const positionCount = await positionCards.count();
      console.log(`🔍 Found ${positionCount} position cards`);

      if (positionCount > 0) {
        // Try clicking on first position card
        const firstPosition = positionCards.first();
        const isClickable = await firstPosition.isVisible();

        if (isClickable) {
          await firstPosition.click();
          await page.waitForTimeout(1500);
          console.log('📂 Clicked first position card');

          // Take screenshot of expanded position
          await page.screenshot({
            path: 'playwright-report/boq-dark-position-expanded.png',
            fullPage: true
          });
          console.log('📸 Screenshot: Position expanded');

          // Try to find table rows
          const tableRows = page.locator('.ant-table-tbody tr');
          const rowCount = await tableRows.count();
          console.log(`📊 Found ${rowCount} table rows`);

          if (rowCount > 0) {
            // Hover over first row
            const firstRow = tableRows.first();
            await firstRow.hover();
            await page.waitForTimeout(500);
            console.log('🖱️ Hovering over first row');

            // Get hover background color
            const hoverBg = await firstRow.locator('td').first().evaluate((el) => {
              return window.getComputedStyle(el).backgroundColor;
            });
            console.log(`🎨 Row hover background: ${hoverBg}`);

            // Take screenshot with hover
            await page.screenshot({
              path: 'playwright-report/boq-dark-row-hover.png',
              fullPage: true
            });
            console.log('📸 Screenshot: Row hover in dark theme');
          } else {
            console.log('⚠️ No table rows found in expanded position');
          }
        }
      }
    } else {
      console.log('⚠️ No tender cards found');
    }

    console.log('✅ Test completed');
  });
});
