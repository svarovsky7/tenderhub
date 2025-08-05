import { supabase } from './client';
import * as XLSX from 'xlsx';
import type {
  Tender,
  TenderInsert,
  TenderUpdate,
  TenderFilters,
  BOQItem,
  BOQItemInsert,
  BOQItemUpdate,
  BOQFilters,
  ClientPosition,
  ClientPositionInsert,
  ClientPositionUpdate,
  ClientPositionFilters,
  ClientPositionWithItems,
  BOQItemWithPosition,
  Material,
  MaterialInsert,
  MaterialUpdate,
  MaterialFilters,
  WorkItem,
  WorkItemInsert,
  WorkItemUpdate,
  WorkItemFilters,
  User,
  UserUpdate,
  ApiResponse,
  PaginatedResponse,
  TenderWithSummary,
  BOQItemWithLibrary,
  BOQSummary,
  ClientPositionSummary,
  TenderHierarchy,
  TenderSummary,
  HierarchyMoveOperation,
  // BulkBOQInsert,
  PositionReorderOperation,
  HierarchyLoadOptions,
} from './types';

// Generic error handler
const handleSupabaseError = (error: unknown, operation: string): string => {
  console.error(`${operation} error:`, error);
  
  if ((error as any)?.code === 'PGRST116') {
    return 'No records found';
  }
  
  if ((error as any)?.code === '23505') {
    return 'A record with this information already exists';
  }
  
  if ((error as any)?.code === '23503') {
    return 'Referenced record does not exist';
  }
  
  if ((error as any)?.code === '42501') {
    return 'Insufficient permissions for this operation';
  }
  
  return (error as any)?.message || `Failed to ${operation.toLowerCase()}`;
};

// Generic pagination helper
interface PaginationOptions {
  page?: number;
  limit?: number;
}

const applyPagination = (query: any, options: PaginationOptions = {}) => {
  const { page = 1, limit = 20 } = options;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  return query.range(from, to);
};

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
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
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
    try {
      const { data, error } = await supabase
        .from('tenders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
    try {
      const { error } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete tender'),
        };
      }

      return {
        data: null,
        message: 'Tender deleted successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete tender'),
      };
    }
  },
};

