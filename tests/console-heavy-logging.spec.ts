import { test, expect } from '@playwright/test';

test.describe('Heavy Console Logging Analysis', () => {
  test('should analyze 6400+ messages when loading specific tender BOQ', async ({ page }) => {
    const consoleMessages: string[] = [];
    const messageTypes = {
      log: 0,
      warn: 0,
      error: 0,
      info: 0,
      debug: 0
    };

    const messageCounts = new Map<string, number>();
    const functionCallCounts = new Map<string, number>();
    const emojiCounts = new Map<string, number>();

    // Перехватываем все console сообщения
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      // Подсчитываем по типам
      if (messageTypes.hasOwnProperty(type)) {
        messageTypes[type as keyof typeof messageTypes]++;
      }

      // Анализируем сообщения по паттернам
      const normalized = text
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]')
        .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
        .replace(/temp-\d+/g, '[TEMP-ID]')
        .replace(/\d+ms/g, '[TIME]')
        .replace(/Position \d+ total/g, 'Position [N] total');

      messageCounts.set(normalized, (messageCounts.get(normalized) || 0) + 1);

      // Ищем названия функций
      const functionPatterns = [
        'calculatePositionTotalCost',
        'loadBOQItemsForPosition',
        'loadLinksForPosition',
        'openModal',
        'closeModal',
        'addItem',
        'removeSubItem',
        'updateSubItem',
        'handleDragEnd',
        'handleMaterialTransferBetweenWorks',
        'handleConflictResolution',
        'handleDeleteMaterial',
        'handleManualVolumeChange'
      ];

      functionPatterns.forEach(funcName => {
        if (text.includes(funcName)) {
          functionCallCounts.set(funcName, (functionCallCounts.get(funcName) || 0) + 1);
        }
      });

      // Анализируем эмодзи
      const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu;
      const emojis = text.match(emojiPattern);
      if (emojis) {
        emojis.forEach(emoji => {
          emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
        });
      }

      consoleMessages.push(`[${type.toUpperCase()}] ${text}`);

      // Выводим в реальном времени каждое 100-е сообщение
      if (consoleMessages.length % 100 === 0) {
        console.log(`📊 Messages so far: ${consoleMessages.length}`);
      }
    });

    console.log('🚀 Starting heavy logging test...');

    // Переходим напрямую к странице с конкретным тендером
    await page.goto('http://localhost:5173/tender/81aa40f6-01e0-454b-ba3a-0f696622c21c/boq');

    // Ждем загрузки страницы
    console.log('⏳ Waiting for page load...');
    await page.waitForSelector('h1, h2, [class*="header"]', { timeout: 15000 });

    const messagesAfterLoad = consoleMessages.length;
    console.log(`📊 Messages after initial load: ${messagesAfterLoad}`);

    // Дополнительное ожидание для полной загрузки всех компонентов
    await page.waitForTimeout(10000);

    // Попробуем взаимодействовать с элементами для генерации большего количества логов
    try {
      // Поищем позиции или карточки для взаимодействия
      const positions = page.locator('[class*="position"], [class*="card"], .ant-card');
      const positionCount = await positions.count();

      console.log(`📋 Found ${positionCount} position elements`);

      if (positionCount > 0) {
        // Кликаем на первые несколько позиций для генерации логов
        for (let i = 0; i < Math.min(3, positionCount); i++) {
          console.log(`🖱️ Clicking position ${i + 1}`);
          try {
            await positions.nth(i).click();
            await page.waitForTimeout(2000); // Ждем обработки
          } catch (e) {
            console.log(`⚠️ Failed to click position ${i + 1}: ${e}`);
          }
        }
      }

      // Поищем кнопки для взаимодействия
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      console.log(`🔘 Found ${buttonCount} buttons`);

      // Попробуем скроллить страницу для загрузки больше данных
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(2000);

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);

    } catch (error) {
      console.log(`⚠️ Interaction error: ${error}`);
    }

    // Финальное ожидание
    await page.waitForTimeout(5000);

    const totalMessages = consoleMessages.length;

    console.log('\n📊 === DETAILED CONSOLE LOGGING ANALYSIS ===');
    console.log(`📈 Total console messages: ${totalMessages}`);
    console.log(`📈 Messages after interactions: ${totalMessages - messagesAfterLoad}`);

    console.log('\n🔢 Message breakdown by type:');
    Object.entries(messageTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} (${(count/totalMessages*100).toFixed(1)}%)`);
    });

    // Топ-10 самых частых сообщений
    const sortedMessages = Array.from(messageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n🔥 Top 10 most frequent message patterns:');
    sortedMessages.forEach(([msg, count], index) => {
      const percentage = (count / totalMessages * 100).toFixed(1);
      console.log(`${index + 1}. (${count}x, ${percentage}%) ${msg.substring(0, 120)}${msg.length > 120 ? '...' : ''}`);
    });

    // Анализ вызовов функций
    if (functionCallCounts.size > 0) {
      const sortedFunctions = Array.from(functionCallCounts.entries())
        .sort((a, b) => b[1] - a[1]);

      console.log('\n🔧 Function calls generating most logs:');
      sortedFunctions.forEach(([func, count]) => {
        const percentage = (count / totalMessages * 100).toFixed(1);
        console.log(`  ${func}: ${count} calls (${percentage}% of total logs)`);
      });
    }

    // Анализ эмодзи
    if (emojiCounts.size > 0) {
      const sortedEmojis = Array.from(emojiCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      console.log('\n🎭 Top 5 emoji usage:');
      sortedEmojis.forEach(([emoji, count]) => {
        console.log(`  ${emoji}: ${count} times`);
      });
    }

    // Специальный анализ для выявления проблем
    console.log('\n🔍 Problem analysis:');

    // Проверяем на повторяющиеся операции
    const highFrequencyMessages = sortedMessages.filter(([_, count]) => count > 50);
    if (highFrequencyMessages.length > 0) {
      console.log('⚠️  High frequency messages detected (>50 occurrences):');
      highFrequencyMessages.forEach(([msg, count]) => {
        console.log(`  - ${count}x: ${msg.substring(0, 80)}...`);
      });
    }

    // Проверяем на потенциальные циклы
    const potentialLoops = sortedMessages.filter(([msg, count]) =>
      count > 20 && (msg.includes('Position') || msg.includes('total') || msg.includes('calculate'))
    );

    if (potentialLoops.length > 0) {
      console.log('🔄 Potential calculation loops detected:');
      potentialLoops.forEach(([msg, count]) => {
        console.log(`  - ${count}x: ${msg.substring(0, 80)}...`);
      });
    }

    // Финальная оценка
    console.log('\n📊 Performance Assessment:');
    if (totalMessages > 5000) {
      console.log('❌ CRITICAL: Excessive logging (>5000 messages)');
      console.log('💡 Recommendation: Implement conditional logging with debug flags');
    } else if (totalMessages > 1000) {
      console.log('⚠️  WARNING: High logging volume (1000-5000 messages)');
      console.log('💡 Recommendation: Review and reduce non-essential logs');
    } else {
      console.log('✅ ACCEPTABLE: Logging volume is reasonable');
    }

    // Создаем детальный отчет
    const detailedReport = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      totalMessages,
      messageTypes,
      topMessages: sortedMessages.slice(0, 20),
      functionCalls: Array.from(functionCallCounts.entries()).sort((a, b) => b[1] - a[1]),
      emojiUsage: Array.from(emojiCounts.entries()).sort((a, b) => b[1] - a[1]),
      recommendations: []
    };

    // Добавляем рекомендации
    if (totalMessages > 3000) {
      detailedReport.recommendations.push('Enable conditional logging with ENABLE_DETAILED_LOGGING flag');
    }
    if (functionCallCounts.get('calculatePositionTotalCost') > 100) {
      detailedReport.recommendations.push('Optimize calculatePositionTotalCost function to reduce logging');
    }
    if (highFrequencyMessages.length > 3) {
      detailedReport.recommendations.push('Review and reduce high-frequency log messages');
    }

    console.log('\n📋 Full detailed report saved');
    console.log(JSON.stringify(detailedReport, null, 2));

    // Тест проходит, но выводим результат
    expect(totalMessages).toBeGreaterThan(0);

    if (totalMessages < 1000) {
      console.log('\n✅ SUCCESS: Console logging has been significantly reduced!');
      console.log('🎉 The optimization work appears to be effective.');
    } else {
      console.log('\n⚠️  The page still generates substantial console output.');
      console.log('📝 Consider implementing the recommendations above.');
    }
  });
});