import { test, expect } from '@playwright/test';

test.describe('BOQ Page - Tender Change Without Animation', () => {
  test('should change tender without page movement or animations', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5176/boq');

    // Wait for tenders to load
    await page.waitForSelector('text=Тендер:', { timeout: 10000 });

    // Select first tender by name
    await page.click('.ant-select-selector:has-text("Выберите тендер")');
    await page.waitForSelector('.ant-select-dropdown');

    // Get first tender option
    const firstTender = page.locator('.ant-select-item-option').first();
    await firstTender.click();

    // Wait for version selector to be enabled
    await page.waitForSelector('text=Выберите версию');

    // Select version
    await page.click('.ant-select-selector:has-text("Выберите версию")');
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    await page.waitForTimeout(300);  // Wait for dropdown animation
    const firstVersion = page.locator('.ant-select-dropdown .ant-select-item-option').first();
    await firstVersion.waitFor({ state: 'visible', timeout: 5000 });
    await firstVersion.click({ force: true });

    // Wait for content to load
    await page.waitForSelector('#boq-content-section', { timeout: 10000 });

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);
    console.log('Initial scroll position:', initialScroll);

    // Get initial tender info
    const initialTenderInfo = await page.locator('text=/Название:.*?/').first().textContent();
    console.log('Initial tender:', initialTenderInfo);

    // Now change tender - select different tender name
    console.log('\n=== CHANGING TENDER NAME ===\n');

    await page.click('.ant-select-selector:has-text("Тендер")');
    await page.waitForSelector('.ant-select-dropdown');

    // Select second tender (different from first)
    const secondTender = page.locator('.ant-select-item-option').nth(1);
    await secondTender.click();

    // At this point, content should still be visible (showing old tender)
    // Check that BOQ content is still visible
    const contentVisible = await page.locator('#boq-content-section').isVisible();
    console.log('Content visible after name change:', contentVisible);
    expect(contentVisible).toBe(true);

    // Check that scroll position hasn't changed significantly
    const scrollAfterNameChange = await page.evaluate(() => window.scrollY);
    console.log('Scroll after name change:', scrollAfterNameChange);
    expect(Math.abs(scrollAfterNameChange - initialScroll)).toBeLessThan(50);

    // Now select version
    console.log('\n=== SELECTING VERSION ===\n');

    await page.click('.ant-select-selector:has-text("Выберите версию")');
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    await page.waitForTimeout(300);  // Wait for dropdown animation
    const secondVersion = page.locator('.ant-select-dropdown .ant-select-item-option').first();
    await secondVersion.waitFor({ state: 'visible', timeout: 5000 });
    await secondVersion.click({ force: true });

    // Wait a bit for data to update
    await page.waitForTimeout(500);

    // Content should still be visible
    const finalContentVisible = await page.locator('#boq-content-section').isVisible();
    console.log('Content visible after version change:', finalContentVisible);
    expect(finalContentVisible).toBe(true);

    // Scroll position should be preserved
    const finalScroll = await page.evaluate(() => window.scrollY);
    console.log('Final scroll position:', finalScroll);
    expect(Math.abs(finalScroll - initialScroll)).toBeLessThan(50);

    // Tender info should be updated
    const finalTenderInfo = await page.locator('text=/Название:.*?/').first().textContent();
    console.log('Final tender:', finalTenderInfo);

    // Should be different from initial
    expect(finalTenderInfo).not.toBe(initialTenderInfo);

    console.log('\n=== TEST PASSED ===\n');
  });
});