// BOQ API (Enhanced for Hierarchical Structure)
export const boqApi = {
  /**
   * Get BOQ items for a tender with hierarchical support
   * Supports filtering by client position and enhanced sorting
   */
  async getByTenderId(
    tenderId: string,
    filters: BOQFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<BOQItemWithPosition>> {
    try {
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
        query = query.eq('client_position_id', filters.client_position_id);
      }

      if (filters.item_type?.length) {
        query = query.in('item_type', filters.item_type);
      }
      
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters.min_amount !== undefined) {
        query = query.gte('total_amount', filters.min_amount);
      }
      
      if (filters.max_amount !== undefined) {
        query = query.lte('total_amount', filters.max_amount);
      }
      
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      // Enhanced ordering for hierarchical display
      const { data, error, count } = await paginatedQuery
        .order('client_position_id', { nullsFirst: false })
        .order('sub_number');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ items'),
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
    try {
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
        query = query.in('item_type', filters.item_type);
      }
      
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters.min_amount !== undefined) {
        query = query.gte('total_amount', filters.min_amount);
      }
      
      if (filters.max_amount !== undefined) {
        query = query.lte('total_amount', filters.max_amount);
      }
      
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      const { data, error, count } = await paginatedQuery
        .order('sub_number')
        .order('sort_order');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ items by position'),
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
        error: handleSupabaseError(error, 'Get BOQ items by position'),
      };
    }
  },

  // Get BOQ summary for a tender
  async getSummary(tenderId: string): Promise<ApiResponse<BOQSummary>> {
    try {
      // BOQ summary calculated from boq_items
      const { data: boqItems, error } = await supabase
        .from('boq_items')
        .select('total_amount')
        .eq('tender_id', tenderId);
      
      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ summary'),
        };
      }

      const data = {
        tender_id: tenderId,
        total_items: boqItems?.length || 0,
        total_amount: boqItems?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0,
        materials_count: 0, // Could be calculated if needed
        works_count: 0, // Could be calculated if needed
      };

      return {
        data,
        message: 'BOQ summary loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get BOQ summary'),
      };
    }
  },

  /**
   * Create BOQ item with automatic sub-numbering
   * If client_position_id is provided, sub_number is automatically assigned
   */
  async create(item: BOQItemInsert): Promise<ApiResponse<BOQItem>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .insert(item)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create BOQ item'),
        };
      }

      return {
        data,
        message: 'BOQ item created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create BOQ item'),
      };
    }
  },

  // Bulk create BOQ items (for Excel imports)
  async bulkCreate(tenderId: string, items: BOQItemInsert[]): Promise<ApiResponse<number>> {
    try {
      // Use the database function for optimized bulk insert
      const { data, error } = await supabase.rpc('bulk_insert_boq_items', {
        p_tender_id: tenderId,
        p_items: items,
      });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Bulk create BOQ items'),
        };
      }

      return {
        data,
        message: `${data} BOQ items created successfully`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Bulk create BOQ items'),
      };
    }
  },

  /**
   * Bulk create BOQ items for a specific client position
   * Uses optimized database function with automatic sub-numbering
   */
  async bulkCreateInPosition(
    clientPositionId: string, 
    items: BOQItemInsert[]
  ): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase.rpc('bulk_insert_boq_items_to_position', {
        p_client_position_id: clientPositionId,
        p_items: items,
      });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Bulk create BOQ items in position'),
        };
      }

      return {
        data,
        message: `${data} BOQ items created in position successfully`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Bulk create BOQ items in position'),
      };
    }
  },

  /**
   * Move BOQ item to different client position
   * Automatically handles sub-number reassignment
   */
  async moveToPosition(
    itemId: string,
    targetPositionId: string,
    newSortOrder?: number
  ): Promise<ApiResponse<BOQItem>> {
    try {
      // Get next sub number for target position
      const { data: nextSubNumber, error: subError } = await supabase.rpc('get_next_sub_number', {
        p_client_position_id: targetPositionId,
      });

      if (subError) {
        return {
          error: handleSupabaseError(subError, 'Get next sub number'),
        };
      }

      // Update the item
      const updates: BOQItemUpdate = {
        client_position_id: targetPositionId,
        sub_number: nextSubNumber,
        sort_order: newSortOrder || 0,
      };

      const { data, error } = await supabase
        .from('boq_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Move BOQ item to position'),
        };
      }

      return {
        data,
        message: 'BOQ item moved successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Move BOQ item to position'),
      };
    }
  },

  /**
   * Batch move multiple BOQ items between positions
   * Optimized for drag-and-drop operations
   */
  async batchMove(operations: HierarchyMoveOperation[]): Promise<ApiResponse<number>> {
    try {
      let successCount = 0;
      const errors: string[] = [];

      for (const operation of operations) {
        const result = await this.moveToPosition(
          operation.itemId,
          operation.targetPositionId,
          operation.newSortOrder
        );

        if (result.error) {
          errors.push(`Item ${operation.itemId}: ${result.error}`);
        } else {
          successCount++;
        }
      }

      if (errors.length > 0) {
        return {
          error: `Some moves failed: ${errors.join('; ')}`,
        };
      }

      return {
        data: successCount,
        message: `${successCount} items moved successfully`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Batch move BOQ items'),
      };
    }
  },

  /**
   * Reorder BOQ items within a client position
   * Updates sort_order for proper sequencing
   */
  async reorderInPosition(
    clientPositionId: string,
    itemIds: string[]
  ): Promise<ApiResponse<number>> {
    try {
      const updates = itemIds.map((itemId, index) => 
        supabase
          .from('boq_items')
          .update({ sort_order: index })
          .eq('id', itemId)
          .eq('client_position_id', clientPositionId)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        return {
          error: `Failed to reorder items: ${errors[0].error?.message}`,
        };
      }

      return {
        data: itemIds.length,
        message: `${itemIds.length} items reordered successfully`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Reorder BOQ items in position'),
      };
    }
  },

  // Update BOQ item
  async update(id: string, updates: BOQItemUpdate): Promise<ApiResponse<BOQItem>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update BOQ item'),
        };
      }

      return {
        data,
        message: 'BOQ item updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update BOQ item'),
      };
    }
  },

  // Delete BOQ item
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('boq_items')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete BOQ item'),
        };
      }

      return {
        data: null,
        message: 'BOQ item deleted successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete BOQ item'),
      };
    }
  },
};

