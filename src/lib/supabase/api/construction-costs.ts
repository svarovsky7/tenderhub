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