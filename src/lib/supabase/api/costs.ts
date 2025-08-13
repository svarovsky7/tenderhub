import { supabase } from '../client';
import * as XLSX from 'xlsx';
import type {
  CostCategory,
  CostCategoryInsert,
  DetailCostCategory,
  DetailCostCategoryInsert,
  Location,
  LocationInsert,
  ApiResponse,
  DetailCostWithRelations,
} from '../types';
import { handleSupabaseError } from './utils';

// API for construction cost management
export const costsApi = {
  // Fetch all detail cost categories with related data
  async getAll(): Promise<ApiResponse<DetailCostWithRelations[]>> {
    console.log('🚀 [costsApi.getAll] called');
    try {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('*, cost_categories(*), location(*)')
        .order('name');

      if (error) {
        console.error('❌ [costsApi.getAll] failed:', error);
        return { error: handleSupabaseError(error, 'Get cost details') };
      }

      console.log('✅ [costsApi.getAll] completed:', data);
      return { data: data as DetailCostWithRelations[] };
    } catch (error) {
      console.error('❌ [costsApi.getAll] failed:', error);
      return { error: handleSupabaseError(error, 'Get cost details') };
    }
  },

  // Create cost category
  async createCategory(payload: CostCategoryInsert): Promise<ApiResponse<CostCategory>> {
    console.log('🚀 [costsApi.createCategory] called with:', payload);
    try {
      const { data, error } = await supabase
        .from('cost_categories')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ [costsApi.createCategory] failed:', error);
        return { error: handleSupabaseError(error, 'Create cost category') };
      }

      console.log('✅ [costsApi.createCategory] completed:', data);
      return { data };
    } catch (error) {
      console.error('❌ [costsApi.createCategory] failed:', error);
      return { error: handleSupabaseError(error, 'Create cost category') };
    }
  },

  // Create location
  async createLocation(payload: LocationInsert): Promise<ApiResponse<Location>> {
    console.log('🚀 [costsApi.createLocation] called with:', payload);
    try {
      const { data, error } = await supabase
        .from('location')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ [costsApi.createLocation] failed:', error);
        return { error: handleSupabaseError(error, 'Create location') };
      }

      console.log('✅ [costsApi.createLocation] completed:', data);
      return { data };
    } catch (error) {
      console.error('❌ [costsApi.createLocation] failed:', error);
      return { error: handleSupabaseError(error, 'Create location') };
    }
  },

  // Create detail cost category
  async createDetail(payload: DetailCostCategoryInsert): Promise<ApiResponse<DetailCostCategory>> {
    console.log('🚀 [costsApi.createDetail] called with:', payload);
    try {
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ [costsApi.createDetail] failed:', error);
        return { error: handleSupabaseError(error, 'Create cost detail') };
      }

      console.log('✅ [costsApi.createDetail] completed:', data);
      return { data };
    } catch (error) {
      console.error('❌ [costsApi.createDetail] failed:', error);
      return { error: handleSupabaseError(error, 'Create cost detail') };
    }
  },

  // Import cost categories, details and locations from Excel
  async importFromXlsx(
    file: File,
    onProgress?: (progress: number, step: string) => void
  ): Promise<ApiResponse<{ rows: number }>> {
    console.log('🚀 [costsApi.importFromXlsx] called with:', { fileName: file.name });
    try {
      onProgress?.(10, 'Чтение Excel файла...');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      onProgress?.(25, 'Парсинг данных из Excel...');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: [
          'cat_number',
          'cat_name',
          'cat_unit',
          'detail_name',
          'detail_unit',
          'location'
        ],
        range: 1,
        defval: '',
        raw: false
      });

      console.log('📊 [costsApi.importFromXlsx] parsed rows:', rows.slice(0, 3));
      onProgress?.(40, 'Подготовка данных...');

      // Load existing categories and locations
      const { data: existingCats, error: catsError } = await supabase
        .from('cost_categories')
        .select('id, name');
      if (catsError) throw catsError;
      const categoryMap = new Map<string, string>();
      existingCats?.forEach(cat => categoryMap.set(cat.name, cat.id));

      const { data: existingLocs, error: locError } = await supabase
        .from('location')
        .select('id, country, region, city');
      if (locError) throw locError;
      const locationMap = new Map<string, string>();
      existingLocs?.forEach(loc => {
        const key = [loc.country, loc.region, loc.city].filter(Boolean).join(', ');
        locationMap.set(key, loc.id);
      });

      const newCategories: { name: string; description?: string | null }[] = [];
      const newLocations: { country?: string | null; region?: string | null; city?: string | null }[] = [];

      rows.forEach(row => {
        const catName = `${String(row.cat_number).trim()} ${String(row.cat_name).trim()}`.trim();
        if (catName && !categoryMap.has(catName)) {
          newCategories.push({
            name: catName,
            description: String(row.cat_unit).trim() || null
          });
          categoryMap.set(catName, 'temp');
        }

        const locationStr = String(row.location).trim();
        if (locationStr && !locationMap.has(locationStr)) {
          const parts = locationStr.split(',').map(p => p.trim());
          const [country, region, city] = [parts[0] || null, parts[1] || null, parts[2] || null];
          newLocations.push({ country, region, city });
          locationMap.set(locationStr, 'temp');
        }
      });

      if (newCategories.length) {
        onProgress?.(60, 'Сохранение категорий...');
        const { data: insertedCats, error } = await supabase
          .from('cost_categories')
          .insert(newCategories)
          .select('id, name');
        if (error) throw error;
        insertedCats?.forEach(cat => categoryMap.set(cat.name, cat.id));
      }

      if (newLocations.length) {
        onProgress?.(70, 'Сохранение локаций...');
        const { data: insertedLocs, error } = await supabase
          .from('location')
          .insert(newLocations)
          .select('id, country, region, city');
        if (error) throw error;
        insertedLocs?.forEach(loc => {
          const key = [loc.country, loc.region, loc.city].filter(Boolean).join(', ');
          locationMap.set(key, loc.id);
        });
      }

      onProgress?.(85, 'Сохранение детализаций...');
      const detailRows = rows
        .map(row => {
          const catName = `${String(row.cat_number).trim()} ${String(row.cat_name).trim()}`.trim();
          const detailName = String(row.detail_name).trim();
          if (!catName || !detailName) return null;
          const locationStr = String(row.location).trim();
          const catId = categoryMap.get(catName);
          const locId = locationMap.get(locationStr);
          if (!catId || !locId) return null;
          const name = row.detail_unit
            ? `${detailName} (${String(row.detail_unit).trim()})`
            : detailName;
          return {
            cost_category_id: catId,
            location_id: locId,
            name,
            unit_cost: null
          } as DetailCostCategoryInsert;
        })
        .filter(Boolean) as DetailCostCategoryInsert[];

      if (detailRows.length) {
        const { error } = await supabase
          .from('detail_cost_categories')
          .insert(detailRows);
        if (error) throw error;
      }

      onProgress?.(100, 'Импорт завершен');
      console.log('✅ [costsApi.importFromXlsx] completed:', { rows: rows.length });
      return { data: { rows: rows.length } };
    } catch (error) {
      console.error('❌ [costsApi.importFromXlsx] failed:', error);
      return { error: handleSupabaseError(error, 'Import costs from Excel') };
    }
  }
};

