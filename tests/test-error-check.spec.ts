import { test, expect } from '@playwright/test';

test('Check component loading error', async ({ page }) => {
  // Collect console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      console.log('❌ ERROR:', text);
    }
  });

  // Navigate to the page
  console.log('🚀 Navigating to http://localhost:5178/boq');
  await page.goto('http://localhost:5178/boq', { waitUntil: 'networkidle' });

  // Wait a bit for any lazy loading
  await page.waitForTimeout(3000);

  // Check if error boundary is shown
  const errorBoundary = await page.locator('text="Ошибка загрузки компонента"').isVisible();
  console.log('🔍 Error boundary visible:', errorBoundary);

  // Check for specific error text
  const errorText = await page.locator('text="Не удалось загрузить компонент"').isVisible();
  console.log('🔍 Error text visible:', errorText);

  // Print all console errors
  console.log('\n📋 All console messages:');
  consoleMessages.forEach(msg => console.log(msg));

  // Take screenshot
  await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved to error-screenshot.png');
});