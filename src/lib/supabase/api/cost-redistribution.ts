import { supabase } from '../client';
import type {
  CostRedistribution,
  CostRedistributionDetail,
  CostRedistributionInsert,
  CostRedistributionWithDetails,
  RedistributeWorkCostsParams,
  SourceWithdrawal,
} from '../types/cost-redistribution';
import type { ApiResponse } from '../types';
import { handleSupabaseError } from './utils';

/**
 * API для работы с перераспределениями коммерческих стоимостей работ
 */
export const costRedistributionApi = {
  /**
   * Получить активное перераспределение для тендера
   */
  async getActiveRedistribution(tenderId: string): Promise<ApiResponse<CostRedistribution | null>> {
    console.log('🚀 getActiveRedistribution called with tenderId:', tenderId);

    try {
      const { data, error } = await supabase
        .from('cost_redistributions')
        .select('*')
        .eq('tender_id', tenderId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching active redistribution:', error);
        return { error: handleSupabaseError(error, 'Get active redistribution') };
      }

      console.log('✅ Active redistribution:', data);
      return { data };
    } catch (error) {
      console.error('💥 Exception in getActiveRedistribution:', error);
      return { error: handleSupabaseError(error, 'Get active redistribution') };
    }
  },

  /**
   * Получить детали перераспределения
   */
  async getRedistributionDetails(redistributionId: string): Promise<ApiResponse<CostRedistributionDetail[]>> {
    console.log('🚀 getRedistributionDetails called with ID:', redistributionId);

    try {
      const { data, error } = await supabase
        .from('cost_redistribution_details')
        .select('*')
        .eq('redistribution_id', redistributionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching redistribution details:', error);
        return { error: handleSupabaseError(error, 'Get redistribution details') };
      }

      console.log('✅ Redistribution details loaded:', data?.length);
      return { data: data || [] };
    } catch (error) {
      console.error('💥 Exception in getRedistributionDetails:', error);
      return { error: handleSupabaseError(error, 'Get redistribution details') };
    }
  },

  /**
   * Получить перераспределение со всеми деталями
   */
  async getRedistributionWithDetails(redistributionId: string): Promise<ApiResponse<CostRedistributionWithDetails>> {
    console.log('🚀 getRedistributionWithDetails called with ID:', redistributionId);

    try {
      // Получить основную запись
      const { data: redistribution, error: redistributionError } = await supabase
        .from('cost_redistributions')
        .select('*')
        .eq('id', redistributionId)
        .single();

      if (redistributionError) {
        console.error('❌ Error fetching redistribution:', redistributionError);
        return { error: handleSupabaseError(redistributionError, 'Get redistribution') };
      }

      // Получить детали
      const detailsResult = await this.getRedistributionDetails(redistributionId);
      if (detailsResult.error) {
        return { error: detailsResult.error };
      }

      const result: CostRedistributionWithDetails = {
        ...redistribution,
        details: detailsResult.data || [],
      };

      console.log('✅ Redistribution with details loaded');
      return { data: result };
    } catch (error) {
      console.error('💥 Exception in getRedistributionWithDetails:', error);
      return { error: handleSupabaseError(error, 'Get redistribution with details') };
    }
  },

  /**
   * Получить все перераспределения для тендера
   */
  async getRedistributionsByTender(tenderId: string): Promise<ApiResponse<CostRedistribution[]>> {
    console.log('🚀 getRedistributionsByTender called with tenderId:', tenderId);

    try {
      const { data, error } = await supabase
        .from('cost_redistributions')
        .select('*')
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching redistributions:', error);
        return { error: handleSupabaseError(error, 'Get redistributions by tender') };
      }

      console.log('✅ Redistributions loaded:', data?.length);
      return { data: data || [] };
    } catch (error) {
      console.error('💥 Exception in getRedistributionsByTender:', error);
      return { error: handleSupabaseError(error, 'Get redistributions by tender') };
    }
  },

  /**
   * Создать новое перераспределение (вызывает функцию БД)
   */
  async createRedistribution(params: RedistributeWorkCostsParams): Promise<ApiResponse<string>> {
    console.log('🚀 createRedistribution called with params:', params);

    try {
      // Преобразовать source_withdrawals в JSONB формат
      const sourceWithdrawalsJson = params.source_withdrawals.map((sw) => ({
        detail_cost_category_id: sw.detail_cost_category_id,
        percent: sw.percent,
      }));

      console.log('📊 Calling redistribute_work_costs function with:', {
        tender_id: params.tender_id,
        redistribution_name: params.redistribution_name,
        description: params.description || null,
        source_withdrawals: sourceWithdrawalsJson,
        target_categories: params.target_categories,
        source_config: params.source_config,
        target_config: params.target_config,
      });

      const { data, error } = await supabase.rpc('redistribute_work_costs', {
        p_tender_id: params.tender_id,
        p_redistribution_name: params.redistribution_name,
        p_description: params.description || null,
        p_source_withdrawals: sourceWithdrawalsJson,
        p_target_categories: params.target_categories,
        p_source_config: params.source_config || null,  // NEW
        p_target_config: params.target_config || null,  // NEW
      });

      if (error) {
        console.error('❌ Error creating redistribution:', error);
        return { error: handleSupabaseError(error, 'Create redistribution') };
      }

      console.log('✅ Redistribution created with ID:', data);
      return { data: data as string };
    } catch (error) {
      console.error('💥 Exception in createRedistribution:', error);
      return { error: handleSupabaseError(error, 'Create redistribution') };
    }
  },

  /**
   * Деактивировать перераспределение
   */
  async deactivateRedistribution(redistributionId: string): Promise<ApiResponse<null>> {
    console.log('🚀 deactivateRedistribution called with ID:', redistributionId);

    try {
      const { error } = await supabase
        .from('cost_redistributions')
        .update({ is_active: false })
        .eq('id', redistributionId);

      if (error) {
        console.error('❌ Error deactivating redistribution:', error);
        return { error: handleSupabaseError(error, 'Deactivate redistribution') };
      }

      console.log('✅ Redistribution deactivated');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in deactivateRedistribution:', error);
      return { error: handleSupabaseError(error, 'Deactivate redistribution') };
    }
  },

  /**
   * Удалить перераспределение
   */
  async deleteRedistribution(redistributionId: string): Promise<ApiResponse<null>> {
    console.log('🚀 deleteRedistribution called with ID:', redistributionId);

    try {
      const { error } = await supabase
        .from('cost_redistributions')
        .delete()
        .eq('id', redistributionId);

      if (error) {
        console.error('❌ Error deleting redistribution:', error);
        return { error: handleSupabaseError(error, 'Delete redistribution') };
      }

      console.log('✅ Redistribution deleted');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in deleteRedistribution:', error);
      return { error: handleSupabaseError(error, 'Delete redistribution') };
    }
  },

  /**
   * Активировать существующее перераспределение (деактивирует остальные)
   */
  async activateRedistribution(redistributionId: string, tenderId: string): Promise<ApiResponse<null>> {
    console.log('🚀 activateRedistribution called with ID:', redistributionId);

    try {
      // Деактивировать все остальные для этого тендера
      const { error: deactivateError } = await supabase
        .from('cost_redistributions')
        .update({ is_active: false })
        .eq('tender_id', tenderId)
        .neq('id', redistributionId);

      if (deactivateError) {
        console.error('❌ Error deactivating other redistributions:', deactivateError);
        return { error: handleSupabaseError(deactivateError, 'Deactivate other redistributions') };
      }

      // Активировать выбранное
      const { error: activateError } = await supabase
        .from('cost_redistributions')
        .update({ is_active: true })
        .eq('id', redistributionId);

      if (activateError) {
        console.error('❌ Error activating redistribution:', activateError);
        return { error: handleSupabaseError(activateError, 'Activate redistribution') };
      }

      console.log('✅ Redistribution activated');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in activateRedistribution:', error);
      return { error: handleSupabaseError(error, 'Activate redistribution') };
    }
  },
};
