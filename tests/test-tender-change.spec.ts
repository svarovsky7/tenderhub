import { test, expect } from '@playwright/test';

test('Check tender change behavior on BOQ page', async ({ page }) => {
  test.setTimeout(60000);

  console.log('1️⃣ Opening BOQ page...');
  await page.goto('http://localhost:5175/boq');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  console.log('2️⃣ Taking initial screenshot...');
  await page.screenshot({ path: 'tests/screenshots/step1-initial.png', fullPage: true });

  // Check if QuickTenderSelector is visible initially
  console.log('3️⃣ Checking for QuickTenderSelector...');
  const quickCards = await page.locator('.quick-tender-card').count();
  console.log(`Found ${quickCards} quick tender cards`);

  // Find and click tender dropdown
  console.log('4️⃣ Looking for tender dropdown...');
  const tenderDropdown = page.getByPlaceholder('Выберите тендер').first();
  const isTenderDropdownVisible = await tenderDropdown.isVisible();
  console.log(`Tender dropdown visible: ${isTenderDropdownVisible}`);

  if (isTenderDropdownVisible) {
    console.log('5️⃣ Clicking tender dropdown...');
    await tenderDropdown.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/step2-dropdown-opened.png' });

    // Select first option
    console.log('6️⃣ Selecting first tender...');
    const firstOption = page.locator('.ant-select-dropdown .ant-select-item').first();
    await firstOption.click();
    await page.waitForTimeout(1500);

    console.log('7️⃣ Taking screenshot after tender name selection...');
    await page.screenshot({ path: 'tests/screenshots/step3-after-name-selection.png', fullPage: true });

    // Check what's visible now
    const quickCardsAfter = await page.locator('.quick-tender-card').count();
    console.log(`Quick cards after name selection: ${quickCardsAfter}`);

    const versionMessage = await page.locator('text=Выберите версию').count();
    console.log(`"Select version" messages found: ${versionMessage}`);

    // Look for version dropdown
    console.log('8️⃣ Looking for version dropdown...');
    const versionDropdown = page.getByPlaceholder('Выберите версию').first();
    const isVersionVisible = await versionDropdown.isVisible();
    console.log(`Version dropdown visible: ${isVersionVisible}`);

    if (isVersionVisible) {
      console.log('9️⃣ Selecting version...');
      await versionDropdown.click();
      await page.waitForTimeout(1000);

      const firstVersion = page.locator('.ant-select-dropdown .ant-select-item').first();
      await firstVersion.click();
      await page.waitForTimeout(3000);

      console.log('🔟 Taking screenshot after version selection...');
      await page.screenshot({ path: 'tests/screenshots/step4-after-version-selection.png', fullPage: true });

      // NOW CHANGE THE TENDER NAME
      console.log('1️⃣1️⃣ NOW CHANGING TENDER NAME...');
      await tenderDropdown.click();
      await page.waitForTimeout(1000);

      // Try to select second option
      const secondOption = page.locator('.ant-select-dropdown .ant-select-item').nth(1);
      const secondExists = await secondOption.isVisible().catch(() => false);

      if (secondExists) {
        console.log('1️⃣2️⃣ Selecting second tender...');
        await secondOption.click();
        await page.waitForTimeout(1500);

        console.log('1️⃣3️⃣ Taking screenshot after tender change...');
        await page.screenshot({ path: 'tests/screenshots/step5-after-tender-change.png', fullPage: true });

        // Check what's visible
        const quickCardsAfterChange = await page.locator('.quick-tender-card').count();
        console.log(`Quick cards after tender change: ${quickCardsAfterChange}`);

        const versionMessageAfterChange = await page.locator('text=Выберите версию').count();
        console.log(`"Select version" messages after change: ${versionMessageAfterChange}`);

        // VERIFY: QuickTenderSelector should NOT be visible
        if (quickCardsAfterChange === 0) {
          console.log('✅ SUCCESS: QuickTenderSelector is NOT visible after tender change');
        } else {
          console.log('❌ FAIL: QuickTenderSelector IS visible after tender change - BUG!');
        }

        // VERIFY: Version selection message should be visible
        if (versionMessageAfterChange > 0) {
          console.log('✅ SUCCESS: Version selection message is visible');
        } else {
          console.log('❌ FAIL: Version selection message is NOT visible');
        }
      } else {
        console.log('⚠️ Only one tender available, cannot test tender change');
      }
    }
  }

  console.log('✅ Test completed');
});
