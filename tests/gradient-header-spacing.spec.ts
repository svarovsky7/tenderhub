import { test, expect } from '@playwright/test';

test.describe('Gradient Header Spacing and Border Radius Check', () => {
  test('should verify all gradient headers have consistent spacing and border-radius', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    console.log('🚀 Starting comprehensive gradient header check');

    const pagesToCheck = [
      // Index pages with gradient headers
      { url: '/', headerClass: '.home-page-header', name: 'Home Page', hasDeadline: false },
      { url: '/boq', headerClass: '.boq-page-header', name: 'BOQ Page', hasDeadline: true },
      { url: '/commerce', headerClass: '.commerce-page-header', name: 'Commerce Index', hasDeadline: false },
      { url: '/libraries', headerClass: '.libraries-page-header', name: 'Libraries Index', hasDeadline: false },
      { url: '/construction-costs', headerClass: '.construction-costs-page-header', name: 'Construction Costs Index', hasDeadline: false },
      { url: '/admin', headerClass: '.admin-page-header', name: 'Admin Index', hasDeadline: false },

      // Pages with DeadlineStatusBar
      { url: '/commercial-costs', headerClass: '.commercial-page-header', name: 'Commercial Costs', hasDeadline: true },
      { url: '/financial', headerClass: '.financial-page-header', name: 'Financial Indicators', hasDeadline: true },
      { url: '/libraries/tender-materials-works', headerClass: '.materials-works-page-header', name: 'Tender Materials Works', hasDeadline: true },
      { url: '/construction-costs/tender', headerClass: '.tender-costs-header', name: 'Tender Construction Costs', hasDeadline: true },
      { url: '/cost-redistribution', headerClass: '.redistribution-page-header', name: 'Cost Redistribution', hasDeadline: true },
    ];

    const results = [];

    for (const pageConfig of pagesToCheck) {
      console.log(`\n📄 Checking ${pageConfig.name} (${pageConfig.url})`);

      await page.goto(pageConfig.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: `tests/screenshots/gradient-${pageConfig.name.replace(/\s/g, '-')}.png`,
        fullPage: true
      });

      // Get header element
      const header = page.locator(pageConfig.headerClass);
      const headerExists = await header.count() > 0;

      if (!headerExists) {
        console.log(`❌ Header not found for ${pageConfig.name}`);
        results.push({
          page: pageConfig.name,
          url: pageConfig.url,
          found: false,
        });
        continue;
      }

      await header.waitFor({ timeout: 5000 });

      // Get computed styles
      const styles = await header.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          marginBottom: computed.marginBottom,
          paddingBottom: computed.paddingBottom,
          borderRadius: computed.borderRadius,
          width: computed.width,
          background: computed.background,
        };
      });

      console.log(`📊 ${pageConfig.name} header styles:`, styles);

      // Check if there's content below header (hint block or DeadlineStatusBar)
      let nextElementMarginTop = 'N/A';
      let nextElementType = 'none';

      if (pageConfig.hasDeadline) {
        // Check for DeadlineStatusBar
        const deadlineBar = page.locator('.deadline-status-bar').first();
        const hasDeadlineBar = await deadlineBar.count() > 0;
        if (hasDeadlineBar) {
          nextElementType = 'DeadlineStatusBar';
          const deadlineStyles = await deadlineBar.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              marginTop: computed.marginTop,
            };
          });
          nextElementMarginTop = deadlineStyles.marginTop;
        }
      } else {
        // Check for hint/card below header
        const cards = page.locator('.ant-card').first();
        const hasCards = await cards.count() > 0;
        if (hasCards) {
          nextElementType = 'Card/Hint';
          const cardStyles = await cards.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              marginTop: computed.marginTop,
            };
          });
          nextElementMarginTop = cardStyles.marginTop;
        }
      }

      console.log(`📦 Next element: ${nextElementType}, margin-top: ${nextElementMarginTop}`);

      results.push({
        page: pageConfig.name,
        url: pageConfig.url,
        found: true,
        hasDeadline: pageConfig.hasDeadline,
        nextElementType,
        nextElementMarginTop,
        ...styles,
      });
    }

    // Print comprehensive comparison table
    console.log('\n📋 COMPREHENSIVE COMPARISON TABLE:');
    console.log('='.repeat(140));
    console.log(
      'Page'.padEnd(30),
      'margin-bottom'.padEnd(15),
      'border-radius'.padEnd(25),
      'Next Element'.padEnd(20),
      'Status'
    );
    console.log('-'.repeat(140));

    for (const result of results) {
      if (!result.found) {
        console.log(result.page.padEnd(30), 'NOT FOUND'.padEnd(15), ''.padEnd(25), ''.padEnd(20), '❌');
        continue;
      }

      const marginOk = result.marginBottom === '24px';
      const radiusOk = result.borderRadius === '16px 16px 0px 0px' || result.borderRadius === '16px';
      const status = marginOk && radiusOk ? '✅' : '❌';

      console.log(
        result.page.padEnd(30),
        result.marginBottom.padEnd(15),
        result.borderRadius.padEnd(25),
        `${result.nextElementType}`.padEnd(20),
        status
      );
    }

    console.log('='.repeat(140));

    // Assert all pages have correct margin-bottom
    const foundResults = results.filter(r => r.found);
    expect(foundResults.length).toBeGreaterThan(0);

    for (const result of foundResults) {
      expect(result.marginBottom, `${result.page} should have margin-bottom: 24px`).toBe('24px');

      // Border radius should be either full rounded (index pages) or top-only rounded (pages with DeadlineStatusBar)
      const validBorderRadius = ['16px 16px 0px 0px', '16px'];
      expect(validBorderRadius.includes(result.borderRadius),
        `${result.page} should have valid border-radius (got ${result.borderRadius})`
      ).toBeTruthy();
    }

    console.log('\n✅ All gradient headers have consistent spacing and border-radius');
  });
});
