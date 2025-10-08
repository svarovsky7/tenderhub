import { test, expect } from '@playwright/test';

test.describe('БСМ Page - Transparent Buttons', () => {
  test('should have transparent background for action buttons', async ({ page }) => {
    await page.goto('http://localhost:5176/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(500);

    // Check "К дашборду" button
    const dashboardButton = page.getByRole('button', { name: /К дашборду/i });
    await expect(dashboardButton).toBeVisible();

    // Get background color
    const dashboardBg = await dashboardButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have transparent white background (rgba with low alpha)
    // Not solid dark background
    console.log('Dashboard button background:', dashboardBg);

    // Check that it's rgba (transparent) and not solid
    expect(dashboardBg).toMatch(/rgba\(/);
    expect(dashboardBg).toContain('255'); // Should contain white (255)

    // Check "Обновить" button has solid white background (not transparent)
    const refreshButton = page.getByRole('button', { name: /Обновить/i });
    await expect(refreshButton).toBeVisible();

    const refreshBg = await refreshButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('Refresh button background:', refreshBg);

    // Should have solid white background
    expect(refreshBg).toMatch(/rgba\(255, 255, 255/);
  });

  test('should have transparent "Назад к выбору" button after tender selection', async ({ page }) => {
    await page.goto('http://localhost:5176/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Select first quick tender selector card
    const quickCard = page.locator('.quick-tender-card').first();
    if (await quickCard.isVisible()) {
      await quickCard.click();
      await page.waitForTimeout(500);

      // Now check "Назад к выбору" button
      const backButton = page.getByRole('button', { name: /Назад к выбору/i });
      await expect(backButton).toBeVisible();

      const backBg = await backButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('Back button background:', backBg);

      // Should have transparent white background
      expect(backBg).toMatch(/rgba\(/);
      expect(backBg).toContain('255'); // Should contain white (255)
    }
  });
});
