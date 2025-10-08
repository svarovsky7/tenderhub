import { test, expect } from '@playwright/test';

test('BOQ page should not reset to main page when changing tender name', async ({ page }) => {
  console.log('🚀 Testing BOQ page tender change behavior...');

  // Set longer test timeout
  test.setTimeout(90000);

  // Navigate to BOQ page
  await page.goto('http://localhost:5175/boq');
  await page.waitForSelector('.boq-page-header', { timeout: 15000 });

  console.log('✅ BOQ page loaded');

  // Wait for tenders to load
  await page.waitForTimeout(3000);

  // Check that QuickTenderSelector is visible initially
  const quickSelector = page.locator('.quick-tender-card').first();
  if (await quickSelector.isVisible()) {
    console.log('✅ QuickTenderSelector visible initially');
  }

  // Select first tender name
  const tenderSelect = page.locator('[placeholder="Выберите тендер"]').first();
  await tenderSelect.click();
  await page.waitForTimeout(500);

  const firstOption = page.locator('.ant-select-item').first();
  await firstOption.click();
  await page.waitForTimeout(1000);

  console.log('✅ First tender name selected');

  // Check that QuickTenderSelector is now hidden
  const quickSelectorAfterNameSelect = page.locator('.quick-tender-card').first();
  const isQuickSelectorVisible = await quickSelectorAfterNameSelect.isVisible().catch(() => false);

  if (!isQuickSelectorVisible) {
    console.log('✅ QuickTenderSelector hidden after name selection');
  } else {
    console.log('❌ QuickTenderSelector still visible after name selection');
  }

  // Check for "Выберите версию тендера" message
  const versionMessage = page.locator('text=Выберите версию тендера');
  await expect(versionMessage).toBeVisible({ timeout: 3000 });
  console.log('✅ "Select version" message is visible');

  // Select version
  const versionSelect = page.locator('[placeholder="Выберите версию"]').first();
  await versionSelect.click();
  await page.waitForTimeout(500);

  const firstVersionOption = page.locator('.ant-select-item').first();
  await firstVersionOption.click();
  await page.waitForTimeout(3000);

  console.log('✅ Version selected, waiting for content to load');

  // Wait for BOQ content to appear
  await page.waitForSelector('.tender-boq-manager, #boq-content-section', { timeout: 10000 });
  console.log('✅ BOQ content loaded');

  // Now change the tender name
  console.log('🔄 Changing tender name...');
  await tenderSelect.click();
  await page.waitForTimeout(500);

  // Select a different tender (second option if available)
  const secondOption = page.locator('.ant-select-item').nth(1);
  if (await secondOption.isVisible()) {
    await secondOption.click();
    await page.waitForTimeout(1000);
    console.log('✅ Changed to second tender name');

    // Check that QuickTenderSelector is NOT visible (should not go back to main page)
    const quickSelectorAfterChange = page.locator('.quick-tender-card').first();
    const isQuickSelectorVisibleAfterChange = await quickSelectorAfterChange.isVisible().catch(() => false);

    if (!isQuickSelectorVisibleAfterChange) {
      console.log('✅ SUCCESS: QuickTenderSelector is NOT visible after tender name change');
    } else {
      console.log('❌ FAIL: QuickTenderSelector is visible - page reset to main screen');
      throw new Error('Page reset to main screen when changing tender name');
    }

    // Check that version selection message is shown
    const versionMessageAfterChange = page.locator('text=Выберите версию тендера');
    await expect(versionMessageAfterChange).toBeVisible({ timeout: 3000 });
    console.log('✅ "Select version" message shown correctly after name change');
  } else {
    console.log('⚠️ Only one tender available, skipping tender change test');
  }

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/boq-tender-change-test.png', fullPage: true });
});

test('Cost Redistribution page should not reset when changing tender name', async ({ page }) => {
  console.log('🚀 Testing Cost Redistribution page tender change behavior...');

  // Set longer test timeout
  test.setTimeout(90000);

  // Navigate to Cost Redistribution page
  await page.goto('http://localhost:5175/cost-redistribution');
  await page.waitForSelector('.redistribution-page-header', { timeout: 15000 });

  console.log('✅ Cost Redistribution page loaded');

  // Wait for tenders to load
  await page.waitForTimeout(3000);

  // Select first tender name
  const tenderSelect = page.locator('[placeholder="Выберите тендер"]').first();
  await tenderSelect.click();
  await page.waitForTimeout(500);

  const firstOption = page.locator('.ant-select-item').first();
  await firstOption.click();
  await page.waitForTimeout(1000);

  console.log('✅ First tender name selected');

  // Check for "Выберите версию тендера" message
  const versionMessage = page.locator('text=Выберите версию тендера');
  await expect(versionMessage).toBeVisible({ timeout: 3000 });
  console.log('✅ "Select version" message is visible');

  // Select version
  const versionSelect = page.locator('[placeholder="Выберите версию"]').first();
  await versionSelect.click();
  await page.waitForTimeout(500);

  const firstVersionOption = page.locator('.ant-select-item').first();
  await firstVersionOption.click();
  await page.waitForTimeout(3000);

  console.log('✅ Version selected, waiting for content to load');

  // Wait for content to appear
  await page.waitForSelector('#redistribution-content-section', { timeout: 10000 });
  console.log('✅ Redistribution content loaded');

  // Now change the tender name
  console.log('🔄 Changing tender name...');
  await tenderSelect.click();
  await page.waitForTimeout(500);

  // Select a different tender
  const secondOption = page.locator('.ant-select-item').nth(1);
  if (await secondOption.isVisible()) {
    await secondOption.click();
    await page.waitForTimeout(1000);
    console.log('✅ Changed to second tender name');

    // Check that QuickTenderSelector is NOT visible
    const quickSelector = page.locator('.quick-tender-card').first();
    const isQuickSelectorVisible = await quickSelector.isVisible().catch(() => false);

    if (!isQuickSelectorVisible) {
      console.log('✅ SUCCESS: QuickTenderSelector is NOT visible after tender name change');
    } else {
      console.log('❌ FAIL: QuickTenderSelector is visible - page reset to main screen');
      throw new Error('Page reset to main screen when changing tender name');
    }

    // Check that version selection message is shown
    const versionMessageAfterChange = page.locator('text=Выберите версию тендера');
    await expect(versionMessageAfterChange).toBeVisible({ timeout: 3000 });
    console.log('✅ "Select version" message shown correctly after name change');
  } else {
    console.log('⚠️ Only one tender available, skipping tender change test');
  }

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/redistribution-tender-change-test.png', fullPage: true });
});
