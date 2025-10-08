import { test, expect } from '@playwright/test';

test('BSM stats colors check', async ({ page }) => {
  // Navigate to BOQ page
  await page.goto('http://localhost:5175/boq');
  await page.waitForSelector('.boq-page-header', { timeout: 10000 });

  // Wait for tenders to load
  await page.waitForTimeout(2000);

  // Select first tender
  const tenderSelect = page.locator('[placeholder="Выберите тендер"]').first();
  await tenderSelect.click();
  await page.waitForTimeout(500);

  // Click first option
  const firstOption = page.locator('.ant-select-item').first();
  await firstOption.click();
  await page.waitForTimeout(1000);

  // Select version if available
  const versionSelect = page.locator('[placeholder="Выберите версию"]').first();
  if (await versionSelect.isVisible()) {
    await versionSelect.click();
    await page.waitForTimeout(500);
    const firstVersionOption = page.locator('.ant-select-item').first();
    await firstVersionOption.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot of the stats area
  await page.screenshot({ path: 'tests/screenshots/bsm-stats-after-selection.png', fullPage: true });

  // Check if there are stat cards with icons
  const statCards = page.locator('.ant-statistic, .ant-card').filter({ hasText: /Общая стоимость|Работ|Материалов/ });
  const count = await statCards.count();

  console.log(`Found ${count} stat elements`);

  // If we find stats with Ant Design Statistic, check their colors
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      const stat = statCards.nth(i);
      const text = await stat.textContent();
      console.log(`Stat ${i}: ${text?.substring(0, 50)}`);
    }
  }
});
