import { supabase } from '../client';
import type {
  Material,
  MaterialInsert,
  MaterialUpdate,
  MaterialFilters,
  ApiResponse,
  PaginatedResponse,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

// MATERIALS API
export const materialsApi = {
  // Get all materials with filtering and pagination
  async getAll(
    filters: MaterialFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Material>> {
    try {
      // Используем представление, которое уже включает name из material_names
      let query = supabase
        .from('materials_library_with_names')
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