import { test, expect } from '@playwright/test';

test.describe('БСМ Page - Dark Theme & Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176/libraries/tender-materials-works');
    await page.waitForLoadState('networkidle');
  });

  test('should have action buttons in header', async ({ page }) => {
    // Check that "К дашборду" button exists
    const dashboardButton = page.getByRole('button', { name: /К дашборду/i });
    await expect(dashboardButton).toBeVisible();

    // Check that "Обновить" button exists
    const refreshButton = page.getByRole('button', { name: /Обновить/i });
    await expect(refreshButton).toBeVisible();

    // "Назад к выбору" should NOT be visible when no tender is selected
    const backButton = page.getByRole('button', { name: /Назад к выбору/i });
    await expect(backButton).not.toBeVisible();
  });

  test('should show "Назад к выбору" button after tender selection', async ({ page }) => {
    // Wait for tenders to load
    await page.waitForTimeout(1000);

    // Select first quick tender selector card (if available)
    const quickCard = page.locator('.quick-tender-card').first();
    if (await quickCard.isVisible()) {
      await quickCard.click();
      await page.waitForTimeout(500);

      // Now "Назад к выбору" button should be visible
      const backButton = page.getByRole('button', { name: /Назад к выбору/i });
      await expect(backButton).toBeVisible();
    }
  });

  test('should have dark background for total cost card in dark theme', async ({ page }) => {
    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(page.getByRole('button', { name: /theme/i }));
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Wait for tenders to load
    await page.waitForTimeout(1000);

    // Select first quick tender selector card
    const quickCard = page.locator('.quick-tender-card').first();
    if (await quickCard.isVisible()) {
      await quickCard.click();
      await page.waitForTimeout(1500); // Wait for data to load

      // Check that statistics card is visible
      const statsCard = page.locator('text=Общая стоимость').locator('..');

      if (await statsCard.count() > 0) {
        // Get background color
        const backgroundColor = await statsCard.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // In dark theme, background should be dark (not white or light gray)
        // rgb(31, 31, 31) = #1f1f1f
        expect(backgroundColor).toBe('rgb(31, 31, 31)');
      }
    }
  });

  test('should have spacing between header and empty card when no tender selected', async ({ page }) => {
    // Find the empty card
    const emptyCard = page.locator('.ant-card', { has: page.locator('.ant-empty') });

    if (await emptyCard.count() > 0) {
      // Check that card has margin-top class
      const hasMarginTop = await emptyCard.evaluate((el) => {
        return el.classList.contains('mt-4');
      });

      expect(hasMarginTop).toBeTruthy();
    }
  });
});
