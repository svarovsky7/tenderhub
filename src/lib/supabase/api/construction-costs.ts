// API для работы с затратами на строительство
import { supabase } from '../client';

export interface CostCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface DetailCostCategory {
  id: string;
  cost_category_id: string;
  location_id: string;
  name: string;
  unit_cost: number | null;
  created_at: string;
  category?: CostCategory;
  location?: Location;
}

export interface Location {
  id: string;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

// Загрузить все категории с деталями
export async function getCategoriesWithDetails() {
  console.log('🚀 [getCategoriesWithDetails] Loading categories and details');
  
  try {
    // Загружаем категории
    const { data: categories, error: catError } = await supabase
      .from('cost_categories')
      .select('*')
      .order('name');
      
    if (catError) {
      console.error('❌ Error loading categories:', catError);
      return { data: null, error: catError };
    }
    
    // Загружаем детали с локализациями
    const { data: details, error: detError } = await supabase
      .from('detail_cost_categories')
      .select(`
        *,
        location:location_id (*)
      `)
      .order('name');
      
    if (detError) {
      console.error('❌ Error loading details:', detError);
      return { data: null, error: detError };
    }
    
    // Группируем детали по категориям
    const categoriesWithDetails = categories?.map(category => {
      const categoryDetails = details?.filter(d => d.cost_category_id === category.id) || [];
      return {
        ...category,
        details: categoryDetails
      };
    });
    
    console.log('✅ [getCategoriesWithDetails] Loaded:', {
      categories: categories?.length || 0,
      details: details?.length || 0
    });
    
    return { data: categoriesWithDetails, error: null };
  } catch (err: any) {
    console.error('❌ [getCategoriesWithDetails] Error:', err);
    return { data: null, error: err };
  }
}

// Загрузить все локализации
export async function getLocations() {
  console.log('🚀 [getLocations] Loading locations');
  
  const { data, error } = await supabase
    .from('location')
    .select('*')
    .order('country');
    
  if (error) {
    console.error('❌ Error loading locations:', error);
    return { data: null, error };
  }
  
  console.log('✅ [getLocations] Loaded:', data?.length || 0);
  return { data, error: null };
}

// Создать новую категорию
export async function createCategory(name: string, description?: string) {
  console.log('🚀 [createCategory] Creating:', { name, description });
  
  const { data, error } = await supabase
    .from('cost_categories')
    .insert({ name, description })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error creating category:', error);
    return { data: null, error };
  }
  
  console.log('✅ [createCategory] Created:', data);
  return { data, error: null };
}

// Создать новую деталь
export async function createDetail(categoryId: string, name: string, locationId: string, unitCost?: number) {
  console.log('🚀 [createDetail] Creating:', { categoryId, name, locationId, unitCost });
  
  const { data, error } = await supabase
    .from('detail_cost_categories')
    .insert({
      cost_category_id: categoryId,
      name,
      location_id: locationId,
      unit_cost: unitCost
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error creating detail:', error);
    return { data: null, error };
  }
  
  console.log('✅ [createDetail] Created:', data);
  return { data, error: null };
}

// Создать новую локализацию
export async function createLocation(country?: string, region?: string, city?: string) {
  console.log('🚀 [createLocation] Creating:', { country, region, city });
  
  const { data, error } = await supabase
    .from('location')
    .insert({ country, region, city })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error creating location:', error);
    return { data: null, error };
  }
  
  console.log('✅ [createLocation] Created:', data);
  return { data, error: null };
}

// Удалить категорию
export async function deleteCategory(id: string) {
  console.log('🚀 [deleteCategory] Deleting:', id);
  
  const { error } = await supabase
    .from('cost_categories')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('❌ Error deleting category:', error);
    return { error };
  }
  
  console.log('✅ [deleteCategory] Deleted');
  return { error: null };
}

// Удалить деталь
export async function deleteDetail(id: string) {
  console.log('🚀 [deleteDetail] Deleting:', id);
  
  const { error } = await supabase
    .from('detail_cost_categories')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('❌ Error deleting detail:', error);
    return { error };
  }
  
  console.log('✅ [deleteDetail] Deleted');
  return { error: null };
}

// Удалить локализацию
export async function deleteLocation(id: string) {
  console.log('🚀 [deleteLocation] Deleting:', id);
  
  const { error } = await supabase
    .from('location')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('❌ Error deleting location:', error);
    return { error };
  }
  
  console.log('✅ [deleteLocation] Deleted');
  return { error: null };
}

// Очистить все данные
export async function clearAllData() {
  console.log('🚀 [clearAllData] Clearing all data');
  
  try {
    // Удаляем в правильном порядке из-за foreign keys
    const { error: detailsError } = await supabase
      .from('detail_cost_categories')
      .delete()
      .gte('created_at', '1900-01-01');
      
    if (detailsError) {
      console.error('❌ Error deleting details:', detailsError);
      return { error: detailsError };
    }
    
    const { error: categoriesError } = await supabase
      .from('cost_categories')
      .delete()
      .gte('created_at', '1900-01-01');
      
    if (categoriesError) {
      console.error('❌ Error deleting categories:', categoriesError);
      return { error: categoriesError };
    }
    
    const { error: locationsError } = await supabase
      .from('location')
      .delete()
      .gte('created_at', '1900-01-01');
      
    if (locationsError) {
      console.error('❌ Error deleting locations:', locationsError);
      return { error: locationsError };
    }
    
    console.log('✅ [clearAllData] All data cleared');
    return { error: null };
  } catch (err: any) {
    console.error('❌ [clearAllData] Error:', err);
    return { error: err };
  }
}