// MATERIALS API
export const materialsApi = {
  // Get all materials with filtering and pagination
  async getAll(
    filters: MaterialFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Material>> {
    try {
      let query = supabase
        .from('materials_library')
        .select('*', { count: 'exact' })
        .eq('is_active', filters.is_active ?? true);

      // Apply filters
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters.supplier?.length) {
        query = query.in('supplier', filters.supplier);
      }
      
      if (filters.price_range) {
        query = query.gte('base_price', filters.price_range[0]).lte('base_price', filters.price_range[1]);
      }
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      const { data, error, count } = await paginatedQuery.order('name');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get materials'),
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
        error: handleSupabaseError(error, 'Get materials'),
      };
    }
  },

  // Create material
  async create(material: MaterialInsert): Promise<ApiResponse<Material>> {
    try {
      const { data, error } = await supabase
        .from('materials_library')
        .insert(material)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create material'),
        };
      }

      return {
        data,
        message: 'Material created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create material'),
      };
    }
  },

  // Update material
  async update(id: string, updates: MaterialUpdate): Promise<ApiResponse<Material>> {
    try {
      const { data, error } = await supabase
        .from('materials_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update material'),
        };
      }

      return {
        data,
        message: 'Material updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update material'),
      };
    }
  },

  // Delete material (soft delete by setting is_active to false)
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('materials_library')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete material'),
        };
      }

      return {
        data: null,
        message: 'Material deleted successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete material'),
      };
    }
  },
};

// WORKS API
export const worksApi = {
  // Get all work items with filtering and pagination
  async getAll(
    filters: WorkItemFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<WorkItem>> {
    try {
      let query = supabase
        .from('works_library')
        .select('*', { count: 'exact' })
        .eq('is_active', filters.is_active ?? true);

      // Apply filters
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters.price_range) {
        query = query.gte('base_price', filters.price_range[0]).lte('base_price', filters.price_range[1]);
      }
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      const { data, error, count } = await paginatedQuery.order('name');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get work items'),
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
        error: handleSupabaseError(error, 'Get work items'),
      };
    }
  },

  // Create work item
  async create(workItem: WorkItemInsert): Promise<ApiResponse<WorkItem>> {
    try {
      const { data, error } = await supabase
        .from('works_library')
        .insert(workItem)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create work item'),
        };
      }

      return {
        data,
        message: 'Work item created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create work item'),
      };
    }
  },

  // Update work item
  async update(id: string, updates: WorkItemUpdate): Promise<ApiResponse<WorkItem>> {
    try {
      const { data, error } = await supabase
        .from('works_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update work item'),
        };
      }

      return {
        data,
        message: 'Work item updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update work item'),
      };
    }
  },

  // Delete work item (soft delete by setting is_active to false)
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('works_library')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete work item'),
        };
      }

      return {
        data: null,
        message: 'Work item deleted successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete work item'),
      };
    }
  },
};

