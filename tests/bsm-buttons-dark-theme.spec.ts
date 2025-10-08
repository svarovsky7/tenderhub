import { test, expect } from '@playwright/test';

test.describe('БСМ Page - Buttons in Dark Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');
  });

  test('should have transparent buttons in dark theme', async ({ page }) => {
    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(page.getByRole('button', { name: /theme/i }));
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(500);

    // Check "К дашборду" button background
    const dashboardButton = page.getByRole('button', { name: /К дашборду/i });
    await expect(dashboardButton).toBeVisible();

    const dashboardBg = await dashboardButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('Dashboard button background (dark theme):', dashboardBg);

    // Should have transparent white background, NOT dark background
    // Should be rgba with 255 (white), not rgba with dark values
    expect(dashboardBg).toMatch(/rgba\(/);
    expect(dashboardBg).toContain('255'); // Should contain white (255)
    expect(dashboardBg).not.toContain('31'); // Should NOT contain dark color (31, 31, 31)

    // Check that alpha is low (transparent), not 1 or 0.95
    const alphaMatch = dashboardBg.match(/rgba\([^)]+,\s*([\d.]+)\)/);
    if (alphaMatch) {
      const alpha = parseFloat(alphaMatch[1]);
      console.log('Alpha value:', alpha);
      expect(alpha).toBeLessThan(0.5); // Should be transparent (< 0.5)
    }
  });

  test('should have transparent "Назад к выбору" button in dark theme after selection', async ({ page }) => {
    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(page.getByRole('button', { name: /theme/i }));
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000);

    // Select first quick tender selector card
    const quickCard = page.locator('.quick-tender-card').first();
    if (await quickCard.isVisible()) {
      await quickCard.click();
      await page.waitForTimeout(500);

      // Check "Назад к выбору" button
      const backButton = page.getByRole('button', { name: /Назад к выбору/i });
      await expect(backButton).toBeVisible();

      const backBg = await backButton.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('Back button background (dark theme):', backBg);

      // Should have transparent white background
      expect(backBg).toMatch(/rgba\(/);
      expect(backBg).toContain('255'); // Should contain white (255)
      expect(backBg).not.toContain('31'); // Should NOT contain dark color

      // Check alpha is low
      const alphaMatch = backBg.match(/rgba\([^)]+,\s*([\d.]+)\)/);
      if (alphaMatch) {
        const alpha = parseFloat(alphaMatch[1]);
        console.log('Alpha value:', alpha);
        expect(alpha).toBeLessThan(0.5); // Should be transparent
      }
    }
  });
});
