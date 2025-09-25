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
    console.log('🚀 clientPositionsApi.getByTenderId called:', { tenderId, filters, pagination });
    
    try {
      let query = supabase
        .from('client_positions')
        .select('*', { count: 'exact' })
        .eq('tender_id', tenderId);

      // Apply filters
      // Note: status field removed from schema
      
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      // Note: cost filters removed as total_position_cost doesn't exist in base table
      // These would need to be calculated from BOQ items if needed
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,client_note.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      // Order by position number
      const { data, error, count } = await paginatedQuery.order('position_number');

      console.log('📦 Query result:', { 
        dataLength: data?.length, 
        error, 
        count,
        firstItem: data?.[0] ? {
          id: data[0].id,
          position_number: data[0].position_number,
          item_no: data[0].item_no,
          work_name: data[0].work_name
        } : null
      });

      if (error) {
        console.error('❌ Error fetching positions:', error);
        return {
          error: handleSupabaseError(error, 'Get client positions'),
        };
      }

      const { page = 1, limit = 20 } = pagination;
      
      console.log('✅ Returning positions:', data?.length || 0);
      
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
    console.log('🚀 clientPositionsApi.create called with:', position);
    
    try {
      // If position_number is not provided or is 0, get the next available number
      if (!position.position_number || position.position_number === 0) {
        console.log('🔍 Position number not provided, fetching next available...');
        
        // Try to use database function first for thread-safe generation
        const { data: dbPositionNumber, error: rpcError } = await supabase
          .rpc('get_next_position_number', { p_tender_id: position.tender_id });
        
        if (rpcError) {
          console.error('❌ Failed to get next position_number from database function:', rpcError);
          // Fallback to manual calculation
          console.log('⚠️ Falling back to manual calculation...');
          
          const { data: maxPosition, error: maxError } = await supabase
            .from('client_positions')
            .select('position_number')
            .eq('tender_id', position.tender_id)
            .order('position_number', { ascending: false })
            .limit(1);

          if (maxError) {
            console.error('❌ Failed to fetch max position number:', maxError);
            position.position_number = 1; // Default to 1 if all else fails
          } else {
            const nextNumber = (maxPosition?.[0]?.position_number || 0) + 1;
            position.position_number = nextNumber;
            console.log('✅ Manually calculated position_number:', nextNumber);
          }
        } else {
          position.position_number = dbPositionNumber;
          console.log('✅ Database function assigned position_number:', dbPositionNumber);
        }
      }

      console.log('💾 Creating client position with data:', position);
      
      const { data, error } = await supabase
        .from('client_positions')
        .insert(position)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create client position:', error);
        return {
          error: handleSupabaseError(error, 'Create client position'),
        };
      }

      console.log('✅ Client position created successfully:', data);
      return {
        data,
        message: 'Client position created successfully',
      };
    } catch (error) {
      console.error('💥 Exception in create client position:', error);
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

  /**
   * Get next position number for additional work (starting from 1000)
   */
  async getNextAdditionalNumber(tenderId: string): Promise<ApiResponse<number>> {
    console.log('🚀 clientPositionsApi.getNextAdditionalNumber called:', { tenderId });
    
    try {
      const { data, error } = await supabase
        .from('client_positions')
        .select('position_number')
        .eq('tender_id', tenderId)
        .eq('is_additional', true)
        .order('position_number', { ascending: false })
        .limit(1);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get next additional number'),
        };
      }

      // Start from 1000 if no additional positions exist
      const nextNumber = data && data.length > 0 ? data[0].position_number + 1 : 1000;

      console.log('✅ Next additional number:', nextNumber);
      return {
        data: nextNumber,
        message: `Next additional number: ${nextNumber}`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get next additional number'),
      };
    }
  },

  /**
   * Create additional work position
   */
  async createAdditionalWork(
    parentPositionId: string,
    tenderId: string,
    data: Omit<ClientPositionInsert, 'tender_id' | 'is_additional' | 'parent_position_id' | 'position_type'>
  ): Promise<ApiResponse<ClientPosition>> {
    console.log('🚀 clientPositionsApi.createAdditionalWork called:', { parentPositionId, tenderId, data });
    
    // Validate parentPositionId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!parentPositionId || 
        parentPositionId === 'undefined' || 
        parentPositionId === 'null' ||
        !uuidRegex.test(parentPositionId)) {
      console.error('❌ Invalid parentPositionId:', {
        value: parentPositionId,
        type: typeof parentPositionId
      });
      return {
        error: `Invalid parent position ID: ${parentPositionId}`,
      };
    }
    
    // Validate tenderId is a valid UUID
    if (!tenderId || 
        tenderId === 'undefined' || 
        tenderId === 'null' ||
        !uuidRegex.test(tenderId)) {
      console.error('❌ Invalid tenderId:', {
        value: tenderId,
        type: typeof tenderId
      });
      return {
        error: `Invalid tender ID: ${tenderId}`,
      };
    }
    
    try {
      // Get parent position
      const { data: parentPosition, error: parentError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('id', parentPositionId)
        .single();

      if (parentError || !parentPosition) {
        console.error('❌ Parent position not found:', {
          parentPositionId,
          error: parentError
        });
        return {
          error: 'Parent position not found',
        };
      }

      console.log('📦 Parent position loaded:', {
        id: parentPosition.id,
        tender_id: parentPosition.tender_id,
        work_name: parentPosition.work_name,
        is_additional: parentPosition.is_additional,
        fullObject: parentPosition
      });

      // Use passed tenderId (parent position may not have tender_id populated)
      const actualTenderId = tenderId || parentPosition.tender_id;
      
      console.log('📍 Using tender_id:', {
        actualTenderId,
        passedTenderId: tenderId,
        parentTenderId: parentPosition.tender_id,
        usingPassed: tenderId ? true : false
      });
      
      if (!actualTenderId) {
        console.error('❌ No tender_id available:', {
          parentTenderId: parentPosition.tender_id,
          passedTenderId: tenderId,
          parentPosition
        });
        return {
          error: 'No tender ID available',
        };
      }

      // Check if parent is already additional
      if (parentPosition.is_additional) {
        return {
          error: 'Cannot create additional work for another additional work',
        };
      }

      // Get next additional number using actualTenderId
      const nextNumberResult = await this.getNextAdditionalNumber(actualTenderId);
      if (nextNumberResult.error) {
        return {
          error: nextNumberResult.error,
        };
      }

      // Create additional position with actualTenderId
      // Generate item_no with "ДОП." prefix, handling undefined parent item_no
      let additionalItemNo: string;
      if (parentPosition.item_no) {
        additionalItemNo = `ДОП.${parentPosition.item_no}`;
        // Limit item_no to 10 characters (database constraint)
        if (additionalItemNo.length > 10) {
          // Truncate parent item_no to fit "ДОП." prefix within 10 chars
          const maxParentLength = 6; // 10 - 4 ("ДОП." is 4 chars)
          const truncatedParent = parentPosition.item_no.substring(0, maxParentLength);
          additionalItemNo = `ДОП.${truncatedParent}`;
          console.log('⚠️ Truncated item_no to fit database limit:', {
            original: `ДОП.${parentPosition.item_no}`,
            truncated: additionalItemNo,
            length: additionalItemNo.length
          });
        }
      } else {
        // If parent has no item_no, use position number
        additionalItemNo = `ДОП.${nextNumberResult.data!}`;
        if (additionalItemNo.length > 10) {
          // Ensure it fits in 10 chars
          additionalItemNo = additionalItemNo.substring(0, 10);
        }
        console.log('⚠️ Parent has no item_no, using position number:', {
          parentPosition: parentPosition.id,
          generatedItemNo: additionalItemNo
        });
      }
      
      const newAdditionalPosition: ClientPositionInsert = {
        ...data,
        tender_id: actualTenderId,
        position_number: nextNumberResult.data!,
        item_no: additionalItemNo,
        work_name: data.work_name.startsWith('ДОП:') ? data.work_name : `ДОП: ${data.work_name}`,
        position_type: 'executable', // Additional works are always executable
        is_additional: true,
        parent_position_id: parentPositionId,
        hierarchy_level: 6, // Executable level
      };

      const { data: createdPosition, error: createError } = await supabase
        .from('client_positions')
        .insert(newAdditionalPosition)
        .select()
        .single();

      if (createError) {
        return {
          error: handleSupabaseError(createError, 'Create additional work'),
        };
      }

      console.log('✅ Additional work created:', createdPosition);
      return {
        data: createdPosition,
        message: 'Additional work created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create additional work'),
      };
    }
  },

  /**
   * Get positions with their additional works
   */
  async getPositionsWithAdditional(tenderId: string): Promise<ApiResponse<any[]>> {
    console.log('🚀 clientPositionsApi.getPositionsWithAdditional called:', { tenderId });
    
    try {
      // Get all positions for the tender
      const { data: positions, error } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', tenderId)
        .order('position_number', { ascending: true });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get positions with additional'),
        };
      }

      // Separate main and additional positions
      const mainPositions = positions?.filter(p => !p.is_additional) || [];
      const additionalPositions = positions?.filter(p => p.is_additional) || [];

      // Create a set of existing position IDs for quick lookup
      const existingPositionIds = new Set(mainPositions.map(p => p.id));

      // Separate orphaned and linked additional works
      const orphanedAdditional: any[] = [];
      const linkedAdditional: Record<string, any[]> = {};

      additionalPositions.forEach(add => {
        if (!add.parent_position_id || !existingPositionIds.has(add.parent_position_id)) {
          // Parent doesn't exist or is null - this is an orphaned additional work
          orphanedAdditional.push({
            ...add,
            is_orphaned: true // Mark as orphaned for UI display
          });
        } else {
          // Parent exists - group by parent
          if (!linkedAdditional[add.parent_position_id]) {
            linkedAdditional[add.parent_position_id] = [];
          }
          linkedAdditional[add.parent_position_id].push(add);
        }
      });

      // Attach additional works to their parent positions
      const positionsWithAdditional = mainPositions.map(position => ({
        ...position,
        additional_works: linkedAdditional[position.id] || [],
      }));

      // Add orphaned additional works at the end
      if (orphanedAdditional.length > 0) {
        console.log(`📦 Found ${orphanedAdditional.length} orphaned additional works`);
      }

      console.log('✅ Positions with additional works loaded');
      return {
        data: {
          positions: positionsWithAdditional,
          orphanedAdditional: orphanedAdditional
        },
        message: 'Positions loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get positions with additional'),
      };
    }
  },

  /**
   * Update commercial costs for a client position
   */
  async updateCommercialCosts(
    id: string,
    materialsCost: number,
    worksCost: number
  ): Promise<ApiResponse<ClientPosition>> {
    console.log('🚀 clientPositionsApi.updateCommercialCosts called with:', { id, materialsCost, worksCost });

    try {
      console.log('📡 Updating commercial costs in database...');
      const { data, error } = await supabase
        .from('client_positions')
        .update({
          total_commercial_materials_cost: materialsCost,
          total_commercial_works_cost: worksCost
        })
        .eq('id', id)
        .select()
        .single();

      console.log('📦 Update commercial costs response:', { data, error });

      if (error) {
        console.error('❌ Update commercial costs failed:', error);
        return {
          error: handleSupabaseError(error, 'Update commercial costs'),
        };
      }

      console.log('✅ Commercial costs updated successfully');
      return {
        data,
        message: 'Commercial costs updated successfully',
      };
    } catch (error) {
      console.error('💥 Exception in updateCommercialCosts:', error);
      return {
        error: handleSupabaseError(error, 'Update commercial costs'),
      };
    }
  },

  /**
   * Get position statistics (works and materials count)
   * Returns count of works and materials for each position
   */
  async getPositionStatistics(positionIds: string[]): Promise<ApiResponse<Record<string, { works_count: number; materials_count: number }>>> {
    console.log('🚀 clientPositionsApi.getPositionStatistics called with:', { positionIds: positionIds.length });

    try {
      if (!positionIds.length) {
        return { data: {} };
      }

      // Get BOQ items for all positions
      const { data: boqItems, error } = await supabase
        .from('boq_items')
        .select('client_position_id, item_type')
        .in('client_position_id', positionIds);

      if (error) {
        console.error('❌ Error fetching BOQ items for statistics:', error);
        return {
          error: handleSupabaseError(error, 'Get position statistics'),
        };
      }

      // Calculate statistics for each position
      const statistics: Record<string, { works_count: number; materials_count: number }> = {};

      // Initialize all positions with zero counts
      positionIds.forEach(id => {
        statistics[id] = { works_count: 0, materials_count: 0 };
      });

      // Count items for each position
      if (boqItems) {
        boqItems.forEach(item => {
          const posId = item.client_position_id;
          if (!statistics[posId]) {
            statistics[posId] = { works_count: 0, materials_count: 0 };
          }

          if (item.item_type === 'work' || item.item_type === 'sub_work') {
            statistics[posId].works_count++;
          } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
            statistics[posId].materials_count++;
          }
        });
      }

      console.log('✅ Position statistics calculated:', statistics);
      return {
        data: statistics,
      };
    } catch (error) {
      console.error('💥 Exception in getPositionStatistics:', error);
      return {
        error: handleSupabaseError(error, 'Get position statistics'),
      };
    }
  },
};