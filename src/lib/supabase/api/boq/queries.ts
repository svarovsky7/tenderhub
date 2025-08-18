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
 * Extended BOQ item with linked materials information
 */
export interface BOQItemWithLinkedMaterials extends BOQItemWithLibrary {
  linked_materials?: Array<{
    link_id: string;
    material_item: BOQItemWithLibrary;
    conversion_coefficient: number;
    calculated_quantity: number;
    calculated_total: number;
  }>;
}

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

  /**
   * Get BOQ items with linked materials for hierarchical display
   * Returns work items with their linked materials nested underneath
   */
  async getHierarchicalByPosition(
    clientPositionId: string
  ): Promise<ApiResponse<BOQItemWithLinkedMaterials[]>> {
    console.log('🚀 boqQueryApi.getHierarchicalByPosition called with:', clientPositionId);
    
    try {
      console.log('📡 Fetching work items for position...');
      
      // First, get all work items in the position
      const { data: workItems, error: workError } = await supabase
        .from('boq_items')
        .select(`
          *,
          material:materials_library(*),
          work_item:works_library(*)
        `)
        .eq('client_position_id', clientPositionId)
        .eq('item_type', 'work')
        .order('sub_number')
        .order('sort_order');

      if (workError) {
        console.error('❌ Failed to fetch work items:', workError);
        return {
          error: handleSupabaseError(workError, 'Get work items for position'),
        };
      }

      console.log('📦 Work items fetched:', workItems?.length || 0);

      // Now get linked materials for each work item
      const hierarchicalItems: BOQItemWithLinkedMaterials[] = [];
      
      for (const workItem of workItems || []) {
        console.log('🔗 Processing work item:', workItem.id);
        
        // Get linked materials using the database function
        const { data: linkedMaterials, error: materialsError } = await supabase
          .rpc('get_materials_for_work', { 
            p_work_boq_item_id: workItem.id 
          });

        if (materialsError) {
          console.error('❌ Failed to fetch linked materials for work:', workItem.id, materialsError);
          // Continue with empty linked materials instead of failing
        }

        console.log(`📋 Found ${linkedMaterials?.length || 0} linked materials for work:`, workItem.description);

        // Fetch full material item details for each linked material
        const linkedMaterialsWithDetails = [];
        for (const linkedMat of linkedMaterials || []) {
          console.log('📦 Fetching material details for:', linkedMat.material_id);
          
          const { data: materialItem, error: matError } = await supabase
            .from('boq_items')
            .select(`
              *,
              material:materials_library(*),
              work_item:works_library(*)
            `)
            .eq('id', linkedMat.material_id) // Fixed: use material_id from function result
            .single();

          if (!matError && materialItem) {
            linkedMaterialsWithDetails.push({
              link_id: linkedMat.link_id,
              material_item: materialItem,
              conversion_coefficient: linkedMat.conversion_coefficient || 1,
              calculated_quantity: linkedMat.total_needed || 0,
              calculated_total: linkedMat.total_cost || 0
            });
          }
        }

        // Add work item with linked materials
        hierarchicalItems.push({
          ...workItem,
          linked_materials: linkedMaterialsWithDetails
        });

        // Add each linked material as a nested item (visually indented)
        for (const linkedMat of linkedMaterialsWithDetails) {
          // Ensure material_item has a valid ID before adding
          if (linkedMat.material_item && linkedMat.material_item.id) {
            hierarchicalItems.push({
              ...linkedMat.material_item,
              // Mark as linked material for special rendering
              is_linked_material: true,
              parent_work_id: workItem.id,
              link_data: {
                link_id: linkedMat.link_id,
                conversion_coefficient: linkedMat.conversion_coefficient,
                calculated_quantity: linkedMat.calculated_quantity,
                calculated_total: linkedMat.calculated_total
              }
            } as any);
          }
        }
      }

      // Finally, get all standalone materials (not linked to works)
      console.log('📡 Fetching standalone materials...');
      
      // Get IDs of already linked materials
      const linkedMaterialIds = hierarchicalItems
        .filter(item => (item as any).is_linked_material)
        .map(item => item.id)
        .filter(id => id && id !== ''); // Filter out empty or null IDs
      
      console.log('🔗 Already linked material IDs:', linkedMaterialIds);
      
      // Build query for standalone materials
      let standaloneQuery = supabase
        .from('boq_items')
        .select(`
          *,
          material:materials_library(*),
          work_item:works_library(*)
        `)
        .eq('client_position_id', clientPositionId)
        .eq('item_type', 'material')
        .order('sub_number')
        .order('sort_order');
      
      // Only add the NOT IN clause if there are valid linked materials to exclude
      if (linkedMaterialIds.length > 0 && linkedMaterialIds.every(id => id && id !== '')) {
        standaloneQuery = standaloneQuery.not('id', 'in', `(${linkedMaterialIds.join(',')})`);
      }
      
      const { data: standaloneMaterials, error: standaloneError } = await standaloneQuery;

      if (standaloneError) {
        console.error('⚠️ Failed to fetch standalone materials:', standaloneError);
      } else if (standaloneMaterials) {
        console.log(`📦 Found ${standaloneMaterials.length} standalone materials`);
        hierarchicalItems.push(...standaloneMaterials.map(mat => ({ ...mat })));
      }

      console.log('✅ Hierarchical BOQ items constructed:', hierarchicalItems.length);
      return {
        data: hierarchicalItems,
        message: 'Hierarchical BOQ items loaded successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getHierarchicalByPosition:', error);
      return {
        error: handleSupabaseError(error, 'Get hierarchical BOQ items'),
      };
    }
  },
};