// Поиск в detail_cost_categories для CostCascadeSelector
export interface DetailCategorySearchResult {
  id: string;
  name: string;
  unit_cost: number | null;
  category_name: string;
  location_name: string;
  display_name: string;
  cost_category_id: string;
  location_id: string;
}

export async function searchDetailCategories(searchTerm: string, limit: number = 30) {
  console.log('🚀 [searchDetailCategories] Searching:', { searchTerm, limit });
  
  try {
    // Сначала ищем детали категорий
    const { data: detailsData, error } = await supabase
      .from('detail_cost_categories')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(limit);
      
    if (error) {
      console.error('❌ [searchDetailCategories] Error:', error);
      return { data: null, error };
    }
    
    console.log('📦 [searchDetailCategories] Raw data:', detailsData);
    
    if (!detailsData || detailsData.length === 0) {
      return { data: [], error: null };
    }
    
    // Получаем уникальные IDs категорий и локаций
    const categoryIds = [...new Set(detailsData.map(d => d.cost_category_id).filter(Boolean))];
    const locationIds = [...new Set(detailsData.map(d => d.location_id).filter(Boolean))];
    
    // Загружаем категории
    const categoriesMap: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('cost_categories')
        .select('id, name')
        .in('id', categoryIds);
      
      if (categories) {
        categories.forEach(cat => {
          categoriesMap[cat.id] = cat.name;
        });
      }
    }
    
    // Загружаем локации
    const locationsMap: Record<string, string> = {};
    if (locationIds.length > 0) {
      const { data: locations } = await supabase
        .from('location')
        .select('id, city, region, country')
        .in('id', locationIds);
      
      if (locations) {
        locations.forEach(loc => {
          const parts = [];
          if (loc.city) parts.push(loc.city);
          if (loc.region) parts.push(loc.region);
          if (loc.country) parts.push(loc.country);
          locationsMap[loc.id] = parts.length > 0 ? parts.join(', ') : 'Локация не указана';
        });
      }
    }
    
    // Transform results to match expected format
    const results: DetailCategorySearchResult[] = detailsData.map(item => {
      const categoryName = item.cost_category_id && categoriesMap[item.cost_category_id] 
        ? categoriesMap[item.cost_category_id] 
        : 'Категория не указана';
      
      const locationName = item.location_id && locationsMap[item.location_id]
        ? locationsMap[item.location_id]
        : 'Локация не указана';
      
      const displayName = `${categoryName} → ${item.name} → ${locationName}`;
      
      return {
        id: item.id,
        name: item.name,
        unit_cost: item.unit_cost,
        category_name: categoryName,
        location_name: locationName,
        display_name: displayName,
        cost_category_id: item.cost_category_id,
        location_id: item.location_id
      };
    });
    
    console.log('✅ [searchDetailCategories] Found:', results.length);
    return { data: results, error: null };
  } catch (err: any) {
    console.error('❌ [searchDetailCategories] Error:', err);
    return { data: null, error: err };
  }
}

// Получить отображаемое значение для detail_cost_category_id
export async function getDetailCategoryDisplay(detailCategoryId: string) {
  console.log('🚀 [getDetailCategoryDisplay] Loading for:', detailCategoryId);
  
  try {
    // Сначала получаем основную запись
    const { data: detailDataArray, error: detailError } = await supabase
      .from('detail_cost_categories')
      .select('*')
      .eq('id', detailCategoryId);
      
    if (detailError) {
      console.error('❌ [getDetailCategoryDisplay] Error loading detail:', detailError);
      return { data: null, error: detailError };
    }
    
    if (!detailDataArray || detailDataArray.length === 0) {
      console.log('⚠️ [getDetailCategoryDisplay] No data found for ID:', detailCategoryId);
      return { data: null, error: { message: 'Detail category not found' } };
    }
    
    const detailData = detailDataArray[0];
    console.log('📦 [getDetailCategoryDisplay] Detail data:', detailData);
    
    // Получаем название категории отдельным запросом
    let categoryName = 'Категория не указана';
    if (detailData.cost_category_id) {
      const { data: categoryDataArray } = await supabase
        .from('cost_categories')
        .select('name')
        .eq('id', detailData.cost_category_id);
      
      if (categoryDataArray && categoryDataArray.length > 0) {
        categoryName = categoryDataArray[0].name;
      }
    }
    
    // Получаем локацию отдельным запросом
    let locationName = 'Локация не указана';
    if (detailData.location_id) {
      const { data: locationDataArray } = await supabase
        .from('location')
        .select('city, region, country')
        .eq('id', detailData.location_id);
      
      if (locationDataArray && locationDataArray.length > 0) {
        const locationData = locationDataArray[0];
        const locationParts = [];
        if (locationData.city) locationParts.push(locationData.city);
        if (locationData.region) locationParts.push(locationData.region);
        if (locationData.country) locationParts.push(locationData.country);
        locationName = locationParts.length > 0 ? locationParts.join(', ') : 'Локация не указана';
      }
    }
    
    // Get detail name - this is the main name field
    const detailName = detailData.name || 'Детализация не указана';
    
    const displayName = `${categoryName} → ${detailName} → ${locationName}`;
    
    console.log('✅ [getDetailCategoryDisplay] Display:', displayName);
    return { data: displayName, error: null };
  } catch (err: any) {
    console.error('❌ [getDetailCategoryDisplay] Error:', err);
    return { data: null, error: err };
  }
}