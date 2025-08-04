import { supabase } from './client';
import type {
  Tender,
  TenderInsert,
  TenderUpdate,
  TenderFilters,
  BOQItem,
  BOQItemInsert,
  BOQItemUpdate,
  BOQFilters,
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
} from './types';

// Generic error handler
const handleSupabaseError = (error: any, operation: string): string => {
  console.error(`${operation} error:`, error);
  
  if (error?.code === 'PGRST116') {
    return 'No records found';
  }
  
  if (error?.code === '23505') {
    return 'A record with this information already exists';
  }
  
  if (error?.code === '23503') {
    return 'Referenced record does not exist';
  }
  
  if (error?.code === '42501') {
    return 'Insufficient permissions for this operation';
  }
  
  return error?.message || `Failed to ${operation.toLowerCase()}`;
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
        .from('tender_analytics')
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
        .from('tender_analytics')
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

// BOQ API
export const boqApi = {
  // Get BOQ items for a tender
  async getByTenderId(
    tenderId: string,
    filters: BOQFilters = {},
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
        .eq('tender_id', tenderId);

      // Apply filters
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
      
      const { data, error, count } = await paginatedQuery.order('item_number');

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

  // Get BOQ summary for a tender
  async getSummary(tenderId: string): Promise<ApiResponse<BOQSummary>> {
    try {
      const { data, error } = await supabase
        .from('boq_summary')
        .select('*')
        .eq('tender_id', tenderId)
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get BOQ summary'),
        };
      }

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

  // Create BOQ item
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

// USERS API (for admin management)
export const usersApi = {
  // Get all users in organization
  async getAll(pagination: PaginationOptions = {}): Promise<PaginatedResponse<User>> {
    try {
      let query = supabase
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

// Real-time subscriptions
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

  // Subscribe to BOQ changes for a specific tender
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
};