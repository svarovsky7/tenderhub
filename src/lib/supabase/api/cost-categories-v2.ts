import { supabase } from '../client';
import type { Database } from '../types/database';

type CostCategory = Database['public']['Tables']['cost_categories']['Row'];
type DetailCostCategory = Database['public']['Tables']['detail_cost_categories']['Row'];
type Location = Database['public']['Tables']['location']['Row'];

export interface CostCategoryImportData {
  sortOrder: number;  // Порядковый номер из первого столбца
  categoryName: string;
  categoryUnit?: string;
  detailCategoryName: string;
  detailCategoryUnit: string;
  locationName: string;
}

// Импорт данных через функцию базы данных (если доступна)
export async function importCostCategoriesV2(data: CostCategoryImportData[]) {
  console.log('🚀 [importCostCategoriesV2] called with:', data.length, 'rows');
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Проверяем, доступна ли функция import_cost_category_row
  const { data: testCall, error: testError } = await supabase.rpc('import_cost_category_row', {
    p_category_name: 'test',
    p_category_unit: null,
    p_detail_name: 'test',
    p_detail_unit: 'шт',
    p_location_name: 'test'
  });

  const useDatabaseFunction = !testError || testError.code !== 'PGRST202';
  console.log('🔍 Using database function:', useDatabaseFunction);

  if (useDatabaseFunction) {
    // Используем функцию базы данных для импорта
    for (const row of data) {
      try {
        console.log('🔄 Processing row via DB function:', row);
        
        const { data: result, error } = await supabase.rpc('import_cost_category_row', {
          p_category_name: row.categoryName,
          p_category_unit: row.categoryUnit || null,
          p_detail_name: row.detailCategoryName,
          p_detail_unit: row.detailCategoryUnit,
          p_location_name: row.locationName
        });

        if (error) {
          throw error;
        }

        if (result && result.success) {
          results.success++;
          console.log('✅ Row processed successfully via DB function');
        } else {
          throw new Error(result?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ Failed to process row:', error);
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Ошибка для строки "${row.categoryName}": ${errorMessage}`);
      }
    }
  } else {
    // Fallback на клиентскую логику
    console.log('⚠️ Database function not available, using client-side logic');
    
    // Импортируем старую функцию как fallback
    const { importCostCategories } = await import('./cost-categories');
    return await importCostCategories(data);
  }

  console.log('✅ [importCostCategoriesV2] completed:', results);
  return results;
}

// Экспортируем остальные функции из основного модуля
export { 
  getCostCategories,
  getDetailCostCategories,
  getLocations,
  exportCostCategories,
  deleteCostCategory,
  deleteDetailCostCategory,
  deleteLocation
} from './cost-categories';