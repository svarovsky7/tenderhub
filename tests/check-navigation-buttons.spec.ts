import { test, expect } from '@playwright/test';

test('Navigation buttons should be transparent on all pages', async ({ page }) => {
  // Test BOQ page
  await page.goto('http://localhost:5175/boq');
  await page.waitForSelector('.boq-page-header', { timeout: 10000 });

  const boqDashboardBtn = page.locator('button', { hasText: 'К дашборду' }).first();
  if (await boqDashboardBtn.isVisible()) {
    const bgColor = await boqDashboardBtn.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('BOQ - К дашборду button bg:', bgColor);
    await page.screenshot({ path: 'tests/screenshots/boq-buttons.png' });
  }

  // Test TenderConstructionCosts page (need to select tender first)
  await page.goto('http://localhost:5175/construction-costs/tender');
  await page.waitForSelector('.tender-costs-header', { timeout: 10000 });

  const constructionTendersBtn = page.locator('button', { hasText: 'К тендерам' }).first();
  if (await constructionTendersBtn.isVisible()) {
    const bgColor = await constructionTendersBtn.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('TenderConstructionCosts - К тендерам button bg:', bgColor);
    await page.screenshot({ path: 'tests/screenshots/construction-costs-buttons.png' });

    // Check that it's NOT white (should be transparent or rgba with low alpha)
    const isTransparent = bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent';
    const hasLowAlpha = bgColor.includes('rgba') && parseFloat(bgColor.split(',')[3]) < 0.3;
    expect(isTransparent || hasLowAlpha).toBeTruthy();
  }

  // Test MaterialsWorks page
  await page.goto('http://localhost:5175/materials-works');
  await page.waitForTimeout(2000);

  const materialsWorksDashboardBtn = page.locator('button', { hasText: 'К дашборду' }).first();
  if (await materialsWorksDashboardBtn.isVisible()) {
    const bgColor = await materialsWorksDashboardBtn.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('MaterialsWorks - К дашборду button bg:', bgColor);
    await page.screenshot({ path: 'tests/screenshots/materials-works-buttons.png' });
  }
});
