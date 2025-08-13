import { supabase } from '../client';
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

  // Fetch all cost categories
  async getCategories(): Promise<ApiResponse<CostCategory[]>> {
    console.log('🚀 [costsApi.getCategories] called');
    try {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ [costsApi.getCategories] failed:', error);
        return { error: handleSupabaseError(error, 'Get cost categories') };
      }

      console.log('✅ [costsApi.getCategories] completed:', data);
      return { data: data as CostCategory[] };
    } catch (error) {
      console.error('❌ [costsApi.getCategories] failed:', error);
      return { error: handleSupabaseError(error, 'Get cost categories') };
    }
  },

  // Fetch all locations
  async getLocations(): Promise<ApiResponse<Location[]>> {
    console.log('🚀 [costsApi.getLocations] called');
    try {
      const { data, error } = await supabase
        .from('location')
        .select('*')
        .order('city');

      if (error) {
        console.error('❌ [costsApi.getLocations] failed:', error);
        return { error: handleSupabaseError(error, 'Get locations') };
      }

      console.log('✅ [costsApi.getLocations] completed:', data);
      return { data: data as Location[] };
    } catch (error) {
      console.error('❌ [costsApi.getLocations] failed:', error);
      return { error: handleSupabaseError(error, 'Get locations') };
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
};

