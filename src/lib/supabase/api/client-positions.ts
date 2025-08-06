import { supabase } from '../client';
import type {
  ClientPosition,
  ClientPositionInsert,
  ClientPositionUpdate,
  ClientPositionFilters,
  ApiResponse,
  PaginatedResponse,
  ClientPositionSummary,
  PositionReorderOperation,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

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