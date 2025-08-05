import { supabase } from '../../client';
import type {
  BOQItem,
  BOQFilters,
  ApiResponse,
  PaginatedResponse,
  BOQItemWithPosition,
  BOQItemWithLibrary,
} from '../../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from '../utils';

/**
 * BOQ Query Operations
 * Advanced query operations for retrieving BOQ items with filtering, pagination, and relationships
 */
export const boqQueryApi = {
  /**
   * Get BOQ items for a tender with hierarchical support
   * Supports filtering by client position and enhanced sorting
   */
  async getByTenderId(
    tenderId: string,
    filters: BOQFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<BOQItemWithPosition>> {
    console.log('🚀 boqQueryApi.getByTenderId called with:', { tenderId, filters, pagination });
    
    try {
      console.log('📡 Building query for BOQ items...');
      let query = supabase
        .from('boq_items')
        .select(`
          *,
          material:materials_library(*),
          work_item:works_library(*),
          client_position:client_positions(*)
        `, { count: 'exact' })
        .eq('tender_id', tenderId);

      // Apply hierarchical filters
      if (filters.client_position_id) {
        console.log('🔍 Filtering by client_position_id:', filters.client_position_id);
        query = query.eq('client_position_id', filters.client_position_id);
      }

      if (filters.item_type?.length) {
        console.log('🔍 Filtering by item_type:', filters.item_type);
        query = query.in('item_type', filters.item_type);
      }
      
      if (filters.category?.length) {
        console.log('🔍 Filtering by category:', filters.category);
        query = query.in('category', filters.category);
      }
      
      if (filters.min_amount !== undefined) {
        console.log('🔍 Filtering by min_amount:', filters.min_amount);
        query = query.gte('total_amount', filters.min_amount);
      }
      
      if (filters.max_amount !== undefined) {
        console.log('🔍 Filtering by max_amount:', filters.max_amount);
        query = query.lte('total_amount', filters.max_amount);
      }
      
      if (filters.search) {
        console.log('🔍 Applying search filter:', filters.search);
        query = query.or(`description.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Apply pagination
      console.log('📊 Applying pagination:', pagination);
      const paginatedQuery = applyPagination(query, pagination);
      
      // Enhanced ordering for hierarchical display
      console.log('📡 Executing query with hierarchical ordering...');
      const { data, error, count } = await paginatedQuery
        .order('client_position_id', { nullsFirst: false })
        .order('sub_number');

      console.log('📦 Query response:', { dataCount: data?.length, error, totalCount: count });

      if (error) {
        console.error('❌ Query failed:', error);
        return {
          error: handleSupabaseError(error, 'Get BOQ items'),
        };
      }

      const { page = 1, limit = 20 } = pagination;
      
      console.log('✅ BOQ items retrieved successfully');
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
      console.error('💥 Exception in getByTenderId:', error);
      return {
        error: handleSupabaseError(error, 'Get BOQ items'),
      };
    }
  },

  /**
   * Get BOQ items by client position ID
   * Optimized for displaying items within a specific position
   */
  async getByClientPositionId(
    clientPositionId: string,
    filters: Omit<BOQFilters, 'client_position_id'> = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<BOQItemWithLibrary>> {
    console.log('🚀 boqQueryApi.getByClientPositionId called with:', { clientPositionId, filters, pagination });
    
    try {
      console.log('📡 Building query for position BOQ items...');
      let query = supabase
        .from('boq_items')
        .select(`
          *,
          material:materials_library(*),
          work_item:works_library(*)
        `, { count: 'exact' })
        .eq('client_position_id', clientPositionId);

      // Apply filters (excluding client_position_id)
      if (filters.item_type?.length) {
        console.log('🔍 Filtering by item_type:', filters.item_type);
        query = query.in('item_type', filters.item_type);
      }
      
      if (filters.category?.length) {
        console.log('🔍 Filtering by category:', filters.category);
        query = query.in('category', filters.category);
      }
      
      if (filters.min_amount !== undefined) {
        console.log('🔍 Filtering by min_amount:', filters.min_amount);
        query = query.gte('total_amount', filters.min_amount);
      }
      
      if (filters.max_amount !== undefined) {
        console.log('🔍 Filtering by max_amount:', filters.max_amount);
        query = query.lte('total_amount', filters.max_amount);
      }
      
      if (filters.search) {
        console.log('🔍 Applying search filter:', filters.search);
        query = query.or(`description.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Apply pagination
      console.log('📊 Applying pagination:', pagination);
      const paginatedQuery = applyPagination(query, pagination);
      
      console.log('📡 Executing position query...');
      const { data, error, count } = await paginatedQuery
        .order('sub_number')
        .order('sort_order');

      console.log('📦 Position query response:', { dataCount: data?.length, error, totalCount: count });

      if (error) {
        console.error('❌ Position query failed:', error);
        return {
          error: handleSupabaseError(error, 'Get BOQ items by position'),
        };
      }

      const { page = 1, limit = 20 } = pagination;
      
      console.log('✅ Position BOQ items retrieved successfully');
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
      console.error('💥 Exception in getByClientPositionId:', error);
      return {
        error: handleSupabaseError(error, 'Get BOQ items by position'),
      };
    }
  },

  /**
   * Get all BOQ items for a tender (legacy compatibility)
   */
  async getByTender(tenderId: string): Promise<ApiResponse<BOQItem[]>> {
    console.log('🚀 boqQueryApi.getByTender called with:', tenderId);
    
    try {
      console.log('📡 Fetching all BOQ items for tender...');
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('tender_id', tenderId)
        .order('item_number');

      console.log('📦 Tender query response:', { dataCount: data?.length, error });

      if (error) {
        console.error('❌ Tender query failed:', error);
        return {
          error: handleSupabaseError(error, 'Get BOQ items by tender'),
        };
      }

      console.log('✅ Tender BOQ items retrieved successfully');
      return {
        data: data || [],
        message: 'BOQ items loaded successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getByTender:', error);
      return {
        error: handleSupabaseError(error, 'Get BOQ items by tender'),
      };
    }
  },

  /**
   * Get BOQ items by position (legacy compatibility)
   */
  async getByPosition(positionId: string): Promise<ApiResponse<BOQItem[]>> {
    console.log('🚀 boqQueryApi.getByPosition called with:', positionId);
    
    try {
      console.log('📡 Fetching BOQ items by position...');
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('client_position_id', positionId)
        .order('item_number');

      console.log('📦 Position legacy query response:', { dataCount: data?.length, error });

      if (error) {
        console.error('❌ Position legacy query failed:', error);
        return {
          error: handleSupabaseError(error, 'Get BOQ items by position'),
        };
      }

      console.log('✅ Position BOQ items retrieved successfully');
      return {
        data: data || [],
        message: 'BOQ items loaded successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getByPosition:', error);
      return {
        error: handleSupabaseError(error, 'Get BOQ items by position'),
      };
    }
  },
};