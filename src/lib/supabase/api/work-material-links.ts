import { supabase } from '../client';
import type { Database } from '../types/database';

// Типы для работы со связями
export interface WorkMaterialLink {
  id?: string;
  client_position_id: string;
  work_boq_item_id?: string;
  material_boq_item_id?: string;
  sub_work_boq_item_id?: string;
  sub_material_boq_item_id?: string;
  material_quantity_per_work?: number;  // Не используется в расчетах, всегда 1
  usage_coefficient?: number;  // Не используется в расчетах, всегда 1
  delivery_price_type?: 'included' | 'not_included' | 'amount';
  delivery_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkMaterialLinkDetailed extends WorkMaterialLink {
  work_description?: string;
  work_unit?: string;
  work_quantity?: number;
  material_description?: string;
  material_unit?: string;
  material_quantity?: number;
  material_unit_rate?: number;
  material_consumption_coefficient?: number;
  material_conversion_coefficient?: number;
  material_delivery_price_type?: string;
  material_delivery_amount?: number;
  total_material_needed?: number;
  total_material_cost?: number;
}

export const workMaterialLinksApi = {
  /**
   * Создать связь между работой и материалом
   */
  async createLink(link: WorkMaterialLink) {
    console.log('🚀 Creating work-material link:', {
      client_position_id: link.client_position_id,
      work_boq_item_id: link.work_boq_item_id,
      sub_work_boq_item_id: link.sub_work_boq_item_id,
      material_boq_item_id: link.material_boq_item_id,
      sub_material_boq_item_id: link.sub_material_boq_item_id,
      coefficients: {
        material_quantity_per_work: link.material_quantity_per_work,
        usage_coefficient: link.usage_coefficient
      }
    });
    
    // Validate required fields
    if (!link.client_position_id) {
      console.error('❌ client_position_id is required');
      return { error: 'client_position_id is required' };
    }
    
    const hasWork = link.work_boq_item_id || link.sub_work_boq_item_id;
    const hasMaterial = link.material_boq_item_id || link.sub_material_boq_item_id;
    
    if (!hasWork) {
      console.error('❌ Either work_boq_item_id or sub_work_boq_item_id is required');
      return { error: 'Work ID is required' };
    }
    
    if (!hasMaterial) {
      console.error('❌ Either material_boq_item_id or sub_material_boq_item_id is required');
      return { error: 'Material ID is required' };
    }
    
    try {
      const { data, error } = await supabase
        .from('work_material_links')
        .insert({
          client_position_id: link.client_position_id,
          work_boq_item_id: link.work_boq_item_id || null,
          material_boq_item_id: link.material_boq_item_id || null,
          sub_work_boq_item_id: link.sub_work_boq_item_id || null,
          sub_material_boq_item_id: link.sub_material_boq_item_id || null,
          material_quantity_per_work: link.material_quantity_per_work || 1,  // Всегда 1, не используется в расчетах
          usage_coefficient: link.usage_coefficient || 1,  // Всегда 1, не используется в расчетах
          delivery_price_type: link.delivery_price_type || 'included',
          delivery_amount: link.delivery_amount || 0,
          notes: link.notes
        })
        .select()
        .single();

      console.log('📦 Create link result:', { data, error });

      if (error) {
        console.error('❌ Failed to create link:', error);
        console.error('❌ Full error details:', JSON.stringify(error, null, 2));
        return { error: error.message };
      }

      console.log('✅ Work-material link created successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in createLink:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить все связи для позиции заказчика
   */
  async getLinksByPosition(positionId: string) {
    console.log('🚀 Getting links for position:', positionId);
    
    try {
      // Прямой запрос к таблице work_material_links
      const { data: links, error } = await supabase
        .from('work_material_links')
        .select('*')
        .eq('client_position_id', positionId);

      if (error) {
        console.error('❌ Failed to get links:', error);
        return { error: error.message };
      }

      if (!links || links.length === 0) {
        console.log('📭 No links found for position');
        return { data: [] };
      }

      console.log(`✅ Found ${links.length} links for position`);
      return { data: links };
    } catch (error) {
      console.error('💥 Exception in getLinksByPosition:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить все связи для позиции заказчика (старая версия для совместимости)
   */
  async getLinksByPositionOld(positionId: string) {
    console.log('🚀 Getting links for position (old):', positionId);
    
    try {
      // Первый подход: попробуем через представление
      let { data, error } = await supabase
        .from('work_material_links_detailed')
        .select('*')
        .eq('client_position_id', positionId);

      // Если представление не работает, используем прямой запрос
      if (error && error.message.includes('work_material_links_detailed')) {
        console.log('⚠️ View not found, using direct query');
        
        // Прямой запрос к таблице с JOIN
        const result = await supabase
          .from('work_material_links')
          .select(`
            *,
            work:boq_items!work_material_links_work_boq_item_id_fkey(
              id,
              description,
              quantity,
              unit,
              unit_rate,
              client_position_id
            ),
            material:boq_items!work_material_links_material_boq_item_id_fkey(
              id,
              description,
              quantity,
              unit,
              unit_rate,
              consumption_coefficient,
              conversion_coefficient,
              delivery_price_type,
              delivery_amount
            )
          `)
          .eq('work.client_position_id', positionId);
        
        if (result.error) {
          console.error('❌ Direct query also failed:', result.error);
          // Последняя попытка - простой запрос без JOIN
          const simpleResult = await supabase
            .from('work_material_links')
            .select('*');
          
          if (simpleResult.error) {
            console.error('❌ Simple query failed:', simpleResult.error);
            return { error: simpleResult.error.message };
          }
          
          // Фильтруем по positionId вручную
          const boqItems = await supabase
            .from('boq_items')
            .select('id, description, quantity, unit, unit_rate, consumption_coefficient, conversion_coefficient, delivery_price_type, delivery_amount, client_position_id')
            .eq('client_position_id', positionId)
            .eq('item_type', 'work');
          
          if (boqItems.data) {
            const workIds = boqItems.data.map(item => item.id);
            const filteredLinks = simpleResult.data?.filter(link => 
              workIds.includes(link.work_boq_item_id)
            ) || [];
            
            // Обогащаем данные
            const enrichedLinks = await Promise.all(filteredLinks.map(async (link) => {
              const workItem = boqItems.data.find(w => w.id === link.work_boq_item_id);
              const { data: materialItem } = await supabase
                .from('boq_items')
                .select('*')
                .eq('id', link.material_boq_item_id)
                .single();
              
              return {
                ...link,
                client_position_id: positionId,
                work_description: workItem?.description,
                work_quantity: workItem?.quantity,
                work_unit: workItem?.unit,
                material_description: materialItem?.description,
                material_unit: materialItem?.unit,
                material_unit_rate: materialItem?.unit_rate,
                material_consumption_coefficient: materialItem?.consumption_coefficient,
                material_conversion_coefficient: materialItem?.conversion_coefficient,
                material_delivery_price_type: materialItem?.delivery_price_type,
                material_delivery_amount: materialItem?.delivery_amount
              };
            }));
            
            console.log('✅ Links retrieved via fallback');
            return { data: enrichedLinks };
          }
          
          return { data: [] };
        }
        
        // Преобразуем результат в нужный формат
        data = result.data?.map(link => ({
          ...link,
          client_position_id: link.work?.client_position_id || positionId,
          work_description: link.work?.description,
          work_quantity: link.work?.quantity,
          work_unit: link.work?.unit,
          material_description: link.material?.description,
          material_unit: link.material?.unit,
          material_unit_rate: link.material?.unit_rate,
          material_consumption_coefficient: link.material?.consumption_coefficient,
          material_conversion_coefficient: link.material?.conversion_coefficient,
          material_delivery_price_type: link.material?.delivery_price_type,
          material_delivery_amount: link.material?.delivery_amount
        })) || [];
        error = null;
      }

      console.log('📦 Links fetched:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to fetch links:', error);
        return { error: error.message };
      }

      console.log('✅ Links retrieved successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in getLinksByPosition:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить все материалы, связанные с работой
   */
  async getMaterialsForWork(workBoqItemId: string) {
    console.log('🚀 Getting materials for work:', workBoqItemId);
    
    try {
      const { data, error } = await supabase
        .rpc('get_materials_for_work', { 
          p_work_boq_item_id: workBoqItemId 
        });

      console.log('📦 Materials fetched:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to fetch materials:', error);
        return { error: error.message };
      }

      console.log('✅ Materials retrieved successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in getMaterialsForWork:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить все работы, использующие материал
   */
  async getWorksUsingMaterial(materialBoqItemId: string) {
    console.log('🚀 Getting works using material:', materialBoqItemId);
    
    try {
      const { data, error } = await supabase
        .rpc('get_works_using_material', { 
          p_material_boq_item_id: materialBoqItemId 
        });

      console.log('📦 Works fetched:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to fetch works:', error);
        return { error: error.message };
      }

      console.log('✅ Works retrieved successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in getWorksUsingMaterial:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Обновить связь
   */
  async updateLink(linkId: string, updates: Partial<WorkMaterialLink>) {
    console.log('🚀 Updating work-material link:', { linkId, updates });
    
    try {
      // Подготавливаем объект обновления, включая все возможные поля
      const updateData: any = {};
      if (updates.work_boq_item_id !== undefined) updateData.work_boq_item_id = updates.work_boq_item_id;
      if (updates.material_boq_item_id !== undefined) updateData.material_boq_item_id = updates.material_boq_item_id;
      if (updates.material_quantity_per_work !== undefined) updateData.material_quantity_per_work = updates.material_quantity_per_work;
      if (updates.usage_coefficient !== undefined) updateData.usage_coefficient = updates.usage_coefficient;
      if (updates.delivery_price_type !== undefined) updateData.delivery_price_type = updates.delivery_price_type;
      if (updates.delivery_amount !== undefined) updateData.delivery_amount = updates.delivery_amount;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      
      const { data, error } = await supabase
        .from('work_material_links')
        .update(updateData)
        .eq('id', linkId)
        .select()
        .single();

      console.log('📦 Update result:', { data, error });

      if (error) {
        console.error('❌ Failed to update link:', error);
        return { error: error.message };
      }

      console.log('✅ Link updated successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in updateLink:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Удалить связь
   */
  async deleteLink(linkId: string) {
    console.log('🚀 Deleting work-material link:', linkId);
    
    try {
      const { error } = await supabase
        .from('work_material_links')
        .delete()
        .eq('id', linkId);

      console.log('📦 Delete result:', { error });

      if (error) {
        console.error('❌ Failed to delete link:', error);
        return { error: error.message };
      }

      console.log('✅ Link deleted successfully');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in deleteLink:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Проверить существование связи
   */
  async checkLinkExists(workBoqItemId: string, materialBoqItemId: string) {
    console.log('🚀 Checking if link exists:', { workBoqItemId, materialBoqItemId });

    try {
      const { data, error } = await supabase
        .from('work_material_links')
        .select('id')
        .eq('work_boq_item_id', workBoqItemId)
        .eq('material_boq_item_id', materialBoqItemId)
        .single();

      console.log('📦 Check result:', { exists: !!data, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Failed to check link:', error);
        return { error: error.message };
      }

      return { exists: !!data, linkId: data?.id };
    } catch (error) {
      console.error('💥 Exception in checkLinkExists:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить все связи work-material для тендера
   * Оптимизированный метод для загрузки всех связей одним запросом
   */
  async getLinksByTender(tenderId: string) {
    console.log('🚀 Getting all work-material links for tender:', tenderId);

    try {
      // Загружаем все связи через JOIN с client_positions
      const { data, error } = await supabase
        .from('work_material_links')
        .select(`
          *,
          client_position:client_positions!inner(
            id,
            tender_id
          )
        `)
        .eq('client_position.tender_id', tenderId);

      if (error) {
        console.error('❌ Failed to fetch links for tender:', error);
        return { error: error.message };
      }

      // Группируем связи по client_position_id для удобного доступа
      const linksByPosition = new Map<string, any[]>();

      if (data) {
        for (const link of data) {
          const positionId = link.client_position_id;
          if (!linksByPosition.has(positionId)) {
            linksByPosition.set(positionId, []);
          }
          // Убираем вложенный объект client_position из результата
          const { client_position, ...linkData } = link;
          linksByPosition.get(positionId)!.push(linkData);
        }
      }

      console.log(`✅ Loaded ${data?.length || 0} links for ${linksByPosition.size} positions`);

      return {
        data: linksByPosition,
        totalLinks: data?.length || 0,
        positionsCount: linksByPosition.size
      };
    } catch (error) {
      console.error('💥 Exception in getLinksByTender:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};