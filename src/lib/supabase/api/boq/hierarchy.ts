import { supabase } from '../../client';
import type {
  BOQItem,
  BOQItemUpdate,
  ApiResponse,
  HierarchyMoveOperation,
} from '../../types';
import { handleSupabaseError } from '../utils';

/**
 * BOQ Hierarchy Operations
 * Specialized operations for managing hierarchical BOQ structure and positioning
 */
export const boqHierarchyApi = {
  /**
   * Move BOQ item to different client position
   * Automatically handles sub-number reassignment
   */
  async moveToPosition(
    itemId: string,
    targetPositionId: string,
    newSortOrder?: number
  ): Promise<ApiResponse<BOQItem>> {
    console.log('🚀 boqHierarchyApi.moveToPosition called with:', { itemId, targetPositionId, newSortOrder });
    
    try {
      // Get current item info
      console.log('🔍 Fetching current item info...');
      const { data: currentItem, error: itemError } = await supabase
        .from('boq_items')
        .select('id,item_number,client_position_id')
        .eq('id', itemId)
        .single();

      console.log('📋 Current item info:', { currentItem, itemError });

      if (itemError || !currentItem) {
        console.error('❌ Failed to fetch current item:', itemError);
        return { error: 'Failed to fetch current item information' };
      }

      // Get next sub number for target position
      console.log('🔍 Getting next sub number for target position...');
      const { data: nextSubNumber, error: subError } = await supabase.rpc('get_next_sub_number', {
        p_client_position_id: targetPositionId,
      });

      console.log('📊 Next sub number result:', { nextSubNumber, subError });

      if (subError) {
        console.error('❌ Failed to get next sub number:', subError);
        return {
          error: handleSupabaseError(subError, 'Get next sub number'),
        };
      }

      // Get target position info for item number generation
      console.log('🔍 Fetching target position info...');
      const { data: targetPosition, error: positionError } = await supabase
        .from('client_positions')
        .select('position_number')
        .eq('id', targetPositionId)
        .single();

      console.log('📋 Target position info:', { targetPosition, positionError });

      if (positionError || !targetPosition) {
        console.error('❌ Failed to fetch target position:', positionError);
        return { error: 'Failed to fetch target position information' };
      }

      // Generate new item number
      const newItemNumber = `${targetPosition.position_number}.${nextSubNumber}`;
      console.log(`🔢 Generated new item_number: ${newItemNumber}`);

      // Update the item
      const updates: BOQItemUpdate = {
        client_position_id: targetPositionId,
        sub_number: nextSubNumber,
        item_number: newItemNumber,
        sort_order: newSortOrder || 0,
      };

      console.log('📝 Updating item with new position data:', updates);
      const { data, error } = await supabase
        .from('boq_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      console.log('📦 Move update response:', { data, error });

      if (error) {
        console.error('❌ Failed to move item:', error);
        return {
          error: handleSupabaseError(error, 'Move BOQ item to position'),
        };
      }

      console.log('✅ BOQ item moved successfully');
      return {
        data,
        message: 'BOQ item moved successfully',
      };
    } catch (error) {
      console.error('💥 Exception in moveToPosition:', error);
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
    console.log('🚀 boqHierarchyApi.batchMove called with:', { operationsCount: operations.length });
    
    try {
      let successCount = 0;
      const errors: string[] = [];

      console.log('🔄 Processing batch move operations...');
      for (const operation of operations) {
        console.log(`🎯 Processing move for item ${operation.itemId}...`);
        const result = await this.moveToPosition(
          operation.itemId,
          operation.targetPositionId,
          operation.newSortOrder
        );

        if (result.error) {
          console.error(`❌ Move failed for item ${operation.itemId}:`, result.error);
          errors.push(`Item ${operation.itemId}: ${result.error}`);
        } else {
          console.log(`✅ Move successful for item ${operation.itemId}`);
          successCount++;
        }
      }

      console.log('📊 Batch move results:', { successCount, errorsCount: errors.length });

      if (errors.length > 0) {
        console.error('❌ Some batch moves failed:', errors);
        return {
          error: `Some moves failed: ${errors.join('; ')}`,
        };
      }

      console.log(`✅ Batch move completed successfully: ${successCount} items moved`);
      return {
        data: successCount,
        message: `${successCount} items moved successfully`,
      };
    } catch (error) {
      console.error('💥 Exception in batchMove:', error);
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
    console.log('🚀 boqHierarchyApi.reorderInPosition called with:', { clientPositionId, itemIdsCount: itemIds.length });
    
    try {
      console.log('🔄 Preparing reorder operations...');
      const updates = itemIds.map((itemId, index) => {
        console.log(`📝 Preparing update for item ${itemId}: sort_order = ${index}`);
        return supabase
          .from('boq_items')
          .update({ sort_order: index })
          .eq('id', itemId)
          .eq('client_position_id', clientPositionId);
      });

      console.log('⏱️ Executing parallel reorder updates...');
      const results = await Promise.all(updates);
      const errors = results.filter(result => result.error);

      console.log('📊 Reorder results:', { 
        totalUpdates: results.length, 
        errorsCount: errors.length 
      });

      if (errors.length > 0) {
        console.error('❌ Failed to reorder some items:', errors.map(e => e.error));
        return {
          error: `Failed to reorder items: ${errors[0].error?.message}`,
        };
      }

      console.log(`✅ Reorder successful: ${itemIds.length} items reordered`);
      return {
        data: itemIds.length,
        message: `${itemIds.length} items reordered successfully`,
      };
    } catch (error) {
      console.error('💥 Exception in reorderInPosition:', error);
      return {
        error: handleSupabaseError(error, 'Reorder BOQ items in position'),
      };
    }
  },

  /**
   * Get hierarchy statistics for a tender
   * Useful for understanding BOQ structure
   */
  async getHierarchyStats(tenderId: string): Promise<ApiResponse<{
    totalItems: number;
    totalPositions: number;
    itemsByPosition: Array<{ positionId: string; positionNumber: string; itemCount: number }>;
  }>> {
    console.log('🚀 boqHierarchyApi.getHierarchyStats called with:', tenderId);
    
    try {
      // Get BOQ items with position info
      console.log('📡 Fetching BOQ items with position data...');
      const { data: items, error: itemsError } = await supabase
        .from('boq_items')
        .select(`
          id,
          client_position_id,
          client_position:client_positions(id, position_number, title)
        `)
        .eq('tender_id', tenderId);

      console.log('📦 Items response:', { itemsCount: items?.length, itemsError });

      if (itemsError) {
        console.error('❌ Failed to fetch items:', itemsError);
        return {
          error: handleSupabaseError(itemsError, 'Get hierarchy stats'),
        };
      }

      // Get unique positions
      console.log('📊 Calculating hierarchy statistics...');
      const positionMap = new Map<string, { positionNumber: string; count: number }>();
      
      items?.forEach(item => {
        if (item.client_position_id && item.client_position) {
          const positionId = item.client_position_id;
          const position = item.client_position as any;
          
          if (positionMap.has(positionId)) {
            positionMap.get(positionId)!.count++;
          } else {
            positionMap.set(positionId, {
              positionNumber: position.position_number,
              count: 1
            });
          }
        }
      });

      const itemsByPosition = Array.from(positionMap.entries()).map(([positionId, data]) => ({
        positionId,
        positionNumber: data.positionNumber,
        itemCount: data.count
      }));

      const stats = {
        totalItems: items?.length || 0,
        totalPositions: positionMap.size,
        itemsByPosition: itemsByPosition.sort((a, b) => 
          parseInt(a.positionNumber) - parseInt(b.positionNumber)
        )
      };

      console.log('📈 Hierarchy stats calculated:', stats);
      return {
        data: stats,
        message: 'Hierarchy statistics calculated successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getHierarchyStats:', error);
      return {
        error: handleSupabaseError(error, 'Get hierarchy stats'),
      };
    }
  },
};