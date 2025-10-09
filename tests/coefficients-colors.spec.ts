import { test, expect } from '@playwright/test';

test('Check coefficient colors in dark theme', async ({ page }) => {
  console.log('🚀 [Test] Checking coefficient colors in dark theme');

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
    const tableVisible = await page.waitForSelector('.boq-items-table', { timeout: 5000 }).catch(() => null);

    if (tableVisible) {
      console.log('✅ [Test] Table found');

      // Find all coefficient elements with class coef-colored
      const coefElements = page.locator('.coef-colored');
      const coefCount = await coefElements.count();
      console.log(`🔢 [Test] Found ${coefCount} coefficient elements with class .coef-colored`);

      if (coefCount > 0) {
        // Check the first 10 coefficient elements
        for (let i = 0; i < Math.min(coefCount, 10); i++) {
          const text = await coefElements.nth(i).textContent();
          const color = await coefElements.nth(i).evaluate((el) => {
            return window.getComputedStyle(el).color;
          });

          const textTrimmed = text?.trim() || '';
          console.log(`📊 [Test] Coef ${i + 1}: "${textTrimmed}" - color: ${color}`);

          // Check if color is not white (should be green, orange, or gray depending on value)
          const isWhite = color === 'rgb(255, 255, 255)' || color === 'rgba(255, 255, 255, 1)';
          if (isWhite && textTrimmed !== '—' && textTrimmed !== '1') {
            console.log(`❌ [Test] Coefficient ${i + 1} is WHITE (should be colored)!`);
          }

          // Expected colors:
          // Green: rgb(149, 222, 100) = #95de64 for conversion coef > 1
          // Orange: rgb(255, 169, 64) = #ffa940 for consumption coef > 1
          // Gray: rgba(255, 255, 255, 0.45) for coef = 1
          const isGreen = color === 'rgb(149, 222, 100)';
          const isOrange = color === 'rgb(255, 169, 64)';
          const isGray = color.includes('rgba(255, 255, 255, 0.45)') || color.includes('rgba(255, 255, 255, 0.3)');

          if (isGreen) {
            console.log(`  ✅ Green (conversion coef > 1)`);
          } else if (isOrange) {
            console.log(`  ✅ Orange (consumption coef > 1)`);
          } else if (isGray) {
            console.log(`  ✅ Gray (coef = 1 or empty)`);
          } else if (!isWhite) {
            console.log(`  ⚠️ Unexpected color but NOT white`);
          }
        }
        console.log('✅ [Test] Checked all visible coefficients');
      } else {
        console.log('⚠️ [Test] No coefficient elements found');
      }

      // Take screenshot
      await page.screenshot({
        path: 'test-results/coefficients-colors-dark-theme.png',
        fullPage: false
      });
      console.log('📸 [Test] Screenshot saved: coefficients-colors-dark-theme.png');
    } else {
      console.log('⚠️ [Test] Table not found after expanding position');

      // Take screenshot to see what's visible
      await page.screenshot({
        path: 'test-results/coefficients-no-table.png',
        fullPage: false
      });
    }
  }

  console.log('✅ [Test] Test completed');
});
