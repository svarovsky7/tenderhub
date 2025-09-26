import { supabase } from '../client';
import type { Database } from '../types/database';

type CostCategory = Database['public']['Tables']['cost_categories']['Row'];
type DetailCostCategory = Database['public']['Tables']['detail_cost_categories']['Row'];
type Location = Database['public']['Tables']['location']['Row'];

export interface CostCategoryImportData {
  categoryName: string;
  categoryUnit?: string;
  detailCategoryName: string;
  detailCategoryUnit: string;
  locationName: string;
}

// Получение всех категорий затрат
export async function getCostCategories() {
  console.log('🚀 [getCostCategories] called');
  
  const { data, error } = await supabase
    .from('cost_categories')
    .select('*');

  if (error) {
    console.error('❌ [getCostCategories] failed:', error);
    throw error;
  }

  console.log('✅ [getCostCategories] completed:', data?.length, 'categories');
  return data;
}

// Получение детальных категорий
export async function getDetailCostCategories(categoryId?: string) {
  console.log('🚀 [getDetailCostCategories] called with:', { categoryId });
  
  let query = supabase
    .from('detail_cost_categories')
    .select(`
      *,
      cost_categories!inner(
        id,
        name,
        code
      )
    `);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [getDetailCostCategories] failed:', error);
    throw error;
  }

  console.log('✅ [getDetailCostCategories] completed:', data?.length, 'detail categories');
  return data;
}

// Получение локаций
export async function getLocations(parentId?: string) {
  console.log('🚀 [getLocations] called with:', { parentId });

  let query = supabase
    .from('location')
    .select('*');

  if (parentId === null) {
    query = query.is('parent_id', null);
  } else if (parentId) {
    query = query.eq('parent_id', parentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [getLocations] failed:', error);
    throw error;
  }

  console.log('✅ [getLocations] completed:', data?.length, 'locations');
  return data;
}

// Batch load all categories and locations for Excel export
export async function getAllCategoriesAndLocations() {
  console.log('🚀 [getAllCategoriesAndLocations] Starting batch load...');
  const startTime = performance.now();

  try {
    // Load all data in parallel
    const [categories, detailCategories, locations] = await Promise.all([
      supabase
        .from('cost_categories')
        .select('*'),
      supabase
        .from('detail_cost_categories')
        .select('*'),
      supabase
        .from('location')
        .select('*')
    ]);

    if (categories.error) throw categories.error;
    if (detailCategories.error) throw detailCategories.error;
    if (locations.error) throw locations.error;

    // Create Maps for fast access by ID
    const categoryMap = new Map();
    const detailCategoryMap = new Map();
    const locationMap = new Map();

    categories.data?.forEach(cat => categoryMap.set(cat.id, cat));
    detailCategories.data?.forEach(detail => detailCategoryMap.set(detail.id, detail));
    locations.data?.forEach(loc => locationMap.set(loc.id, loc));

    const loadTime = performance.now() - startTime;
    console.log(`✅ [getAllCategoriesAndLocations] Loaded in ${loadTime.toFixed(0)}ms:`,
      `${categories.data?.length || 0} categories,`,
      `${detailCategories.data?.length || 0} detail categories,`,
      `${locations.data?.length || 0} locations`);

    return {
      categories: categories.data || [],
      detailCategories: detailCategories.data || [],
      locations: locations.data || [],
      categoryMap,
      detailCategoryMap,
      locationMap
    };
  } catch (error) {
    console.error('❌ [getAllCategoriesAndLocations] failed:', error);
    throw error;
  }
}

// Создание или получение категории затрат
async function upsertCostCategory(name: string, unit?: string): Promise<CostCategory | null> {
  console.log('🚀 [upsertCostCategory] called with:', { name, unit });
  
  try {
    // Проверяем существование
    const { data: existing, error: selectError } = await supabase
      .from('cost_categories')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      console.log('✅ [upsertCostCategory] found existing:', existing.id);
      return existing;
    }

    // Если ошибка не "PGRST116" (not found), то это реальная ошибка
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [upsertCostCategory] select failed:', selectError);
      throw selectError;
    }

    // Создаем новую категорию
    const code = `CAT-${Date.now()}`;
    const { data, error } = await supabase
      .from('cost_categories')
      .insert({
        code,
        name,
        description: unit ? `Единица измерения: ${unit}` : undefined
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [upsertCostCategory] insert failed:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ [upsertCostCategory] no data returned after insert');
      throw new Error('Failed to create category: no data returned');
    }

    console.log('✅ [upsertCostCategory] created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ [upsertCostCategory] unexpected error:', error);
    throw error;
  }
}

