import { test, expect } from '@playwright/test';

test.describe('DeadlineStatusBar CSS consistency across all pages', () => {
  test('should verify all pages have consistent header spacing', async ({ page }) => {
    test.setTimeout(120000);
    console.log('🚀 Starting comprehensive CSS check across all pages');

    const pagesToCheck = [
      { url: '/commercial-costs', headerClass: '.commercial-page-header', name: 'Commercial Costs' },
      { url: '/financial', headerClass: '.financial-page-header', name: 'Financial Indicators' },
      { url: '/libraries/tender-materials-works', headerClass: '.materials-works-page-header', name: 'Tender Materials Works' },
      { url: '/construction-costs/tender', headerClass: '.tender-costs-header', name: 'Tender Construction Costs' },
      { url: '/cost-redistribution', headerClass: '.redistribution-page-header', name: 'Cost Redistribution' },
    ];

    const results = [];

    for (const pageConfig of pagesToCheck) {
      console.log(`\n📄 Checking ${pageConfig.name} (${pageConfig.url})`);

      await page.goto(pageConfig.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: `tests/screenshots/${pageConfig.name.replace(/\s/g, '-')}.png`,
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
        };
      });

      console.log(`📊 ${pageConfig.name} styles:`, styles);

      results.push({
        page: pageConfig.name,
        url: pageConfig.url,
        found: true,
        ...styles,
      });
    }

    // Print comparison table
    console.log('\n📋 COMPARISON TABLE:');
    console.log('='.repeat(100));
    console.log('Page'.padEnd(30), 'margin-bottom'.padEnd(15), 'border-radius'.padEnd(25), 'Status');
    console.log('-'.repeat(100));

    for (const result of results) {
      if (!result.found) {
        console.log(result.page.padEnd(30), 'NOT FOUND'.padEnd(15), ''.padEnd(25), '❌');
        continue;
      }

      const status = result.marginBottom === '24px' ? '✅' : '❌';
      console.log(
        result.page.padEnd(30),
        result.marginBottom.padEnd(15),
        result.borderRadius.padEnd(25),
        status
      );
    }

    console.log('='.repeat(100));

    // Assert all pages have margin-bottom: 24px
    const foundResults = results.filter(r => r.found);
    expect(foundResults.length).toBeGreaterThan(0);

    for (const result of foundResults) {
      expect(result.marginBottom, `${result.page} should have margin-bottom: 24px`).toBe('24px');
    }

    console.log('\n✅ All pages have consistent margin-bottom: 24px');
  });
});