// HIERARCHY API - For complete tender structure management
export const hierarchyApi = {
  /**
   * Get complete tender hierarchy with positions and BOQ items
   * Optimized for displaying full tender structure
   */
  async getTenderHierarchy(
    tenderId: string,
    options: HierarchyLoadOptions = {}
  ): Promise<ApiResponse<TenderHierarchy[]>> {
    try {
      const { 
        // include_items = true, 
        limit, 
        offset = 0
        // positions_only = false 
      } = options;

      // Get tender hierarchy by joining client_positions and boq_items
      let query = supabase
        .from('client_positions')
        .select(`
          *,
          boq_items!client_position_id(*)
        `)
        .eq('tender_id', tenderId);

      // Apply performance pagination if specified
      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query.order('position_number');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tender hierarchy'),
        };
      }

      return {
        data: data || [],
        message: 'Tender hierarchy loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender hierarchy'),
      };
    }
  },

  /**
   * Get tender summary with aggregated totals
   * Fast overview of tender financial structure
   */
  async getTenderSummary(tenderId: string): Promise<ApiResponse<TenderSummary>> {
    try {
      // Get tender with basic aggregated data
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', tenderId)
        .single();

      if (tenderError) {
        return {
          error: handleSupabaseError(tenderError, 'Get tender summary'),
        };
      }

      // Get positions count
      const { count: positionsCount } = await supabase
        .from('client_positions')
        .select('*', { count: 'exact', head: true })
        .eq('tender_id', tenderId);

      // Get BOQ items summary  
      const { data: boqItems, error: boqError } = await supabase
        .from('boq_items')
        .select('total_amount, item_type')
        .eq('tender_id', tenderId);

      const data = {
        ...tender,
        positions_count: positionsCount || 0,
        total_items: boqItems?.length || 0,
        total_amount: boqItems?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0,
        materials_count: boqItems?.filter(item => item.item_type === 'material').length || 0,
        works_count: boqItems?.filter(item => item.item_type === 'work').length || 0,
      };

      const error = boqError;

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tender summary'),
        };
      }

      return {
        data,
        message: 'Tender summary loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender summary'),
      };
    }
  },

  /**
   * Get structured tender data with nested client positions and BOQ items
   * Optimized for React component tree rendering
   */
  async getTenderWithPositions(
    tenderId: string,
    options: HierarchyLoadOptions = {}
  ): Promise<ApiResponse<any>> {
    try {
      // Get tender basic info
      const tenderResult = await tendersApi.getById(tenderId);
      if (tenderResult.error) {
        return {
          error: tenderResult.error,
        };
      }

      // Get positions with their BOQ items
      const positionsResult = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
      if (positionsResult.error) {
        return {
          error: positionsResult.error,
        };
      }

      const positionsWithItems: ClientPositionWithItems[] = [];

      if (options.include_items !== false) {
        // Load BOQ items for each position
        for (const position of positionsResult.data || []) {
          const itemsResult = await boqApi.getByClientPositionId(position.id!, {}, { limit: 1000 });
          
          positionsWithItems.push({
            ...position,
            description: (position as any).description || '',
            priority: (position as any).priority || 1,
            boq_items: itemsResult.data || [],
            items_count: itemsResult.data?.length || 0,
            materials_count: itemsResult.data?.filter(item => item.item_type === 'material').length || 0,
            works_count: itemsResult.data?.filter(item => item.item_type === 'work').length || 0,
          } as any);
        }
      } else {
        // Just positions without items
        positionsWithItems.push(...(positionsResult.data?.map((pos: any) => ({
          ...pos,
          boq_items: [],
          items_count: pos.items_count || 0,
          materials_count: pos.materials_count || 0,
          works_count: pos.works_count || 0,
        })) || []));
      }

      // Get summary
      const summaryResult = await this.getTenderSummary(tenderId);

      const result: any = {
        ...tenderResult.data!,
        client_positions: positionsWithItems,
        summary: summaryResult.data || undefined,
      };

      return {
        data: result,
        message: 'Tender with full hierarchy loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender with positions'),
      };
    }
  },

  /**
   * Create complete tender structure from template or import
   * Handles bulk creation of positions and BOQ items
   */
  async createTenderStructure(
    tenderId: string,
    structure: {
      positions: ClientPositionInsert[];
      itemsByPosition: Record<string, BOQItemInsert[]>;
    }
  ): Promise<ApiResponse<{ positionsCreated: number; itemsCreated: number }>> {
    try {
      // Create positions first
      const positionsResult = await clientPositionsApi.bulkCreate(tenderId, structure.positions);
      if (positionsResult.error) {
        return {
          error: positionsResult.error,
        };
      }

      let totalItemsCreated = 0;

      // Create BOQ items for each position
      for (const position of positionsResult.data!) {
        const positionKey = structure.positions.findIndex(p => p.title === position.title).toString();
        const items = structure.itemsByPosition[positionKey];
        
        if (items && items.length > 0) {
          const itemsResult = await boqApi.bulkCreateInPosition(position.id, items);
          if (itemsResult.error) {
            return {
              error: `Failed to create items for position ${position.title}: ${itemsResult.error}`,
            };
          }
          totalItemsCreated += itemsResult.data || 0;
        }
      }

      return {
        data: {
          positionsCreated: positionsResult.data!.length,
          itemsCreated: totalItemsCreated,
        },
        message: `Tender structure created: ${positionsResult.data!.length} positions, ${totalItemsCreated} items`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create tender structure'),
      };
    }
  },

  /**
   * Clone tender structure to a new tender
   * Copies all positions and BOQ items with new IDs
   */
  async cloneTenderStructure(
    sourceTenderId: string,
    targetTenderId: string
  ): Promise<ApiResponse<{ positionsCreated: number; itemsCreated: number }>> {
    try {
      // Get source structure
      const sourceResult = await this.getTenderWithPositions(sourceTenderId, { include_items: true });
      if (sourceResult.error) {
        return {
          error: sourceResult.error,
        };
      }

      // Prepare positions for cloning
      const positions: ClientPositionInsert[] = sourceResult.data!.client_positions!.map((pos: any) => ({
        tender_id: targetTenderId,
        title: pos.title,
        description: pos.description,
        category: pos.category,
        priority: pos.priority,
        status: 'active' as const,
      }));

      // Prepare items by position
      const itemsByPosition: Record<string, BOQItemInsert[]> = {};
      
      sourceResult.data!.client_positions!.forEach((pos: any, index: any) => {
        if (pos.boq_items && pos.boq_items.length > 0) {
          itemsByPosition[index.toString()] = pos.boq_items.map((item: any) => ({
            tender_id: targetTenderId,
            item_type: item.item_type,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_rate: item.unit_rate,
            material_id: item.material_id,
            work_id: item.work_id,
            category: item.category,
            notes: item.notes,
            markup_percentage: item.markup_percentage,
          }));
        }
      });

      // Create the structure
      return await this.createTenderStructure(targetTenderId, {
        positions,
        itemsByPosition,
      });
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Clone tender structure'),
      };
    }
  },

  /**
   * Search across entire tender hierarchy
   * Full-text search through positions and BOQ items
   */
  async searchInTender(
    tenderId: string,
    searchTerm: string,
    filters: {
      includePositions?: boolean;
      includeItems?: boolean;
      itemTypes?: ('work' | 'material')[];
    } = {}
  ): Promise<ApiResponse<{
    positions: ClientPositionSummary[];
    items: BOQItemWithPosition[];
  }>> {
    try {
      const {
        includePositions = true,
        includeItems = true,
        itemTypes = ['work', 'material']
      } = filters;

      const results = {
        positions: [] as ClientPositionSummary[],
        items: [] as BOQItemWithPosition[],
      };

      // Search in positions
      if (includePositions) {
        const positionsResult = await clientPositionsApi.getByTenderId(
          tenderId,
          { search: searchTerm },
          { limit: 100 }
        );
        
        if (!positionsResult.error) {
          results.positions = positionsResult.data || [];
        }
      }

      // Search in BOQ items
      if (includeItems) {
        const itemsResult = await boqApi.getByTenderId(
          tenderId,
          { 
            search: searchTerm,
            item_type: itemTypes
          },
          { limit: 100 }
        );
        
        if (!itemsResult.error) {
          results.items = itemsResult.data || [];
        }
      }

      return {
        data: results,
        message: `Found ${results.positions.length} positions and ${results.items.length} items`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Search in tender'),
      };
    }
  },

  /**
   * Export tender hierarchy for reporting or backup
   * Returns complete structure in a format suitable for Excel/PDF export
   */
  async exportTenderStructure(tenderId: string): Promise<ApiResponse<{
    tender: TenderWithSummary;
    hierarchy: TenderHierarchy[];
    summary: TenderSummary;
  }>> {
    try {
      // Get all data in parallel
      const [tenderResult, hierarchyResult, summaryResult] = await Promise.all([
        tendersApi.getById(tenderId),
        this.getTenderHierarchy(tenderId),
        this.getTenderSummary(tenderId),
      ]);

      // Check for errors
      if (tenderResult.error) return { error: tenderResult.error };
      if (hierarchyResult.error) return { error: hierarchyResult.error };
      if (summaryResult.error) return { error: summaryResult.error };

      return {
        data: {
          tender: tenderResult.data!,
          hierarchy: hierarchyResult.data!,
          summary: summaryResult.data!,
        },
        message: 'Tender structure exported successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Export tender structure'),
      };
    }
  },
};

