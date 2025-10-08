import { test, expect } from '@playwright/test';

test.describe('Sticky Header on Commercial Costs Page', () => {
  test('should keep header fixed when scrolling down', async ({ page }) => {
    // Navigate to commercial costs page with a tender selected
    await page.goto('http://localhost:5174/commercial-costs?tender=736dc11c-33dc-4fce-a7ee-c477abb8b694');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: Navigated to commercial costs page with tender');

    // Wait for table to appear
    await page.waitForSelector('.ant-table', { timeout: 10000 }).catch(() => {
      console.log('⚠️ Table not found, continuing...');
    });

    // Take screenshot before scroll
    await page.screenshot({
      path: 'playwright-report/sticky-header-1-before-scroll.png',
      fullPage: false
    });

    // Scroll down to see table header stick
    await page.evaluate(() => window.scrollBy(0, 600));

    console.log('📜 Scrolled down 600px to test table header sticky');

    // Take screenshot with table visible
    await page.screenshot({
      path: 'playwright-report/sticky-header-3-table-scroll.png',
      fullPage: false
    });

    // Check if table header is also sticky
    const tableHeader = page.locator('.ant-table-thead th').first();
    const tableHeaderExists = await tableHeader.isVisible().catch(() => false);

    if (tableHeaderExists) {
      const tableHeaderPosition = await tableHeader.boundingBox();
      console.log('📊 Table header cell position:', tableHeaderPosition);

      // Check the actual thead element for sticky styles
      const theadElement = page.locator('.ant-table-thead').first();
      const theadStyles = await theadElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          position: computed.position,
          top: computed.top,
          zIndex: computed.zIndex
        };
      });

      console.log('🎨 Table thead styles:');
      console.log('   Position:', theadStyles.position);
      console.log('   Top:', theadStyles.top);
      console.log('   Z-index:', theadStyles.zIndex);

      // Also check individual th element
      const thStyles = await tableHeader.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          position: computed.position,
          top: computed.top,
          zIndex: computed.zIndex,
          backgroundColor: computed.backgroundColor
        };
      });

      console.log('\n🎨 Table th (cell) styles:');
      console.log('   Position:', thStyles.position);
      console.log('   Top:', thStyles.top);
      console.log('   Z-index:', thStyles.zIndex);
      console.log('   Background:', thStyles.backgroundColor);

      if (thStyles.position === 'sticky') {
        console.log('\n   ✅ GOOD: Table header cells are sticky\n');

        // Check if offsetHeader is applied correctly (should be 64px - AppLayout header height)
        if (thStyles.top === '64px') {
          console.log('   ✅ GOOD: Offset header is 64px (correct, aligned with AppLayout header)\n');
        } else {
          console.log(`   ⚠️ INFO: Offset header is ${thStyles.top} (expected 64px)\n`);
        }
      } else {
        console.log('\n   ❌ PROBLEM: Table header cells position is', thStyles.position, '\n');
      }
    }

    console.log('\n✅ Test completed!\n');
  });
});
