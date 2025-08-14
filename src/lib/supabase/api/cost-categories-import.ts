import { supabase } from '../client';
import type { Database } from '../types/database';

type CostCategory = Database['public']['Tables']['cost_categories']['Row'];
type DetailCostCategory = Database['public']['Tables']['detail_cost_categories']['Row'];
type Location = Database['public']['Tables']['location']['Row'];

export interface CostCategoryImportData {
  sortOrder: number;
  categoryName: string;
  categoryUnit?: string;
  detailCategoryName: string;
  detailCategoryUnit: string;
  locationName: string;
}

// Группировка данных для оптимизации импорта
interface GroupedImportData {
  categories: Map<string, { name: string; unit?: string; sortOrder: number }>;
  detailCategories: Map<string, { categoryName: string; name: string; unit: string; sortOrder: number }>;
  locations: Map<string, { name: string; sortOrder: number }>;
  mappings: Array<{ detailKey: string; locationName: string }>;
}

// Группировка данных импорта для оптимизации
function groupImportData(data: CostCategoryImportData[]): GroupedImportData {
  const categories = new Map<string, { name: string; unit?: string; sortOrder: number }>();
  const detailCategories = new Map<string, { categoryName: string; name: string; unit: string; sortOrder: number }>();
  const locations = new Map<string, { name: string; sortOrder: number }>();
  const mappings: Array<{ detailKey: string; locationName: string }> = [];

  data.forEach((row) => {
    // Категории - сохраняем нумерацию из первой встреченной строки для каждого имени
    if (!categories.has(row.categoryName)) {
      categories.set(row.categoryName, {
        name: row.categoryName,
        unit: row.categoryUnit,
        sortOrder: row.sortOrder
      });
    }

    // Детальные категории (ключ: категория + детальная категория)
    const detailKey = `${row.categoryName}::${row.detailCategoryName}`;
    if (!detailCategories.has(detailKey)) {
      detailCategories.set(detailKey, {
        categoryName: row.categoryName,
        name: row.detailCategoryName,
        unit: row.detailCategoryUnit,
        sortOrder: row.sortOrder
      });
    }

    // Локации
    if (!locations.has(row.locationName)) {
      locations.set(row.locationName, {
        name: row.locationName,
        sortOrder: row.sortOrder
      });
    }

    // Связи детальная категория -> локация
    mappings.push({
      detailKey,
      locationName: row.locationName
    });
  });

  return { categories, detailCategories, locations, mappings };
}

// Очистка старых данных перед импортом
async function clearOldData() {
  console.log('🗑️ [clearOldData] Clearing old mappings');
  
  try {
    // Удаляем все старые связи - используем простой способ без условия
    const { error: mappingError } = await supabase
      .from('category_location_mapping')
      .delete()
      .gte('created_at', '1970-01-01'); // Удаляем все записи (все созданы после 1970)

    if (mappingError && mappingError.code !== 'PGRST116') {
      console.error('❌ [clearOldData] Failed to clear mappings:', mappingError);
    } else {
      console.log('✅ [clearOldData] Mappings cleared');
    }
  } catch (error) {
    console.log('🔄 [clearOldData] Error clearing mappings, continuing...');
  }
}

