import { test, expect } from '@playwright/test';

test.describe('Console Logging Monitor', () => {
  test('should track console messages when loading tender BOQ page', async ({ page }) => {
    const consoleMessages: string[] = [];
    const messageTypes = {
      log: 0,
      warn: 0,
      error: 0,
      info: 0,
      debug: 0
    };

    // Перехватываем все console сообщения
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      // Подсчитываем по типам
      if (messageTypes.hasOwnProperty(type)) {
        messageTypes[type as keyof typeof messageTypes]++;
      }

      // Сохраняем сообщение для анализа
      consoleMessages.push(`[${type.toUpperCase()}] ${text}`);

      // Выводим в реальном времени (первые 100 сообщений)
      if (consoleMessages.length <= 100) {
        console.log(`Console ${type}: ${text}`);
      }
    });

    // Переходим на страницу тендера
    await page.goto('http://localhost:5173');

    // Ждем загрузки основной страницы - ищем таблицу тендеров или кнопку "Позиции заказчика"
    await page.waitForSelector('table, [href="/boq"]', { timeout: 10000 });

    console.log('📊 Main page loaded, console messages so far:', consoleMessages.length);

    // Очищаем счетчик перед переходом к BOQ
    const messagesBeforeBOQ = consoleMessages.length;
    console.log('📊 Messages before navigating to BOQ:', messagesBeforeBOQ);

    // Попробуем несколько способов перехода к BOQ
    const boqMenuLink = page.locator('[href="/boq"]').first();
    const eyeButton = page.locator('button[aria-label*="eye"], button:has(img[alt*="eye"])').first();
    const tenderRow = page.locator('table tbody tr').first();

    if (await boqMenuLink.isVisible()) {
      console.log('📊 Using menu link to BOQ page');
      await boqMenuLink.click();
      await page.waitForURL(/.*\/boq/, { timeout: 15000 });
    } else if (await eyeButton.isVisible()) {
      console.log('📊 Using eye button to view tender BOQ');
      await eyeButton.click();
      await page.waitForURL(/.*\/tender\/.*\/boq/, { timeout: 15000 });
    } else if (await tenderRow.isVisible()) {
      console.log('📊 Clicking on tender row');
      await tenderRow.click();
      await page.waitForURL(/.*\/tender\/.*\/boq/, { timeout: 15000 });
    } else {
      console.log('📊 Navigating directly to BOQ page');
      await page.goto('http://localhost:5173/boq');
    }

    // Ждем загрузки страницы BOQ
    await page.waitForSelector('.ant-select', { timeout: 15000 });

    // Выбираем тендер из селектора
    console.log('📊 Selecting tender from dropdown');
    const tenderSelector = page.locator('.ant-select').first();
    await tenderSelector.click();

    // Ждем загрузки опций и выбираем первый доступный тендер
    await page.waitForSelector('.ant-select-item', { timeout: 10000 });
    const firstTenderOption = page.locator('.ant-select-item').first();
    await firstTenderOption.click();

    // Ждем загрузки позиций после выбора тендера
    await page.waitForSelector('[class*="grid"], [class*="position"], .ant-card', { timeout: 15000 });

    // Дополнительное ожидание для полной загрузки данных
    await page.waitForTimeout(5000);

    const totalMessages = consoleMessages.length;
    const boqMessages = totalMessages - messagesBeforeBOQ;

    console.log('\n📊 === CONSOLE LOGGING REPORT ===');
    console.log(`Total console messages: ${totalMessages}`);
    console.log(`Messages during BOQ loading: ${boqMessages}`);
    console.log('\nBreakdown by type:');
    console.log(`- Log messages: ${messageTypes.log}`);
    console.log(`- Warning messages: ${messageTypes.warn}`);
    console.log(`- Error messages: ${messageTypes.error}`);
    console.log(`- Info messages: ${messageTypes.info}`);
    console.log(`- Debug messages: ${messageTypes.debug}`);

    // Анализируем наиболее частые сообщения
    const messageFrequency = new Map<string, number>();
    consoleMessages.forEach(msg => {
      // Убираем временные метки и специфичные ID для группировки
      const normalized = msg
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]')
        .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
        .replace(/temp-\d+/g, '[TEMP-ID]')
        .replace(/\d+ms/g, '[TIME]');

      messageFrequency.set(normalized, (messageFrequency.get(normalized) || 0) + 1);
    });

    // Сортируем по частоте
    const sortedMessages = Array.from(messageFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n🔍 Top 10 most frequent messages:');
    sortedMessages.forEach(([msg, count], index) => {
      console.log(`${index + 1}. (${count}x) ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
    });

    // Ищем специфичные паттерны BOQ логирования
    const boqPatterns = [
      '🚀', '✅', '📋', '💰', '🎯', '🔍', '📝', '➕', '🗑️', '✏️', '🎆', '📊', '📥'
    ];

    let boqSpecificMessages = 0;
    consoleMessages.forEach(msg => {
      if (boqPatterns.some(pattern => msg.includes(pattern))) {
        boqSpecificMessages++;
      }
    });

    console.log(`\n🎯 BOQ-specific emoji messages: ${boqSpecificMessages}`);

    // Проверяем, что логирование действительно уменьшилось
    console.log('\n📈 Performance Analysis:');
    if (totalMessages > 5000) {
      console.log('❌ EXCESSIVE LOGGING: More than 5000 messages detected');
      console.log('💡 Consider further optimization of console.log statements');
    } else if (totalMessages > 1000) {
      console.log('⚠️  HIGH LOGGING: 1000-5000 messages detected');
      console.log('💡 Some optimization may still be needed');
    } else {
      console.log('✅ ACCEPTABLE LOGGING: Less than 1000 messages');
    }

    // Сохраняем детальный отчет
    const report = {
      timestamp: new Date().toISOString(),
      totalMessages,
      boqMessages,
      messageTypes,
      topFrequentMessages: sortedMessages.slice(0, 5),
      boqSpecificMessages,
      url: page.url()
    };

    console.log('\n📄 Detailed report:', JSON.stringify(report, null, 2));

    // Тест проходит, но выводим предупреждение если слишком много логов
    expect(totalMessages).toBeLessThan(10000); // Максимальный порог

    if (totalMessages > 2000) {
      console.log('\n⚠️  WARNING: Console logging is still high. Consider further optimization.');
    }
  });

  test('should identify specific functions generating most logs', async ({ page }) => {
    const functionLogs = new Map<string, number>();

    page.on('console', (msg) => {
      const text = msg.text();

      // Ищем названия функций в логах
      const functionPatterns = [
        'calculatePositionTotalCost',
        'loadBOQItemsForPosition',
        'loadLinksForPosition',
        'handleDragEnd',
        'handleMaterialTransferBetweenWorks',
        'addItem',
        'updateSubItem',
        'removeSubItem',
        'handleManualVolumeChange',
        'openModal',
        'closeModal'
      ];

      functionPatterns.forEach(funcName => {
        if (text.includes(funcName)) {
          functionLogs.set(funcName, (functionLogs.get(funcName) || 0) + 1);
        }
      });
    });

    await page.goto('http://localhost:5173');
    await page.waitForSelector('table, [href="/boq"]', { timeout: 10000 });

    // Используем то же самое переход к BOQ как в первом тесте
    const boqMenuLink = page.locator('[href="/boq"]').first();
    if (await boqMenuLink.isVisible()) {
      await boqMenuLink.click();
      await page.waitForURL(/.*\/boq/, { timeout: 15000 });
    } else {
      await page.goto('http://localhost:5173/boq');
    }

    // Выбираем тендер из селектора
    await page.waitForSelector('.ant-select', { timeout: 15000 });
    const tenderSelector = page.locator('.ant-select').first();
    await tenderSelector.click();
    await page.waitForSelector('.ant-select-item', { timeout: 10000 });
    const firstTenderOption = page.locator('.ant-select-item').first();
    await firstTenderOption.click();

    await page.waitForSelector('[class*="grid"], [class*="position"], .ant-card', { timeout: 15000 });
    await page.waitForTimeout(5000);

    console.log('\n🔍 Function-specific logging analysis:');
    const sortedFunctions = Array.from(functionLogs.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sortedFunctions.length > 0) {
      sortedFunctions.forEach(([func, count]) => {
        console.log(`${func}: ${count} messages`);
      });
    } else {
      console.log('✅ No function-specific patterns detected in current logs');
    }
  });
});