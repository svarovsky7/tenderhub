import { test, expect } from '@playwright/test';

test('Dashboard stats colors in dark theme', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('http://localhost:5175/');

  // Wait for dashboard to load
  await page.waitForSelector('.dashboard-page-header', { timeout: 10000 });

  // Switch to dark theme
  const themeButton = page.locator('button').filter({ hasText: /🌙|☀️/ }).first();
  await themeButton.click();

  // Wait for theme to apply
  await page.waitForTimeout(500);

  // Take screenshot of the stats section
  const statsContainer = page.locator('.dashboard-stats-container').first();
  await statsContainer.screenshot({ path: 'tests/screenshots/dashboard-stats-dark.png' });

  // Get computed styles for each stat card
  const statCards = page.locator('.dashboard-stats-container .ant-col');
  const count = await statCards.count();

  console.log(`Found ${count} stat cards`);

  for (let i = 0; i < count; i++) {
    const card = statCards.nth(i);

    // Get title
    const title = await card.locator('.ant-statistic-title').textContent();

    // Get computed color of the value
    const valueElement = card.locator('.ant-statistic-content-value, .ant-statistic-content');
    const color = await valueElement.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    console.log(`Card ${i + 1}: "${title}" - color: ${color}`);
  }

  // Take full page screenshot
  await page.screenshot({ path: 'tests/screenshots/dashboard-dark-full.png', fullPage: true });
});
