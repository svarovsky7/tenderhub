import { test, expect } from '@playwright/test';

test.describe('DeadlineStatusBar spacing consistency', () => {
  test('should have equal spacing between header and DeadlineStatusBar on both pages', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds timeout
    console.log('🚀 Starting DeadlineStatusBar spacing test');

    // Navigate to commercial costs page
    await page.goto('/commercial-costs');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to /commercial-costs');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Look for QuickTenderSelector cards (cards with tender names starting with "ЖК")
    const tenderCards = page.locator('.ant-card').filter({ hasText: 'ЖК' });
    const tenderCardsCount = await tenderCards.count();

    console.log(`📊 Found ${tenderCardsCount} tender cards on /commercial-costs`);

    if (tenderCardsCount > 0) {
      // Click the first tender card
      await tenderCards.first().click();
      await page.waitForTimeout(3000);
      console.log('✅ Selected tender via card on /commercial-costs');
    } else {
      throw new Error('No tender cards found on /commercial-costs');
    }

    // Wait for DeadlineStatusBar to appear
    await page.waitForSelector('[class*="deadline-status-bar"], .ant-alert', { timeout: 5000 });
    console.log('✅ DeadlineStatusBar appeared on /commercial-costs');

    // Get bounding boxes for header and DeadlineStatusBar
    const header1 = page.locator('.commercial-page-header');
    const deadlineBar1 = page.locator('[class*="deadline-status-bar"], .ant-alert').first();

    const headerBox1 = await header1.boundingBox();
    const deadlineBox1 = await deadlineBar1.boundingBox();

    if (!headerBox1 || !deadlineBox1) {
      throw new Error('Could not get bounding boxes on /commercial-costs');
    }

    // Calculate spacing (distance between bottom of header and top of DeadlineStatusBar)
    const spacing1 = deadlineBox1.y - (headerBox1.y + headerBox1.height);
    console.log(`📏 /commercial-costs spacing: ${spacing1}px`);
    console.log(`   Header bottom: ${headerBox1.y + headerBox1.height}px, DeadlineBar top: ${deadlineBox1.y}px`);

    // Navigate to financial indicators page
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to /financial');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Look for QuickTenderSelector cards (cards with tender names starting with "ЖК")
    const tenderCards2 = page.locator('.ant-card').filter({ hasText: 'ЖК' });
    const tenderCardsCount2 = await tenderCards2.count();

    console.log(`📊 Found ${tenderCardsCount2} tender cards on /financial`);

    if (tenderCardsCount2 > 0) {
      // Click the first tender card
      await tenderCards2.first().click();
      await page.waitForTimeout(3000);
      console.log('✅ Selected tender via card on /financial');
    } else {
      throw new Error('No tender cards found on /financial');
    }

    // Wait for DeadlineStatusBar to appear
    await page.waitForSelector('[class*="deadline-status-bar"], .ant-alert', { timeout: 5000 });
    console.log('✅ DeadlineStatusBar appeared on /financial');

    // Get bounding boxes for header and DeadlineStatusBar
    const header2 = page.locator('.financial-page-header');
    const deadlineBar2 = page.locator('[class*="deadline-status-bar"], .ant-alert').first();

    const headerBox2 = await header2.boundingBox();
    const deadlineBox2 = await deadlineBar2.boundingBox();

    if (!headerBox2 || !deadlineBox2) {
      throw new Error('Could not get bounding boxes on /financial');
    }

    // Calculate spacing
    const spacing2 = deadlineBox2.y - (headerBox2.y + headerBox2.height);
    console.log(`📏 /financial spacing: ${spacing2}px`);
    console.log(`   Header bottom: ${headerBox2.y + headerBox2.height}px, DeadlineBar top: ${deadlineBox2.y}px`);

    // Compare spacings (allow 2px tolerance for rounding differences)
    const tolerance = 2;
    const spacingDifference = Math.abs(spacing1 - spacing2);

    console.log(`\n📊 Comparison:`);
    console.log(`   /commercial-costs: ${spacing1.toFixed(2)}px`);
    console.log(`   /financial: ${spacing2.toFixed(2)}px`);
    console.log(`   Difference: ${spacingDifference.toFixed(2)}px`);
    console.log(`   Tolerance: ${tolerance}px`);

    // Assert that spacings are equal within tolerance
    expect(spacingDifference).toBeLessThanOrEqual(tolerance);

    if (spacingDifference <= tolerance) {
      console.log('✅ SUCCESS: Spacings are equal!');
    } else {
      console.log('❌ FAIL: Spacings are different!');
    }
  });
});