// Создание или получение детальной категории
async function upsertDetailCostCategory(
  categoryId: string,
  name: string,
  unit: string
): Promise<DetailCostCategory | null> {
  console.log('🚀 [upsertDetailCostCategory] called with:', { categoryId, name, unit });
  
  try {
    // Проверяем существование
    const { data: existing, error: selectError } = await supabase
      .from('detail_cost_categories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('name', name)
      .single();

    if (existing) {
      console.log('✅ [upsertDetailCostCategory] found existing:', existing.id);
      return existing;
    }

    // Если ошибка не "PGRST116" (not found), то это реальная ошибка
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [upsertDetailCostCategory] select failed:', selectError);
      throw selectError;
    }

    // Создаем новую детальную категорию
    const code = `DETAIL-${Date.now()}`;
    const { data, error } = await supabase
      .from('detail_cost_categories')
      .insert({
        category_id: categoryId,
        code,
        name,
        unit,
        base_price: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [upsertDetailCostCategory] insert failed:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ [upsertDetailCostCategory] no data returned after insert');
      throw new Error('Failed to create detail category: no data returned');
    }

    console.log('✅ [upsertDetailCostCategory] created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ [upsertDetailCostCategory] unexpected error:', error);
    throw error;
  }
}

// Создание или получение локации
async function upsertLocation(name: string): Promise<Location | null> {
  console.log('🚀 [upsertLocation] called with:', { name });
  
  try {
    // Проверяем существование
    const { data: existing, error: selectError } = await supabase
      .from('location')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      console.log('✅ [upsertLocation] found existing:', existing.id);
      return existing;
    }

    // Если ошибка не "PGRST116" (not found), то это реальная ошибка
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [upsertLocation] select failed:', selectError);
      throw selectError;
    }

    // Создаем новую локацию
    const code = `LOC-${Date.now()}`;
    const { data, error } = await supabase
      .from('location')
      .insert({
        code,
        name,
        parent_id: null,
        level: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [upsertLocation] insert failed:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ [upsertLocation] no data returned after insert');
      throw new Error('Failed to create location: no data returned');
    }

    console.log('✅ [upsertLocation] created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ [upsertLocation] unexpected error:', error);
    throw error;
  }
}

