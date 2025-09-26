import { supabase } from '../client';
import * as XLSX from 'xlsx-js-style';
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

  // Import cost data from Excel file
  async importFromXlsx(file: File): Promise<ApiResponse<{ rows: number }>> {
    console.log('🚀 [costsApi.importFromXlsx] called with:', { fileName: file.name });
    try {
      console.log('📖 Reading Excel file...');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: [
          'cat_code',
          'cat_name',
          'cat_unit',
          'detail_name',
          'detail_unit',
          'unit_cost',
          'location',
        ],
        range: 1,
        raw: false,
        defval: '',
      });

      console.log('📊 Raw rows:', rows.slice(0, 3));
      const validRows = rows.filter(r => r.cat_name && r.detail_name);
      console.log('📈 Valid rows:', validRows.length);

      const categoriesMap = new Map<string, CostCategoryInsert>();
      const locationsMap = new Map<string, LocationInsert>();

      validRows.forEach(r => {
        const code = String(r.cat_code || '').trim();
        const name = String(r.cat_name || '').trim();
        const unit = String(r.cat_unit || '').trim();
        if (name && !categoriesMap.has(code)) {
          categoriesMap.set(code, { code: code || null, name, unit: unit || null });
        }
        const loc = String(r.location || '').trim();
        if (loc && !locationsMap.has(loc)) {
          locationsMap.set(loc, { city: loc });
        }
      });

      console.log('📡 Purging schema cache...');
      const { error: purgeError } = await supabase.rpc('schema_cache_purge');
      if (purgeError) {
        console.error('❌ [costsApi.importFromXlsx] schema cache purge failed:', purgeError);
      } else {
        console.log('✅ [costsApi.importFromXlsx] schema cache purged');
      }

      console.log('📡 Upserting categories:', categoriesMap.size);
      const { data: catData, error: catError } = await supabase
        .from('cost_categories')
        .upsert(Array.from(categoriesMap.values()), { onConflict: 'code' })
        .select();
      if (catError) {
        console.error('❌ [costsApi.importFromXlsx] category upsert failed:', catError);
        return { error: handleSupabaseError(catError, 'Import categories') };
      }

      console.log('📡 Upserting locations:', locationsMap.size);
      const { data: locData, error: locError } = await supabase
        .from('location')
        .upsert(Array.from(locationsMap.values()), { onConflict: 'city' })
        .select();
      if (locError) {
        console.error('❌ [costsApi.importFromXlsx] location upsert failed:', locError);
        return { error: handleSupabaseError(locError, 'Import locations') };
      }

      const catIdByCode = new Map<string, string>();
      catData?.forEach(c => catIdByCode.set(c.code || '', c.id));
      const locIdByName = new Map<string, string>();
      locData?.forEach(l => locIdByName.set(l.city || '', l.id));

      const details: DetailCostCategoryInsert[] = validRows
        .map(r => {
          const cost = parseFloat(
            String(r.unit_cost || '')
              .trim()
              .replace(/\s/g, '')
              .replace(',', '.')
          );
          return {
            cost_category_id: catIdByCode.get(String(r.cat_code || '').trim())!,
            location_id: locIdByName.get(String(r.location || '').trim())!,
            name: String(r.detail_name || '').trim(),
            unit: String(r.detail_unit || '').trim() || null,
            unit_cost: Number.isFinite(cost) ? cost : null,
          };
        })
        .filter(d => d.cost_category_id && d.location_id && d.name);

      console.log('📡 Inserting details:', details.length);
      const { error: detailError } = await supabase
        .from('detail_cost_categories')
        .insert(details);
      if (detailError) {
        console.error('❌ [costsApi.importFromXlsx] detail insert failed:', detailError);
        return { error: handleSupabaseError(detailError, 'Import details') };
      }

      console.log('✅ [costsApi.importFromXlsx] completed:', { rows: details.length });
      return { data: { rows: details.length } };
    } catch (error) {
      console.error('❌ [costsApi.importFromXlsx] failed:', error);
      return { error: handleSupabaseError(error, 'Import costs from Excel') };
    }
  },
};

