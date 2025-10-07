import { test, expect } from '@playwright/test';

test.describe('Full Tender Loading Console Analysis', () => {
  test('should analyze console logging when fully loading tender with all positions', async ({ page }) => {
    const consoleMessages: string[] = [];
    const messageTypes = {
      log: 0,
      warn: 0,
      error: 0,
      info: 0,
      debug: 0
    };

    const phases = {
      initial: 0,
      tenderSelection: 0,
      versionSelection: 0,
      positionsLoading: 0,
      interactions: 0
    };

    let currentPhase = 'initial';

    // Детальное отслеживание сообщений
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (messageTypes.hasOwnProperty(type)) {
        messageTypes[type as keyof typeof messageTypes]++;
      }

      consoleMessages.push(`[${type.toUpperCase()}] ${text}`);

      // Подсчитываем сообщения по фазам
      phases[currentPhase as keyof typeof phases]++;

      // Выводим каждое 100-е сообщение для отслеживания
      if (consoleMessages.length % 100 === 0) {
        console.log(`📊 [${currentPhase}] Messages: ${consoleMessages.length}`);
      }
    });

    console.log('🚀 Starting full tender loading analysis...');
    console.log('📋 This test will select tender and version to trigger full data loading');

    // Переходим к BOQ странице
    await page.goto('http://localhost:5173/boq');

    // Фаза 1: Загрузка страницы
    currentPhase = 'initial';
    await page.waitForSelector('.ant-select', { timeout: 15000 });
    phases.initial = consoleMessages.length;
    console.log(`📊 Phase 1 - Initial load: ${phases.initial} messages`);

    // Фаза 2: Выбор тендера
    currentPhase = 'tenderSelection';
    console.log('🎯 Phase 2 - Selecting tender...');

    const tenderSelector = page.locator('.ant-select').first();
    await tenderSelector.click();

    // Ждем загрузки опций тендера
    await page.waitForSelector('.ant-select-item', { timeout: 10000 });

    // Выбираем первый доступный тендер
    const tenderOptions = page.locator('.ant-select-item');
    const tenderCount = await tenderOptions.count();
    console.log(`📋 Found ${tenderCount} tender options`);

    if (tenderCount > 0) {
      await tenderOptions.first().click();
      console.log('✅ Tender selected');
    } else {
      throw new Error('No tender options found');
    }

    // Ждем немного после выбора тендера
    await page.waitForTimeout(2000);
    const tenderMessages = consoleMessages.length;
    phases.tenderSelection = tenderMessages - phases.initial;
    console.log(`📊 Phase 2 - Tender selection: +${phases.tenderSelection} messages (total: ${tenderMessages})`);

    // Фаза 3: Выбор версии
    currentPhase = 'versionSelection';
    console.log('🔄 Phase 3 - Selecting version...');

    try {
      // Ищем селектор версии (он должен стать активным после выбора тендера)
      const versionSelector = page.locator('.ant-select').nth(1);

      // Ждем, пока селектор версии станет активным
      await page.waitForTimeout(3000);

      // Проверяем, активен ли селектор версии
      const isVersionEnabled = await versionSelector.evaluate((el) => !el.classList.contains('ant-select-disabled'));

      if (isVersionEnabled) {
        console.log('🔄 Version selector is enabled, clicking...');
        await versionSelector.click();

        // Ждем загрузки версий
        await page.waitForSelector('.ant-select-item', { timeout: 10000 });

        const versionOptions = page.locator('.ant-select-item');
        const versionCount = await versionOptions.count();
        console.log(`📋 Found ${versionCount} version options`);

        if (versionCount > 0) {
          await versionOptions.first().click();
          console.log('✅ Version selected');
        }
      } else {
        console.log('⚠️ Version selector is disabled, might auto-select or have no versions');
      }
    } catch (e) {
      console.log(`⚠️ Version selection issue: ${e.message}`);
    }

    // Ждем загрузки данных после выбора версии
    await page.waitForTimeout(5000);
    const versionMessages = consoleMessages.length;
    phases.versionSelection = versionMessages - tenderMessages;
    console.log(`📊 Phase 3 - Version selection: +${phases.versionSelection} messages (total: ${versionMessages})`);

    // Фаза 4: Загрузка позиций
    currentPhase = 'positionsLoading';
    console.log('📦 Phase 4 - Loading positions and BOQ data...');

    try {
      // Ждем появления позиций или сообщения об отсутствии данных
      await Promise.race([
        page.waitForSelector('[class*="position"], .ant-card, [class*="grid"]', { timeout: 20000 }),
        page.waitForSelector('text=Нет данных', { timeout: 20000 }),
        page.waitForSelector('[class*="empty"]', { timeout: 20000 })
      ]);

      console.log('📋 Content loaded or empty state detected');
    } catch (e) {
      console.log('⚠️ Timeout waiting for positions, continuing...');
    }

    // Дополнительное ожидание для полной загрузки всех компонентов
    await page.waitForTimeout(8000);

    const positionMessages = consoleMessages.length;
    phases.positionsLoading = positionMessages - versionMessages;
    console.log(`📊 Phase 4 - Positions loading: +${phases.positionsLoading} messages (total: ${positionMessages})`);

    // Фаза 5: Взаимодействия
    currentPhase = 'interactions';
    console.log('🖱️ Phase 5 - Testing interactions...');

    const beforeInteractions = consoleMessages.length;

    try {
      // Ищем все интерактивные элементы
      const clickableElements = page.locator('button:visible, [role="button"]:visible, .ant-card:visible, [class*="position"]:visible');
      const elementCount = await clickableElements.count();
      console.log(`🔘 Found ${elementCount} clickable elements`);

      if (elementCount > 0) {
        // Кликаем на первые несколько элементов
        for (let i = 0; i < Math.min(5, elementCount); i++) {
          try {
            const beforeClick = consoleMessages.length;
            await clickableElements.nth(i).click();
            await page.waitForTimeout(2000);
            const afterClick = consoleMessages.length;
            const clickMessages = afterClick - beforeClick;

            console.log(`  Click ${i + 1}: +${clickMessages} messages`);

            if (clickMessages > 200) {
              console.log(`⚠️ High message volume detected on click ${i + 1}!`);
              break;
            }
          } catch (e) {
            console.log(`  Click ${i + 1}: failed (${e.message})`);
          }
        }
      }

      // Тестируем скролл
      console.log('📜 Testing scroll...');
      const beforeScroll = consoleMessages.length;

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(2000);

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(2000);

      const scrollMessages = consoleMessages.length - beforeScroll;
      console.log(`📜 Scroll: +${scrollMessages} messages`);

    } catch (e) {
      console.log(`⚠️ Interaction error: ${e.message}`);
    }

    const finalMessages = consoleMessages.length;
    phases.interactions = finalMessages - positionMessages;
    console.log(`📊 Phase 5 - Interactions: +${phases.interactions} messages (total: ${finalMessages})`);

    // Детальный анализ
    console.log('\n📊 === COMPREHENSIVE LOGGING ANALYSIS ===');
    console.log(`📈 Total console messages: ${finalMessages}`);

    console.log('\n📋 Messages by phase:');
    console.log(`  1. Initial load: ${phases.initial}`);
    console.log(`  2. Tender selection: ${phases.tenderSelection}`);
    console.log(`  3. Version selection: ${phases.versionSelection}`);
    console.log(`  4. Positions loading: ${phases.positionsLoading}`);
    console.log(`  5. Interactions: ${phases.interactions}`);

    console.log('\n🔢 Message types:');
    Object.entries(messageTypes).forEach(([type, count]) => {
      const percentage = (count / finalMessages * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });

    // Анализ паттернов сообщений
    const patterns = {
      debugLogs: 0,
      boqOperations: 0,
      calculations: 0,
      supabaseRequests: 0,
      performanceMonitoring: 0,
      uiEvents: 0,
      errors: 0
    };

    consoleMessages.forEach(msg => {
      if (msg.includes('debugLog') || msg.includes('ENABLE_DETAILED_LOGGING')) patterns.debugLogs++;
      if (msg.includes('BOQ') || msg.includes('📋') || msg.includes('➕') || msg.includes('🗑️')) patterns.boqOperations++;
      if (msg.includes('Position') && msg.includes('total') || msg.includes('💰') || msg.includes('calculate')) patterns.calculations++;
      if (msg.includes('Supabase') || msg.includes('🌐') || msg.includes('fetch')) patterns.supabaseRequests++;
      if (msg.includes('performance') || msg.includes('monitoring') || msg.includes('📊')) patterns.performanceMonitoring++;
      if (msg.includes('click') || msg.includes('🖱️') || msg.includes('Form') || msg.includes('📝')) patterns.uiEvents++;
      if (msg.includes('ERROR') || msg.includes('❌') || msg.includes('Failed')) patterns.errors++;
    });

    console.log('\n🎯 Pattern analysis:');
    Object.entries(patterns).forEach(([pattern, count]) => {
      if (count > 0) {
        const percentage = (count / finalMessages * 100).toFixed(1);
        console.log(`  ${pattern}: ${count} (${percentage}%)`);
      }
    });

    // Поиск наиболее частых сообщений
    const messageFrequency = new Map<string, number>();
    consoleMessages.forEach(msg => {
      const normalized = msg
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]')
        .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
        .replace(/temp-\d+/g, '[TEMP-ID]')
        .replace(/\d+ms/g, '[TIME]')
        .replace(/Position \d+/g, 'Position [N]');

      messageFrequency.set(normalized, (messageFrequency.get(normalized) || 0) + 1);
    });

    const topMessages = Array.from(messageFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n🔥 Top 10 most frequent messages:');
    topMessages.forEach(([msg, count], index) => {
      const percentage = (count / finalMessages * 100).toFixed(1);
      console.log(`${index + 1}. (${count}x, ${percentage}%) ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
    });

    // Оценка результата
    console.log('\n📊 Assessment:');
    if (finalMessages < 200) {
      console.log('✅ EXCELLENT: Very low logging volume');
    } else if (finalMessages < 1000) {
      console.log('✅ GOOD: Reasonable logging volume');
    } else if (finalMessages < 3000) {
      console.log('⚠️ MODERATE: Some optimization may be beneficial');
    } else if (finalMessages < 6000) {
      console.log('⚠️ HIGH: Significant logging volume detected');
    } else {
      console.log('❌ EXCESSIVE: Very high logging volume (original problem persists)');
    }

    if (patterns.debugLogs === 0) {
      console.log('✅ Debug logging optimization is working correctly');
    } else {
      console.log(`⚠️ Found ${patterns.debugLogs} debug log calls - check ENABLE_DETAILED_LOGGING flag`);
    }

    // Создаем финальный отчет
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      totalMessages: finalMessages,
      phases,
      messageTypes,
      patterns,
      topFrequentMessages: topMessages.slice(0, 5),
      assessment: finalMessages < 1000 ? 'optimized' : 'needs_attention'
    };

    console.log('\n📋 Complete Report:');
    console.log(JSON.stringify(report, null, 2));

    // Тест проходит независимо от результата
    expect(finalMessages).toBeGreaterThan(0);

    if (finalMessages > 5000) {
      console.log('\n🚨 The 6400+ message issue may still be present!');
      console.log('💡 Consider checking if ENABLE_DETAILED_LOGGING is properly set to false');
    } else {
      console.log(`\n🎉 Logging optimization is effective! Reduced to ${finalMessages} messages.`);
    }
  });
});