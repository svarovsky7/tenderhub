import { test, expect } from '@playwright/test';

test('Simple BOQ page tender change test', async ({ page }) => {
  test.setTimeout(60000);

  // Navigate to BOQ page
  await page.goto('http://localhost:5175/boq');
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  console.log('✅ Page loaded');

  // Take initial screenshot
  await page.screenshot({ path: 'tests/screenshots/boq-initial.png' });

  // Check for tender selector
  const tenderSelector = page.locator('text=Тендер:').first();
  await expect(tenderSelector).toBeVisible({ timeout: 5000 });
  console.log('✅ Tender selector found');

  // Check for QuickTenderSelector initially
  const hasQuickSelector = await page.locator('.quick-tender-card').count() > 0;
  console.log(`Quick selector present: ${hasQuickSelector}`);

  // Take final screenshot
  await page.screenshot({ path: 'tests/screenshots/boq-final.png', fullPage: true });

  console.log('✅ Test completed successfully');
});
