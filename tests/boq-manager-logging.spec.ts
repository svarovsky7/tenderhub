import { test, expect } from '@playwright/test';

test.describe('TenderBOQManagerNew Logging Analysis', () => {
  test('should test actual TenderBOQManagerNew component with real tender data', async ({ page }) => {
    const consoleMessages: string[] = [];
    const boqSpecificMessages: string[] = [];
    const debugLogMessages: string[] = [];

    let positionInteractionLogs = 0;
    let calculationLogs = 0;
    let materialLinkLogs = 0;

    // Отслеживаем все сообщения
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);

      // Специфичные для BOQ сообщения
      if (text.includes('Position') || text.includes('BOQ') || text.includes('Material') ||
          text.includes('🚀') || text.includes('✅') || text.includes('📋') ||
          text.includes('💰') || text.includes('🎯') || text.includes('🗑️') ||
          text.includes('✏️') || text.includes('➕')) {
        boqSpecificMessages.push(text);
      }

      // DebugLog сообщения (если они есть)
      if (text.includes('debugLog') || text.includes('ENABLE_DETAILED_LOGGING')) {
        debugLogMessages.push(text);
      }

      // Анализируем специфичные паттерны
      if (text.includes('Position') && (text.includes('total') || text.includes('cost'))) {
        calculationLogs++;
      }
      if (text.includes('openModal') || text.includes('closeModal') || text.includes('Position details')) {
        positionInteractionLogs++;
      }
      if (text.includes('Material') && (text.includes('link') || text.includes('transfer'))) {
        materialLinkLogs++;
      }

      // Выводим счетчик каждые 500 сообщений
      if (consoleMessages.length % 500 === 0) {
        console.log(`📊 Messages: ${consoleMessages.length} (BOQ: ${boqSpecificMessages.length})`);
      }
    });

    console.log('🚀 Testing TenderBOQManagerNew with real tender data...');

    // Метод 1: Попробуем прямой URL к тендеру с BOQ
    console.log('🎯 Method 1: Direct tender BOQ URL...');
    await page.goto('http://localhost:5173/tender/81aa40f6-01e0-454b-ba3a-0f696622c21c/boq');

    const directMessages = consoleMessages.length;
    console.log(`📊 Direct URL messages: ${directMessages}`);

    // Ждем загрузки
    await page.waitForTimeout(5000);

    // Ищем компонент TenderBOQManagerNew
    let hasTenderBOQ = false;
    try {
      await page.waitForSelector('[class*="tender"], [class*="position"], h1, h2', { timeout: 10000 });
      hasTenderBOQ = true;
      console.log('✅ Tender BOQ component detected');
    } catch (e) {
      console.log('⚠️ Direct URL method failed, trying alternative...');
    }

    const afterWaitMessages = consoleMessages.length;
    console.log(`📊 After wait messages: ${afterWaitMessages}`);

    // Метод 2: Если прямой URL не работает, переходим через BOQ страницу
    if (!hasTenderBOQ) {
      console.log('🔄 Method 2: BOQ page with tender selection...');
      await page.goto('http://localhost:5173/boq');

      // Выбираем тендер
      try {
        await page.waitForSelector('.ant-select', { timeout: 10000 });
        const tenderSelector = page.locator('.ant-select').first();
        await tenderSelector.click();

        await page.waitForSelector('.ant-select-item', { timeout: 10000 });
        await page.locator('.ant-select-item').first().click();

        // Выбираем версию если доступна
        await page.waitForTimeout(2000);
        const versionSelector = page.locator('.ant-select').nth(1);
        const isVersionEnabled = await versionSelector.evaluate((el) => !el.classList.contains('ant-select-disabled'));

        if (isVersionEnabled) {
          await versionSelector.click();
          await page.waitForTimeout(1000);
          const versionOptions = page.locator('.ant-select-item');
          const versionCount = await versionOptions.count();
          if (versionCount > 0) {
            await versionOptions.first().click();
            console.log('✅ Version selected');
          }
        }
      } catch (e) {
        console.log(`⚠️ Selection failed: ${e.message}`);
      }
    }

    // Ждем полной загрузки данных
    console.log('⏳ Waiting for full data loading...');
    await page.waitForTimeout(10000);

    const afterSelectionMessages = consoleMessages.length;
    console.log(`📊 After selection/loading: ${afterSelectionMessages}`);

    // Интерактивное тестирование
    console.log('🖱️ Testing interactions...');
    const beforeInteractions = consoleMessages.length;

    try {
      // Ищем позиции или карточки
      const positions = page.locator('[class*="position"], .ant-card, [data-testid*="position"], button:has-text("Позиция")');
      const positionCount = await positions.count();
      console.log(`📋 Found ${positionCount} position elements`);

      if (positionCount > 0) {
        console.log('🖱️ Clicking on positions to trigger BOQ operations...');

        for (let i = 0; i < Math.min(3, positionCount); i++) {
          const beforeClick = consoleMessages.length;
          try {
            await positions.nth(i).click();
            await page.waitForTimeout(3000); // Ждем обработки

            const afterClick = consoleMessages.length;
            const clickLogs = afterClick - beforeClick;
            console.log(`  Position ${i + 1}: +${clickLogs} messages`);

            if (clickLogs > 500) {
              console.log(`🚨 HIGH LOG VOLUME detected on position ${i + 1}!`);
              break;
            }
          } catch (e) {
            console.log(`  Position ${i + 1}: interaction failed`);
          }
        }
      }

      // Тестируем другие интерактивные элементы
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      console.log(`🔘 Found ${buttonCount} buttons`);

      if (buttonCount > 0) {
        console.log('🖱️ Testing button interactions...');

        for (let i = 0; i < Math.min(3, buttonCount); i++) {
          const beforeClick = consoleMessages.length;
          try {
            const button = buttons.nth(i);
            const buttonText = await button.textContent();

            // Избегаем опасных кнопок
            if (buttonText && !buttonText.includes('Delete') && !buttonText.includes('Remove')) {
              await button.click();
              await page.waitForTimeout(2000);

              const afterClick = consoleMessages.length;
              const clickLogs = afterClick - beforeClick;
              console.log(`  Button "${buttonText?.substring(0, 20)}": +${clickLogs} messages`);
            }
          } catch (e) {
            // Игнорируем ошибки кликов
          }
        }
      }

    } catch (e) {
      console.log(`⚠️ Interaction testing error: ${e.message}`);
    }

    const afterInteractions = consoleMessages.length;
    const interactionMessages = afterInteractions - beforeInteractions;
    console.log(`📊 Interaction testing: +${interactionMessages} messages`);

    // Финальное ожидание для захвата всех асинхронных операций
    console.log('⏳ Final wait for async operations...');
    await page.waitForTimeout(5000);

    const finalMessages = consoleMessages.length;
    const asyncMessages = finalMessages - afterInteractions;
    console.log(`📊 Async operations: +${asyncMessages} messages`);

    // Детальный анализ результатов
    console.log('\n📊 === DETAILED BOQ MANAGER LOGGING ANALYSIS ===');
    console.log(`📈 Total console messages: ${finalMessages}`);
    console.log(`📈 BOQ-specific messages: ${boqSpecificMessages.length} (${(boqSpecificMessages.length/finalMessages*100).toFixed(1)}%)`);
    console.log(`📈 Debug log messages: ${debugLogMessages.length}`);
    console.log(`📈 Position interaction logs: ${positionInteractionLogs}`);
    console.log(`📈 Calculation logs: ${calculationLogs}`);
    console.log(`📈 Material link logs: ${materialLinkLogs}`);

    // Анализ фаз
    console.log('\n📋 Logging by phases:');
    console.log(`  Initial loading: ${directMessages}`);
    console.log(`  Component rendering: ${afterWaitMessages - directMessages}`);
    console.log(`  Data loading: ${afterSelectionMessages - afterWaitMessages}`);
    console.log(`  User interactions: ${interactionMessages}`);
    console.log(`  Async operations: ${asyncMessages}`);

    // Анализ паттернов сообщений
    const emojiPatterns = {
      '🚀': 0, '✅': 0, '📋': 0, '💰': 0, '🎯': 0, '🗑️': 0, '✏️': 0, '➕': 0,
      '📊': 0, '🔍': 0, '📝': 0, '🖱️': 0, '⚠️': 0, '❌': 0
    };

    consoleMessages.forEach(msg => {
      Object.keys(emojiPatterns).forEach(emoji => {
        if (msg.includes(emoji)) {
          emojiPatterns[emoji as keyof typeof emojiPatterns]++;
        }
      });
    });

    console.log('\n🎭 Emoji pattern frequency:');
    Object.entries(emojiPatterns)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([emoji, count]) => {
        console.log(`  ${emoji}: ${count} times`);
      });

    // Поиск повторяющихся сообщений
    const messageFreq = new Map<string, number>();
    consoleMessages.forEach(msg => {
      const normalized = msg
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIME]')
        .replace(/[a-f0-9-]{36}/g, '[UUID]')
        .replace(/\d+ms/g, '[MS]')
        .replace(/Position \d+/g, 'Position [N]');

      messageFreq.set(normalized, (messageFreq.get(normalized) || 0) + 1);
    });

    const frequentMessages = Array.from(messageFreq.entries())
      .filter(([_, count]) => count > 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (frequentMessages.length > 0) {
      console.log('\n🔥 Most frequent messages (>5 occurrences):');
      frequentMessages.forEach(([msg, count], index) => {
        console.log(`${index + 1}. (${count}x) ${msg.substring(0, 80)}${msg.length > 80 ? '...' : ''}`);
      });
    }

    // Финальная оценка
    console.log('\n📊 FINAL ASSESSMENT:');

    if (debugLogMessages.length > 0) {
      console.log(`🚨 FOUND ${debugLogMessages.length} DEBUG LOG MESSAGES!`);
      console.log('💡 The ENABLE_DETAILED_LOGGING flag might be set to true');
      debugLogMessages.slice(0, 5).forEach(msg => console.log(`   "${msg}"`));
    } else {
      console.log('✅ No debug log messages detected - optimization is working');
    }

    if (finalMessages < 200) {
      console.log('✅ EXCELLENT: Very low logging volume');
    } else if (finalMessages < 1000) {
      console.log('✅ GOOD: Acceptable logging volume');
    } else if (finalMessages < 3000) {
      console.log('⚠️ MODERATE: Some optimization may be needed');
    } else if (finalMessages < 6000) {
      console.log('⚠️ HIGH: Significant logging volume detected');
    } else {
      console.log('❌ CRITICAL: 6400+ message problem persists!');
    }

    // Специфичная проверка для TenderBOQManagerNew
    if (boqSpecificMessages.length > finalMessages * 0.5) {
      console.log(`📋 High BOQ activity detected: ${boqSpecificMessages.length} BOQ messages`);
    }

    if (positionInteractionLogs > 50) {
      console.log(`🖱️ High position interaction logging: ${positionInteractionLogs} messages`);
    }

    // Создаем отчет
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      totalMessages: finalMessages,
      boqSpecificMessages: boqSpecificMessages.length,
      debugLogMessages: debugLogMessages.length,
      categories: {
        positionInteractions: positionInteractionLogs,
        calculations: calculationLogs,
        materialLinks: materialLinkLogs
      },
      emojiPatterns,
      phases: {
        initial: directMessages,
        rendering: afterWaitMessages - directMessages,
        dataLoading: afterSelectionMessages - afterWaitMessages,
        interactions: interactionMessages,
        async: asyncMessages
      },
      assessment: finalMessages < 1000 ? 'optimized' : 'needs_review',
      topFrequentMessages: frequentMessages.slice(0, 5)
    };

    console.log('\n📋 Complete BOQ Manager Report:');
    console.log(JSON.stringify(report, null, 2));

    expect(finalMessages).toBeGreaterThan(0);

    if (finalMessages > 5000) {
      console.log('\n🚨 ALERT: The original 6400+ message problem may still be present!');
      console.log('🔧 Recommendation: Check TenderBOQManagerNew.tsx for any remaining console.log statements');
    } else {
      console.log(`\n🎉 TenderBOQManagerNew logging appears optimized: ${finalMessages} total messages`);
    }
  });
});