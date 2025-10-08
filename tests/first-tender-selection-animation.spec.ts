import { test, expect } from '@playwright/test';

test.describe('BOQ Page - First Tender Selection Animation', () => {
  test('should show animation on first tender selection', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5176/boq');

    // Wait for tenders to load
    await page.waitForSelector('text=Тендер:', { timeout: 10000 });

    // Get BOQ content section
    const contentSection = page.locator('#boq-content-section');

    // Initially content should not exist
    await expect(contentSection).not.toBeVisible();

    // Select first tender by name
    await page.click('.ant-select-selector:has-text("Выберите тендер")');
    await page.waitForSelector('.ant-select-dropdown');
    const firstTender = page.locator('.ant-select-item-option').first();
    await firstTender.click();

    // Wait for version selector to be enabled
    await page.waitForSelector('text=Выберите версию');

    // Select version - use JavaScript click to bypass visibility check
    await page.click('.ant-select-selector:has-text("Выберите версию")');
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    await page.waitForTimeout(500);  // Wait for dropdown animation
    // Use evaluate to click directly via JavaScript (bypasses visibility check)
    await page.evaluate(() => {
      const option = document.querySelector('.ant-select-dropdown .ant-select-item-option') as HTMLElement;
      if (option) option.click();
    });

    // Wait a bit for animation to start
    await page.waitForTimeout(100);

    // Check that content section exists and has transition class (animation)
    const hasTransition = await contentSection.evaluate((el) => {
      const classes = el.className;
      return classes.includes('transition-opacity') && classes.includes('duration-300');
    });

    console.log('Content section has transition animation:', hasTransition);
    expect(hasTransition).toBe(true);

    // Wait for animation to complete
    await page.waitForTimeout(400);

    // Content should be fully visible now
    await expect(contentSection).toBeVisible();
    const isFullyVisible = await contentSection.evaluate((el) => {
      const classes = el.className;
      return classes.includes('opacity-100');
    });

    console.log('Content is fully visible (opacity-100):', isFullyVisible);
    expect(isFullyVisible).toBe(true);

    console.log('✅ First selection animation test PASSED');
  });

  test('should NOT show animation on second tender selection', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5176/boq');

    // Wait for tenders to load
    await page.waitForSelector('text=Тендер:', { timeout: 10000 });

    // First selection (with animation)
    await page.click('.ant-select-selector:has-text("Выберите тендер")');
    await page.waitForSelector('.ant-select-dropdown');
    const firstTender = page.locator('.ant-select-item-option').first();
    await firstTender.click();

    await page.waitForSelector('text=Выберите версию');
    await page.click('.ant-select-selector:has-text("Выберите версию")');
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    await page.waitForTimeout(500);
    // Use JavaScript click
    await page.evaluate(() => {
      const option = document.querySelector('.ant-select-dropdown .ant-select-item-option') as HTMLElement;
      if (option) option.click();
    });

    // Wait for first tender to fully load
    await page.waitForTimeout(500);

    // Now change to different tender (should NOT have animation)
    await page.click('.ant-select-selector:has-text("Тендер")');
    await page.waitForSelector('.ant-select-dropdown');
    const secondTender = page.locator('.ant-select-item-option').nth(1);
    await secondTender.click();

    // Select version for second tender
    await page.click('.ant-select-selector:has-text("Выберите версию")');
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });
    await page.waitForTimeout(500);
    // Use JavaScript click
    await page.evaluate(() => {
      const option = document.querySelector('.ant-select-dropdown .ant-select-item-option') as HTMLElement;
      if (option) option.click();
    });

    // Wait a bit
    await page.waitForTimeout(100);

    // Check that content section does NOT have transition class
    const contentSection = page.locator('#boq-content-section');
    const hasTransition = await contentSection.evaluate((el) => {
      const classes = el.className;
      return classes.includes('transition-opacity');
    });

    console.log('Content section has transition on second selection:', hasTransition);
    expect(hasTransition).toBe(false);

    console.log('✅ Second selection NO animation test PASSED');
  });
});
