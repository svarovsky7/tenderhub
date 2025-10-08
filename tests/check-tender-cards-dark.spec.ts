import { test, expect } from '@playwright/test';

test.describe('Tender Cards in Dark Theme', () => {
  test('should check if tender cards have dark borders instead of white in dark theme', async ({ page }) => {
    // Navigate to commercial costs page
    await page.goto('http://localhost:5174/commercial-costs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📍 Step 1: Navigated to commercial costs page');

    // Toggle to dark theme
    const themeToggle = page.locator('[role="switch"]').first();
    await themeToggle.click();
    await page.waitForTimeout(800);
    console.log('🌙 Step 2: Switched to dark theme\n');

    // Wait for tender cards to load
    await page.waitForTimeout(2000);

    // Take screenshot before hover
    await page.screenshot({
      path: 'playwright-report/tender-cards-1-initial.png',
      fullPage: true
    });

    // Find tender cards
    const tenderCards = page.locator('.modern-tender-card');
    const cardsCount = await tenderCards.count();
    console.log(`📦 Found ${cardsCount} tender cards\n`);

    if (cardsCount > 0) {
      // Check first card
      const firstCard = tenderCards.first();

      // Get border color
      const borderColor = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderColor: computed.borderColor,
          borderTopColor: computed.borderTopColor,
          boxShadow: computed.boxShadow,
          background: computed.background
        };
      });

      console.log('🎨 First card styles:');
      console.log('   Border color:', borderColor.borderColor);
      console.log('   Border top color:', borderColor.borderTopColor);
      console.log('   Box shadow:', borderColor.boxShadow);
      console.log('   Background:', borderColor.background.substring(0, 100) + '...\n');

      // Parse RGB from border color
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

      const borderRgb = parseRgb(borderColor.borderTopColor);
      if (borderRgb) {
        const brightness = borderRgb.r + borderRgb.g + borderRgb.b;
        console.log(`   Border RGB: (${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b})`);
        console.log(`   Border brightness: ${brightness}`);
        console.log(`   Border alpha: ${borderRgb.a}\n`);

        // Check if border is dark (brightness should be low)
        if (brightness < 300) {
          console.log('   ✅ GOOD: Border is DARK\n');
        } else {
          console.log('   ❌ PROBLEM: Border is LIGHT/WHITE\n');
        }
      }

      // Hover over the card and check hover state
      await firstCard.hover();
      await page.waitForTimeout(500);

      console.log('🖱️ Hovering over first card...\n');

      // Take screenshot on hover
      await page.screenshot({
        path: 'playwright-report/tender-cards-2-hover.png',
        fullPage: true
      });

      const hoverBorderColor = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderColor: computed.borderColor,
          borderTopColor: computed.borderTopColor,
          boxShadow: computed.boxShadow
        };
      });

      console.log('🎨 Hover state:');
      console.log('   Border color:', hoverBorderColor.borderTopColor);
      console.log('   Box shadow:', hoverBorderColor.boxShadow.substring(0, 150) + '...\n');

      const hoverBorderRgb = parseRgb(hoverBorderColor.borderTopColor);
      if (hoverBorderRgb) {
        const brightness = hoverBorderRgb.r + hoverBorderRgb.g + hoverBorderRgb.b;
        console.log(`   Hover border RGB: (${hoverBorderRgb.r}, ${hoverBorderRgb.g}, ${hoverBorderRgb.b})`);
        console.log(`   Hover border brightness: ${brightness}`);
        console.log(`   Hover border alpha: ${hoverBorderRgb.a}\n`);

        if (brightness < 350) {
          console.log('   ✅ GOOD: Hover border is DARK\n');
        } else {
          console.log('   ❌ PROBLEM: Hover border is LIGHT/WHITE\n');
        }
      }

      // Check icon wrapper
      const iconWrapper = firstCard.locator('.tender-icon-wrapper').first();
      const iconWrapperExists = await iconWrapper.isVisible().catch(() => false);

      if (iconWrapperExists) {
        const iconStyles = await iconWrapper.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderColor: computed.borderColor,
            background: computed.background
          };
        });

        console.log('🎯 Icon wrapper styles:');
        console.log('   Border color:', iconStyles.borderColor);
        console.log('   Background:', iconStyles.background.substring(0, 100) + '...\n');

        const iconBorderRgb = parseRgb(iconStyles.borderColor);
        if (iconBorderRgb) {
          const brightness = iconBorderRgb.r + iconBorderRgb.g + iconBorderRgb.b;
          console.log(`   Icon border RGB: (${iconBorderRgb.r}, ${iconBorderRgb.g}, ${iconBorderRgb.b})`);
          console.log(`   Icon border brightness: ${brightness}\n`);

          if (brightness < 400) {
            console.log('   ✅ GOOD: Icon border is DARK\n');
          } else {
            console.log('   ❌ PROBLEM: Icon border is LIGHT/WHITE\n');
          }
        }
      }

      // Check area badge
      const areaBadge = firstCard.locator('.tender-area-badge').first();
      const areaBadgeExists = await areaBadge.isVisible().catch(() => false);

      if (areaBadgeExists) {
        const badgeStyles = await areaBadge.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderColor: computed.borderColor,
            background: computed.background
          };
        });

        console.log('📊 Area badge styles:');
        console.log('   Border color:', badgeStyles.borderColor);

        const badgeBorderRgb = parseRgb(badgeStyles.borderColor);
        if (badgeBorderRgb) {
          const brightness = badgeBorderRgb.r + badgeBorderRgb.g + badgeBorderRgb.b;
          console.log(`   Badge border RGB: (${badgeBorderRgb.r}, ${badgeBorderRgb.g}, ${badgeBorderRgb.b})`);
          console.log(`   Badge border brightness: ${brightness}\n`);

          if (brightness < 400) {
            console.log('   ✅ GOOD: Badge border is DARK\n');
          } else {
            console.log('   ❌ PROBLEM: Badge border is LIGHT/WHITE\n');
          }
        }
      }

      // Check version badge
      const versionBadge = firstCard.locator('.tender-version-badge').first();
      const versionBadgeExists = await versionBadge.isVisible().catch(() => false);

      if (versionBadgeExists) {
        const versionStyles = await versionBadge.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderColor: computed.borderColor
          };
        });

        console.log('🔢 Version badge styles:');
        console.log('   Border color:', versionStyles.borderColor);

        const versionBorderRgb = parseRgb(versionStyles.borderColor);
        if (versionBorderRgb) {
          const brightness = versionBorderRgb.r + versionBorderRgb.g + versionBorderRgb.b;
          console.log(`   Version border RGB: (${versionBorderRgb.r}, ${versionBorderRgb.g}, ${versionBorderRgb.b})`);
          console.log(`   Version border brightness: ${brightness}\n`);

          if (brightness < 400) {
            console.log('   ✅ GOOD: Version badge border is DARK\n');
          } else {
            console.log('   ❌ PROBLEM: Version badge border is LIGHT/WHITE\n');
          }
        }
      }
    } else {
      console.log('❌ No tender cards found on page\n');
    }

    console.log('\n✅ Test completed!\n');
  });
});
