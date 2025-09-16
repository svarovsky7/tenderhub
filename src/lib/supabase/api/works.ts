import { supabase } from '../client';
import type {
  WorkItem,
  WorkItemInsert,
  WorkItemUpdate,
  WorkItemFilters,
  ApiResponse,
  PaginatedResponse,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

// WORKS API
export const worksApi = {
  // Get all work items with filtering and pagination
  async getAll(
    filters: WorkItemFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<WorkItem>> {
    try {
      // Используем представление, которое уже включает name из work_names
      let query = supabase
        .from('works_library_with_names')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
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