// CLIENT POSITIONS API
export const clientPositionsApi = {
  /**
   * Get all client positions for a tender with optional filtering and pagination
   * Supports automatic numbering and cost calculations
   */
  async getByTenderId(
    tenderId: string,
    filters: ClientPositionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<ClientPositionSummary>> {
    try {
      let query = supabase
        .from('client_positions')
        .select('*', { count: 'exact' })
        .eq('tender_id', tenderId);

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      // Note: cost filters removed as total_position_cost doesn't exist in base table
      // These would need to be calculated from BOQ items if needed
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      // Order by position number
      const { data, error, count } = await paginatedQuery.order('position_number');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get client positions'),
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
        error: handleSupabaseError(error, 'Get client positions'),
      };
    }
  },

  /**
   * Get a single client position by ID with all details
   */
  async getById(id: string): Promise<ApiResponse<ClientPositionSummary>> {
    try {
      const { data, error } = await supabase
        .from('client_positions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get client position'),
        };
      }

      return {
        data,
        message: 'Client position loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get client position'),
      };
    }
  },

  /**
   * Create a new client position
   * Position number is automatically assigned if not provided
   */
  async create(position: ClientPositionInsert): Promise<ApiResponse<ClientPosition>> {
    try {
      const { data, error } = await supabase
        .from('client_positions')
        .insert(position)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create client position'),
        };
      }

      return {
        data,
        message: 'Client position created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create client position'),
      };
    }
  },

  /**
   * Update an existing client position
   * Note: Manual cost updates are discouraged as they'll be overridden by triggers
   */
  async update(id: string, updates: ClientPositionUpdate): Promise<ApiResponse<ClientPosition>> {
    try {
      const { data, error } = await supabase
        .from('client_positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update client position'),
        };
      }

      return {
        data,
        message: 'Client position updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update client position'),
      };
    }
  },

  /**
   * Delete a client position and all its BOQ items
   * This is a cascading delete operation
   */
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('client_positions')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete client position'),
        };
      }

      return {
        data: null,
        message: 'Client position deleted successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete client position'),
      };
    }
  },

  /**
   * Reorder client positions in a tender
   * Automatically renumbers all positions based on new order
   */
  async reorder(tenderId: string, newOrder: PositionReorderOperation[]): Promise<ApiResponse<number>> {
    try {
      // Update each position with new number
      const updates = newOrder.map(({ positionId, newNumber }) => 
        supabase
          .from('client_positions')
          .update({ position_number: newNumber })
          .eq('id', positionId)
      );

      // Execute all updates
      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        return {
          error: `Failed to reorder positions: ${errors[0].error?.message}`,
        };
      }

      // Alternative: Use the database function for atomic renumbering
      const { data, error } = await supabase.rpc('renumber_client_positions', {
        p_tender_id: tenderId,
      });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Reorder client positions'),
        };
      }

      return {
        data,
        message: `${data} positions reordered successfully`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Reorder client positions'),
      };
    }
  },

  /**
   * Get the next available position number for a tender
   */
  async getNextPositionNumber(tenderId: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase.rpc('get_next_client_position_number', {
        p_tender_id: tenderId,
      });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get next position number'),
        };
      }

      return {
        data,
        message: 'Next position number calculated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get next position number'),
      };
    }
  },

  /**
   * Bulk create multiple client positions for a tender
   */
  async bulkCreate(tenderId: string, positions: ClientPositionInsert[]): Promise<ApiResponse<ClientPosition[]>> {
    try {
      // Ensure all positions have the correct tender_id
      const positionsWithTenderId = positions.map(pos => ({
        ...pos,
        tender_id: tenderId,
      }));

      const { data, error } = await supabase
        .from('client_positions')
        .insert(positionsWithTenderId)
        .select();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Bulk create client positions'),
        };
      }

      return {
        data: data || [],
        message: `${data?.length || 0} client positions created successfully`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Bulk create client positions'),
      };
    }
  },
};

