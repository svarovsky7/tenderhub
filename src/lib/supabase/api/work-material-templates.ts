import { supabase } from '../client';
import type { Database } from '../types/database';

// Типы для работы с шаблонами
export interface WorkMaterialTemplate {
  id?: string;
  template_name: string;
  template_description?: string;
  work_library_id?: string;
  sub_work_library_id?: string;
  material_library_id?: string;
  sub_material_library_id?: string;
  is_linked_to_work: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkMaterialTemplateDetailed extends WorkMaterialTemplate {
  work_name?: string;
  work_unit?: string;
  work_description?: string;
  material_name?: string;
  material_unit?: string;
  material_description?: string;
  material_consumption_coefficient?: number;
}

export interface TemplateGroup {
  template_name: string;
  template_description?: string;
  work_data?: {
    id: string;
    name: string;
    description?: string;
    unit: string;
    type: 'work' | 'sub_work';
    unit_rate?: number;
    currency_type?: string;
    category?: string;
  };
  materials: Array<{
    id: string;
    name: string;
    description?: string;
    unit: string;
    type: 'material' | 'sub_material' | 'work' | 'sub_work';
    category?: string;
    material_type?: string;
    consumption_coefficient?: number;
    unit_rate?: number;
    currency_type?: string;
    delivery_price_type?: string;
    delivery_amount?: number;
    quote_link?: string;
    conversion_coefficient: number;
    is_linked_to_work: boolean;
    notes?: string;
    template_item_id?: string;
    template_name?: string;
    template_description?: string;
    work_library_id?: string;
    sub_work_library_id?: string;
    material_library_id?: string;
    sub_material_library_id?: string;
    work_library?: any;
    sub_work_library?: any;
    material_library?: any;
    sub_material_library?: any;
    linked_work_id?: string;
    linked_work_name?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export const workMaterialTemplatesApi = {
  /**
   * Создать элемент шаблона
   */
  async createTemplateItem(template: WorkMaterialTemplate) {
    console.log('🚀 Creating template item:', {
      template_name: template.template_name,
      work_id: template.work_library_id || template.sub_work_library_id,
      material_id: template.material_library_id || template.sub_material_library_id,
      is_linked_to_work: template.is_linked_to_work
    });

    // Validate required fields
    if (!template.template_name?.trim()) {
      console.error('❌ template_name is required');
      return { error: 'Название шаблона обязательно' };
    }

    const hasWork = template.work_library_id || template.sub_work_library_id;
    const hasMaterial = template.material_library_id || template.sub_material_library_id;

    // Проверяем что есть хотя бы что-то
    if (!hasWork && !hasMaterial) {
      console.error('❌ Either work or material is required');
      return { error: 'Необходимо выбрать работу или материал' };
    }

    // Для привязанных материалов работа обязательна
    if (hasMaterial && template.is_linked_to_work && !hasWork) {
      console.error('❌ Work is required for linked material');
      return { error: 'Для привязанного материала необходимо указать работу' };
    }

    console.log('✅ Validation passed:', {
      hasWork,
      hasMaterial,
      is_linked_to_work: template.is_linked_to_work
    });

    try {
      const { data, error } = await supabase
        .from('work_material_templates')
        .insert({
          template_name: template.template_name.trim(),
          template_description: template.template_description?.trim() || null,
          work_library_id: template.work_library_id || null,
          sub_work_library_id: template.sub_work_library_id || null,
          material_library_id: template.material_library_id || null,
          sub_material_library_id: template.sub_material_library_id || null,
          is_linked_to_work: template.is_linked_to_work !== false,
          notes: template.notes?.trim() || null
        })
        .select()
        .single();

      console.log('📦 Create template item result:', { data, error });

      if (error) {
        console.error('❌ Failed to create template item:', error);
        return { error: error.message };
      }

      console.log('✅ Template item created successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in createTemplateItem:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить все шаблоны (сгруппированные по template_name)
   */
  async getTemplates() {
    console.log('🚀 Getting all templates');

    try {
      // First get templates with library data
      const { data: templatesData, error: templatesError } = await supabase
        .from('work_material_templates')
        .select(`
          *,
          work_library:works_library!work_library_id(
            id, name_id, item_type, unit_rate, currency_type
          ),
          sub_work_library:works_library!sub_work_library_id(
            id, name_id, item_type, unit_rate, currency_type
          ),
          material_library:materials_library!material_library_id(
            id, name_id, item_type, material_type, consumption_coefficient, conversion_coefficient, unit_rate, currency_type, delivery_price_type, delivery_amount, quote_link
          ),
          sub_material_library:materials_library!sub_material_library_id(
            id, name_id, item_type, material_type, consumption_coefficient, conversion_coefficient, unit_rate, currency_type, delivery_price_type, delivery_amount, quote_link
          )
        `)
        .order('template_name', { ascending: true })
        .order('created_at', { ascending: true });

      if (templatesError) {
        console.error('❌ Failed to fetch templates:', templatesError);
        return { error: templatesError.message };
      }

      // Now get all name_ids to fetch names
      const workNameIds = new Set<string>();
      const materialNameIds = new Set<string>();

      templatesData?.forEach((item: any) => {
        if (item.work_library?.name_id) workNameIds.add(item.work_library.name_id);
        if (item.sub_work_library?.name_id) workNameIds.add(item.sub_work_library.name_id);
        if (item.material_library?.name_id) materialNameIds.add(item.material_library.name_id);
        if (item.sub_material_library?.name_id) materialNameIds.add(item.sub_material_library.name_id);
      });

      // Fetch work names
      const workNamesMap = new Map<string, { name: string; unit: string }>();
      if (workNameIds.size > 0) {
        const { data: workNames } = await supabase
          .from('work_names')
          .select('id, name, unit')
          .in('id', Array.from(workNameIds));

        workNames?.forEach(n => workNamesMap.set(n.id, { name: n.name, unit: n.unit }));
      }

      // Fetch material names
      const materialNamesMap = new Map<string, { name: string; unit: string }>();
      if (materialNameIds.size > 0) {
        const { data: materialNames } = await supabase
          .from('material_names')
          .select('id, name, unit')
          .in('id', Array.from(materialNameIds));

        materialNames?.forEach(n => materialNamesMap.set(n.id, { name: n.name, unit: n.unit }));
      }

      // Combine data with names
      const data = templatesData?.map((item: any) => ({
        ...item,
        work_name: item.work_library?.name_id ? workNamesMap.get(item.work_library.name_id) : null,
        sub_work_name: item.sub_work_library?.name_id ? workNamesMap.get(item.sub_work_library.name_id) : null,
        material_name: item.material_library?.name_id ? materialNamesMap.get(item.material_library.name_id) : null,
        sub_material_name: item.sub_material_library?.name_id ? materialNamesMap.get(item.sub_material_library.name_id) : null
      }));

      const error = null;

      console.log('📦 Templates fetched:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to fetch templates:', error);
        return { error: error.message };
      }

      // Проверяем конкретно "Новый шаблон"
      const newTemplateItems = data?.filter((item: any) => item.template_name === 'Новый шаблон');
      console.log('🔍 "Новый шаблон" items:', newTemplateItems);

      // Сортируем данные так, чтобы сначала обрабатывались записи только с работами
      // Это важно для правильного порядка добавления в массив materials
      const sortedData = data?.sort((a: any, b: any) => {
        const aHasWork = !!(a.work_library_id || a.sub_work_library_id);
        const aHasMaterial = !!(a.material_library_id || a.sub_material_library_id);
        const bHasWork = !!(b.work_library_id || b.sub_work_library_id);
        const bHasMaterial = !!(b.material_library_id || b.sub_material_library_id);

        // Приоритет: только работа > работа+материал > только материал
        const aPriority = aHasWork && !aHasMaterial ? 0 : (aHasWork && aHasMaterial ? 1 : 2);
        const bPriority = bHasWork && !bHasMaterial ? 0 : (bHasWork && bHasMaterial ? 1 : 2);

        if (aPriority !== bPriority) return aPriority - bPriority;

        // Если приоритет одинаковый, сортируем по имени шаблона и дате создания
        if (a.template_name !== b.template_name) {
          return a.template_name.localeCompare(b.template_name);
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Группируем по template_name
      const grouped = new Map<string, TemplateGroup>();

      sortedData?.forEach((item: any) => {
        const templateName = item.template_name;

        console.log('📋 Processing template item:', {
          id: item.id,
          template_name: item.template_name,
          work_library_id: item.work_library_id,
          sub_work_library_id: item.sub_work_library_id,
          material_library_id: item.material_library_id,
          sub_material_library_id: item.sub_material_library_id,
          is_linked: item.is_linked_to_work,
          work_name: item.work_name?.name || item.sub_work_name?.name || 'NO WORK',
          material_name: item.material_name?.name || item.sub_material_name?.name || 'NO MATERIAL'
        });

        // Создаем группу если ее еще нет
        if (!grouped.has(templateName)) {
          grouped.set(templateName, {
            template_name: templateName,
            template_description: item.template_description,
            work_data: undefined, // Будет заполнено позже
            materials: [],
            created_at: item.created_at,
            updated_at: item.updated_at
          });
        }

        const group = grouped.get(templateName)!;

        // Определяем данные работы и материала
        const workLibrary = item.work_library || item.sub_work_library;
        const workNameData = item.work_name || item.sub_work_name;
        const materialLibrary = item.material_library || item.sub_material_library;
        const materialNameData = item.material_name || item.sub_material_name;

        // Объединяем данные из библиотеки и имени
        const workData = workLibrary ? { ...workLibrary, name: workNameData?.name, unit: workNameData?.unit } : null;
        const materialData = materialLibrary ? { ...materialLibrary, name: materialNameData?.name, unit: materialNameData?.unit } : null;

        console.log('📊 Extracted data:', {
          hasWork: !!workData,
          hasMaterial: !!materialData,
          workName: workData?.name,
          materialName: materialData?.name
        });

        // Если есть работа и материал - это связка
        if (workData && materialData) {
          // Сначала добавляем работу как отдельный элемент, если ее еще нет в списке
          const workType = item.sub_work_library ? 'sub_work' : 'work';
          const workAlreadyExists = group.materials.some(m =>
            m.id === workData.id && (m.type === 'work' || m.type === 'sub_work')
          );

          console.log(`    🔍 Work "${workData.name}" (${workData.id}) already exists: ${workAlreadyExists}`);

          if (!workAlreadyExists) {
            console.log(`    ➕ Adding work "${workData.name}" to materials list`);
            // Добавляем работу как отдельный элемент
            group.materials.push({
              id: workData.id,
              name: workData.name,
              description: undefined,
              unit: workData.unit,
              type: workType as any,
              category: undefined,
              material_type: undefined,
              consumption_coefficient: 1,
              unit_rate: workData.unit_rate,
              currency_type: workData.currency_type,
              delivery_price_type: undefined,
              delivery_amount: undefined,
              quote_link: undefined,
              conversion_coefficient: 1,
              is_linked_to_work: false,
              notes: undefined,
              template_item_id: item.id,
              template_name: item.template_name,
              template_description: item.template_description,
              work_library_id: item.work_library_id,
              sub_work_library_id: item.sub_work_library_id,
              material_library_id: undefined,
              sub_material_library_id: undefined,
              work_library: item.work_library,
              sub_work_library: item.sub_work_library,
              material_library: undefined,
              sub_material_library: undefined
            });
          }

          // Добавляем материал привязанный к работе
          const materialType = item.sub_material_library ? 'sub_material' : 'material';
          group.materials.push({
            id: materialData.id,
            name: materialData.name,
            description: undefined,
            unit: materialData.unit,
            type: materialType,
            category: undefined,
            material_type: materialData.material_type,
            consumption_coefficient: materialData.consumption_coefficient,
            unit_rate: materialData.unit_rate,
            currency_type: materialData.currency_type,
            delivery_price_type: materialData.delivery_price_type,
            delivery_amount: materialData.delivery_amount,
            quote_link: materialData.quote_link,
            conversion_coefficient: materialData?.conversion_coefficient || 1,
            is_linked_to_work: item.is_linked_to_work,
            notes: item.notes,
            template_item_id: item.id,
            template_name: item.template_name,
            template_description: item.template_description,
            work_library_id: item.work_library_id,
            sub_work_library_id: item.sub_work_library_id,
            material_library_id: item.material_library_id,
            sub_material_library_id: item.sub_material_library_id,
            work_library: item.work_library,
            sub_work_library: item.sub_work_library,
            material_library: item.material_library,
            sub_material_library: item.sub_material_library,
            // Добавляем ссылку на работу для правильной группировки
            linked_work_id: workData.id,
            linked_work_name: workData.name
          });

          // Также сохраняем работу если ее еще нет
          if (!group.work_data && item.is_linked_to_work) {
            group.work_data = {
              id: workData.id,
              name: workData.name,
              description: undefined,
              unit: workData.unit,
              type: workType,
              unit_rate: workData.unit_rate,
              currency_type: workData.currency_type,
              category: undefined
            };
          }
        }
        // Если только работа без материала
        else if (workData && !materialData) {
          const workType = item.sub_work_library ? 'sub_work' : 'work';
          // Для работ без материалов добавляем их как специальную запись в materials
          // чтобы они отображались в таблице
          group.materials.push({
            id: workData.id,
            name: workData.name,
            description: workData.description,
            unit: workData.unit,
            type: workType as any,
            category: workData.category,
            material_type: undefined,
            consumption_coefficient: 1,
            unit_rate: workData.unit_rate,
            currency_type: workData.currency_type,
            delivery_price_type: undefined,
            delivery_amount: undefined,
            quote_link: undefined,
            conversion_coefficient: 1,
            is_linked_to_work: false,
            notes: 'Работа без материалов',
            template_item_id: item.id,
            template_name: item.template_name,
            template_description: item.template_description,
            work_library_id: item.work_library_id,
            sub_work_library_id: item.sub_work_library_id,
            material_library_id: null,
            sub_material_library_id: null,
            work_library: item.work_library,
            sub_work_library: item.sub_work_library,
            material_library: null,
            sub_material_library: null
          });

          // Также сохраняем как work_data если это первая работа
          if (!group.work_data) {
            group.work_data = {
              id: workData.id,
              name: workData.name,
              description: undefined,
              unit: workData.unit,
              type: workType,
              unit_rate: workData.unit_rate,
              currency_type: workData.currency_type,
              category: undefined
            };
          }
        }
        // Если только материал без работы
        else if (!workData && materialData) {
          const materialType = item.material_library ? 'material' : 'sub_material';
          group.materials.push({
            id: materialData.id,
            name: materialData.name,
            description: undefined,
            unit: materialData.unit,
            type: materialType,
            category: undefined,
            material_type: materialData.material_type,
            consumption_coefficient: materialData.consumption_coefficient,
            unit_rate: materialData.unit_rate,
            currency_type: materialData.currency_type,
            delivery_price_type: materialData.delivery_price_type,
            delivery_amount: materialData.delivery_amount,
            quote_link: materialData.quote_link,
            conversion_coefficient: materialData?.conversion_coefficient || 1,
            is_linked_to_work: false,
            notes: item.notes,
            template_item_id: item.id,
            template_name: item.template_name,
            template_description: item.template_description,
            work_library_id: null,
            sub_work_library_id: null,
            material_library_id: item.material_library_id,
            sub_material_library_id: item.sub_material_library_id,
            work_library: null,
            sub_work_library: null,
            material_library: item.material_library,
            sub_material_library: item.sub_material_library
          });
        }
      });

      const templates = Array.from(grouped.values());
      console.log('✅ Templates grouped:', templates.length);

      // Проверяем конкретно "Новый шаблон" после группировки
      const newTemplate = templates.find(t => t.template_name === 'Новый шаблон');
      if (newTemplate) {
        console.log('🎯 "Новый шаблон" after grouping:', {
          name: newTemplate.template_name,
          materials_count: newTemplate.materials?.length,
          materials: newTemplate.materials?.map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            linked_work_id: m.linked_work_id,
            linked_work_name: m.linked_work_name,
            is_linked_to_work: m.is_linked_to_work
          }))
        });
      }

      return { data: templates };
    } catch (error) {
      console.error('💥 Exception in getTemplates:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Получить элементы конкретного шаблона
   */
  async getTemplateByName(templateName: string) {
    console.log('🚀 Getting template by name:', templateName);

    try {
      // First get templates with library data
      const { data: templatesData, error: templatesError } = await supabase
        .from('work_material_templates')
        .select(`
          *,
          work_library:works_library!work_library_id(
            id, name_id, item_type, unit_rate, currency_type
          ),
          sub_work_library:works_library!sub_work_library_id(
            id, name_id, item_type, unit_rate, currency_type
          ),
          material_library:materials_library!material_library_id(
            id, name_id, item_type, material_type, consumption_coefficient, conversion_coefficient, unit_rate, currency_type, delivery_price_type, delivery_amount, quote_link
          ),
          sub_material_library:materials_library!sub_material_library_id(
            id, name_id, item_type, material_type, consumption_coefficient, conversion_coefficient, unit_rate, currency_type, delivery_price_type, delivery_amount, quote_link
          )
        `)
        .eq('template_name', templateName)
        .order('created_at', { ascending: true });

      if (templatesError) {
        console.error('❌ Failed to fetch templates:', templatesError);
        return { error: templatesError.message };
      }

      // Now get all name_ids to fetch names
      const workNameIds = new Set<string>();
      const materialNameIds = new Set<string>();

      templatesData?.forEach((item: any) => {
        if (item.work_library?.name_id) workNameIds.add(item.work_library.name_id);
        if (item.sub_work_library?.name_id) workNameIds.add(item.sub_work_library.name_id);
        if (item.material_library?.name_id) materialNameIds.add(item.material_library.name_id);
        if (item.sub_material_library?.name_id) materialNameIds.add(item.sub_material_library.name_id);
      });

      // Fetch work names
      const workNamesMap = new Map<string, { name: string; unit: string }>();
      if (workNameIds.size > 0) {
        const { data: workNames } = await supabase
          .from('work_names')
          .select('id, name, unit')
          .in('id', Array.from(workNameIds));

        workNames?.forEach(n => workNamesMap.set(n.id, { name: n.name, unit: n.unit }));
      }

      // Fetch material names
      const materialNamesMap = new Map<string, { name: string; unit: string }>();
      if (materialNameIds.size > 0) {
        const { data: materialNames } = await supabase
          .from('material_names')
          .select('id, name, unit')
          .in('id', Array.from(materialNameIds));

        materialNames?.forEach(n => materialNamesMap.set(n.id, { name: n.name, unit: n.unit }));
      }

      // Combine data with names
      const data = templatesData?.map((item: any) => ({
        ...item,
        work_name: item.work_library?.name_id ? workNamesMap.get(item.work_library.name_id) : null,
        sub_work_name: item.sub_work_library?.name_id ? workNamesMap.get(item.sub_work_library.name_id) : null,
        material_name: item.material_library?.name_id ? materialNamesMap.get(item.material_library.name_id) : null,
        sub_material_name: item.sub_material_library?.name_id ? materialNamesMap.get(item.sub_material_library.name_id) : null
      }));

      const error = null;

      console.log('📦 Template items fetched:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to fetch template:', error);
        return { error: error.message };
      }

      console.log('✅ Template retrieved successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in getTemplateByName:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Обновить элемент шаблона
   */
  async updateTemplateItem(itemId: string, updates: Partial<WorkMaterialTemplate>) {
    console.log('🚀 Updating template item:', { itemId, updates });

    try {
      const updateData: any = {};
      if (updates.template_name !== undefined) updateData.template_name = updates.template_name.trim();
      if (updates.template_description !== undefined) updateData.template_description = updates.template_description?.trim() || null;
      if (updates.work_library_id !== undefined) updateData.work_library_id = updates.work_library_id;
      if (updates.sub_work_library_id !== undefined) updateData.sub_work_library_id = updates.sub_work_library_id;
      if (updates.material_library_id !== undefined) updateData.material_library_id = updates.material_library_id;
      if (updates.sub_material_library_id !== undefined) updateData.sub_material_library_id = updates.sub_material_library_id;
      // conversion_coefficient is now in materials_library, not here
      if (updates.is_linked_to_work !== undefined) updateData.is_linked_to_work = updates.is_linked_to_work;
      if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null;

      const { data, error } = await supabase
        .from('work_material_templates')
        .update(updateData)
        .eq('id', itemId)
        .select()
        .single();

      console.log('📦 Update result:', { data, error });

      if (error) {
        console.error('❌ Failed to update template item:', error);
        return { error: error.message };
      }

      console.log('✅ Template item updated successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in updateTemplateItem:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Удалить элемент шаблона
   */
  async deleteTemplateItem(itemId: string) {
    console.log('🚀 Deleting template item:', itemId);

    try {
      const { error } = await supabase
        .from('work_material_templates')
        .delete()
        .eq('id', itemId);

      console.log('📦 Delete result:', { error });

      if (error) {
        console.error('❌ Failed to delete template item:', error);
        return { error: error.message };
      }

      console.log('✅ Template item deleted successfully');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in deleteTemplateItem:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Удалить весь шаблон (все элементы с одинаковым template_name)
   */
  async deleteTemplate(templateName: string) {
    console.log('🚀 Deleting entire template:', templateName);

    try {
      const { error } = await supabase
        .from('work_material_templates')
        .delete()
        .eq('template_name', templateName);

      console.log('📦 Delete template result:', { error });

      if (error) {
        console.error('❌ Failed to delete template:', error);
        return { error: error.message };
      }

      console.log('✅ Template deleted successfully');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in deleteTemplate:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Дублировать шаблон с новым именем
   */
  async duplicateTemplate(originalTemplateName: string, newTemplateName: string) {
    console.log('🚀 Duplicating template:', { originalTemplateName, newTemplateName });

    try {
      // Получаем элементы оригинального шаблона
      const { data: originalItems, error: fetchError } = await this.getTemplateByName(originalTemplateName);

      if (fetchError) {
        return { error: fetchError };
      }

      if (!originalItems || originalItems.length === 0) {
        return { error: 'Шаблон не найден' };
      }

      // Создаем копии элементов с новым именем
      const newItems = originalItems.map((item: any) => ({
        template_name: newTemplateName.trim(),
        template_description: item.template_description,
        work_library_id: item.work_library_id,
        sub_work_library_id: item.sub_work_library_id,
        material_library_id: item.material_library_id,
        sub_material_library_id: item.sub_material_library_id,
        // conversion_coefficient is now in materials_library
        is_linked_to_work: item.is_linked_to_work,
        notes: item.notes
      }));

      const { data, error } = await supabase
        .from('work_material_templates')
        .insert(newItems)
        .select();

      console.log('📦 Duplicate result:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to duplicate template:', error);
        return { error: error.message };
      }

      console.log('✅ Template duplicated successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in duplicateTemplate:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Обновить работу из шаблона
   */
  async updateWorkFromTemplate(
    workId: string,
    isSubWork: boolean,
    updates: {
      name?: string;
      unit?: string;
      unit_rate?: number;
      currency_type?: string;
    }
  ) {
    console.log('🚀 Updating work from template:', { workId, isSubWork, updates });

    try {
      const { name, unit, ...workData } = updates;

      // Если обновляется имя или единица измерения
      if (name || unit) {
        // Получаем текущую работу
        const { data: currentWork, error: fetchError } = await supabase
          .from('works_library')
          .select('name_id')
          .eq('id', workId)
          .single();

        if (fetchError) {
          console.error('❌ Failed to fetch work:', fetchError);
          return { error: fetchError.message };
        }

        // Обновляем запись в work_names
        if (currentWork?.name_id) {
          const nameUpdates: any = {};
          if (name) nameUpdates.name = name;
          if (unit) nameUpdates.unit = unit;

          const { error: nameError } = await supabase
            .from('work_names')
            .update(nameUpdates)
            .eq('id', currentWork.name_id);

          if (nameError) {
            console.error('❌ Failed to update work name:', nameError);
            return { error: nameError.message };
          }
          console.log('✅ Work name updated');
        }
      }

      // Обновляем остальные данные в works_library
      if (Object.keys(workData).length > 0) {
        const { error: updateError } = await supabase
          .from('works_library')
          .update(workData)
          .eq('id', workId);

        if (updateError) {
          console.error('❌ Failed to update work library:', updateError);
          return { error: updateError.message };
        }
        console.log('✅ Work library updated');
      }

      return { data: { success: true } };
    } catch (error) {
      console.error('💥 Exception in updateWorkFromTemplate:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Обновить материал из шаблона
   */
  async updateMaterialFromTemplate(
    materialId: string,
    isSubMaterial: boolean,
    updates: {
      name?: string;
      unit?: string;
      unit_rate?: number;
      currency_type?: string;
      consumption_coefficient?: number;
      conversion_coefficient?: number;
      delivery_price_type?: string;
      delivery_amount?: number;
      material_type?: string;
    }
  ) {
    console.log('🚀 Updating material from template:', { materialId, isSubMaterial, updates });

    try {
      const { name, unit, ...materialData } = updates;

      // Если обновляется имя или единица измерения
      if (name || unit) {
        // Получаем текущий материал
        const { data: currentMaterial, error: fetchError } = await supabase
          .from('materials_library')
          .select('name_id')
          .eq('id', materialId)
          .single();

        if (fetchError) {
          console.error('❌ Failed to fetch material:', fetchError);
          return { error: fetchError.message };
        }

        // Обновляем запись в material_names
        if (currentMaterial?.name_id) {
          const nameUpdates: any = {};
          if (name) nameUpdates.name = name;
          if (unit) nameUpdates.unit = unit;

          const { error: nameError } = await supabase
            .from('material_names')
            .update(nameUpdates)
            .eq('id', currentMaterial.name_id);

          if (nameError) {
            console.error('❌ Failed to update material name:', nameError);
            return { error: nameError.message };
          }
          console.log('✅ Material name updated');
        }
      }

      // Обновляем остальные данные в materials_library
      if (Object.keys(materialData).length > 0) {
        const { error: updateError } = await supabase
          .from('materials_library')
          .update(materialData)
          .eq('id', materialId);

        if (updateError) {
          console.error('❌ Failed to update material library:', updateError);
          return { error: updateError.message };
        }
        console.log('✅ Material library updated');
      }

      return { data: { success: true } };
    } catch (error) {
      console.error('💥 Exception in updateMaterialFromTemplate:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Конвертировать шаблон в BOQ элементы
   */
  async convertTemplateToBOQItems(templateName: string, tenderId: string, clientPositionId?: string) {
    console.log('🚀 Converting template to BOQ items:', { templateName, tenderId, clientPositionId });

    try {
      // Получаем элементы шаблона с данными библиотеки
      const { data: templateItems, error: fetchError } = await this.getTemplateByName(templateName);

      if (fetchError) {
        return { error: fetchError };
      }

      if (!templateItems || templateItems.length === 0) {
        return { error: 'Шаблон не найден или пуст' };
      }

      console.log('📋 Template items loaded:', templateItems.length);

      // Конвертируем элементы шаблона в BOQ элементы
      const boqItems = [];

      for (const templateItem of templateItems) {
        // Определяем работу
        const workLibrary = templateItem.work_library || templateItem.sub_work_library;
        const workNameData = templateItem.work_name || templateItem.sub_work_name;
        const workData = workLibrary ? { ...workLibrary, name: workNameData?.name, unit: workNameData?.unit } : null;
        const workType = templateItem.work_library ? 'work' : 'sub_work';

        // Определяем материал
        const materialLibrary = templateItem.material_library || templateItem.sub_material_library;
        const materialNameData = templateItem.material_name || templateItem.sub_material_name;
        const materialData = materialLibrary ? { ...materialLibrary, name: materialNameData?.name, unit: materialNameData?.unit } : null;
        const materialType = templateItem.material_library ? 'material' : 'sub_material';

        if (!workData || !materialData) {
          console.warn('⚠️ Skipping template item with missing work or material:', templateItem.id);
          continue;
        }

        // Создаем BOQ элемент для работы
        const workItem = {
          tender_id: tenderId,
          client_position_id: clientPositionId || null,
          item_type: workType as 'work' | 'sub_work',
          description: workData.name,
          unit: workData.unit,
          quantity: 1, // Базовое количество работ
          unit_rate: 0, // Будет заполнено пользователем
          work_id: workData.id,
          material_id: null,
          notes: templateItem.template_description || null,
          delivery_price_type: 'included' as const,
          currency_type: 'RUB' as const
        };

        // Создаем BOQ элемент для материала
        const materialItem = {
          tender_id: tenderId,
          client_position_id: clientPositionId || null,
          item_type: materialType as 'material' | 'sub_material',
          description: materialData.name,
          unit: materialData.unit,
          quantity: 1, // Базовое количество
          unit_rate: 0, // Будет заполнено пользователем
          work_id: templateItem.is_linked_to_work ? workData.id : null,
          material_id: materialData.id,
          // conversion_coefficient comes from material library now
          consumption_coefficient: materialData.consumption_coefficient || 1.0,
          notes: templateItem.notes || null,
          delivery_price_type: 'included' as const,
          currency_type: 'RUB' as const
        };

        // Если материал привязан к работе, используем base_quantity
        if (!templateItem.is_linked_to_work) {
          materialItem.base_quantity = 1;
        }

        boqItems.push(workItem, materialItem);
      }

      console.log('✅ Template converted to BOQ items:', boqItems.length);
      return { data: boqItems };
    } catch (error) {
      console.error('💥 Exception in convertTemplateToBOQItems:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};