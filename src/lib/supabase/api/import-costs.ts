// API для импорта затрат на строительство
import { supabase } from '../client';

export interface ImportRow {
  orderNum: number | null;      // Столбец 1: №
  categoryName: string | null;  // Столбец 2: Категория
  categoryUnit: string | null;  // Столбец 3: Ед.изм. категории
  detailName: string | null;    // Столбец 4: Вид затрат
  detailUnit: string | null;    // Столбец 5: Ед.изм. детали
  locationName: string | null;  // Столбец 6: Локализация
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  categoriesCreated: number;
  detailsCreated: number;
  locationsCreated: number;
}

// Импорт данных из Excel в правильные таблицы
export async function importConstructionCosts(rows: ImportRow[]): Promise<ImportResult> {
  console.log('🚀 [importConstructionCosts] Starting import with', rows.length, 'rows');
  console.log('📋 First 3 rows received:', rows.slice(0, 3));
  
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    categoriesCreated: 0,
    detailsCreated: 0,
    locationsCreated: 0
  };

  // 1. Загружаем справочники
  console.log('📡 Loading reference data...');
  
  const [locationsRes, categoriesRes, detailsRes] = await Promise.all([
    supabase.from('location').select('*'),
    supabase.from('cost_categories').select('*'),
    supabase.from('detail_cost_categories').select('*')
  ]);

  const locations = locationsRes.data || [];
  const categories = categoriesRes.data || [];
  const details = detailsRes.data || [];

  console.log('✅ Loaded:', {
    locations: locations.length,
    categories: categories.length,
    details: details.length
  });

  // Карты для быстрого поиска
  const categoryMap = new Map<string, string>(); // name -> id
  const locationMap = new Map<string, string>(); // name -> id

  // Заполняем карты существующих данных
  categories.forEach(c => {
    if (c.name) categoryMap.set(c.name, c.id);
  });
  
  locations.forEach(l => {
    const keys = [];
    if (l.country) keys.push(l.country);
    if (l.region) keys.push(l.region);
    if (l.city) keys.push(l.city);
    const locationKey = keys.join(', ');
    if (locationKey) locationMap.set(locationKey, l.id);
    
    // Также создаем ключи для поиска по отдельным полям
    if (l.country) locationMap.set(l.country, l.id);
    if (l.city) locationMap.set(l.city, l.id);
  });

  // 2. Анализируем структуру файла
  console.log('📋 Analyzing file structure...');
  
  // Выводим первые несколько строк для отладки
  console.log('📊 First 10 rows for debugging:');
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`Row ${i + 1}:`, {
      col1_num: row.orderNum,
      col2_category: row.categoryName,
      col3_catUnit: row.categoryUnit,
      col4_detail: row.detailName,
      col5_detUnit: row.detailUnit,
      col6_location: row.locationName
    });
  });

  // 3. Определяем стратегию импорта
  // Проверяем, есть ли категории в файле
  const hasCategories = rows.some(row => row.categoryName && row.categoryName.trim() && row.categoryName !== 'Категория' && row.categoryName !== 'Категория затрат');
  
  console.log('📊 File analysis:', {
    hasCategories,
    totalRows: rows.length,
    rowsWithDetails: rows.filter(r => r.detailName && r.detailName.trim()).length,
    rowsWithLocations: rows.filter(r => r.locationName && r.locationName.trim()).length
  });
  
  if (!hasCategories) {
    console.log('⚠️ No categories found in file. Creating default category.');
    
    // Создаем дефолтную категорию если её нет
    let defaultCategoryId = categoryMap.get('Общие затраты');
    
    if (!defaultCategoryId) {
      const insertResult = await supabase
        .from('cost_categories')
        .insert({
          name: 'Общие затраты',
          description: 'Категория для импортированных затрат',
          unit: null
        });
      
      let newCategory = null;
      let catError = insertResult.error;
      
      if (!catError) {
        const selectResult = await supabase
          .from('cost_categories')
          .select('*')
          .eq('name', 'Общие затраты')
          .limit(1);
        
        if (selectResult.data && selectResult.data.length > 0) {
          newCategory = selectResult.data[0];
        }
        catError = selectResult.error;
      }
        
      if (newCategory) {
        defaultCategoryId = newCategory.id;
        categoryMap.set('Общие затраты', newCategory.id);
        result.categoriesCreated++;
        console.log('✅ Created default category: Общие затраты');
      }
    }
    
    // Импортируем все детали в дефолтную категорию
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Пропускаем заголовки и пустые строки
      if (row.detailName === 'Вид затрат' || (!row.detailName && !row.categoryName)) {
        continue;
      }
      
      // Если есть деталь, импортируем её
      if (row.detailName && row.detailName.trim() && defaultCategoryId) {
        await processDetail(row, i, defaultCategoryId, 'Общие затраты', 
          details, locations, locationMap, result);
      }
    }
  } else {
    // Стандартная обработка с категориями
    let currentCategoryId: string | null = null;
    let currentCategoryName: string | null = null;
    
    console.log('📋 Processing with categories...');
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Пропускаем заголовки
      if (row.categoryName === 'Категория' || row.categoryName === 'Категория затрат' || 
          row.detailName === 'Вид затрат') {
        console.log(`⏭️ Skipping header row ${i + 1}`);
        continue;
      }
      
      // Пропускаем полностью пустые строки
      if (!row.categoryName && !row.detailName && !row.locationName) {
        continue;
      }
      
      try {
        // Обрабатываем категорию (если есть)
        if (row.categoryName && row.categoryName.trim()) {
          currentCategoryName = row.categoryName.trim();
          currentCategoryId = categoryMap.get(currentCategoryName) || null;
          
          console.log(`📂 Row ${i + 1} has category: ${currentCategoryName}`);
          
          if (!currentCategoryId) {
            console.log(`🔍 Creating new category: ${currentCategoryName}`);
            
            // Создаем категорию
            console.log(`📝 Attempting to create category:`, {
              name: currentCategoryName,
              description: row.categoryUnit ? `Единица измерения: ${row.categoryUnit}` : null
            });
            
            const insertResult = await supabase
              .from('cost_categories')
              .insert({
                name: currentCategoryName,
                unit: row.categoryUnit || null,
                description: null
              });
            
            console.log(`📦 Insert result:`, insertResult);
            
            let newCategory = null;
            let catError = insertResult.error;
            
            // Если вставка успешна, получаем созданную запись
            if (!catError) {
              const selectResult = await supabase
                .from('cost_categories')
                .select('*')
                .eq('name', currentCategoryName)
                .limit(1);
              
              console.log(`📦 Select result:`, selectResult);
              
              // Берем первый элемент из массива
              if (selectResult.data && selectResult.data.length > 0) {
                newCategory = selectResult.data[0];
              }
              catError = selectResult.error;
            }
              
            console.log(`📦 Category creation result:`, { data: newCategory, error: catError });
              
            if (catError) {
              console.error(`❌ Error creating category:`, catError);
              
              // Если ошибка из-за дубликата, попробуем найти существующую
              const { data: existingCats } = await supabase
                .from('cost_categories')
                .select('*')
                .eq('name', currentCategoryName)
                .limit(1);
                
              if (existingCats && existingCats.length > 0) {
                const existingCat = existingCats[0];
                currentCategoryId = existingCat.id;
                categoryMap.set(currentCategoryName, existingCat.id);
                console.log(`✅ Found existing category: ${currentCategoryName} (ID: ${existingCat.id})`);
              } else {
                result.errors.push(`Строка ${i + 1}: Не удалось создать категорию ${currentCategoryName}`);
                currentCategoryId = null;
                continue;
              }
            } else if (newCategory) {
              currentCategoryId = newCategory.id;
              categoryMap.set(currentCategoryName, newCategory.id);
              categories.push(newCategory);
              result.categoriesCreated++;
              console.log(`✅ Created category: ${currentCategoryName} (ID: ${currentCategoryId})`);
            }
          } else {
            console.log(`📂 Using existing category: ${currentCategoryName} (ID: ${currentCategoryId})`);
          }
          
          // ВАЖНО: Убедимся, что categoryId установлен
          console.log(`📌 Current categoryId after processing: ${currentCategoryId}`);
          
          // Если в этой же строке нет детали, переходим к следующей строке
          if (!row.detailName || !row.detailName.trim()) {
            result.success++;
            continue;
          }
        }
        
        // Обрабатываем деталь (если есть)
        if (row.detailName && row.detailName.trim()) {
          console.log(`📝 Row ${i + 1} has detail: ${row.detailName.trim()}, categoryId: ${currentCategoryId}`);
          
          // Если нет текущей категории, пытаемся использовать дефолтную
          if (!currentCategoryId || !currentCategoryName) {
            // Создаем или находим дефолтную категорию
            let defaultCategoryId = categoryMap.get('Общие затраты');
            
            if (!defaultCategoryId) {
              const insertResult = await supabase
                .from('cost_categories')
                .insert({
                  name: 'Общие затраты',
                  description: 'Категория для импортированных затрат',
                  unit: null
                });
              
              let newCategory = null;
              if (!insertResult.error) {
                const selectResult = await supabase
                  .from('cost_categories')
                  .select('*')
                  .eq('name', 'Общие затраты')
                  .limit(1);
                
                if (selectResult.data && selectResult.data.length > 0) {
                  newCategory = selectResult.data[0];
                }
              }
                
              if (newCategory) {
                defaultCategoryId = newCategory.id;
                categoryMap.set('Общие затраты', newCategory.id);
                result.categoriesCreated++;
                console.log('✅ Created default category: Общие затраты');
              }
            }
            
            if (defaultCategoryId) {
              currentCategoryId = defaultCategoryId;
              currentCategoryName = 'Общие затраты';
              console.log(`📂 Using default category for detail: ${row.detailName}`);
            } else {
              console.error(`❌ Cannot create detail without category: ${row.detailName}`);
              result.errors.push(`Строка ${i + 1}: Деталь "${row.detailName}" не может быть создана без категории`);
              result.failed++;
              continue;
            }
          }
          
          await processDetail(row, i, currentCategoryId, currentCategoryName, 
            details, locations, locationMap, result);
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing row ${i + 1}:`, error);
        result.failed++;
        result.errors.push(`Строка ${i + 1}: ${error.message}`);
      }
    }
  }

  console.log('✅ [importConstructionCosts] Import complete:', result);
  return result;
}

// Вспомогательная функция для обработки детали
async function processDetail(
  row: ImportRow,
  rowIndex: number,
  categoryId: string,
  categoryName: string,
  details: any[],
  locations: any[],
  locationMap: Map<string, string>,
  result: ImportResult
) {
  console.log(`📋 [processDetail] Called for row ${rowIndex + 1}:`, {
    detailName: row.detailName,
    detailUnit: row.detailUnit,
    locationName: row.locationName,
    categoryId,
    categoryName
  });
  
  const detailName = row.detailName!.trim();
  const detailUnit = row.detailUnit ? row.detailUnit.trim() : null;
  
  // Обрабатываем локализацию сначала, чтобы получить location_id
  let locationId = null;
  if (row.locationName && row.locationName.trim()) {
    const locationName = row.locationName.trim();
    
    // Пытаемся разобрать строку локализации
    const locationParts = locationName.split(',').map(s => s.trim());
    const locationData: any = {};
    
    if (locationParts.length === 1) {
      // Если одна часть - считаем это страной
      locationData.country = locationParts[0];
    } else if (locationParts.length === 2) {
      // Если две части - город и страна
      locationData.city = locationParts[0];
      locationData.country = locationParts[1];
    } else if (locationParts.length >= 3) {
      // Если три части - город, регион, страна
      locationData.city = locationParts[0];
      locationData.region = locationParts[1];
      locationData.country = locationParts[2];
    }
    
    // Ищем существующую локализацию
    locationId = locationMap.get(locationName);
    
    if (!locationId) {
      console.log(`📍 Creating new location: ${locationName}`);
        
        const insertResult = await supabase
          .from('location')
          .insert(locationData);
          
        let newLocation = null;
        let locError = insertResult.error;
        
        if (!locError) {
          const selectResult = await supabase
            .from('location')
            .select('*')
            .or(`country.eq.${locationData.country || null},city.eq.${locationData.city || null}`)
            .limit(1);
          
          if (selectResult.data && selectResult.data.length > 0) {
            newLocation = selectResult.data[0];
          }
          locError = selectResult.error;
        }
          
        if (!locError && newLocation) {
          locationId = newLocation.id;
          locationMap.set(locationName, newLocation.id);
          locations.push(newLocation);
          result.locationsCreated++;
          console.log(`✅ Created location: ${locationName} (ID: ${locationId})`);
        } else {
          console.error(`❌ Error creating location:`, locError);
        }
    } else {
      console.log(`📍 Using existing location: ${locationName} (ID: ${locationId})`);
    }
  }
  
  // Если location_id не найден - создаем дефолтную локализацию
  if (!locationId) {
    let defaultLocation = locations.find(l => l.country === 'Не указано');
    
    if (!defaultLocation) {
      const insertResult = await supabase
        .from('location')
        .insert({
          country: 'Не указано'
        });
        
      let newLoc = null;
      if (!insertResult.error) {
        const selectResult = await supabase
          .from('location')
          .select('*')
          .eq('country', 'Не указано')
          .limit(1);
        
        if (selectResult.data && selectResult.data.length > 0) {
          newLoc = selectResult.data[0];
        }
      }
        
      if (newLoc) {
        defaultLocation = newLoc;
        locations.push(newLoc);
        locationMap.set('Не указано', newLoc.id);
        locationId = newLoc.id;
        console.log(`✅ Created default location`);
      }
    } else {
      locationId = defaultLocation.id;
    }
  }

  // Проверяем, существует ли уже деталь с таким же именем, категорией И локализацией
  const existingDetail = details.find(d => 
    d.name === detailName && 
    d.cost_category_id === categoryId &&
    d.location_id === locationId
  );
  
  console.log(`🔍 Checking for existing detail:`, {
    detailName,
    detailUnit,
    locationId,
    existingDetail: !!existingDetail,
    totalExistingDetails: details.length
  });
  
  if (!existingDetail) {
    console.log(`🔍 Processing NEW detail: ${detailName} for category: ${categoryName}`);
    
    // Создаем детальную категорию
    console.log(`📦 Creating detail: ${detailName} for category ${categoryName} (ID: ${categoryId})`);
    
    console.log(`📝 Inserting detail with data:`, {
      cost_category_id: categoryId,
      name: detailName,
      unit: detailUnit,
      location_id: locationId,
      unit_cost: null
    });
    
    const insertResult = await supabase
      .from('detail_cost_categories')
      .insert({
        cost_category_id: categoryId,
        name: detailName,
        unit: detailUnit,
        location_id: locationId,
        unit_cost: null
      });
    
    console.log(`📦 Detail insert result:`, insertResult);
    
    let newDetail = null;
    let detError = insertResult.error;
    
    if (!detError) {
      const selectResult = await supabase
        .from('detail_cost_categories')
        .select('*')
        .eq('cost_category_id', categoryId)
        .eq('name', detailName)
        .limit(1);
      
      console.log(`📦 Detail select result:`, selectResult);
      
      if (selectResult.data && selectResult.data.length > 0) {
        newDetail = selectResult.data[0];
      }
      detError = selectResult.error;
    }
      
    if (detError) {
      console.error(`❌ Error creating detail:`, detError);
      result.errors.push(`Строка ${rowIndex + 1}: Не удалось создать деталь ${detailName}: ${detError.message}`);
      result.failed++;
    } else if (newDetail) {
      details.push(newDetail);
      result.detailsCreated++;
      result.success++;
      console.log(`✅ Created detail: ${detailName} with unit: ${detailUnit}`);
    }
  } else {
    console.log(`⏭️ Detail already exists: ${detailName} with location ID: ${locationId}`);
    result.success++;
  }
}