const { chromium } = require('playwright');

async function testFinancialNavigation() {
  console.log('🚀 Starting navigation test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Переходим на главную страницу
    console.log('📍 Navigate to main page');
    await page.goto('http://localhost:5179');
    await page.waitForTimeout(2000);

    // Кликаем на "Финансовые показатели" в левом меню
    console.log('🔍 Click on Financial Indicators in menu');
    
    // Сначала раскроем раздел "Коммерция" если он закрыт
    const commerceSection = await page.locator('span:has-text("Коммерция")').first();
    await commerceSection.click();
    await page.waitForTimeout(1000);

    // Кликаем на "Финансовые показатели"
    const financialLink = await page.locator('a[href="/financial"]');
    await financialLink.click();
    await page.waitForTimeout(2000);

    // Проверяем URL
    const currentURL = page.url();
    console.log('✅ Current URL:', currentURL);
    
    if (currentURL.includes('/financial')) {
      console.log('✅ Navigation to financial page successful!');
      
      // Проверяем наличие блока выбора тендера
      const tenderSelector = await page.locator('text=Выберите тендер').first();
      if (await tenderSelector.isVisible()) {
        console.log('✅ Tender selection block is visible');
      } else {
        console.log('❌ Tender selection block is NOT visible');
      }
      
    } else {
      console.log('❌ Navigation failed. Expected /financial, got:', currentURL);
    }

    // Попробуем выбрать тендер если есть
    console.log('🔍 Looking for tender selection...');
    
    const selectElement = await page.locator('div.ant-select').first();
    if (await selectElement.isVisible()) {
      await selectElement.click();
      await page.waitForTimeout(1000);
      
      // Выберем первый тендер из списка
      const firstOption = await page.locator('.ant-select-item').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForTimeout(5000); // Увеличиваем ожидание для загрузки MarkupEditor
        console.log('✅ Selected first tender');
        
        // Ждем появления контента
        await page.waitForSelector('.financial-action-btn', { timeout: 10000 });
        
        // Проверяем, появилась ли кнопка "Назад к выбору"  
        console.log('🔍 Looking for Back button...');
        const backButton = await page.locator('button:has-text("Назад к выбору")');
        if (await backButton.isVisible()) {
          console.log('✅ Back button is visible!');
          await backButton.click();
          await page.waitForTimeout(2000);
          
          // Проверяем, что вернулись к выбору тендера
          const tenderSelectorAgain = await page.locator('text=Выберите тендер').first();
          if (await tenderSelectorAgain.isVisible()) {
            console.log('✅ Successfully returned to tender selection!');
          } else {
            console.log('❌ Did not return to tender selection');
          }
        } else {
          console.log('❌ Back button is NOT visible');
        }
        
        // Также проверим клик по меню
        console.log('🔍 Test menu click navigation');
        await financialLink.click();
        await page.waitForTimeout(2000);
        
        const newURL = page.url();
        console.log('📍 URL after menu click:', newURL);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await page.waitForTimeout(3000); // Keep browser open for 3 seconds to see result
    await browser.close();
  }
}

testFinancialNavigation();