// Создание связи между категорией и локацией
async function createCategoryLocationMapping(
  detailCategoryId: string,
  locationId: string
) {
  console.log('🚀 [createCategoryLocationMapping] called with:', { detailCategoryId, locationId });
  
  // Проверяем существование связи
  const { data: existing } = await supabase
    .from('category_location_mapping')
    .select('*')
    .eq('detail_category_id', detailCategoryId)
    .eq('location_id', locationId)
    .single();

  if (existing) {
    console.log('✅ [createCategoryLocationMapping] mapping already exists:', existing.id);
    return existing;
  }

  // Создаем новую связь
  const { data, error } = await supabase
    .from('category_location_mapping')
    .insert({
      detail_category_id: detailCategoryId,
      location_id: locationId,
      quantity: 0,
      unit_price: 0,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [createCategoryLocationMapping] failed:', error);
    throw error;
  }

  console.log('✅ [createCategoryLocationMapping] created:', data.id);
  return data;
}

// Импорт данных из Excel
export async function importCostCategories(data: CostCategoryImportData[]) {
  console.log('🚀 [importCostCategories] called with:', data.length, 'rows');
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Сортируем данные по sortOrder для сохранения порядка
  const sortedData = [...data].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const [index, row] of sortedData.entries()) {
    try {
      console.log('🔄 Processing row:', row);
      
      // 1. Создаем или обновляем основную категорию с учетом сортировки
      const category = await upsertCostCategoryWithOrder(
        row.categoryName, 
        row.categoryUnit,
        row.sortOrder || index
      );
      
      if (!category) {
        throw new Error(`Failed to create or find category: ${row.categoryName}`);
      }
      
      // 2. Создаем или обновляем детальную категорию
      const detailCategory = await upsertDetailCostCategoryWithOrder(
        category.id,
        row.detailCategoryName,
        row.detailCategoryUnit,
        row.sortOrder || index
      );
      
      if (!detailCategory) {
        throw new Error(`Failed to create or find detail category: ${row.detailCategoryName}`);
      }
      
      // 3. Создаем или обновляем локацию
      const location = await upsertLocationWithOrder(
        row.locationName,
        row.sortOrder || index
      );
      
      if (!location) {
        throw new Error(`Failed to create or find location: ${row.locationName}`);
      }
      
      // 4. Создаем связь между категорией и локацией
      await createCategoryLocationMapping(detailCategory.id, location.id);
      
      results.success++;
      console.log('✅ Row processed successfully');
    } catch (error) {
      console.error('❌ Failed to process row:', error);
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Ошибка для строки "${row.categoryName}": ${errorMessage}`);
    }
  }

  console.log('✅ [importCostCategories] completed:', results);
  return results;
}

// Создание или обновление категории с сортировкой
async function upsertCostCategoryWithOrder(name: string, unit?: string, sortOrder: number = 0): Promise<CostCategory | null> {
  console.log('🚀 [upsertCostCategoryWithOrder] called with:', { name, unit, sortOrder });
  
  try {
    // Проверяем существование
    const { data: existing, error: selectError } = await supabase
      .from('cost_categories')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      // Обновляем существующую категорию с новым порядком сортировки
      const { data, error } = await supabase
        .from('cost_categories')
        .update({
          description: unit ? `Единица измерения: ${unit}` : existing.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [upsertCostCategoryWithOrder] update failed:', error);
        throw error;
      }
      
      console.log('✅ [upsertCostCategoryWithOrder] updated existing:', data?.id);
      return data;
    }

    // Если ошибка не "PGRST116" (not found), то это реальная ошибка
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [upsertCostCategoryWithOrder] select failed:', selectError);
      throw selectError;
    }

    // Создаем новую категорию
    const code = `CAT-${Date.now()}`;
    const { data, error } = await supabase
      .from('cost_categories')
      .insert({
        code,
        name,
        description: unit ? `Единица измерения: ${unit}` : undefined,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [upsertCostCategoryWithOrder] insert failed:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ [upsertCostCategoryWithOrder] no data returned after insert');
      throw new Error('Failed to create category: no data returned');
    }

    console.log('✅ [upsertCostCategoryWithOrder] created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ [upsertCostCategoryWithOrder] unexpected error:', error);
    throw error;
  }
}

// Создание или обновление детальной категории с сортировкой
async function upsertDetailCostCategoryWithOrder(
  categoryId: string,
  name: string,
  unit: string,
  sortOrder: number = 0
): Promise<DetailCostCategory | null> {
  console.log('🚀 [upsertDetailCostCategoryWithOrder] called with:', { categoryId, name, unit, sortOrder });
  
  try {
    // Проверяем существование
    const { data: existing, error: selectError } = await supabase
      .from('detail_cost_categories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('name', name)
      .single();

    if (existing) {
      // Обновляем существующую детальную категорию
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .update({
          unit,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [upsertDetailCostCategoryWithOrder] update failed:', error);
        throw error;
      }
      
      console.log('✅ [upsertDetailCostCategoryWithOrder] updated existing:', data?.id);
      return data;
    }

    // Если ошибка не "PGRST116" (not found), то это реальная ошибка
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [upsertDetailCostCategoryWithOrder] select failed:', selectError);
      throw selectError;
    }

    // Создаем новую детальную категорию
    const code = `DETAIL-${Date.now()}`;
    const { data, error } = await supabase
      .from('detail_cost_categories')
      .insert({
        category_id: categoryId,
        code,
        name,
        unit,
        base_price: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [upsertDetailCostCategoryWithOrder] insert failed:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ [upsertDetailCostCategoryWithOrder] no data returned after insert');
      throw new Error('Failed to create detail category: no data returned');
    }

    console.log('✅ [upsertDetailCostCategoryWithOrder] created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ [upsertDetailCostCategoryWithOrder] unexpected error:', error);
    throw error;
  }
}

// Создание или обновление локации с сортировкой
async function upsertLocationWithOrder(name: string, sortOrder: number = 0): Promise<Location | null> {
  console.log('🚀 [upsertLocationWithOrder] called with:', { name, sortOrder });
  
  try {
    // Проверяем существование
    const { data: existing, error: selectError } = await supabase
      .from('location')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      // Обновляем существующую локацию
      const { data, error } = await supabase
        .from('location')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [upsertLocationWithOrder] update failed:', error);
        throw error;
      }
      
      console.log('✅ [upsertLocationWithOrder] updated existing:', data?.id);
      return data;
    }

    // Если ошибка не "PGRST116" (not found), то это реальная ошибка
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ [upsertLocationWithOrder] select failed:', selectError);
      throw selectError;
    }

    // Создаем новую локацию
    const code = `LOC-${Date.now()}`;
    const { data, error } = await supabase
      .from('location')
      .insert({
        code,
        name,
        parent_id: null,
        level: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [upsertLocationWithOrder] insert failed:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ [upsertLocationWithOrder] no data returned after insert');
      throw new Error('Failed to create location: no data returned');
    }

    console.log('✅ [upsertLocationWithOrder] created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ [upsertLocationWithOrder] unexpected error:', error);
    throw error;
  }
}

// Получение всех данных для экспорта
export async function exportCostCategories() {
  console.log('🚀 [exportCostCategories] called');
  
  // Получаем категории с sort_order
  const { data: categoriesData, error: catError } = await supabase
    .from('cost_categories')
    .select('*')
;

  if (catError) {
    console.error('❌ [exportCostCategories] categories failed:', catError);
    throw catError;
  }

  // Получаем детальные категории
  const { data: detailsData, error: detError } = await supabase
    .from('detail_cost_categories')
    .select('*')
;

  if (detError) {
    console.error('❌ [exportCostCategories] details failed:', detError);
    throw detError;
  }

  // Получаем локации
  const { data: locationsData, error: locError } = await supabase
    .from('location')
    .select('*')
;

  if (locError) {
    console.error('❌ [exportCostCategories] locations failed:', locError);
    throw locError;
  }

  // Формируем данные для экспорта с нумерацией
  const exportData: CostCategoryImportData[] = [];
  let sortOrder = 1;

  for (const category of categoriesData || []) {
    const categoryDetails = detailsData?.filter(d => d.category_id === category.id) || [];
    
    for (const detail of categoryDetails) {
      // Для каждой детальной категории добавляем все локации
      for (const location of locationsData || []) {
        exportData.push({
          sortOrder: sortOrder++,
          categoryName: category.name,
          categoryUnit: category.description?.replace('Единица измерения: ', '') || '',
          detailCategoryName: detail.name,
          detailCategoryUnit: detail.unit,
          locationName: location.name
        });
      }
    }
  }

  console.log('✅ [exportCostCategories] completed:', exportData.length, 'records');
  return exportData;
}

// Удаление категории
export async function deleteCostCategory(id: string) {
  console.log('🚀 [deleteCostCategory] called with:', id);
  
  const { error } = await supabase
    .from('cost_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ [deleteCostCategory] failed:', error);
    throw error;
  }

  console.log('✅ [deleteCostCategory] completed');
}

// Удаление детальной категории
export async function deleteDetailCostCategory(id: string) {
  console.log('🚀 [deleteDetailCostCategory] called with:', id);
  
  const { error } = await supabase
    .from('detail_cost_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ [deleteDetailCostCategory] failed:', error);
    throw error;
  }

  console.log('✅ [deleteDetailCostCategory] completed');
}

// Удаление локации
export async function deleteLocation(id: string) {
  console.log('🚀 [deleteLocation] called with:', id);
  
  const { error } = await supabase
    .from('location')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ [deleteLocation] failed:', error);
    throw error;
  }

  console.log('✅ [deleteLocation] completed');
}