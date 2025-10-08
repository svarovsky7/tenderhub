import { test } from '@playwright/test';

test('Visual test - BOQ page screenshots', async ({ page }) => {
  test.setTimeout(45000);

  // Navigate and wait
  await page.goto('http://localhost:5175/boq', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Screenshot
  await page.screenshot({
    path: 'tests/screenshots/boq-page-visual.png',
    fullPage: true
  });

  console.log('✅ Screenshot saved');
});
