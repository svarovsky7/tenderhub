import { supabase } from '../../client';
import type {
  BOQItemInsert,
  ApiResponse,
} from '../../types';
import { handleSupabaseError } from '../utils';
import { workMaterialLinksApi } from '../work-material-links';

/**
 * BOQ Bulk Operations
 * Optimized operations for handling large datasets, especially Excel imports
 */
// Updated to fix silent insert failure issue
export const boqBulkApi = {
  /**
   * Bulk create BOQ items (for Excel imports)
   * Uses database function for optimized performance
   */
  async bulkCreate(tenderId: string, items: BOQItemInsert[]): Promise<ApiResponse<number>> {
    console.log('🚀 boqBulkApi.bulkCreate called with:', { tenderId, itemsCount: items.length });
    console.log('📦 First item to insert:', items[0]);

    try {
      // Проверяем наличие tenderId
      if (!tenderId) {
        console.error('❌ No tenderId provided to bulkCreate');
        return {
          error: 'Не указан ID тендера',
        };
      }

      // Получаем максимальный номер в тендере
      console.log('🔢 Getting max item number in tender...');
      const { data: maxData, error: maxError } = await supabase
        .from('boq_items')
        .select('sub_number')
        .eq('tender_id', tenderId)
        .is('client_position_id', null)
        .order('sub_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = (maxData?.sub_number || 0) + 1;

      // Подготавливаем элементы для вставки
      console.log('📦 Preparing items for bulk insert...');
      const preparedItems = items.map((item, index) => {
        const currentNumber = nextNumber + index;

        // Сохраняем существующий tender_id, если он есть
        const finalItem = {
          ...item,
          item_number: currentNumber.toString(),
          sub_number: currentNumber,
          sort_order: currentNumber
        };

        // Устанавливаем tender_id только если его нет
        if (!finalItem.tender_id) {
          finalItem.tender_id = tenderId;
        }

        if (!finalItem.tender_id) {
          console.error('❌ No tender_id available for item:', finalItem);
        }

        return finalItem;
      });

      console.log('📋 First prepared item:', preparedItems[0]);

      // Вставляем элементы
      console.log('💾 Inserting items...');
      const { data, error } = await supabase
        .from('boq_items')
        .insert(preparedItems)
        .select();

      console.log('📦 Bulk insert response:', { count: data?.length, error });

      if (error) {
        console.error('❌ Bulk insert failed:', error);
        return {
          error: handleSupabaseError(error, 'Bulk create BOQ items'),
        };
      }

      const insertedCount = data?.length || 0;
      console.log(`✅ Bulk insert successful: ${insertedCount} items created`);
      return {
        data: insertedCount,
        message: `${insertedCount} BOQ items created successfully`,
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
   * @param clientPositionId - ID of the client position
   * @param items - Array of BOQ items to insert, or object with items and links
   */
  async bulkCreateInPosition(
    clientPositionId: string,
    items: BOQItemInsert[] | { items: BOQItemInsert[], links: any[] }
  ): Promise<ApiResponse<number>> {
    // Проверяем, что передано - массив или объект с items и links
    const isStructuredData = !Array.isArray(items) && !!(items as any).items;
    const boqItems = isStructuredData ? (items as any).items : items as BOQItemInsert[];
    const linkInfo = isStructuredData && (items as any).links ? (items as any).links : [];

    console.log('🚀 boqBulkApi.bulkCreateInPosition called with:', {
      clientPositionId,
      itemsCount: boqItems.length,
      linksCount: linkInfo.length,
      isStructuredData,
      actualDataType: Array.isArray(items) ? 'array' : 'object',
      hasItems: !!(items as any).items,
      hasLinks: !!(items as any).links
    });

    if (linkInfo.length > 0) {
      console.log('🔗 Links to create:', linkInfo);
    }

    console.log('📦 First item to insert:', boqItems[0]);

    try {
      // Получаем информацию о позиции для правильной нумерации
      console.log('📡 Getting client position info...');
      const { data: positionDataArray, error: positionError } = await supabase
        .from('client_positions')
        .select('tender_id,position_number')
        .eq('id', clientPositionId)
        .single();

      console.log('📋 Position data retrieved:', positionDataArray);

      // Обрабатываем случай, когда возвращается массив
      const positionData = Array.isArray(positionDataArray) ? positionDataArray[0] : positionDataArray;

      if (positionError || !positionData) {
        console.error('❌ Failed to get position info:', positionError);
        return {
          error: 'Позиция не найдена',
        };
      }

      // Проверяем наличие tender_id в позиции
      if (!positionData.tender_id) {
        console.error('❌ Position has no tender_id:', positionData);
        return {
          error: 'Позиция не связана с тендером',
        };
      }

      // Получаем максимальные номера в этой позиции
      console.log('🔢 Getting max numbers in position...');
      const { data: maxData, error: maxError } = await supabase
        .from('boq_items')
        .select('sub_number')
        .eq('client_position_id', clientPositionId)
        .order('sub_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSubNumber = (maxData?.sub_number || 0) + 1;

      // Подготавливаем элементы для вставки
      console.log('📦 Preparing items for insert...');
      console.log('🔍 BOQ items before preparation:', boqItems);

      const preparedItems = boqItems.map((item, index) => {
        const currentSubNumber = nextSubNumber + index;

        // Сохраняем существующий tender_id, если он есть, иначе берем из позиции
        const finalItem = {
          ...item,
          client_position_id: clientPositionId,
          item_number: `${positionData.position_number}.${currentSubNumber}`,
          sub_number: currentSubNumber,
          sort_order: currentSubNumber
        };

        // Устанавливаем tender_id только если его нет
        if (!finalItem.tender_id) {
          finalItem.tender_id = positionData.tender_id;
        }

        if (!finalItem.tender_id) {
          console.error('❌ No tender_id available for item:', finalItem);
        }

        console.log(`📋 Prepared item ${index}:`, {
          type: finalItem.item_type,
          description: finalItem.description,
          tender_id: finalItem.tender_id,
          client_position_id: finalItem.client_position_id,
          item_number: finalItem.item_number
        });

        return finalItem;
      });

      console.log('📋 First prepared item:', preparedItems[0]);

      // Вставляем элементы
      console.log('💾 Inserting items...');
      console.log('📝 Items to insert:', preparedItems);

      // Проверяем структуру данных перед вставкой
      console.log('🔍 Checking prepared items structure:');
      preparedItems.forEach((item, idx) => {
        console.log(`  Item ${idx}:`, JSON.stringify(item, null, 2));
      });

      let { data, error } = await supabase
        .from('boq_items')
        .insert(preparedItems)
        .select();

      console.log('📦 Bulk position insert response:', {
        count: data?.length,
        error,
        data: data?.slice(0, 3), // First 3 items for debugging
        rawData: data,
        dataType: typeof data,
        isArray: Array.isArray(data)
      });

      if (error) {
        console.error('❌ Bulk position insert failed:', error);
        return {
          error: handleSupabaseError(error, 'Bulk create BOQ items in position'),
        };
      }

      // Проверяем, что данные действительно вернулись
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error('❌ Insert succeeded but no data returned');
        console.log('🔍 Attempting to fetch inserted items by client_position_id...');

        // Попробуем получить вставленные элементы по client_position_id
        const { data: fetchedData, error: fetchError } = await supabase
          .from('boq_items')
          .select('*')
          .eq('client_position_id', clientPositionId)
          .order('created_at', { ascending: false })
          .limit(preparedItems.length);

        console.log('📊 Fetched items:', {
          count: fetchedData?.length,
          error: fetchError,
          items: fetchedData?.slice(0, 3)
        });

        if (fetchedData && fetchedData.length > 0) {
          // Используем полученные данные
          data = fetchedData;
        } else {
          return {
            error: 'Failed to retrieve inserted BOQ items',
          };
        }
      }

      const insertedCount = data?.length || 0;
      console.log(`✅ Bulk position insert successful: ${insertedCount} items created`);

      // Если есть информация о связях, создаем их
      if (linkInfo.length > 0 && data) {
        console.log('🔗 Creating work-material links...');
        console.log('📊 Links to process:', linkInfo.length);
        console.log('📋 Inserted BOQ items count:', data.length);
        console.log('📋 First 5 BOQ items:', data.slice(0, 5).map(item => ({
          id: item.id,
          description: item.description,
          item_type: item.item_type
        })));

        for (let i = 0; i < linkInfo.length; i++) {
          const link = linkInfo[i];
          console.log(`🔗 Processing link ${i + 1}/${linkInfo.length}:`, {
            workIndex: link.workIndex,
            materialIndex: link.materialIndex,
            workName: link.workName,
            materialName: link.materialName,
            validWorkIndex: link.workIndex >= 0 && link.workIndex < data.length,
            validMaterialIndex: link.materialIndex >= 0 && link.materialIndex < data.length
          });

          const workItem = data[link.workIndex];
          const materialItem = data[link.materialIndex];

          if (workItem && materialItem) {
            console.log('🔗 Found items to link:', {
              workItem: {
                id: workItem.id,
                description: workItem.description,
                item_type: workItem.item_type
              },
              materialItem: {
                id: materialItem.id,
                description: materialItem.description,
                item_type: materialItem.item_type
              },
              linkTypes: {
                workType: link.workType,
                materialType: link.materialType
              }
            });

            const linkData = {
              client_position_id: clientPositionId,
              work_boq_item_id: link.workType === 'work' ? workItem.id : null,
              sub_work_boq_item_id: link.workType === 'sub_work' ? workItem.id : null,
              material_boq_item_id: link.materialType === 'material' ? materialItem.id : null,
              sub_material_boq_item_id: link.materialType === 'sub_material' ? materialItem.id : null,
              material_quantity_per_work: link.consumption_coefficient || 1,
              usage_coefficient: link.conversion_coefficient || 1,
              delivery_price_type: 'included' as const,
              delivery_amount: 0
            };

            console.log('📦 Link data prepared:', linkData);

            console.log('📡 Calling workMaterialLinksApi.createLink...');
            const linkResult = await workMaterialLinksApi.createLink(linkData);

            if (linkResult.error) {
              console.error('❌ Failed to create link:', {
                error: linkResult.error,
                linkData
              });
              // Не прерываем процесс, продолжаем с другими связями
            } else {
              console.log('✅ Link created successfully:', {
                linkId: linkResult.data?.id,
                workId: workItem.id,
                materialId: materialItem.id
              });
            }
          } else {
            console.warn('⚠️ Could not create link - missing items:', {
              workIndex: link.workIndex,
              materialIndex: link.materialIndex,
              workItem: workItem ? 'exists' : 'missing',
              materialItem: materialItem ? 'exists' : 'missing',
              dataLength: data.length
            });
          }
        }

        console.log('🎯 Finished processing all links');
      } else if (linkInfo.length === 0) {
        console.log('ℹ️ No links to create');
      } else if (!data) {
        console.error('❌ Cannot create links - no BOQ data');
      }

      return {
        data: insertedCount,
        message: `${insertedCount} BOQ items created in position successfully`,
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
        .select('id,item_number')
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