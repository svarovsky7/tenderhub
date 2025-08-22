import { supabase } from '../client';
import type {
  Tender,
  TenderInsert,
  TenderUpdate,
  TenderFilters,
  ApiResponse,
  PaginatedResponse,
  TenderWithSummary,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

// TENDER API
export const tendersApi = {
  // Get all tenders with optional filtering and pagination
  async getAll(
    filters: TenderFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<TenderWithSummary>> {
    try {
      let query = supabase
        .from('tenders')
        .select('*', { count: 'exact' });

      // Apply filters
      // Note: status field removed from schema
      
      if (filters.client_name) {
        query = query.ilike('client_name', `%${filters.client_name}%`);
      }
      
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tender_number.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      // Order by created_at descending
      const { data, error, count } = await paginatedQuery.order('created_at', { ascending: false });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tenders'),
        };
      }

      const { page = 1, limit = 20 } = pagination;
      
      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tenders'),
      };
    }
  },

  // Get tender by ID
  async getById(id: string): Promise<ApiResponse<TenderWithSummary>> {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tender'),
        };
      }

      return {
        data: data as TenderWithSummary,
        message: 'Tender loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender'),
      };
    }
  },

  // Create new tender
  async create(tender: TenderInsert): Promise<ApiResponse<Tender>> {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .insert(tender)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create tender'),
        };
      }

      return {
        data,
        message: 'Tender created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create tender'),
      };
    }
  },

  // Update tender
  async update(id: string, updates: TenderUpdate): Promise<ApiResponse<Tender>> {
    console.log('🔄 tendersApi.update called with:', { id, updates });
    console.log('🔍 New fields in update:', { 
      version: updates.version, 
      area_sp: updates.area_sp, 
      area_client: updates.area_client 
    });
    
    try {
      const { data, error } = await supabase
        .from('tenders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      console.log('📦 Supabase update response:', { data, error });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update tender'),
        };
      }

      return {
        data,
        message: 'Tender updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update tender'),
      };
    }
  },

  // Delete tender
  async delete(id: string): Promise<ApiResponse<null>> {
    console.log('🔥 tendersApi.delete called with ID:', id);
    
    try {
      // First check if tender exists
      console.log('🔍 Checking if tender exists...');
      const { data: existingTender, error: checkError } = await supabase
        .from('tenders')
        .select('id,title')
        .eq('id', id)
        .single();
      
      console.log('📋 Existing tender check result:', { existingTender, checkError });
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking tender existence:', checkError);
        return {
          error: handleSupabaseError(checkError, 'Check tender existence'),
        };
      }
      
      if (!existingTender) {
        console.warn('⚠️ Tender not found for deletion:', id);
        return {
          error: 'Тендер не найден',
        };
      }
      
      console.log('✅ Tender found, proceeding with deletion:', existingTender);

      // Check for related records
      console.log('🔗 Checking for related client positions...');
      const { data: positions, error: positionsError } = await supabase
        .from('client_positions')
        .select('id')
        .eq('tender_id', id);
      
      console.log('📍 Related positions:', { positions, positionsError });
      
      console.log('🔗 Checking for related BOQ items...');
      const { data: boqItems, error: boqError } = await supabase
        .from('boq_items')
        .select('id')
        .eq('tender_id', id);
      
      console.log('📋 Related BOQ items:', { boqItems, boqError });

      // Perform the deletion
      console.log('🗑️ Performing tender deletion...');
      const { error } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id);

      console.log('📤 Delete operation result:', { error });

      if (error) {
        console.error('❌ Supabase delete error:', error);
        return {
          error: handleSupabaseError(error, 'Delete tender'),
        };
      }

      console.log('✅ Tender deleted successfully:', id);
      return {
        data: null,
        message: 'Tender deleted successfully',
      };
    } catch (error) {
      console.error('💥 Exception in tender delete:', error);
      return {
        error: handleSupabaseError(error, 'Delete tender'),  
      };
    }
  },
};