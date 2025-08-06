import { supabase } from '../client';
import type {
  User,
  UserUpdate,
  ApiResponse,
  PaginatedResponse,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

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