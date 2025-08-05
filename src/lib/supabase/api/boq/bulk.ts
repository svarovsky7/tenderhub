import { supabase } from '../../client';
import type {
  BOQItemInsert,
  ApiResponse,
} from '../../types';
import { handleSupabaseError } from '../utils';

/**
 * BOQ Bulk Operations
 * Optimized operations for handling large datasets, especially Excel imports
 */
export const boqBulkApi = {
  /**
   * Bulk create BOQ items (for Excel imports)
   * Uses database function for optimized performance
   */
  async bulkCreate(tenderId: string, items: BOQItemInsert[]): Promise<ApiResponse<number>> {
    console.log('🚀 boqBulkApi.bulkCreate called with:', { tenderId, itemsCount: items.length });
    
    try {
      console.log('📡 Calling bulk_insert_boq_items database function...');
      const { data, error } = await supabase.rpc('bulk_insert_boq_items', {
        p_tender_id: tenderId,
        p_items: items,
      });

      console.log('📦 Bulk insert response:', { data, error });

      if (error) {
        console.error('❌ Bulk insert failed:', error);
        return {
          error: handleSupabaseError(error, 'Bulk create BOQ items'),
        };
      }

      console.log(`✅ Bulk insert successful: ${data} items created`);
      return {
        data,
        message: `${data} BOQ items created successfully`,
      };
    } catch (error) {
      console.error('💥 Exception in bulkCreate:', error);
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
    console.log('🚀 boqBulkApi.bulkCreateInPosition called with:', { clientPositionId, itemsCount: items.length });
    
    try {
      console.log('📡 Calling bulk_insert_boq_items_to_position database function...');
      const { data, error } = await supabase.rpc('bulk_insert_boq_items_to_position', {
        p_client_position_id: clientPositionId,
        p_items: items,
      });

      console.log('📦 Bulk position insert response:', { data, error });

      if (error) {
        console.error('❌ Bulk position insert failed:', error);
        return {
          error: handleSupabaseError(error, 'Bulk create BOQ items in position'),
        };
      }

      console.log(`✅ Bulk position insert successful: ${data} items created`);
      return {
        data,
        message: `${data} BOQ items created in position successfully`,
      };
    } catch (error) {
      console.error('💥 Exception in bulkCreateInPosition:', error);
      return {
        error: handleSupabaseError(error, 'Bulk create BOQ items in position'),
      };
    }
  },

  /**
   * Bulk update BOQ items
   * Optimized for updating multiple items at once
   */
  async bulkUpdate(updates: Array<{ id: string; updates: Partial<BOQItemInsert> }>): Promise<ApiResponse<number>> {
    console.log('🚀 boqBulkApi.bulkUpdate called with:', { updatesCount: updates.length });
    
    try {
      console.log('📡 Processing bulk updates...');
      const updatePromises = updates.map(({ id, updates: itemUpdates }) => 
        supabase
          .from('boq_items')
          .update(itemUpdates)
          .eq('id', id)
          .select()
      );

      console.log('⏱️ Executing parallel updates...');
      const results = await Promise.all(updatePromises);
      
      const errors = results.filter(result => result.error);
      const successful = results.filter(result => !result.error);

      console.log('📊 Bulk update results:', { 
        successful: successful.length, 
        failed: errors.length 
      });

      if (errors.length > 0) {
        console.error('❌ Some bulk updates failed:', errors.map(e => e.error));
        return {
          error: `Failed to update ${errors.length} out of ${updates.length} items`,
        };
      }

      console.log(`✅ Bulk update successful: ${successful.length} items updated`);
      return {
        data: successful.length,
        message: `${successful.length} BOQ items updated successfully`,
      };
    } catch (error) {
      console.error('💥 Exception in bulkUpdate:', error);
      return {
        error: handleSupabaseError(error, 'Bulk update BOQ items'),
      };
    }
  },

  /**
   * Bulk delete BOQ items
   * Optimized for deleting multiple items at once
   */
  async bulkDelete(itemIds: string[]): Promise<ApiResponse<number>> {
    console.log('🚀 boqBulkApi.bulkDelete called with:', { itemIdsCount: itemIds.length });
    
    try {
      // Check if items exist first
      console.log('🔍 Checking item existence before deletion...');
      const { data: existingItems, error: checkError } = await supabase
        .from('boq_items')
        .select('id, item_number')
        .in('id', itemIds);

      console.log('📋 Existence check result:', { 
        foundItems: existingItems?.length, 
        checkError 
      });

      if (checkError) {
        console.error('❌ Error checking item existence:', checkError);
        return { error: handleSupabaseError(checkError, 'Check BOQ items existence') };
      }

      const foundIds = existingItems?.map(item => item.id) || [];
      const notFoundIds = itemIds.filter(id => !foundIds.includes(id));

      if (notFoundIds.length > 0) {
        console.warn('⚠️ Some items not found:', notFoundIds);
      }

      if (foundIds.length === 0) {
        console.warn('⚠️ No items found for deletion');
        return { error: 'No BOQ items found for deletion' };
      }

      console.log('🔥 Performing bulk deletion...');
      const { error } = await supabase
        .from('boq_items')
        .delete()
        .in('id', foundIds);

      console.log('📤 Bulk delete result:', { error });

      if (error) {
        console.error('❌ Bulk delete failed:', error);
        return {
          error: handleSupabaseError(error, 'Bulk delete BOQ items'),
        };
      }

      console.log(`✅ Bulk delete successful: ${foundIds.length} items deleted`);
      return {
        data: foundIds.length,
        message: `${foundIds.length} BOQ items deleted successfully`,
      };
    } catch (error) {
      console.error('💥 Exception in bulkDelete:', error);
      return {
        error: handleSupabaseError(error, 'Bulk delete BOQ items'),
      };
    }
  },
};