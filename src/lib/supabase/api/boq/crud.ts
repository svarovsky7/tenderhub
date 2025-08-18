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
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} to create BOQ item`);
      // Get client position to determine item_number format
      if (!item.client_position_id) {
        console.error('❌ Missing client_position_id for BOQ item');
        return { error: 'Client position ID is required' };
      }

      console.log('🔍 Fetching client position info for ID:', item.client_position_id);
      const { data: positionData, error: positionError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('id', item.client_position_id)
        .single();

      console.log('📦 Position response:', { positionData, positionError });
      console.log('📦 Position data type:', typeof positionData);
      console.log('📦 Position keys:', positionData ? Object.keys(positionData) : 'null');
      
      // Handle array response from Supabase
      const position = Array.isArray(positionData) ? positionData[0] : positionData;

      if (positionError || !position) {
        console.error('❌ Failed to fetch client position:', positionError);
        return { error: 'Failed to fetch client position information' };
      }

      console.log('📋 Position found:', {
        id: position.id,
        position_number: position.position_number,
        item_no: position.item_no,
        work_name: position.work_name
      });
      
      // Check if position_number is valid
      if (!position.position_number && position.position_number !== 0) {
        console.error('❌ Position has invalid position_number:', position.position_number);
        return { error: `Client position ${position.id} has no position_number assigned. Please contact support.` };
      }

      // Check if sub_number and item_number are already provided
      let subNumber = item.sub_number;
      let itemNumber = item.item_number;

      // Only generate sub_number and item_number if not provided
      if (!subNumber || !itemNumber) {
        console.log('🔍 sub_number or item_number not provided, generating...');
        
        // Use database function for thread-safe sub_number generation
        console.log('🔢 Calling database function get_next_sub_number with position:', item.client_position_id);
        
        // Validate client_position_id before calling RPC
        if (!item.client_position_id || item.client_position_id === '') {
          console.error('❌ Invalid client_position_id for get_next_sub_number');
          throw new Error('Client position ID is required for creating BOQ item');
        }
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(item.client_position_id)) {
          console.error('❌ Invalid UUID format for client_position_id:', item.client_position_id);
          throw new Error('Invalid client position ID format');
        }
        
        const { data: dbSubNumber, error: rpcError } = await supabase
          .rpc('get_next_sub_number', { p_client_position_id: item.client_position_id });
        
        if (rpcError) {
          console.error('❌ Failed to get next sub_number from database function:', rpcError);
          // Fallback to manual calculation if function fails
          console.log('⚠️ Falling back to manual calculation...');
          const { data: maxSub, error: subError } = await supabase
            .from('boq_items')
            .select('sub_number')
            .eq('client_position_id', item.client_position_id)
            .order('sub_number', { ascending: false })
            .limit(1);

          if (subError) {
            console.error('❌ Failed to fetch max sub_number:', subError);
            return { error: 'Failed to fetch existing BOQ items' };
          }
          
          subNumber = (maxSub?.[0]?.sub_number || 0) + 1;
        } else {
          subNumber = dbSubNumber;
          console.log('✅ Database function returned sub_number:', subNumber);
        }
        
        itemNumber = itemNumber || `${position.position_number}.${subNumber}`;

        console.log(
          `🔢 Generated item_number: ${itemNumber} (position: ${position.position_number}, sub: ${subNumber})`
        );
      } else {
        console.log(`🔢 Using provided values - item_number: ${itemNumber}, sub_number: ${subNumber}`);
      }

      // Create the item with provided or generated values
      const itemToInsert = {
        ...item,
        item_number: itemNumber,
        sub_number: subNumber,
        sort_order: item.sort_order !== undefined ? item.sort_order : subNumber
      };

      console.log('💾 Inserting BOQ item:', itemToInsert);
      
      // Check for existing items with same sub_number (only this constraint remains)
      console.log('🔍 Checking for duplicate sub_number before insert...');
      const { data: existingBySubNumber } = await supabase
        .from('boq_items')
        .select('id,item_number,sub_number,description')
        .eq('client_position_id', item.client_position_id)
        .eq('sub_number', subNumber);
      
      if (existingBySubNumber && existingBySubNumber.length > 0) {
        console.error('❌ Duplicate sub_number found in position:', existingBySubNumber);
      }
      
      const { data, error } = await supabase
        .from('boq_items')
        .insert(itemToInsert)
        .select('*')
        .single();

      console.log('📦 Insert response:', { data, error });
      
      if (error && (error as any).code === '23505') {
        console.error('🔍 Unique constraint violation (uq_boq_position_sub_number):', {
          error_code: (error as any).code,
          error_details: (error as any).details,
          error_hint: (error as any).hint,
          error_message: (error as any).message,
          attempted_values: {
            client_position_id: itemToInsert.client_position_id,
            sub_number: itemToInsert.sub_number,
            item_number: itemToInsert.item_number
          }
        });
      }

      if (error) {
        console.error('❌ Failed to insert BOQ item:', error);
        
        // If it's a duplicate error and we haven't exhausted retries
        if ((error as any).code === '23505' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 100 * Math.pow(2, retryCount); // 200ms, 400ms
          console.log(`⏳ Duplicate detected. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Clear sub_number and item_number to force regeneration
          item.sub_number = undefined;
          item.item_number = undefined;
          continue; // Retry with new numbers
        }
        
        return {
          error: handleSupabaseError(error, 'Create BOQ item'),
        };
      }

      // If insert was successful but data is null, fetch the created item
      if (!data) {
        console.log('⚠️ Insert successful but no data returned, fetching created item...');
        const { data: createdItems, error: fetchError } = await supabase
          .from('boq_items')
          .select('*')
          .eq('tender_id', itemToInsert.tender_id)
          .eq('client_position_id', itemToInsert.client_position_id)
          .eq('sub_number', itemToInsert.sub_number);
        
        console.log('📦 Fetched items:', createdItems);
        console.log('📦 Fetch error:', fetchError);
        
        if (fetchError || !createdItems || createdItems.length === 0) {
          console.error('❌ Failed to fetch created item:', fetchError);
          return {
            error: 'Item created but could not retrieve details',
          };
        }
        
        // Take the first item from array
        const createdItem = createdItems[0];
        console.log('✅ BOQ item created and fetched successfully:', createdItem);
        console.log('📦 Created item ID:', createdItem?.id);
        return {
          data: createdItem,
          message: 'BOQ item created successfully',
        };
      }

      console.log('✅ BOQ item created successfully:', data.id);
      return {
        data,
        message: 'BOQ item created successfully',
      };
    } catch (error) {
      console.error('💥 Exception in create BOQ item attempt:', error);
      
      // If not the last retry, continue
      if (retryCount < maxRetries - 1) {
        retryCount++;
        const waitTime = 100 * Math.pow(2, retryCount);
        console.log(`⏳ Exception occurred. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Clear sub_number and item_number to force regeneration
        item.sub_number = undefined;
        item.item_number = undefined;
        continue;
      }
      
      return {
        error: handleSupabaseError(error, 'Create BOQ item'),
      };
    }
    }
    
    // Should never reach here, but TypeScript needs this
    return { error: 'Maximum retries exceeded' }
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
        .select('id,item_number,description')
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