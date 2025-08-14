import { supabase } from '../client';
import type { Database } from '../types/database';

type WorksLibrary = Database['public']['Tables']['works_library']['Row'];
type MaterialsLibrary = Database['public']['Tables']['materials_library']['Row'];
type WorkMaterialLink = Database['public']['Tables']['work_material_links']['Row'];
type BOQItem = Database['public']['Tables']['boq_items']['Row'];
type ClientPosition = Database['public']['Tables']['client_positions']['Row'];

export interface WorkWithMaterials {
  work: WorksLibrary;
  materials: Array<{
    material: MaterialsLibrary;
    link: WorkMaterialLink;
    quantity: number;
    totalCost: number;
  }>;
  totalCost: number;
}

export interface CreateWorkMaterialLinkParams {
  tenderId: string;
  clientPositionId: string;
  workId: string;
  materialId: string;
  workQuantity: number;
  materialQuantityPerWork: number;
  usageCoefficient?: number;
  deliveryPriceType?: 'included' | 'not_included' | 'amount';
  deliveryAmount?: number;
  notes?: string;
}

export const workMaterialsManagementApi = {
  /**
   * Получить все работы с их материалами для тендера
   */
  async getWorksByTender(tenderId: string): Promise<WorkWithMaterials[]> {
    console.log('🚀 [getWorksByTender] запрос для тендера:', tenderId);
    
    try {
      // Получаем все позиции заказчика для тендера
      const { data: positions, error: posError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', tenderId)
        .order('position_number');
        
      if (posError) throw posError;
      
      const result: WorkWithMaterials[] = [];
      
      for (const position of positions || []) {
        // Получаем работы для позиции
        const { data: workItems, error: workError } = await supabase
          .from('boq_items')
          .select(`
            *,
            work:works_library(*)
          `)
          .eq('client_position_id', position.id)
          .eq('item_type', 'work');
          
        if (workError) throw workError;
        
        for (const workItem of workItems || []) {
          if (!workItem.work) continue;
          
          // Получаем связанные материалы
          const { data: links, error: linksError } = await supabase
            .from('work_material_links')
            .select(`
              *,
              material_boq:boq_items!work_material_links_material_boq_item_id_fkey(
                *,
                material:materials_library(*)
              )
            `)
            .eq('work_boq_item_id', workItem.id);
            
          if (linksError) throw linksError;
          
          const materials = (links || []).map(link => {
            const materialBoq = link.material_boq as any;
            const quantity = (workItem.quantity || 0) * (link.material_quantity_per_work || 1) * (link.usage_coefficient || 1);
            const unitCost = materialBoq?.unit_rate || 0;
            const totalCost = quantity * unitCost;
            
            return {
              material: materialBoq?.material,
              link,
              quantity,
              totalCost
            };
          }).filter(m => m.material);
          
          const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
          
          result.push({
            work: workItem.work as WorksLibrary,
            materials,
            totalCost
          });
        }
      }
      
      console.log('✅ [getWorksByTender] загружено работ:', result.length);
      return result;
    } catch (error) {
      console.error('❌ [getWorksByTender] ошибка:', error);
      throw error;
    }
  },

  /**
   * Создать связь между работой и материалом
   */
  async createWorkMaterialLink(params: CreateWorkMaterialLinkParams) {
    console.log('🚀 [createWorkMaterialLink] создание связи:', params);
    
    try {
      // Создаем BOQ элемент для работы если его нет
      let workBoqItemId = null;
      
      // Проверяем существующий BOQ элемент для работы
      const { data: existingWork } = await supabase
        .from('boq_items')
        .select('id')
        .eq('client_position_id', params.clientPositionId)
        .eq('work_id', params.workId)
        .eq('item_type', 'work')
        .single();
        
      if (existingWork) {
        workBoqItemId = existingWork.id;
      } else {
        // Создаем новый BOQ элемент для работы
        const { data: workLibrary } = await supabase
          .from('works_library')
          .select('*')
          .eq('id', params.workId)
          .single();
          
        if (!workLibrary) throw new Error('Работа не найдена в библиотеке');
        
        const { data: newWorkBoq, error: workError } = await supabase
          .from('boq_items')
          .insert({
            tender_id: params.tenderId,
            client_position_id: params.clientPositionId,
            item_type: 'work',
            work_id: params.workId,
            description: workLibrary.name,
            unit: workLibrary.unit,
            quantity: params.workQuantity,
            unit_rate: 0,
            item_number: `W-${Date.now()}`
          })
          .select()
          .single();
          
        if (workError) throw workError;
        workBoqItemId = newWorkBoq.id;
      }
      
      // Создаем BOQ элемент для материала
      const { data: materialLibrary } = await supabase
        .from('materials_library')
        .select('*')
        .eq('id', params.materialId)
        .single();
        
      if (!materialLibrary) throw new Error('Материал не найден в библиотеке');
      
      const { data: materialBoq, error: matError } = await supabase
        .from('boq_items')
        .insert({
          tender_id: params.tenderId,
          client_position_id: params.clientPositionId,
          item_type: 'material',
          material_id: params.materialId,
          description: materialLibrary.name,
          unit: materialLibrary.unit,
          quantity: params.workQuantity * params.materialQuantityPerWork * (params.usageCoefficient || 1),
          unit_rate: 0,
          item_number: `M-${Date.now()}`,
          consumption_coefficient: params.usageCoefficient || 1,
          delivery_price_type: params.deliveryPriceType || 'included',
          delivery_amount: params.deliveryAmount || 0
        })
        .select()
        .single();
        
      if (matError) throw matError;
      
      // Создаем связь
      const { data: link, error: linkError } = await supabase
        .from('work_material_links')
        .insert({
          client_position_id: params.clientPositionId,
          work_boq_item_id: workBoqItemId,
          material_boq_item_id: materialBoq.id,
          material_quantity_per_work: params.materialQuantityPerWork,
          usage_coefficient: params.usageCoefficient || 1,
          delivery_price_type: params.deliveryPriceType || 'included',
          delivery_amount: params.deliveryAmount || 0,
          notes: params.notes
        })
        .select()
        .single();
        
      if (linkError) throw linkError;
      
      console.log('✅ [createWorkMaterialLink] связь создана:', link);
      return link;
    } catch (error) {
      console.error('❌ [createWorkMaterialLink] ошибка:', error);
      throw error;
    }
  },

  /**
   * Обновить связь между работой и материалом
   */
  async updateWorkMaterialLink(linkId: string, updates: Partial<WorkMaterialLink>) {
    console.log('🚀 [updateWorkMaterialLink] обновление связи:', linkId, updates);
    
    try {
      const { data, error } = await supabase
        .from('work_material_links')
        .update(updates)
        .eq('id', linkId)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('✅ [updateWorkMaterialLink] связь обновлена:', data);
      return data;
    } catch (error) {
      console.error('❌ [updateWorkMaterialLink] ошибка:', error);
      throw error;
    }
  },

  /**
   * Удалить связь между работой и материалом
   */
  async deleteWorkMaterialLink(linkId: string) {
    console.log('🚀 [deleteWorkMaterialLink] удаление связи:', linkId);
    
    try {
      // Получаем информацию о связи
      const { data: link } = await supabase
        .from('work_material_links')
        .select('material_boq_item_id')
        .eq('id', linkId)
        .single();
        
      if (link) {
        // Удаляем BOQ элемент материала
        await supabase
          .from('boq_items')
          .delete()
          .eq('id', link.material_boq_item_id);
      }
      
      // Удаляем саму связь
      const { error } = await supabase
        .from('work_material_links')
        .delete()
        .eq('id', linkId);
        
      if (error) throw error;
      
      console.log('✅ [deleteWorkMaterialLink] связь удалена');
      return true;
    } catch (error) {
      console.error('❌ [deleteWorkMaterialLink] ошибка:', error);
      throw error;
    }
  },

  /**
   * Переместить материал в другую работу
   */
  async moveMaterialToWork(linkId: string, newWorkBoqItemId: string) {
    console.log('🚀 [moveMaterialToWork] перемещение материала:', { linkId, newWorkBoqItemId });
    
    try {
      const { data, error } = await supabase
        .from('work_material_links')
        .update({ work_boq_item_id: newWorkBoqItemId })
        .eq('id', linkId)
        .select()
        .single();
        
      if (error) throw error;
      
      console.log('✅ [moveMaterialToWork] материал перемещен:', data);
      return data;
    } catch (error) {
      console.error('❌ [moveMaterialToWork] ошибка:', error);
      throw error;
    }
  },

  /**
   * Копировать работу со всеми материалами
   */
  async copyWorkWithMaterials(workBoqItemId: string, targetClientPositionId: string) {
    console.log('🚀 [copyWorkWithMaterials] копирование работы:', { workBoqItemId, targetClientPositionId });
    
    try {
      // Получаем информацию о работе
      const { data: workBoq } = await supabase
        .from('boq_items')
        .select('*')
        .eq('id', workBoqItemId)
        .single();
        
      if (!workBoq) throw new Error('Работа не найдена');
      
      // Создаем копию работы
      const { data: newWorkBoq, error: workError } = await supabase
        .from('boq_items')
        .insert({
          ...workBoq,
          id: undefined,
          client_position_id: targetClientPositionId,
          item_number: `${workBoq.item_number}-copy-${Date.now()}`,
          created_at: undefined,
          updated_at: undefined
        })
        .select()
        .single();
        
      if (workError) throw workError;
      
      // Получаем все связанные материалы
      const { data: links } = await supabase
        .from('work_material_links')
        .select(`
          *,
          material_boq:boq_items!work_material_links_material_boq_item_id_fkey(*)
        `)
        .eq('work_boq_item_id', workBoqItemId);
        
      // Копируем каждый материал и связь
      for (const link of links || []) {
        const materialBoq = link.material_boq as any;
        
        // Создаем копию материала
        const { data: newMaterialBoq, error: matError } = await supabase
          .from('boq_items')
          .insert({
            ...materialBoq,
            id: undefined,
            client_position_id: targetClientPositionId,
            item_number: `${materialBoq.item_number}-copy-${Date.now()}`,
            created_at: undefined,
            updated_at: undefined
          })
          .select()
          .single();
          
        if (matError) throw matError;
        
        // Создаем новую связь
        await supabase
          .from('work_material_links')
          .insert({
            client_position_id: targetClientPositionId,
            work_boq_item_id: newWorkBoq.id,
            material_boq_item_id: newMaterialBoq.id,
            material_quantity_per_work: link.material_quantity_per_work,
            usage_coefficient: link.usage_coefficient,
            delivery_price_type: link.delivery_price_type,
            delivery_amount: link.delivery_amount,
            notes: link.notes
          });
      }
      
      console.log('✅ [copyWorkWithMaterials] работа скопирована');
      return newWorkBoq;
    } catch (error) {
      console.error('❌ [copyWorkWithMaterials] ошибка:', error);
      throw error;
    }
  }
};