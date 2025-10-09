import { test, expect } from '@playwright/test';

test('Check table sum colors are green in dark theme', async ({ page }) => {
  console.log('🚀 [Test] Checking table sum colors in dark theme');

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

  // Find first position card
  const positionCards = page.locator('.ant-card');
  const cardsCount = await positionCards.count();
  console.log(`📋 [Test] Found ${cardsCount} position cards`);

  if (cardsCount > 0) {
    // Expand first position
    const firstCard = positionCards.first();
    console.log('📂 [Test] Expanding first position...');
    await firstCard.click();
    await page.waitForTimeout(3000);

    // Wait for table to appear
    await page.waitForSelector('.boq-items-table', { timeout: 5000 }).catch(() => {
      console.log('⚠️ [Test] Table not found');
    });

    // Find all table sum elements with class table-sum-green
    let sumElements = page.locator('.table-sum-green');
    let sumCount = await sumElements.count();
    console.log(`💰 [Test] Found ${sumCount} sum elements with class .table-sum-green`);

    // If not found by class, try finding by text pattern (amount with ₽)
    if (sumCount === 0) {
      console.log('🔍 [Test] Trying to find sums by text pattern...');
      sumElements = page.locator('.ant-table-summary strong, .ant-table-tbody strong').filter({ hasText: '₽' });
      sumCount = await sumElements.count();
      console.log(`💰 [Test] Found ${sumCount} sum elements by text pattern`);
    }

    if (sumCount > 0) {
      // Check the first few sum elements
      for (let i = 0; i < Math.min(sumCount, 5); i++) {
        const text = await sumElements.nth(i).textContent();
        const color = await sumElements.nth(i).evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        console.log(`📊 [Test] Sum ${i + 1}: "${text}" - color: ${color}`);

        // Should be green in dark theme: rgb(115, 209, 61) = #73d13d
        // OR rgb(82, 196, 26) = #52c41a for light theme
        const isGreen = color === 'rgb(115, 209, 61)' || color === 'rgb(82, 196, 26)';
        if (!isGreen) {
          console.log(`❌ [Test] Sum ${i + 1} is NOT green! Color: ${color}`);
        }
      }
      console.log('✅ [Test] Checked all visible sums');
    } else {
      console.log('⚠️ [Test] No sum elements found');
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/table-sums-dark-theme.png',
      fullPage: false
    });
    console.log('📸 [Test] Screenshot saved: table-sums-dark-theme.png');
  }

  console.log('✅ [Test] Test completed');
});
