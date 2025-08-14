import { supabase } from '../client';
import { handleSupabaseError } from './utils';
import type {
  CostCategory,
  DetailCostCategory,
  Location,
  CategoryLocationMapping,
  CreateCostCategoryInput,
  CreateDetailCostCategoryInput,
  CreateLocationInput,
  CreateCategoryLocationMappingInput,
  ImportCostRow,
  ParsedImportData,
  ImportResult
} from '../types/new-cost-structure';

export const costStructureApiFixed = {
  /**
   * Парсинг данных из Excel файла
   * Структура столбцов:
   * 1-3: Категория (код, название, описание)
   * 4-5: Детализация (код, название)
   * 6: Локация (название)
   * 7-10: Дополнительные данные (количество, цена, единица измерения и т.д.)
   */
  parseImportData(rows: ImportCostRow[]): ParsedImportData {
    console.log('🚀 [parseImportData] Parsing rows:', rows.length);
    
    const categories = new Map<string, CreateCostCategoryInput>();
    const detailCategories = new Map<string, CreateDetailCostCategoryInput & { 
      rowNumber: number;
      categoryCode: string; // Добавляем код категории для связывания
    }>();
    const locations = new Map<string, CreateLocationInput>();
    const mappings: ParsedImportData['mappings'] = [];
    
    // Отслеживаем текущую категорию для связывания
    let currentCategoryCode: string | null = null;
    
    rows.forEach((row, index) => {
      console.log(`📝 Processing row ${index + 1}:`, {
        category: `${row.categoryCode} - ${row.categoryName}`,
        detail: `${row.detailCode} - ${row.detailName}`,
        location: `${row.locationCode} - ${row.locationName}`
      });
      
      // 1. Обработка категории (столбцы 1-3)
      if (row.categoryCode && row.categoryName) {
        currentCategoryCode = row.categoryCode;
        if (!categories.has(row.categoryCode)) {
          categories.set(row.categoryCode, {
            code: row.categoryCode,
            name: row.categoryName,
            description: row.categoryDescription || undefined,
            sort_order: categories.size,
            is_active: true
          });
          console.log(`✅ Category added: ${row.categoryName}`);
        }
      }
      
      // 2. Обработка детализации (столбцы 4-5) - привязка к текущей категории
      if (row.detailCode && row.detailName && currentCategoryCode) {
        const detailKey = `${currentCategoryCode}_${row.detailCode}`;
        if (!detailCategories.has(detailKey)) {
          detailCategories.set(detailKey, {
            category_id: '', // Будет заполнен после создания категорий
            code: row.detailCode,
            name: row.detailName,
            unit: row.detailUnit || 'шт',
            base_price: row.detailPrice || 0,
            description: undefined,
            sort_order: detailCategories.size,
            is_active: true,
            rowNumber: row.rowNumber,
            categoryCode: currentCategoryCode // Сохраняем код категории
          });
          console.log(`✅ Detail added: ${row.detailName} (category: ${currentCategoryCode})`);
        }
      }
      
      // 3. Обработка локации (столбец 6)
      // Используем название как код, если код не указан
      const locationCode = row.locationCode || row.locationName;
      if (locationCode && row.locationName) {
        if (!locations.has(locationCode)) {
          locations.set(locationCode, {
            code: locationCode,
            name: row.locationName,
            description: undefined,
            parent_id: undefined,
            sort_order: locations.size,
            level: 1,
            is_active: true
          });
          console.log(`✅ Location added: ${row.locationName}`);
        }
      }
      
      // 4. Создание связи (каждая строка с детализацией и локацией = связь)
      if (row.detailCode && row.detailName && row.locationName && currentCategoryCode) {
        const mapping = {
          rowNumber: row.rowNumber,
          categoryCode: currentCategoryCode,
          detailCategoryCode: row.detailCode,
          detailCategoryName: row.detailName,
          locationCode: locationCode,
          locationName: row.locationName,
          quantity: row.quantity || 1,
          unitPrice: row.unitPrice || row.detailPrice || 0,
          discount: row.discount || 0
        };
        mappings.push(mapping);
        console.log(`🔗 Mapping created: ${row.detailName} -> ${row.locationName}`);
      }
    });
    
    console.log('✅ [parseImportData] Summary:', {
      categories: categories.size,
      detailCategories: detailCategories.size,
      locations: locations.size,
      mappings: mappings.length
    });
    
    return { categories, detailCategories, locations, mappings };
  },

  /**
   * Импорт структуры затрат из Excel
   */
  async importCostStructure(
    rows: ImportCostRow[], 
    onProgress?: (progress: number, message: string) => void
  ): Promise<ImportResult> {
    console.log('🚀 [importCostStructure] Starting import with rows:', rows.length);
    
    const result: ImportResult = {
      success: false,
      categoriesCreated: 0,
      detailCategoriesCreated: 0,
      locationsCreated: 0,
      mappingsCreated: 0,
      errors: []
    };
    
    try {
      onProgress?.(10, 'Парсинг данных...');
      
      // Парсинг данных
      const parsedData = this.parseImportData(rows);
      
      onProgress?.(20, `Создание ${parsedData.categories.size} категорий...`);
      
      // Шаг 1: Создание категорий
      const categoryIdMap = new Map<string, string>();
      if (parsedData.categories.size > 0) {
        const categoriesArray = Array.from(parsedData.categories.values());
        
        // Используем UPSERT для избежания дубликатов
        const { data: createdCategories, error } = await supabase
          .from('cost_categories')
          .upsert(categoriesArray, { 
            onConflict: 'code',
            ignoreDuplicates: false 
          })
          .select();
        
        if (error) throw error;
        
        result.categoriesCreated = createdCategories?.length || 0;
        
        // Создаем маппинг код -> id
        createdCategories?.forEach(cat => {
          categoryIdMap.set(cat.code, cat.id);
          console.log(`📁 Category created: ${cat.name} (${cat.id})`);
        });
      }
      
      onProgress?.(40, `Создание ${parsedData.detailCategories.size} детальных категорий...`);
      
      // Шаг 2: Создание детальных категорий
      const detailIdMap = new Map<string, string>();
      if (parsedData.detailCategories.size > 0) {
        const detailCategoriesArray = Array.from(parsedData.detailCategories.values())
          .map(detail => {
            // Привязываем к категории по коду
            const categoryId = categoryIdMap.get(detail.categoryCode);
            if (!categoryId) {
              console.warn(`⚠️ Category not found for detail: ${detail.name} (category code: ${detail.categoryCode})`);
              return null;
            }
            return {
              ...detail,
              category_id: categoryId
            };
          })
          .filter(d => d !== null);
        
        if (detailCategoriesArray.length > 0) {
          const { data: createdDetails, error } = await supabase
            .from('detail_cost_categories')
            .upsert(detailCategoriesArray, { 
              onConflict: 'code',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) throw error;
          
          result.detailCategoriesCreated = createdDetails?.length || 0;
          
          // Создаем маппинг код -> id и имя -> id
          createdDetails?.forEach(detail => {
            detailIdMap.set(detail.code, detail.id);
            detailIdMap.set(detail.name.toLowerCase().trim(), detail.id);
            console.log(`📋 Detail created: ${detail.name} (${detail.id})`);
          });
        }
      }
      
      onProgress?.(60, `Создание ${parsedData.locations.size} локаций...`);
      
      // Шаг 3: Создание локаций
      const locationIdMap = new Map<string, string>();
      if (parsedData.locations.size > 0) {
        const locationsArray = Array.from(parsedData.locations.values());
        
        const { data: createdLocations, error } = await supabase
          .from('location')
          .upsert(locationsArray, { 
            onConflict: 'code',
            ignoreDuplicates: false 
          })
          .select();
        
        if (error) throw error;
        
        result.locationsCreated = createdLocations?.length || 0;
        
        // Создаем маппинг код -> id и имя -> id
        createdLocations?.forEach(loc => {
          locationIdMap.set(loc.code, loc.id);
          locationIdMap.set(loc.name.toLowerCase().trim(), loc.id);
          console.log(`📍 Location created: ${loc.name} (${loc.id})`);
        });
      }
      
      onProgress?.(80, `Создание ${parsedData.mappings.length} связей...`);
      
      // Шаг 4: Создание связей категория-локация
      if (parsedData.mappings.length > 0) {
        const mappingsToCreate = parsedData.mappings
          .map(m => {
            // Ищем ID детальной категории
            let detailId = detailIdMap.get(m.detailCategoryCode);
            if (!detailId) {
              detailId = detailIdMap.get(m.detailCategoryName.toLowerCase().trim());
            }
            
            // Ищем ID локации
            let locationId = locationIdMap.get(m.locationCode);
            if (!locationId) {
              locationId = locationIdMap.get(m.locationName.toLowerCase().trim());
            }
            
            if (!detailId || !locationId) {
              console.warn(`⚠️ Cannot create mapping: detail="${m.detailCategoryName}" (${detailId}), location="${m.locationName}" (${locationId})`);
              return null;
            }
            
            return {
              detail_category_id: detailId,
              location_id: locationId,
              quantity: m.quantity,
              unit_price: m.unitPrice,
              discount_percent: m.discount,
              is_active: true
            };
          })
          .filter(m => m !== null);
        
        console.log(`🔗 Creating ${mappingsToCreate.length} mappings out of ${parsedData.mappings.length} requested`);
        
        if (mappingsToCreate.length > 0) {
          const { data: createdMappings, error } = await supabase
            .from('category_location_mapping')
            .upsert(mappingsToCreate, { 
              onConflict: 'detail_category_id,location_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) throw error;
          
          result.mappingsCreated = createdMappings?.length || 0;
          console.log(`✅ Created ${result.mappingsCreated} mappings`);
        }
      }
      
      onProgress?.(100, 'Импорт завершен!');
      result.success = true;
      
    } catch (error) {
      console.error('❌ [importCostStructure] Import failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      onProgress?.(100, `Ошибка импорта: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('📊 [importCostStructure] Final result:', result);
    return result;
  }
};