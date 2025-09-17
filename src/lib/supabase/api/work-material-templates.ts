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
    console.log('🚀 Creating template item - full data:', template);
    console.log('🚀 Creating template item - summary:', {
      template_name: template.template_name,
      work_library_id: template.work_library_id,
      sub_work_library_id: template.sub_work_library_id,
      material_library_id: template.material_library_id,
      sub_material_library_id: template.sub_material_library_id,
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

    // ВАЖНО: is_linked_to_work должен быть true ТОЛЬКО если есть И работа И материал
    const actualIsLinkedToWork = !!(hasWork && hasMaterial);

    console.log('✅ Validation passed:', {
      hasWork,
      hasMaterial,
      is_linked_to_work: template.is_linked_to_work
    });

    try {
      // Если добавляется материал, привязанный к работе, проверяем существующие записи
      if (hasMaterial && template.is_linked_to_work && hasWork) {
        console.log('🔍 Checking for existing work record to update...');

        // Проверяем, существует ли уже запись с этой работой в этом шаблоне
        let query = supabase
          .from('work_material_templates')
          .select('*')
          .eq('template_name', template.template_name);

        // Добавляем условие для проверки работы - ищем записи с этой работой
        if (template.work_library_id) {
          query = query.eq('work_library_id', template.work_library_id);
        } else if (template.sub_work_library_id) {
          query = query.eq('sub_work_library_id', template.sub_work_library_id);
        }

        const { data: existingRecords, error: checkError } = await query;

        if (checkError) {
          console.error('❌ Failed to check existing records:', checkError);
          return { error: checkError.message };
        }

        console.log('🔍 Existing records for template:', {
          template_name: template.template_name,
          work_library_id: template.work_library_id,
          sub_work_library_id: template.sub_work_library_id,
          material_library_id: template.material_library_id,
          sub_material_library_id: template.sub_material_library_id,
          records: existingRecords?.map(r => ({
            id: r.id,
            work_library_id: r.work_library_id,
            sub_work_library_id: r.sub_work_library_id,
            material_library_id: r.material_library_id,
            sub_material_library_id: r.sub_material_library_id
          }))
        });

        // Ищем запись с той же работой но без материала
        const recordToUpdate = existingRecords?.find(r => {
          const sameWork = (template.work_library_id && r.work_library_id === template.work_library_id) ||
                          (template.sub_work_library_id && r.sub_work_library_id === template.sub_work_library_id);
          const noMaterial = !r.material_library_id && !r.sub_material_library_id;

          console.log('🔍 Checking record for update:', {
            record_id: r.id,
            sameWork,
            noMaterial,
            shouldUpdate: sameWork && noMaterial
          });

          return sameWork && noMaterial;
        });

        console.log('📝 Record to update found:', recordToUpdate ? `Yes, ID: ${recordToUpdate.id}` : 'No, will create new');

        if (recordToUpdate) {
          // Удаляем старую запись только с работой
          console.log('🗑️ Deleting old work-only record:', recordToUpdate.id);

          const { error: deleteError } = await supabase
            .from('work_material_templates')
            .delete()
            .eq('id', recordToUpdate.id);

          if (deleteError) {
            console.error('❌ Failed to delete old record:', deleteError);
            return { error: deleteError.message };
          }

          console.log('✅ Old work-only record deleted');

          // Теперь создаем новую запись с работой и материалом
          // (продолжение ниже, выполнится стандартная логика создания)
        }
      }

      // Если не нашли запись для обновления или добавляется не привязанный материал или работа - создаём новую запись
      const insertData = {
        template_name: template.template_name.trim(),
        template_description: template.template_description?.trim() || null,
        work_library_id: template.work_library_id || null,
        sub_work_library_id: template.sub_work_library_id || null,
        material_library_id: template.material_library_id || null,
        sub_material_library_id: template.sub_material_library_id || null,
        is_linked_to_work: actualIsLinkedToWork,  // Используем правильное значение
        notes: template.notes?.trim() || null
      };

      console.log('📝 Data to insert into DB:', JSON.stringify(insertData, null, 2));
      console.log('🔍 Type check - is_linked_to_work:', {
        value: insertData.is_linked_to_work,
        type: typeof insertData.is_linked_to_work
      });

      const { data, error } = await supabase
        .from('work_material_templates')
        .insert(insertData)
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

        // Если есть работа и материал - это связка (одна запись в БД!)
        if (workData && materialData) {
          // НЕ добавляем работу отдельно - это будет дублированием
          // Вся информация о связке хранится в одной записи

          // Эта запись представляет и работу и материал одновременно
          // UI должен правильно отображать эту связку
          const materialType = item.sub_material_library ? 'sub_material' : 'material';
          const workType = item.sub_work_library ? 'sub_work' : 'work';

          // Добавляем комбинированную запись с полной информацией
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
            template_item_id: item.id,  // Это ID записи в БД для удаления
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
            linked_work_name: workData.name,
            linked_work_unit: workData.unit,  // Add work unit for display
            // Добавляем информацию о типе работы для корректного отображения в UI
            linked_work_type: workType,
            // Флаг, что эта запись содержит и работу и материал
            is_combined_record: true
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

      console.log('📝 Raw template data:', templatesData?.map(item => ({
        id: item.id,
        is_linked_to_work: item.is_linked_to_work,
        work_library_id: item.work_library_id,
        sub_work_library_id: item.sub_work_library_id,
        material_library_id: item.material_library_id,
        sub_material_library_id: item.sub_material_library_id
      })));

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

      // Логирование для отладки
      console.log('📊 Template data enriched:', data?.map(item => ({
        id: item.id,
        is_linked_to_work: item.is_linked_to_work,
        work_library_id: item.work_library_id,
        sub_work_library_id: item.sub_work_library_id,
        material_library_id: item.material_library_id,
        sub_material_library_id: item.sub_material_library_id,
        work_name: item.work_name,
        sub_work_name: item.sub_work_name,
        material_name: item.material_name,
        sub_material_name: item.sub_material_name
      })));

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
   * Разделить связанную запись на отдельные работу и материал
   */
  async unlinkMaterialFromWork(itemId: string) {
    console.log('🚀 Unlinking material from work:', itemId);

    try {
      // Получаем текущую запись
      const { data: currentItems, error: fetchError } = await supabase
        .from('work_material_templates')
        .select('*')
        .eq('id', itemId);

      if (fetchError || !currentItems || currentItems.length === 0) {
        console.error('❌ Failed to fetch item:', fetchError);
        return { error: fetchError?.message || 'Запись не найдена' };
      }

      // Берем первый элемент из массива
      const currentItem = currentItems[0];
      console.log('📋 Current item data:', currentItem);

      // Проверяем что это действительно связанная запись
      const hasWork = currentItem.work_library_id || currentItem.sub_work_library_id;
      const hasMaterial = currentItem.material_library_id || currentItem.sub_material_library_id;

      console.log('🔍 Checking if linked:', { hasWork, hasMaterial, work_id: currentItem.work_library_id, sub_work_id: currentItem.sub_work_library_id });

      if (!hasWork || !hasMaterial) {
        console.error('❌ Item is not a linked work-material pair:', {
          hasWork,
          hasMaterial,
          currentItem
        });
        return { error: 'Запись не является связанной парой работа-материал' };
      }

      // Обновляем существующую запись - оставляем только материал
      const { error: updateError } = await supabase
        .from('work_material_templates')
        .update({
          work_library_id: null,
          sub_work_library_id: null,
          is_linked_to_work: false
        })
        .eq('id', itemId);

      if (updateError) {
        console.error('❌ Failed to update material record:', updateError);
        return { error: updateError.message };
      }

      // Создаем новую запись для работы
      const newWorkRecord = {
        template_name: currentItem.template_name,
        template_description: currentItem.template_description,
        work_library_id: currentItem.work_library_id,
        sub_work_library_id: currentItem.sub_work_library_id,
        material_library_id: null,
        sub_material_library_id: null,
        is_linked_to_work: false,
        notes: null
      };

      console.log('📝 Creating new work record:', newWorkRecord);

      const { data: insertData, error: insertError } = await supabase
        .from('work_material_templates')
        .insert(newWorkRecord)
        .select();

      if (insertError) {
        console.error('❌ Failed to create work record:', insertError);
        return { error: insertError.message };
      }

      console.log('✅ New work record created:', insertData);

      console.log('✅ Successfully unlinked material from work');
      return { data: null };
    } catch (error) {
      console.error('💥 Exception in unlinkMaterialFromWork:', error);
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
   * Очистить дубликаты работ в шаблонах
   * Удаляет записи только с работой, если есть такая же работа с материалом
   */
  async cleanupDuplicateWorks() {
    console.log('🧹 Starting cleanup of duplicate works in templates');

    try {
      // Получаем все записи из шаблонов
      const { data: allRecords, error: fetchError } = await supabase
        .from('work_material_templates')
        .select('*')
        .order('template_name, created_at');

      if (fetchError) {
        console.error('❌ Failed to fetch templates:', fetchError);
        return { error: fetchError.message };
      }

      if (!allRecords || allRecords.length === 0) {
        console.log('✅ No records to clean');
        return { data: { deleted: 0 } };
      }

      // Группируем по шаблонам
      const templateGroups = new Map<string, any[]>();
      allRecords.forEach(record => {
        const templateName = record.template_name;
        if (!templateGroups.has(templateName)) {
          templateGroups.set(templateName, []);
        }
        templateGroups.get(templateName)!.push(record);
      });

      const toDelete: string[] = [];

      // Проверяем каждый шаблон на дубликаты
      templateGroups.forEach((records, templateName) => {
        console.log(`📋 Checking template "${templateName}" with ${records.length} records`);

        // Находим все записи только с работой (без материала)
        const workOnlyRecords = records.filter(r =>
          (r.work_library_id || r.sub_work_library_id) &&
          !r.material_library_id &&
          !r.sub_material_library_id
        );

        // Находим все записи с работой и материалом
        const workWithMaterialRecords = records.filter(r =>
          (r.work_library_id || r.sub_work_library_id) &&
          (r.material_library_id || r.sub_material_library_id)
        );

        // Для каждой записи только с работой проверяем, есть ли такая же работа с материалом
        workOnlyRecords.forEach(workOnly => {
          const workId = workOnly.work_library_id || workOnly.sub_work_library_id;
          const hasDuplicate = workWithMaterialRecords.some(wm =>
            (wm.work_library_id === workOnly.work_library_id && workOnly.work_library_id) ||
            (wm.sub_work_library_id === workOnly.sub_work_library_id && workOnly.sub_work_library_id)
          );

          if (hasDuplicate) {
            console.log(`  🗑️ Found duplicate work to delete: ${workOnly.id} (work: ${workId})`);
            toDelete.push(workOnly.id);
          }
        });
      });

      // Удаляем найденные дубликаты
      if (toDelete.length > 0) {
        console.log(`🗑️ Deleting ${toDelete.length} duplicate records...`);

        for (const id of toDelete) {
          const { error } = await supabase
            .from('work_material_templates')
            .delete()
            .eq('id', id);

          if (error) {
            console.error(`❌ Failed to delete ${id}:`, error);
          } else {
            console.log(`  ✅ Deleted ${id}`);
          }
        }

        console.log(`✅ Cleanup complete! Deleted ${toDelete.length} duplicate records`);
        return { data: { deleted: toDelete.length } };
      }

      console.log('✅ No duplicates found');
      return { data: { deleted: 0 } };
    } catch (error) {
      console.error('💥 Exception in cleanupDuplicateWorks:', error);
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
      console.log('🔍 Template items details:', templateItems.map(item => ({
        id: item.id,
        has_work: !!(item.work_library_id || item.sub_work_library_id),
        has_material: !!(item.material_library_id || item.sub_material_library_id),
        is_linked_to_work: item.is_linked_to_work,
        work_name: item.work_name?.name || item.sub_work_name?.name,
        material_name: item.material_name?.name || item.sub_material_name?.name,
        linked_work_name: item.linked_work_name
      })));

      // Конвертируем элементы шаблона в BOQ элементы
      const boqItems = [];
      const links = []; // Информация о связях между элементами

      // Сначала сортируем элементы, чтобы связанные пары шли вместе
      const sortedItems = [...templateItems].sort((a, b) => {
        // Сначала связанные пары (с is_linked_to_work = true)
        const aIsLinked = a.is_linked_to_work && (a.material_library_id || a.sub_material_library_id) && (a.work_library_id || a.sub_work_library_id);
        const bIsLinked = b.is_linked_to_work && (b.material_library_id || b.sub_material_library_id) && (b.work_library_id || b.sub_work_library_id);
        if (aIsLinked && !bIsLinked) return -1;
        if (!aIsLinked && bIsLinked) return 1;

        // Затем отдельные работы
        const aIsWork = (a.work_library_id || a.sub_work_library_id) && !a.material_library_id && !a.sub_material_library_id;
        const bIsWork = (b.work_library_id || b.sub_work_library_id) && !b.material_library_id && !b.sub_material_library_id;
        if (aIsWork && !bIsWork) return -1;
        if (!aIsWork && bIsWork) return 1;

        return 0;
      });

      console.log('🔄 Sorted template items:', sortedItems.map(item => ({
        id: item.id,
        is_linked: item.is_linked_to_work,
        hasWork: !!(item.work_library_id || item.sub_work_library_id),
        hasMaterial: !!(item.material_library_id || item.sub_material_library_id)
      })));

      for (const templateItem of sortedItems) {
        // Определяем работу
        const workLibrary = templateItem.work_library || templateItem.sub_work_library;
        const workNameData = templateItem.work_name || templateItem.sub_work_name;
        const workData = workLibrary && workNameData ? { ...workLibrary, name: workNameData.name, unit: workNameData.unit } : null;
        const workType = templateItem.work_library ? 'work' : 'sub_work';

        // Определяем материал
        const materialLibrary = templateItem.material_library || templateItem.sub_material_library;
        const materialNameData = templateItem.material_name || templateItem.sub_material_name;
        const materialData = materialLibrary && materialNameData ? { ...materialLibrary, name: materialNameData.name, unit: materialNameData.unit } : null;
        const materialType = templateItem.material_library ? 'material' : 'sub_material';

        console.log('📍 Processing template item:', {
          id: templateItem.id,
          hasWorkLibrary: !!workLibrary,
          hasWorkName: !!workNameData,
          hasMaterialLibrary: !!materialLibrary,
          hasMaterialName: !!materialNameData,
          is_linked_to_work: templateItem.is_linked_to_work,
          workData: workData ? { name: workData.name, id: workData.id } : null,
          materialData: materialData ? { name: materialData.name, id: materialData.id } : null
        });

        // Пропускаем только полностью пустые записи
        if (!workData && !materialData) {
          console.warn('⚠️ Skipping empty template item:', templateItem.id);
          continue;
        }

        // Если это связанная пара (работа + материал в одной записи)
        if (workData && materialData && templateItem.is_linked_to_work) {
          console.log('🔗 Found linked pair:', {
            work: workData.name,
            material: materialData.name,
            is_linked: templateItem.is_linked_to_work,
            templateItemId: templateItem.id,
            workId: workData.id,
            materialId: materialData.id
          });

          const workIndex = boqItems.length; // Индекс работы

          // Сначала добавляем работу
          const workItem = {
            tender_id: tenderId,
            client_position_id: clientPositionId || null,
            item_type: workType as 'work' | 'sub_work',
            description: workData.name,
            unit: workData.unit,
            quantity: 1,
            unit_rate: workData.unit_rate || 0,
            work_id: workData.id,
            material_id: null,
            delivery_price_type: 'included' as const,
            currency_type: workData.currency_type || 'RUB' as const
          };
          boqItems.push(workItem);

          const materialIndex = boqItems.length; // Индекс материала

          // Сразу после работы добавляем связанный материал
          const materialItem = {
            tender_id: tenderId,
            client_position_id: clientPositionId || null,
            item_type: materialType as 'material' | 'sub_material',
            description: materialData.name,
            unit: materialData.unit,
            quantity: 1,
            unit_rate: materialData.unit_rate || 0,
            work_id: null, // Не связываем через work_id
            material_id: materialData.id,
            consumption_coefficient: materialData.consumption_coefficient || 1.0,
            conversion_coefficient: materialData.conversion_coefficient || 1.0,
            delivery_price_type: materialData.delivery_price_type || 'included' as const,
            delivery_amount: materialData.delivery_amount || 0,
            currency_type: materialData.currency_type || 'RUB' as const,
            material_type: materialData.material_type || 'main' as const
          };
          boqItems.push(materialItem);

          // Сохраняем информацию о связи
          const linkInfo = {
            workIndex,
            materialIndex,
            workType: workType as 'work' | 'sub_work',
            materialType: materialType as 'material' | 'sub_material',
            workName: workData.name,
            materialName: materialData.name,
            consumption_coefficient: materialData.consumption_coefficient || 1.0,
            conversion_coefficient: materialData.conversion_coefficient || 1.0
          };

          console.log('📎 Saving link info:', {
            ...linkInfo,
            totalBoqItemsSoFar: boqItems.length + 2 // После добавления работы и материала
          });
          links.push(linkInfo);
        }
        // Иначе обрабатываем отдельные элементы
        else {
          // Если есть только работа
          if (workData) {
            const workItem = {
              tender_id: tenderId,
              client_position_id: clientPositionId || null,
              item_type: workType as 'work' | 'sub_work',
              description: workData.name,
              unit: workData.unit,
              quantity: 1,
              unit_rate: workData.unit_rate || 0,
              work_id: workData.id,
              material_id: null,
              delivery_price_type: 'included' as const,
              currency_type: workData.currency_type || 'RUB' as const
            };
            boqItems.push(workItem);
          }

          // Если есть только материал (не связанный)
          if (materialData) {
            const materialItem = {
              tender_id: tenderId,
              client_position_id: clientPositionId || null,
              item_type: materialType as 'material' | 'sub_material',
              description: materialData.name,
              unit: materialData.unit,
              quantity: 1,
              unit_rate: materialData.unit_rate || 0,
              work_id: null, // Не связан с работой
              material_id: materialData.id,
              consumption_coefficient: materialData.consumption_coefficient || 1.0,
              conversion_coefficient: materialData.conversion_coefficient || 1.0,
              delivery_price_type: materialData.delivery_price_type || 'included' as const,
              delivery_amount: materialData.delivery_amount || 0,
              currency_type: materialData.currency_type || 'RUB' as const,
              material_type: materialData.material_type || 'main' as const,
              base_quantity: 1 // Для несвязанных материалов
            };
            boqItems.push(materialItem);
          }
        }
      }

      // Альтернативный метод поиска связей: проверяем отдельные работы и материалы
      if (links.length === 0) {
        console.log('🔍 Checking for links using alternative method...');

        // Создаем карты для быстрого поиска
        const workItemsMap = new Map<string, number>();
        const materialItemsMap = new Map<string, number>();

        boqItems.forEach((item, index) => {
          if (item.item_type === 'work' || item.item_type === 'sub_work') {
            workItemsMap.set(item.description, index);
          } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
            materialItemsMap.set(item.description, index);
          }
        });

        // Проверяем каждый материал из исходных данных шаблона
        for (const templateItem of templateItems) {
          if (templateItem.linked_work_name && (templateItem.material_name || templateItem.sub_material_name)) {
            const materialName = templateItem.material_name?.name || templateItem.sub_material_name?.name;
            const workName = templateItem.linked_work_name;

            const workIndex = workItemsMap.get(workName);
            const materialIndex = materialItemsMap.get(materialName);

            if (workIndex !== undefined && materialIndex !== undefined) {
              const linkInfo = {
                workIndex,
                materialIndex,
                workType: boqItems[workIndex].item_type as 'work' | 'sub_work',
                materialType: boqItems[materialIndex].item_type as 'material' | 'sub_material',
                workName,
                materialName,
                consumption_coefficient: templateItem.material_library?.consumption_coefficient ||
                                       templateItem.sub_material_library?.consumption_coefficient || 1.0,
                conversion_coefficient: templateItem.material_library?.conversion_coefficient ||
                                      templateItem.sub_material_library?.conversion_coefficient || 1.0
              };

              console.log('🔗 Found link via alternative method:', linkInfo);
              links.push(linkInfo);
            }
          }
        }
      }

      console.log('✅ Template converted to BOQ items:', {
        itemsCount: boqItems.length,
        linksCount: links.length,
        links: links.length > 0 ? links : 'No links found',
        boqItemsDetails: boqItems.map((item, i) => ({
          index: i,
          type: item.item_type,
          description: item.description
        }))
      });

      // Дополнительная проверка для отладки
      if (links.length === 0 && templateName === 'Кладка стен ГСБ 50 мм') {
        console.warn('⚠️ WARNING: No links created for "Кладка стен ГСБ 50 мм" template!');
        console.warn('Template items analysis:', templateItems.map(item => ({
          id: item.id,
          is_linked_to_work: item.is_linked_to_work,
          hasWork: !!(item.work_library || item.sub_work_library),
          hasMaterial: !!(item.material_library || item.sub_material_library),
          hasWorkName: !!(item.work_name || item.sub_work_name),
          hasMaterialName: !!(item.material_name || item.sub_material_name)
        })));
      }

      return { data: { items: boqItems, links } };
    } catch (error) {
      console.error('💥 Exception in convertTemplateToBOQItems:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};