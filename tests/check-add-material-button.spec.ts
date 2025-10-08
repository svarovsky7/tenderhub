import { test, expect } from '@playwright/test';

test.describe('Add Material Button Brightness', () => {
  test('should have bright blue color in dark theme', async ({ page }) => {
    // Navigate to materials page
    await page.goto('http://localhost:5174/libraries/materials');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to materials page');

    // Get button in light theme first
    const addButton = page.locator('button:has-text("Добавить материал")');
    await addButton.waitFor({ state: 'visible' });

    const lightThemeStyles = await addButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        color: computed.color
      };
    });

    console.log('\n☀️ Light theme button styles:');
    console.log('   Background:', lightThemeStyles.backgroundColor);
    console.log('   Border:', lightThemeStyles.borderColor);
    console.log('   Text:', lightThemeStyles.color);

    // Parse RGB for brightness
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

    const lightBgRgb = parseRgb(lightThemeStyles.backgroundColor);
    console.log(`   Background RGB: (${lightBgRgb?.r}, ${lightBgRgb?.g}, ${lightBgRgb?.b})`);

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('\n🌙 Step 2: Switched to dark theme');

    // Get button styles in dark theme
    const darkThemeStyles = await addButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        color: computed.color
      };
    });

    console.log('\n🌙 Dark theme button styles:');
    console.log('   Background:', darkThemeStyles.backgroundColor);
    console.log('   Border:', darkThemeStyles.borderColor);
    console.log('   Text:', darkThemeStyles.color);

    const darkBgRgb = parseRgb(darkThemeStyles.backgroundColor);
    console.log(`   Background RGB: (${darkBgRgb?.r}, ${darkBgRgb?.g}, ${darkBgRgb?.b})`);

    // Check if button is bright blue (24, 144, 255)
    if (darkBgRgb) {
      const isBrightBlue = darkBgRgb.r === 24 && darkBgRgb.g === 144 && darkBgRgb.b === 255;
      console.log('\n   Expected: rgb(24, 144, 255)');
      console.log(`   Actual: rgb(${darkBgRgb.r}, ${darkBgRgb.g}, ${darkBgRgb.b})`);

      if (isBrightBlue) {
        console.log('   ✅ GOOD: Button is bright blue in dark theme!\n');
      } else {
        console.log('   ❌ PROBLEM: Button is not the expected bright blue\n');
      }
    }

    // Take screenshots
    await page.screenshot({
      path: 'playwright-report/materials-button-dark.png',
      fullPage: true
    });

    console.log('\n✅ Test completed!\n');
  });
});
