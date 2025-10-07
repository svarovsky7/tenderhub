import { test, expect } from '@playwright/test';

test.describe('BOQ Position Rows Hover in Dark Theme', () => {
  test('should verify row hover background color in dark theme', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('📍 Navigated to BOQ page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    console.log('🌙 Switched to dark theme');

    // Select a tender (click on first tender card)
    const tenderCard = page.locator('.ant-card').first();
    await tenderCard.click();
    await page.waitForTimeout(2000);

    console.log('📋 Selected tender');

    // Find and expand first position card
    const positionCard = page.locator('.ant-card').first();
    await positionCard.click();
    await page.waitForTimeout(1000);

    console.log('📂 Expanded position card');

    // Find first table row in the position
    const tableRow = page.locator('.custom-table .ant-table-tbody > tr').first();

    // Get initial background color
    const initialBgColor = await tableRow.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.backgroundColor;
    });

    console.log('🎨 Initial row background:', initialBgColor);

    // Hover over the row
    await tableRow.hover();
    await page.waitForTimeout(500);

    // Get background color after hover
    const hoverBgColor = await tableRow.locator('td').first().evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.backgroundColor;
    });

    console.log('🎨 Hover row background:', hoverBgColor);

    // Parse RGBA values
    const parseRgba = (color: string) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return null;
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1
      };
    };

    const hoverRgba = parseRgba(hoverBgColor);

    // Check if hover background is NOT white (should be subtle dark color)
    const isNotWhite = hoverRgba && !(hoverRgba.r > 200 && hoverRgba.g > 200 && hoverRgba.b > 200);

    // Check if hover background is slightly lighter (increased alpha or RGB values)
    const isLighter = hoverRgba && (hoverRgba.r > 20 || hoverRgba.a > 0.05);

    if (isNotWhite) {
      console.log('✅ Row hover background is NOT white');
    } else {
      console.log('⚠️ Row hover background appears white:', hoverBgColor);
    }

    if (isLighter) {
      console.log('✅ Row hover background is subtly lighter');
    } else {
      console.log('⚠️ Row hover background may not be lighter');
    }

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/boq-row-hover-dark.png',
      fullPage: true
    });

    // Assertions
    expect(isNotWhite).toBeTruthy();
  });

  test('should verify text contrast in dark theme', async ({ page }) => {
    // Navigate to BOQ page
    await page.goto('http://localhost:5174/boq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    console.log('🌙 Switched to dark theme');

    // Select a tender
    const tenderCard = page.locator('.ant-card').first();
    await tenderCard.click();
    await page.waitForTimeout(2000);

    console.log('📋 Selected tender');

    // Find first position card
    const positionCard = page.locator('.ant-card').first();

    // Get card text color
    const textColor = await positionCard.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.color;
    });

    console.log('🎨 Position card text color:', textColor);

    // Parse RGB values
    const parseRgb = (color: string) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    };

    const textRgb = parseRgb(textColor);

    // Check if text is light colored (high contrast on dark background)
    const isLightText = textRgb && textRgb.r > 200 && textRgb.g > 200 && textRgb.b > 200;

    if (isLightText) {
      console.log('✅ Text color is light (good contrast on dark background)');
    } else {
      console.log('⚠️ Text color may be too dark for dark background:', textColor);
    }

    // Take screenshot
    await page.screenshot({
      path: 'playwright-report/boq-text-contrast-dark.png',
      fullPage: true
    });

    expect(isLightText).toBeTruthy();
  });
});