// USERS API (for admin management)
export const usersApi = {
  // Get all users in organization
  async getAll(pagination: PaginationOptions = {}): Promise<PaginatedResponse<User>> {
    try {
      const query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      const { data, error, count } = await paginatedQuery.order('full_name');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get users'),
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
        error: handleSupabaseError(error, 'Get users'),
      };
    }
  },

  // Update user
  async update(id: string, updates: UserUpdate): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update user'),
        };
      }

      return {
        data,
        message: 'User updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update user'),
      };
    }
  },

  // Deactivate user
  async deactivate(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Deactivate user'),
        };
      }

      return {
        data: null,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Deactivate user'),
      };
    }
  },
};

// Real-time subscriptions (Enhanced for Hierarchical Structure)
export const subscriptions = {
  // Subscribe to tender changes
  subscribeTenders: (callback: (payload: any) => void) => {
    return supabase
      .channel('tenders_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tenders' 
      }, callback)
      .subscribe();
  },

  // Subscribe to client positions changes for a specific tender
  subscribeClientPositions: (tenderId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`client_positions_${tenderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'client_positions',
        filter: `tender_id=eq.${tenderId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to BOQ changes for a specific tender (hierarchical aware)
  subscribeBOQ: (tenderId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`boq_changes_${tenderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'boq_items',
        filter: `tender_id=eq.${tenderId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to BOQ changes for a specific client position
  subscribeBOQByPosition: (clientPositionId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`boq_position_${clientPositionId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'boq_items',
        filter: `client_position_id=eq.${clientPositionId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to complete tender hierarchy changes
  subscribeTenderHierarchy: (tenderId: string, callback: (payload: any) => void) => {
    const channel = supabase.channel(`tender_hierarchy_${tenderId}`);

    // Subscribe to tender changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tenders',
      filter: `id=eq.${tenderId}`
    }, callback);

    // Subscribe to client positions changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'client_positions',
      filter: `tender_id=eq.${tenderId}`
    }, callback);

    // Subscribe to BOQ items changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'boq_items',
      filter: `tender_id=eq.${tenderId}`
    }, callback);

    return channel.subscribe();
  },

  // Subscribe to materials library changes
  subscribeMaterials: (callback: (payload: any) => void) => {
    return supabase
      .channel('materials_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'materials_library' 
      }, callback)
      .subscribe();
  },

  // Subscribe to works library changes
  subscribeWorks: (callback: (payload: any) => void) => {
    return supabase
      .channel('works_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'works_library' 
      }, callback)
      .subscribe();
  },

  // Performance monitoring subscription for hierarchy operations
  subscribeSlowQueries: (callback: (payload: any) => void) => {
    return supabase
      .channel('performance_monitoring')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'slow_queries' 
      }, callback)
      .subscribe();
  },
};

