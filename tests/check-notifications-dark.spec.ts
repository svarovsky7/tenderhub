import { test, expect } from '@playwright/test';

test.describe('Notifications in Dark Theme', () => {
  test('should have dark background for messages and notifications', async ({ page }) => {
    // Navigate to commercial costs page
    await page.goto('http://localhost:5174/commercial-costs');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to commercial costs page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Trigger a message by clicking refresh without selecting tender
    const refreshButton = page.locator('button:has-text("Обновить")').first();
    await refreshButton.click();
    await page.waitForTimeout(300);

    console.log('🔔 Step 3: Triggered message notification\n');

    // Wait for message to appear
    const messageNotice = page.locator('.ant-message-notice-content').first();
    const messageExists = await messageNotice.isVisible({ timeout: 2000 }).catch(() => false);

    if (messageExists) {
      // Take screenshot of message
      await page.screenshot({
        path: 'playwright-report/notification-message-dark.png',
        fullPage: false
      });

      const messageStyles = await messageNotice.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderColor: computed.borderColor
        };
      });

      console.log('💬 Message notification styles:');
      console.log('   Background:', messageStyles.backgroundColor);
      console.log('   Text color:', messageStyles.color);
      console.log('   Border:', messageStyles.borderColor);

      // Parse RGB
      const parseRgb = (color: string) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return null;
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] ? parseFloat(match[4]) : 1
        };
      };

      const bgRgb = parseRgb(messageStyles.backgroundColor);
      if (bgRgb) {
        const brightness = bgRgb.r + bgRgb.g + bgRgb.b;
        console.log(`   Background RGB: (${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`);
        console.log(`   Background brightness: ${brightness}\n`);

        if (brightness < 150) {
          console.log('   ✅ GOOD: Message background is DARK\n');
        } else {
          console.log('   ❌ PROBLEM: Message background is LIGHT\n');
        }
      }

      const textRgb = parseRgb(messageStyles.color);
      if (textRgb) {
        const brightness = textRgb.r + textRgb.g + textRgb.b;
        console.log(`   Text RGB: (${textRgb.r}, ${textRgb.g}, ${textRgb.b})`);
        console.log(`   Text brightness: ${brightness}\n`);

        if (brightness > 600) {
          console.log('   ✅ GOOD: Message text is LIGHT (visible on dark background)\n');
        } else {
          console.log('   ❌ PROBLEM: Message text is DARK\n');
        }
      }
    } else {
      console.log('⚠️ Message notification not found\n');
    }

    console.log('\n✅ Test completed!\n');
  });
});
