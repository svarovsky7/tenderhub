import { test, expect } from '@playwright/test';

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

    // Очистить - красный текст в светлой теме
    const clearButton = page.locator('button:has-text("Очистить")');
    const clearStyle = await clearButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
      };
    });
    console.log('Очистить button style:', clearStyle);
    expect(clearStyle.color).toBe('rgb(220, 38, 38)'); // red #dc2626
  });

  test('should verify button styles in dark theme', async ({ page }) => {
    console.log('🌙 Testing dark theme button styles...');

    // Переключаем на темную тему
    const themeToggle = page.locator('button[aria-label="Переключить тему"], button:has(svg)').first();
    await themeToggle.click();
    await page.waitForTimeout(500); // Ждем применения темы

    // К структуре - прозрачная заливка, белый текст
    const backButton = page.locator('button:has-text("К структуре")');
    const backStyle = await backButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
      };
    });
    console.log('К структуре button style (dark):', backStyle);
    expect(backStyle.color).toBe('rgb(255, 255, 255)'); // white

    // Экспорт - желтая окантовка, белый текст
    const exportButton = page.locator('button:has-text("Экспорт")');
    const exportStyle = await exportButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        borderWidth: style.borderWidth,
      };
    });
    console.log('Экспорт button style (dark):', exportStyle);
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
    console.log('Импорт button style (dark):', importStyle);
    expect(importStyle.color).toBe('rgb(255, 255, 255)'); // white
    expect(importStyle.borderWidth).toBe('2px');

    // Очистить - красный текст в темной теме, красная окантовка
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
    expect(clearStyle.borderWidth).toBe('2px');
  });

  test('should verify table text colors', async ({ page }) => {
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

  test('should verify management panel background in dark theme', async ({ page }) => {
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

  test('should take screenshots for visual verification', async ({ page }) => {
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
