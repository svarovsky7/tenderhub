import { supabase } from '../../client';
import type {
  BOQItem,
  BOQItemInsert,
  BOQItemUpdate,
  ApiResponse,
} from '../../types';
import { handleSupabaseError } from '../utils';

/**
 * BOQ CRUD Operations
 * Basic create, read, update, delete operations for BOQ items
 */
export const boqCrudApi = {
  /**
   * Get BOQ item by ID
   */
  async getById(itemId: string): Promise<ApiResponse<BOQItem>> {
    console.log('🚀 boqCrudApi.getById called with:', itemId);
    
    try {
      console.log('📡 Fetching BOQ item from database...');
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('id', itemId)
        .single();

      console.log('📦 Database response:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        return {
          error: handleSupabaseError(error, 'Get BOQ item'),
        };
      }

      console.log('✅ BOQ item retrieved successfully');
      return {
        data,
        message: 'BOQ item loaded successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getById:', error);
      return {
        error: handleSupabaseError(error, 'Get BOQ item'),
      };
    }
  },

  /**
   * Create BOQ item with automatic sub-numbering
   * If client_position_id is provided, sub_number is automatically assigned
   */
  async create(item: BOQItemInsert): Promise<ApiResponse<BOQItem>> {
    console.log('🚀 boqCrudApi.create called with:', item);
    
    try {
      // Get client position to determine item_number format
      if (!item.client_position_id) {
        console.error('❌ Missing client_position_id for BOQ item');
        return { error: 'Client position ID is required' };
      }

      console.log('🔍 Fetching client position info...');
      const { data: position, error: positionError } = await supabase
        .from('client_positions')
        .select('position_number')
        .eq('id', item.client_position_id)
        .single();

      console.log('📦 Position response:', { position, positionError });

      if (positionError || !position) {
        console.error('❌ Failed to fetch client position:', positionError);
        return { error: 'Failed to fetch client position information' };
      }

      console.log('📋 Position found:', position);

      // Get the count of existing BOQ items in this position
      console.log('🔍 Counting existing BOQ items in position...');
      const { count, error: countError } = await supabase
        .from('boq_items')
        .select('*', { count: 'exact', head: true })
        .eq('client_position_id', item.client_position_id);

      console.log('📊 Count result:', { count, countError });

      if (countError) {
        console.error('❌ Failed to count existing BOQ items:', countError);
        return { error: 'Failed to count existing BOQ items' };
      }

      // Generate item_number in format "X.Y" where X is position number, Y is sub-number
      const subNumber = (count || 0) + 1;
      const itemNumber = `${position.position_number}.${subNumber}`;
      
      console.log(`🔢 Generated item_number: ${itemNumber} (position: ${position.position_number}, sub: ${subNumber})`);

      // Create the item with generated item_number and sub_number
      const itemToInsert = {
        ...item,
        item_number: itemNumber,
        sub_number: subNumber,
        sort_order: item.sort_order || (count || 0)
      };

      console.log('💾 Inserting BOQ item:', itemToInsert);
      const { data, error } = await supabase
        .from('boq_items')
        .insert(itemToInsert)
        .select()
        .single();

      console.log('📦 Insert response:', { data, error });

      if (error) {
        console.error('❌ Failed to insert BOQ item:', error);
        return {
          error: handleSupabaseError(error, 'Create BOQ item'),
        };
      }

      console.log('✅ BOQ item created successfully:', data.id);
      return {
        data,
        message: 'BOQ item created successfully',
      };
    } catch (error) {
      console.error('💥 Exception in create BOQ item:', error);
      return {
        error: handleSupabaseError(error, 'Create BOQ item'),
      };
    }
  },

  /**
   * Update BOQ item
   */
  async update(id: string, updates: BOQItemUpdate): Promise<ApiResponse<BOQItem>> {
    console.log('🚀 boqCrudApi.update called with:', { id, updates });
    
    try {
      console.log('📡 Updating BOQ item in database...');
      const { data, error } = await supabase
        .from('boq_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      console.log('📦 Update response:', { data, error });

      if (error) {
        console.error('❌ Update failed:', error);
        return {
          error: handleSupabaseError(error, 'Update BOQ item'),
        };
      }

      console.log('✅ BOQ item updated successfully');
      return {
        data,
        message: 'BOQ item updated successfully',
      };
    } catch (error) {
      console.error('💥 Exception in update:', error);
      return {
        error: handleSupabaseError(error, 'Update BOQ item'),
      };
    }
  },

  /**
   * Delete BOQ item
   */
  async delete(id: string): Promise<ApiResponse<null>> {
    console.log('🚀 boqCrudApi.delete called with ID:', id);
    
    try {
      // Check if item exists first
      console.log('🔍 Checking if BOQ item exists...');
      const { data: existing, error: checkError } = await supabase
        .from('boq_items')
        .select('id, item_number, description')
        .eq('id', id)
        .single();

      console.log('📋 Existence check result:', { existing, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking item existence:', checkError);
        return { error: handleSupabaseError(checkError, 'Check BOQ item existence') };
      }

      if (!existing) {
        console.warn('⚠️ BOQ item not found for deletion:', id);
        return { error: 'BOQ item not found' };
      }

      console.log('🔥 Performing deletion...');
      const { error } = await supabase
        .from('boq_items')
        .delete()
        .eq('id', id);

      console.log('📤 Delete result:', { error });

      if (error) {
        console.error('❌ Delete failed:', error);
        return {
          error: handleSupabaseError(error, 'Delete BOQ item'),
        };
      }

      console.log('✅ BOQ item deleted successfully:', id);
      return {
        data: null,
        message: 'BOQ item deleted successfully',
      };
    } catch (error) {
      console.error('💥 Exception in delete:', error);
      return {
        error: handleSupabaseError(error, 'Delete BOQ item'),
      };
    }
  },
};