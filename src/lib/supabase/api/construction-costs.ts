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
  } catch (error: any) {
    console.error('❌ [getCategoriesWithDetails] Error:', error);
    return { data: null, error };
  }
}

// Загрузить все локализации
export async function getLocations() {
  console.log('🚀 [getLocations] Loading locations');
  
  const { data, error } = await supabase
    .from('location')
    .select('*')
    .order('country', { ascending: true });
    
  if (error) {
    console.error('❌ Error loading locations:', error);
    return { data: null, error };
  }
  
  console.log('✅ [getLocations] Loaded:', data?.length || 0);
  return { data, error: null };
}

// Удалить категорию
export async function deleteCategory(id: string) {
  console.log('🚀 [deleteCategory] Deleting category:', id);
  
  const { error } = await supabase
    .from('cost_categories')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('❌ Error deleting category:', error);
    return { error };
  }
  
  console.log('✅ [deleteCategory] Category deleted');
  return { error: null };
}

// Удалить деталь
export async function deleteDetail(id: string) {
  console.log('🚀 [deleteDetail] Deleting detail:', id);
  
  const { error } = await supabase
    .from('detail_cost_categories')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('❌ Error deleting detail:', error);
    return { error };
  }
  
  console.log('✅ [deleteDetail] Detail deleted');
  return { error: null };
}

// Удалить локализацию
export async function deleteLocation(id: string) {
  console.log('🚀 [deleteLocation] Deleting location:', id);
  
  const { error } = await supabase
    .from('location')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('❌ Error deleting location:', error);
    return { error };
  }
  
  console.log('✅ [deleteLocation] Location deleted');
  return { error: null };
}

// Очистить все данные
export async function clearAllData() {
  console.log('🚀 [clearAllData] Clearing all data');
  
  try {
    // Удаляем в правильном порядке из-за foreign keys
    const { error: detailError } = await supabase
      .from('detail_cost_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все
      
    if (detailError) {
      console.error('❌ Error clearing details:', detailError);
      return { error: detailError };
    }
    
    const { error: catError } = await supabase
      .from('cost_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все
      
    if (catError) {
      console.error('❌ Error clearing categories:', catError);
      return { error: catError };
    }
    
    const { error: locError } = await supabase
      .from('location')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все
      
    if (locError) {
      console.error('❌ Error clearing locations:', locError);
      return { error: locError };
    }
    
    console.log('✅ [clearAllData] All data cleared');
    return { error: null };
  } catch (error: any) {
    console.error('❌ [clearAllData] Error:', error);
    return { error };
  }
}