// Add export for new APIs
export const boqItemsApi = {
  async getByPosition(positionId: string): Promise<ApiResponse<BOQItem[]>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('client_position_id', positionId)
        .order('item_number');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ items by position'),
        };
      }

      return {
        data: data || [],
        message: 'BOQ items loaded successfully',
      };
    } catch (error) {
      return {
        error: `Failed to get BOQ items: ${error}`,
      };
    }
  },

  async getByTender(tenderId: string): Promise<ApiResponse<BOQItem[]>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('tender_id', tenderId)
        .order('item_number');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ items by tender'),
        };
      }

      return {
        data: data || [],
        message: 'BOQ items loaded successfully',
      };
    } catch (error) {
      return {
        error: `Failed to get BOQ items: ${error}`,
      };
    }
  },

  async getById(itemId: string): Promise<ApiResponse<BOQItem>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ item'),
        };
      }

      return {
        data,
        message: 'BOQ item loaded successfully',
      };
    } catch (error) {
      return {
        error: `Failed to get BOQ item: ${error}`,
      };
    }
  },

  async create(itemData: BOQItemInsert): Promise<ApiResponse<BOQItem>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .insert(itemData)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create BOQ item'),
        };
      }

      return {
        data,
        message: 'BOQ item created successfully',
      };
    } catch (error) {
      return {
        error: `Failed to create BOQ item: ${error}`,
      };
    }
  },

  async update(itemId: string, updates: BOQItemUpdate): Promise<ApiResponse<BOQItem>> {
    try {
      const { data, error } = await supabase
        .from('boq_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update BOQ item'),
        };
      }

      return {
        data,
        message: 'BOQ item updated successfully',
      };
    } catch (error) {
      return {
        error: `Failed to update BOQ item: ${error}`,
      };
    }
  },

  async delete(itemId: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('boq_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete BOQ item'),
        };
      }

      return {
        data: true,
        message: 'BOQ item deleted successfully',
      };
    } catch (error) {
      return {
        error: `Failed to delete BOQ item: ${error}`,
      };
    }
  },
};

export const clientWorksApi = {
  async uploadFromXlsx(tenderId: string, file: File): Promise<ApiResponse<boolean>> {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: ['item_no', 'work_name', 'unit', 'client_volume', 'client_notes'],
        range: 1,
      });
      const records: BOQItemInsert[] = rows.map((r, index) => ({
        tender_id: tenderId,
        item_number: String(r['item_no'] ?? index + 1),
        sub_number: 1,
        item_type: 'work',
        description: String(r['work_name'] || ''),
        unit: String(r['unit'] || ''),
        quantity: Number(r['client_volume']) || 0,
        unit_rate: 0,
        notes: r['client_notes'] ? String(r['client_notes']) : null,
        sort_order: index,
      }));

      const { error } = await supabase.from('boq_items').insert(records);

      if (error) {
        return { error: handleSupabaseError(error, 'Upload BOQ items') };
      }

      return { data: true, message: 'BOQ items uploaded successfully' };
    } catch (error) {
      return { error: handleSupabaseError(error, 'Upload BOQ items') };
    }
  },
};