// Импорт категорий с перезаписью
export async function importCostCategoriesWithOverwrite(data: CostCategoryImportData[]) {
  console.log('🚀 [importCostCategoriesWithOverwrite] called with:', data.length, 'rows');
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Группируем данные для оптимизации
    const grouped = groupImportData(data);
    console.log('📊 Grouped data:', {
      categories: grouped.categories.size,
      details: grouped.detailCategories.size,
      locations: grouped.locations.size,
      mappings: grouped.mappings.length
    });

    // Очищаем старые связи
    await clearOldData();

    // 1. Создаем/обновляем категории
    const categoryMap = new Map<string, string>(); // name -> id
    for (const [name, catData] of grouped.categories) {
      try {
        // Сначала пробуем создать новую категорию
        const { data: newCategory, error: insertError } = await supabase
          .from('cost_categories')
          .insert({
            name: catData.name,
            code: `CAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: catData.unit ? `Единица измерения: ${catData.unit}` : null,
            sort_order: catData.sortOrder,
            is_active: true
          })
          .select()
          .single();
        
        if (newCategory && !insertError) {
          categoryMap.set(name, newCategory.id);
          console.log('✅ New category created:', newCategory.name, 'sort_order:', newCategory.sort_order);
          continue;
        }
        
        // Если не получилось создать (возможно уже существует), ищем существующую
        const { data: existingCategory, error: selectError } = await supabase
          .from('cost_categories')
          .select('*')
          .eq('name', catData.name)
          .maybeSingle();

        if (existingCategory && !selectError) {
          // Обновляем существующую категорию
          const { data: updatedCategory, error: updateError } = await supabase
            .from('cost_categories')
            .update({
              description: catData.unit ? `Единица измерения: ${catData.unit}` : null,
              sort_order: catData.sortOrder,
              is_active: true
            })
            .eq('id', existingCategory.id)
            .select()
            .single();
          
          if (updatedCategory && !updateError) {
            categoryMap.set(name, updatedCategory.id);
            console.log('✅ Category updated:', updatedCategory.name, 'sort_order:', updatedCategory.sort_order);
          } else {
            // Если обновление не получилось, используем существующий ID
            categoryMap.set(name, existingCategory.id);
            console.log('✅ Category found (update failed, using existing):', existingCategory.name);
          }
        } else {
          console.error('❌ Failed to create/find category:', name, insertError, selectError);
          results.errors.push(`Категория "${name}": не удалось создать или найти`);
        }
      } catch (error) {
        console.error('❌ Unexpected error for category:', name, error);
        results.errors.push(`Категория "${name}": неожиданная ошибка`);
      }
    }

    // 2. Создаем/обновляем детальные категории
    const detailCategoryMap = new Map<string, string>(); // key -> id
    for (const [key, detailData] of grouped.detailCategories) {
      const categoryId = categoryMap.get(detailData.categoryName);
      if (!categoryId) {
        console.error('❌ Category not found for detail:', detailData.categoryName);
        console.log('📊 Available categories:', Array.from(categoryMap.keys()));
        continue;
      }

      try {
        // Сначала пробуем создать новую детальную категорию
        const { data: newDetail, error: insertError } = await supabase
          .from('detail_cost_categories')
          .insert({
            category_id: categoryId,
            name: detailData.name,
            code: `DET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            unit: detailData.unit,
            sort_order: detailData.sortOrder,
            base_price: 0,
            is_active: true
          })
          .select()
          .single();
        
        if (newDetail && !insertError) {
          detailCategoryMap.set(key, newDetail.id);
          console.log('✅ New detail category created:', newDetail.name, 'for category:', detailData.categoryName);
          continue;
        }
        
        // Если не получилось создать, ищем существующую
        const { data: existingDetail, error: selectError } = await supabase
          .from('detail_cost_categories')
          .select('*')
          .eq('category_id', categoryId)
          .eq('name', detailData.name)
          .maybeSingle();

        if (existingDetail && !selectError) {
          // Обновляем существующую детальную категорию
          const { data: updatedDetail, error: updateError } = await supabase
            .from('detail_cost_categories')
            .update({
              unit: detailData.unit,
              sort_order: detailData.sortOrder,
              is_active: true
            })
            .eq('id', existingDetail.id)
            .select()
            .single();
          
          if (updatedDetail && !updateError) {
            detailCategoryMap.set(key, updatedDetail.id);
            console.log('✅ Detail category updated:', updatedDetail.name, 'for category:', detailData.categoryName);
          } else {
            // Если обновление не получилось, используем существующий ID
            detailCategoryMap.set(key, existingDetail.id);
            console.log('✅ Detail category found (update failed, using existing):', existingDetail.name);
          }
        } else {
          console.error('❌ Failed to create/find detail category:', key, insertError, selectError);
          results.errors.push(`Детальная категория "${detailData.name}": не удалось создать или найти`);
        }
      } catch (error) {
        console.error('❌ Unexpected error for detail category:', key, error);
        results.errors.push(`Детальная категория "${detailData.name}": неожиданная ошибка`);
      }
    }

    // 3. Создаем/обновляем локации
    const locationMap = new Map<string, string>(); // name -> id
    for (const [name, locData] of grouped.locations) {
      try {
        // Сначала пробуем создать новую локацию
        const { data: newLocation, error: insertError } = await supabase
          .from('location')
          .insert({
            name: locData.name,
            code: `LOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sort_order: locData.sortOrder,
            level: 0,
            is_active: true
          })
          .select()
          .single();
        
        if (newLocation && !insertError) {
          locationMap.set(name, newLocation.id);
          console.log('✅ New location created:', newLocation.name, 'sort_order:', newLocation.sort_order);
          continue;
        }
        
        // Если не получилось создать, ищем существующую
        const { data: existingLocation, error: selectError } = await supabase
          .from('location')
          .select('*')
          .eq('name', locData.name)
          .maybeSingle();

        if (existingLocation && !selectError) {
          // Обновляем существующую локацию
          const { data: updatedLocation, error: updateError } = await supabase
            .from('location')
            .update({
              sort_order: locData.sortOrder,
              is_active: true
            })
            .eq('id', existingLocation.id)
            .select()
            .single();
          
          if (updatedLocation && !updateError) {
            locationMap.set(name, updatedLocation.id);
            console.log('✅ Location updated:', updatedLocation.name, 'sort_order:', updatedLocation.sort_order);
          } else {
            // Если обновление не получилось, используем существующий ID
            locationMap.set(name, existingLocation.id);
            console.log('✅ Location found (update failed, using existing):', existingLocation.name);
          }
        } else {
          console.error('❌ Failed to create/find location:', name, insertError, selectError);
          results.errors.push(`Локация "${name}": не удалось создать или найти`);
        }
      } catch (error) {
        console.error('❌ Unexpected error for location:', name, error);
        results.errors.push(`Локация "${name}": неожиданная ошибка`);
      }
    }

    // 4. Создаем связи детальная категория -> локация
    console.log('📊 Creating mappings:');
    console.log('  - Detail categories:', detailCategoryMap.size);
    console.log('  - Locations:', locationMap.size);
    console.log('  - Mappings to create:', grouped.mappings.length);
    
    const uniqueMappings = new Map<string, boolean>();
    let mappingCount = 0;
    
    for (const mapping of grouped.mappings) {
      const detailId = detailCategoryMap.get(mapping.detailKey);
      const locationId = locationMap.get(mapping.locationName);

      if (!detailId || !locationId) {
        console.error('❌ Missing IDs for mapping:', {
          detailKey: mapping.detailKey,
          locationName: mapping.locationName,
          hasDetailId: !!detailId,
          hasLocationId: !!locationId
        });
        console.log('📊 Available detail categories:', Array.from(detailCategoryMap.keys()));
        console.log('📊 Available locations:', Array.from(locationMap.keys()));
        continue;
      }

      // Проверяем уникальность связи
      const mappingKey = `${detailId}::${locationId}`;
      if (uniqueMappings.has(mappingKey)) {
        console.log('⏭️ Skipping duplicate mapping:', mapping.detailKey, '->', mapping.locationName);
        continue; // Пропускаем дубликаты
      }
      uniqueMappings.set(mappingKey, true);

      try {
        // Сначала пробуем создать новую связь
        const { error: insertError } = await supabase
          .from('category_location_mapping')
          .insert({
            detail_category_id: detailId,
            location_id: locationId,
            quantity: 0,
            unit_price: 0,
            is_active: true
          });

        if (!insertError) {
          mappingCount++;
          console.log('✅ New mapping created:', mapping.detailKey, '->', mapping.locationName);
          results.success++;
        } else {
          // Если не получилось создать (возможно уже существует), пытаемся обновить
          const { error: updateError } = await supabase
            .from('category_location_mapping')
            .update({
              quantity: 0,
              unit_price: 0,
              is_active: true
            })
            .eq('detail_category_id', detailId)
            .eq('location_id', locationId);

          if (!updateError) {
            mappingCount++;
            console.log('✅ Existing mapping updated:', mapping.detailKey, '->', mapping.locationName);
            results.success++;
          } else {
            console.error('❌ Failed to create/update mapping:', mapping, insertError, updateError);
            results.errors.push(`Связь "${mapping.detailKey}" -> "${mapping.locationName}": не удалось создать`);
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error creating mapping:', mapping, error);
        results.errors.push(`Связь "${mapping.detailKey}" -> "${mapping.locationName}": неожиданная ошибка`);
      }
    }
    
    console.log('📊 Total mappings processed:', mappingCount);

    console.log('✅ [importCostCategoriesWithOverwrite] completed:', results);
    return results;

  } catch (error) {
    console.error('❌ [importCostCategoriesWithOverwrite] unexpected error:', error);
    results.failed = data.length;
    results.errors.push(`Общая ошибка: ${error}`);
    return results;
  }
}

// Получение связанных локаций для детальной категории
export async function getLocationsForDetailCategory(detailCategoryId: string): Promise<any[]> {
  console.log('🚀 [getLocationsForDetailCategory] called with:', detailCategoryId);
  
  try {
    const { data, error } = await supabase
      .from('category_location_mapping')
      .select(`
        location_id,
        location:location!category_location_mapping_location_id_fkey (
          id,
          name,
          code,
          description,
          sort_order
        )
      `)
      .eq('detail_category_id', detailCategoryId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [getLocationsForDetailCategory] failed:', error);
      throw error;
    }

    console.log('✅ [getLocationsForDetailCategory] found:', data?.length, 'locations');
    
    // Фильтруем null значения и возвращаем только location объекты
    const locations = data?.map(item => item.location).filter(Boolean) || [];
    
    // Сортируем по sort_order
    locations.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    return locations;
  } catch (error) {
    console.error('❌ [getLocationsForDetailCategory] error:', error);
    return [];
  }
}