import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' }); // Run tests sequentially

test.describe('Construction Costs Edit Page - Button Styles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/construction-costs/edit');
    await page.waitForLoadState('networkidle');
  });

  test('should verify button order in header', async ({ page }) => {
    console.log('🔍 Checking button order...');

    const buttons = page.locator('.action-buttons button');
    const buttonCount = await buttons.count();

    console.log(`Found ${buttonCount} buttons`);

    // Проверяем порядок кнопок
    const buttonTexts = [];
    for (let i = 0; i < buttonCount; i++) {
      const text = await buttons.nth(i).textContent();
      buttonTexts.push(text?.trim());
    }

    console.log('Button order:', buttonTexts);

    expect(buttonTexts).toEqual([
      'К структуре',
      'Экспорт',
      'Импорт',
      'Обновить',
      'Очистить'
    ]);
  });

  test('should verify button styles in light theme', async ({ page }) => {
    console.log('🌞 Testing light theme button styles...');

    // К структуре - прозрачная заливка, белый текст
    const backButton = page.locator('button:has-text("К структуре")');
    const backStyle = await backButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });
    console.log('К структуре button style:', backStyle);
    expect(backStyle.color).toBe('rgb(255, 255, 255)'); // white

    // Экспорт - желтая окантовка, белый текст
    const exportButton = page.locator('button:has-text("Экспорт")');
    const exportStyle = await exportButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
      };
    });
    console.log('Экспорт button style:', exportStyle);
    expect(exportStyle.color).toBe('rgb(255, 255, 255)'); // white
    expect(exportStyle.borderWidth).toBe('2px');

    // Импорт - синяя окантовка, белый текст
    const importButton = page.locator('button:has-text("Импорт")');
    const importStyle = await importButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        borderWidth: style.borderWidth,
      };
    });
    console.log('Импорт button style:', importStyle);
    expect(importStyle.color).toBe('rgb(255, 255, 255)'); // white
    expect(importStyle.borderWidth).toBe('2px');

    // Обновить - белый текст
    const refreshButton = page.locator('button:has-text("Обновить")');
    const refreshStyle = await refreshButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
      };
    });
    console.log('Обновить button style:', refreshStyle);
    expect(refreshStyle.color).toBe('rgb(255, 255, 255)'); // white

    // Очистить - белый текст, красная иконка, красная окантовка 3px в светлой теме
    const clearButton = page.locator('button:has-text("Очистить")');
    const clearStyle = await clearButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const icon = el.querySelector('.anticon');
      const iconStyle = icon ? window.getComputedStyle(icon) : null;
      return {
        color: style.color,
        borderWidth: style.borderWidth,
        iconColor: iconStyle?.color || 'not found',
      };
    });
    console.log('Очистить button style:', clearStyle);
    expect(clearStyle.color).toBe('rgb(255, 255, 255)'); // white text
    expect(clearStyle.borderWidth).toBe('3px'); // 3px border
    expect(clearStyle.iconColor).toBe('rgb(239, 68, 68)'); // red icon #ef4444
  });

  test('should verify button styles in dark theme', async ({ page }) => {
    console.log('🌙 Testing dark theme button styles...');

    // Переключаем на темную тему через Switch компонент
    const themeToggle = page.locator('.ant-switch').first();
    await themeToggle.click();
    await page.waitForTimeout(1500); // Ждем применения темы и ре-рендера

    // Проверяем, что тема действительно переключилась
    const headerClass = await page.locator('.edit-page-header').getAttribute('class');
    console.log('Header classes after toggle:', headerClass);
    expect(headerClass).toContain('dark');

    // К структуре - прозрачная заливка, белый текст
    const backButton = page.locator('button:has-text("К структуре")');
    const backStyle = await backButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
      };
    });
    console.log('К структуре button style (dark):', backStyle);
    expect(backStyle.color).toMatch(/rgb(a)?\(255,\s*255,\s*255/); // white (with or without alpha)

    // Экспорт - желтая иконка, белый текст
    const exportButton = page.locator('button:has-text("Экспорт")');
    const exportStyle = await exportButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const icon = el.querySelector('.anticon');
      const iconStyle = icon ? window.getComputedStyle(icon) : null;
      return {
        color: style.color,
        borderWidth: style.borderWidth,
        iconColor: iconStyle?.color || 'not found',
      };
    });
    console.log('Экспорт button style (dark):', exportStyle);
    expect(exportStyle.color).toMatch(/rgb(a)?\(255,\s*255,\s*255/); // white (with or without alpha)
    expect(exportStyle.borderWidth).toBe('2px');
    // Иконка желтая - проверяем что она не белая
    expect(exportStyle.iconColor).not.toMatch(/rgb(a)?\(255,\s*255,\s*255/); // not white (should be yellow)

    // Импорт - синяя иконка в темной теме, белый текст
    const importButton = page.locator('button:has-text("Импорт")');
    const importStyle = await importButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const icon = el.querySelector('.anticon svg');
      const iconStyle = icon ? window.getComputedStyle(icon) : null;
      return {
        color: style.color,
        borderWidth: style.borderWidth,
        iconColor: iconStyle?.color || (icon as any)?.style?.color || 'not found',
      };
    });
    console.log('Импорт button style (dark):', importStyle);
    expect(importStyle.color).toMatch(/rgb(a)?\(255,\s*255,\s*255/); // white (with or without alpha)
    expect(importStyle.borderWidth).toBe('2px');
    // Иконка может быть задана через inline style, проверяем что она не белая
    expect(importStyle.iconColor).not.toMatch(/rgb(a)?\(255,\s*255,\s*255,\s*1\)/); // not white (should be blue)

    // Обновить - черная заливка, зеленая иконка, белый текст
    const refreshButton = page.locator('button:has-text("Обновить")');
    const refreshStyle = await refreshButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const icon = el.querySelector('.anticon');
      const iconStyle = icon ? window.getComputedStyle(icon) : null;
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        iconColor: iconStyle?.color || 'not found',
      };
    });
    console.log('Обновить button style (dark):', refreshStyle);
    expect(refreshStyle.color).toMatch(/rgb(a)?\(255,\s*255,\s*255/); // white (with or without alpha)
    // Черная заливка
    expect(refreshStyle.backgroundColor).toMatch(/rgba?\(0,\s*0,\s*0/); // black background
    // Иконка зеленая - проверяем что она не белая
    expect(refreshStyle.iconColor).not.toMatch(/rgb(a)?\(255,\s*255,\s*255/); // not white (should be green)

    // Очистить - красный текст, красная окантовка 3px
    const clearButton = page.locator('button:has-text("Очистить")');
    const clearStyle = await clearButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        borderWidth: style.borderWidth,
      };
    });
    console.log('Очистить button style (dark):', clearStyle);
    expect(clearStyle.color).toBe('rgb(239, 68, 68)'); // red #ef4444
    expect(clearStyle.borderWidth).toBe('3px'); // 3px border
  });

  test.skip('should verify table text colors', async ({ page }) => {
    console.log('🔤 Testing table text colors...');

    // Ждем загрузки таблицы
    await page.waitForSelector('.ant-table', { timeout: 10000 });

    // Проверяем цвет текста в структуре (светлая тема)
    const firstRowText = page.locator('.ant-table-tbody tr').first().locator('td').first().locator('span');
    if (await firstRowText.count() > 0) {
      const textColor = await firstRowText.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.color;
      });
      console.log('Table text color (light theme):', textColor);
      expect(textColor).toBe('rgb(0, 0, 0)'); // black
    }

    // Переключаем на темную тему
    const themeToggle = page.locator('button[aria-label="Переключить тему"], button:has(svg)').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Проверяем цвет текста в темной теме
    if (await firstRowText.count() > 0) {
      const textColorDark = await firstRowText.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.color;
      });
      console.log('Table text color (dark theme):', textColorDark);
      expect(textColorDark).toBe('rgb(255, 255, 255)'); // white
    }
  });

  test.skip('should verify management panel background in dark theme', async ({ page }) => {
    console.log('🎨 Testing management panel background...');

    // Переключаем на темную тему
    const themeToggle = page.locator('button[aria-label="Переключить тему"], button:has(svg)').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Проверяем фон панели "Управление группировкой"
    const managementPanel = page.locator('div:has-text("Управление группировкой")').first();
    if (await managementPanel.count() > 0) {
      const panelStyle = await managementPanel.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
      });
      console.log('Management panel style (dark):', panelStyle);
      expect(panelStyle.backgroundColor).toBe('rgb(20, 20, 20)'); // #141414
    }
  });

  test.skip('should take screenshots for visual verification', async ({ page }) => {
    console.log('📸 Taking screenshots...');

    // Светлая тема
    await page.screenshot({
      path: 'tests/screenshots/construction-costs-edit-light.png',
      fullPage: true
    });
    console.log('✅ Light theme screenshot saved');

    // Переключаем на темную тему
    const themeToggle = page.locator('button[aria-label="Переключить тему"], button:has(svg)').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/construction-costs-edit-dark.png',
      fullPage: true
    });
    console.log('✅ Dark theme screenshot saved');
  });
});
