import { test, expect } from '@playwright/test';

// Helper function to calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper function to calculate contrast ratio
function getContrastRatio(rgb1: string, rgb2: string): number {
  const parseRgb = (rgb: string) => {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
  };

  const [r1, g1, b1] = parseRgb(rgb1);
  const [r2, g2, b2] = parseRgb(rgb2);

  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Helper function to check if color is dark
function isDarkColor(rgb: string): boolean {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;

  const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  // Consider color dark if all RGB values are below 50
  return r < 50 && g < 50 && b < 50;
}

test.describe('Dark Theme Visual Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    // Wait a bit for any initial animations
    await page.waitForTimeout(1000);
  });

  test('should toggle to dark theme and verify backgrounds are dark', async ({ page }) => {
    console.log('\n🎨 Testing dark theme toggle and backgrounds...\n');

    // Find and click theme toggle
    const themeToggle = page.locator('[role="switch"]').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    await themeToggle.click();

    // Wait for theme transition
    await page.waitForTimeout(800);

    // Check body background color
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('✓ Body background:', bodyBg);
    expect(isDarkColor(bodyBg)).toBe(true);

    // Check main layout background
    const layoutBg = await page.locator('.ant-layout').first().evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('✓ Layout background:', layoutBg);
    expect(isDarkColor(layoutBg)).toBe(true);

    // Check sidebar background
    const sidebarBg = await page.locator('.ant-layout-sider').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('✓ Sidebar background:', sidebarBg);
    expect(isDarkColor(sidebarBg)).toBe(true);

    // Check header background
    const headerBg = await page.locator('.ant-layout-header').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('✓ Header background:', headerBg);
    expect(isDarkColor(headerBg)).toBe(true);

    // Check content area background
    const contentBg = await page.locator('.ant-layout-content').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('✓ Content background:', contentBg);

    // Take screenshot of dashboard in dark mode
    await page.screenshot({
      path: 'playwright-report/dark-theme-dashboard.png',
      fullPage: true
    });

    console.log('✓ Screenshot saved: dark-theme-dashboard.png\n');
  });

  test('should test dark theme across all major pages', async ({ page }) => {
    console.log('\n📸 Testing dark theme on all pages...\n');

    // Toggle to dark theme first
    const themeToggle = page.locator('[role="switch"]').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    await themeToggle.click();
    await page.waitForTimeout(800);

    const pages = [
      { url: '/', name: 'dashboard', waitFor: '.ant-layout-content' },
      { url: '/tenders', name: 'tenders', waitFor: '.ant-table' },
      { url: '/boq', name: 'boq', waitFor: '.ant-layout-content' },
      { url: '/libraries/tender-materials-works', name: 'bsm', waitFor: '.ant-layout-content' },
      { url: '/libraries/materials', name: 'materials', waitFor: '.ant-table' },
      { url: '/libraries/works', name: 'works', waitFor: '.ant-table' },
      { url: '/financial-indicators', name: 'financial', waitFor: '.ant-layout-content' },
      { url: '/commercial-costs', name: 'commercial', waitFor: '.ant-layout-content' },
    ];

    for (const testPage of pages) {
      console.log(`📄 Testing ${testPage.name} page...`);
      await page.goto(`http://localhost:5174${testPage.url}`, { waitUntil: 'domcontentloaded' });

      // Wait for layout to render (more reliable than networkidle)
      await page.waitForSelector('.ant-layout', { timeout: 10000 });

      // Wait for specific element to ensure page loaded
      try {
        await page.waitForSelector(testPage.waitFor, { timeout: 3000 });
      } catch (e) {
        console.log(`  ⚠ Warning: ${testPage.waitFor} not found on ${testPage.name}`);
      }

      await page.waitForTimeout(500);

      // Check background is still dark
      const bodyBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      const isStillDark = isDarkColor(bodyBg);
      console.log(`  ${isStillDark ? '✓' : '✗'} Background: ${bodyBg}`);

      await page.screenshot({
        path: `playwright-report/dark-theme-${testPage.name}.png`,
        fullPage: true
      });

      console.log(`  ✓ Screenshot saved: dark-theme-${testPage.name}.png`);
    }

    console.log('\n✓ All page screenshots captured\n');
  });

  test('should check text contrast on dark backgrounds', async ({ page }) => {
    console.log('\n🔍 Checking text contrast ratios...\n');

    const themeToggle = page.locator('[role="switch"]').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    await themeToggle.click();
    await page.waitForTimeout(800);

    // Navigate to a content-rich page
    await page.goto('http://localhost:5174/tenders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check various text elements
    const selectors = [
      'h1',
      'h2',
      'h3',
      '.ant-typography',
      '.ant-btn',
      '.ant-table-thead th',
      '.ant-table-tbody td',
      '.ant-menu-item',
      '.ant-tag',
      '.ant-input',
      '.ant-select',
    ];

    const contrastIssues: Array<{
      selector: string;
      text: string;
      color: string;
      bgColor: string;
      contrast: number;
      passes: boolean;
    }> = [];

    for (const selector of selectors) {
      try {
        const elements = await page.locator(selector).all();

        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          const element = elements[i];

          const isVisible = await element.isVisible().catch(() => false);
          if (!isVisible) continue;

          const text = await element.innerText().catch(() => '');
          if (!text || text.length > 50) continue;

          const color = await element.evaluate(el => window.getComputedStyle(el).color);
          const bgColor = await element.evaluate(el => {
            let bg = window.getComputedStyle(el).backgroundColor;
            // If transparent, get parent background
            if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
              let parent = el.parentElement;
              while (parent && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
                bg = window.getComputedStyle(parent).backgroundColor;
                parent = parent.parentElement;
              }
            }
            return bg;
          });

          const contrast = getContrastRatio(color, bgColor);
          const passes = contrast >= 4.5; // WCAG AA for normal text

          contrastIssues.push({
            selector,
            text: text.substring(0, 30),
            color,
            bgColor,
            contrast: Math.round(contrast * 100) / 100,
            passes,
          });

          if (!passes) {
            console.log(`✗ FAIL: ${selector}`);
            console.log(`  Text: "${text.substring(0, 30)}"`);
            console.log(`  Color: ${color}`);
            console.log(`  Background: ${bgColor}`);
            console.log(`  Contrast: ${Math.round(contrast * 100) / 100}:1 (needs 4.5:1)\n`);
          }
        }
      } catch (e) {
        // Element not found or not accessible
      }
    }

    // Print summary
    const failedElements = contrastIssues.filter(issue => !issue.passes);
    const passedElements = contrastIssues.filter(issue => issue.passes);

    console.log('\n📊 Contrast Check Summary:');
    console.log(`✓ Passed: ${passedElements.length}`);
    console.log(`✗ Failed: ${failedElements.length}`);
    console.log(`Total checked: ${contrastIssues.length}\n`);

    // Take screenshot of test page
    await page.screenshot({
      path: 'playwright-report/dark-theme-contrast-test.png',
      fullPage: true
    });
  });

  test('should check component visibility in dark theme', async ({ page }) => {
    console.log('\n👁 Checking component visibility...\n');

    const themeToggle = page.locator('[role="switch"]').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    await themeToggle.click();
    await page.waitForTimeout(800);

    // Navigate to tenders page (has most components)
    await page.goto('http://localhost:5174/tenders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const components = [
      { name: 'Table', selector: '.ant-table' },
      { name: 'Button', selector: '.ant-btn' },
      { name: 'Input', selector: '.ant-input' },
      { name: 'Card', selector: '.ant-card' },
      { name: 'Menu', selector: '.ant-menu' },
      { name: 'Tag', selector: '.ant-tag' },
      { name: 'Breadcrumb', selector: '.ant-breadcrumb' },
      { name: 'Divider', selector: '.ant-divider' },
    ];

    console.log('Component Visibility Check:\n');

    for (const component of components) {
      const exists = await page.locator(component.selector).first().isVisible().catch(() => false);

      if (exists) {
        const bgColor = await page.locator(component.selector).first().evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });

        const borderColor = await page.locator(component.selector).first().evaluate(el => {
          return window.getComputedStyle(el).borderColor || window.getComputedStyle(el).borderTopColor;
        });

        console.log(`✓ ${component.name}:`);
        console.log(`  Background: ${bgColor}`);
        console.log(`  Border: ${borderColor}\n`);
      } else {
        console.log(`✗ ${component.name}: Not found\n`);
      }
    }

    await page.screenshot({
      path: 'playwright-report/dark-theme-components.png',
      fullPage: true
    });
  });

  test('should check for light backgrounds bleeding through', async ({ page }) => {
    console.log('\n🔦 Checking for light background leaks...\n');

    const themeToggle = page.locator('[role="switch"]').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    await themeToggle.click();
    await page.waitForTimeout(800);

    // Check all elements for light backgrounds
    const lightBackgrounds = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const issues: Array<{ tag: string; className: string; bg: string }> = [];

      allElements.forEach(el => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

        if (match) {
          const [_, r, g, b] = match.map(Number);
          // Check if background is light (all RGB > 200)
          if (r > 200 && g > 200 && b > 200) {
            issues.push({
              tag: el.tagName.toLowerCase(),
              className: el.className.toString().substring(0, 50),
              bg,
            });
          }
        }
      });

      return issues;
    });

    if (lightBackgrounds.length > 0) {
      console.log(`⚠ Found ${lightBackgrounds.length} elements with light backgrounds:\n`);

      // Show first 10 issues
      lightBackgrounds.slice(0, 10).forEach(issue => {
        console.log(`  ✗ <${issue.tag}> class="${issue.className}"`);
        console.log(`    Background: ${issue.bg}\n`);
      });

      if (lightBackgrounds.length > 10) {
        console.log(`  ... and ${lightBackgrounds.length - 10} more\n`);
      }
    } else {
      console.log('✓ No light backgrounds detected!\n');
    }

    await page.screenshot({
      path: 'playwright-report/dark-theme-leak-check.png',
      fullPage: true
    });
  });
});
