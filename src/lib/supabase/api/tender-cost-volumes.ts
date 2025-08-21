import { supabase } from '../client';
import { handleSupabaseError } from './utils';

export interface TenderCostVolume {
  id?: string;
  tender_id: string;
  detail_cost_category_id: string;
  volume: number;
  unit_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTenderCostVolumeInput {
  tender_id: string;
  detail_cost_category_id: string;
  volume: number;
  unit_total?: number;
}

export interface UpdateTenderCostVolumeInput extends Partial<CreateTenderCostVolumeInput> {
  id: string;
}

export const tenderCostVolumesApi = {
  // ========== CRUD OPERATIONS ==========
  
  async getByTenderId(tenderId: string) {
    console.log('🚀 [getByTenderId] Loading volumes for tender:', tenderId);
    
    try {
      const { data, error } = await supabase
        .from('tender_cost_volumes')
        .select('*')
        .eq('tender_id', tenderId);
      
      if (error) throw error;
      
      console.log('✅ [getByTenderId] Success:', data?.length, 'volumes');
      return data as TenderCostVolume[];
    } catch (error) {
      console.error('❌ [getByTenderId] Failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async upsertVolume(input: CreateTenderCostVolumeInput) {
    console.log('🚀 [upsertVolume] Saving volume:', input);
    
    try {
      const { data, error } = await supabase
        .from('tender_cost_volumes')
        .upsert(input, {
          onConflict: 'tender_id,detail_cost_category_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [upsertVolume] Success:', data);
      return data as TenderCostVolume;
    } catch (error) {
      console.error('❌ [upsertVolume] Failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async deleteVolume(tenderId: string, detailCostCategoryId: string) {
    console.log('🚀 [deleteVolume] Deleting volume for:', { tenderId, detailCostCategoryId });
    
    try {
      const { error } = await supabase
        .from('tender_cost_volumes')
        .delete()
        .eq('tender_id', tenderId)
        .eq('detail_cost_category_id', detailCostCategoryId);
      
      if (error) throw error;
      
      console.log('✅ [deleteVolume] Success');
      return true;
    } catch (error) {
      console.error('❌ [deleteVolume] Failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkUpsertVolumes(volumes: CreateTenderCostVolumeInput[]) {
    console.log('🚀 [bulkUpsertVolumes] Saving volumes:', volumes.length);
    
    try {
      const { data, error } = await supabase
        .from('tender_cost_volumes')
        .upsert(volumes, {
          onConflict: 'tender_id,detail_cost_category_id'
        })
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkUpsertVolumes] Success:', data?.length, 'volumes');
      return data as TenderCostVolume[];
    } catch (error) {
      console.error('❌ [bulkUpsertVolumes] Failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== TABLE MANAGEMENT ==========
  
  async ensureTableExists() {
    console.log('🚀 [ensureTableExists] Ensuring tender_cost_volumes table exists');
    
    try {
      // Try to query the table to see if it exists
      const { error } = await supabase
        .from('tender_cost_volumes')
        .select('id')
        .limit(1);
      
      if (error && error.code === 'PGRST106') {
        console.log('📝 [ensureTableExists] Table does not exist, needs to be created');
        console.log('💡 Please run the SQL from ensure_tender_cost_volumes_table.sql in Supabase Dashboard');
        return false;
      } else if (error) {
        throw error;
      }
      
      console.log('✅ [ensureTableExists] Table exists');
      return true;
    } catch (error) {
      console.error('❌ [ensureTableExists] Failed:', error);
      throw handleSupabaseError(error);
    }
  }
};