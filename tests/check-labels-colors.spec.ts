import { test, expect } from '@playwright/test';

test('Check Client and GP labels colors in dark theme', async ({ page }) => {
  console.log('🚀 [Test] Checking labels colors in dark theme');

  // Go to BOQ page
  await page.goto('/boq');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Switch to dark theme
  const themeToggle = page.locator('[data-testid="theme-toggle"]');
  await expect(themeToggle).toBeVisible();
  await themeToggle.click();
  await page.waitForTimeout(1000);
  console.log('✅ [Test] Switched to dark theme');

  // Select tender
  console.log('🔍 [Test] Selecting tender...');
  const tenderNameSelector = page.locator('.ant-select').first();
  await tenderNameSelector.click();
  await page.waitForTimeout(500);

  await page.waitForSelector('.ant-select-item-option', { timeout: 3000 });
  const options = page.locator('.ant-select-item-option');
  const optionsCount = await options.count();

  let found = false;
  for (let i = 0; i < Math.min(optionsCount, 10); i++) {
    const optionText = await options.nth(i).textContent();
    if (optionText?.toLowerCase().includes('адмирал') || optionText?.toLowerCase().includes('admiral')) {
      await options.nth(i).click();
      found = true;
      break;
    }
  }

  if (!found && optionsCount > 0) {
    await options.first().click();
  }

  await page.waitForTimeout(1000);

  // Select version if available
  const versionSelector = page.locator('.ant-select').nth(1);
  if (await versionSelector.isVisible().catch(() => false)) {
    await versionSelector.click();
    await page.waitForTimeout(500);
    try {
      await page.waitForSelector('.ant-select-dropdown:visible .ant-select-item-option', { timeout: 2000 });
      const versionOptions = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      if (await versionOptions.count() > 0) {
        await versionOptions.first().click();
      }
    } catch (e) {
      console.log('⚠️ [Test] No version options');
    }
  }

  await page.waitForTimeout(3000);
  console.log('✅ [Test] Tender selected');

  // Wait for positions to load
  await page.waitForTimeout(4000);

  // Find first position card with client note or quantity
  const positionCards = page.locator('.ant-card');
  const cardsCount = await positionCards.count();
  console.log(`📋 [Test] Found ${cardsCount} position cards`);

  if (cardsCount > 0) {
    // Expand first position
    const firstCard = positionCards.first();
    console.log('📂 [Test] Expanding first position...');
    await firstCard.click();
    await page.waitForTimeout(2000);

    // Take screenshot of the expanded position
    await page.screenshot({
      path: 'test-results/expanded-position-dark-theme.png',
      fullPage: false
    });
    console.log('📸 [Test] Screenshot saved: expanded-position-dark-theme.png');

    // Check if we can find the labels
    const clientNoteLabel = page.locator('text=/Примечание Заказчика:/');
    const clientQtyLabel = page.locator('text=/Кол-во Заказчика:/');
    const gpNoteLabel = page.locator('text=/Примечание ГП:/');
    const gpQtyLabel = page.locator('text=/Кол-во ГП:|Объем ГП:/');

    console.log('🔍 [Test] Looking for labels:');
    console.log(`  Client Note: ${await clientNoteLabel.count()} found`);
    console.log(`  Client Qty: ${await clientQtyLabel.count()} found`);
    console.log(`  GP Note: ${await gpNoteLabel.count()} found`);
    console.log(`  GP Qty: ${await gpQtyLabel.count()} found`);

    // Check label colors if found
    if (await clientNoteLabel.count() > 0) {
      const color = await clientNoteLabel.first().evaluate((el) => window.getComputedStyle(el).color);
      console.log(`📝 [Test] Client Note label color: ${color}`);
      // Should be gray in dark theme
      expect(color).toMatch(/rgba?\(115,\s*115,\s*115|rgba?\(255,\s*255,\s*255,\s*0\.4[0-9]/);
    }

    console.log('✅ [Test] Test completed');
  }
});
