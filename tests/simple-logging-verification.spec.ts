import { test, expect } from '@playwright/test';

test.describe('Simple Logging Verification', () => {
  test('should have dramatically reduced logging on BOQ page', async ({ page }) => {
    console.log('🚀 Testing simple BOQ page loading...');

    const consoleMessages: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleMessages.push(msg.text());
      }
    });

    // Navigate to BOQ page
    await page.goto('http://localhost:5173/boq');
    console.log('📊 After navigation:', consoleMessages.length);

    // Wait for page to settle
    await page.waitForTimeout(3000);
    console.log('📊 After 3s wait:', consoleMessages.length);

    // Wait for any loading indicators to disappear
    await page.waitForTimeout(2000);
    console.log('📊 After 5s total:', consoleMessages.length);

    const finalCount = consoleMessages.length;
    console.log(`✅ Final message count: ${finalCount}`);

    // Log some sample messages
    if (consoleMessages.length > 0) {
      console.log('📝 Sample messages (first 5):');
      consoleMessages.slice(0, 5).forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg}`);
      });
    }

    // We should have significantly fewer than 1000 messages now
    expect(finalCount).toBeLessThan(100);

    // Ideally we should have very few messages with ENABLE_DETAILED_LOGGING = false
    if (finalCount < 20) {
      console.log('🎉 Excellent! Logging optimization is working perfectly!');
    } else if (finalCount < 100) {
      console.log('✅ Good! Logging is significantly reduced.');
    }

    console.log(`📈 Optimization result: ${6400 - finalCount} fewer messages!`);
  });
});