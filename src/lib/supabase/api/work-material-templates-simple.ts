import { supabase } from '../client';

// Простые типы для шаблонов
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

export const workMaterialTemplatesSimpleApi = {
  /**
   * Получить первый доступный work ID для тестирования
   */
  async getFirstWorkId() {
    try {
      console.log('🔍 Getting first work ID...');
      const { data, error } = await supabase
        .from('works_library')
        .select('id')
        .limit(1);

      console.log('📦 Works query result:', { data, error });

      if (error || !data || data.length === 0) {
        console.warn('⚠️ No works found, using null');
        return null;
      }

      const workId = data[0].id;
      console.log('✅ Got work ID:', workId);
      return workId;
    } catch (error) {
      console.warn('⚠️ Error getting work ID:', error);
      return null;
    }
  },

  /**
   * Получить первый доступный material ID для тестирования
   */
  async getFirstMaterialId() {
    try {
      console.log('🔍 Getting first material ID...');
      const { data, error } = await supabase
        .from('materials_library')
        .select('id')
        .limit(1);

      console.log('📦 Materials query result:', { data, error });

      if (error || !data || data.length === 0) {
        console.warn('⚠️ No materials found, using null');
        return null;
      }

      const materialId = data[0].id;
      console.log('✅ Got material ID:', materialId);
      return materialId;
    } catch (error) {
      console.warn('⚠️ Error getting material ID:', error);
      return null;
    }
  },

  /**
   * Получить все элементы шаблонов (базовая версия)
   */
  async getAll() {
    console.log('🚀 Getting all template items (simple)');

    try {
      const { data, error } = await supabase
        .from('work_material_templates')
        .select('*')
        .order('template_name', { ascending: true })
        .order('created_at', { ascending: true });

      console.log('📦 Templates fetched:', { count: data?.length, error });

      if (error) {
        console.error('❌ Failed to fetch templates:', error);
        return { error: error.message };
      }

      console.log('✅ Templates retrieved successfully');
      return { data: data || [] };
    } catch (error) {
      console.error('💥 Exception in getAll:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Создать элемент шаблона
   */
  async create(template: WorkMaterialTemplate) {
    console.log('🚀 Creating template item:', template);

    // Validate required fields
    if (!template.template_name?.trim()) {
      console.error('❌ template_name is required');
      return { error: 'Название шаблона обязательно' };
    }

    // Получаем первые доступные ID для тестирования
    const workId = await this.getFirstWorkId();
    const materialId = await this.getFirstMaterialId();

    if (!workId) {
      return { error: 'Нет доступных работ в библиотеке. Сначала добавьте работы.' };
    }

    if (!materialId) {
      return { error: 'Нет доступных материалов в библиотеке. Сначала добавьте материалы.' };
    }

    console.log('ℹ️ Using first available IDs:', { workId, materialId });

    try {
      const { data, error } = await supabase
        .from('work_material_templates')
        .insert({
          template_name: template.template_name.trim(),
          template_description: template.template_description?.trim() || null,
          work_library_id: template.work_library_id || workId,
          sub_work_library_id: template.sub_work_library_id || null,
          material_library_id: template.material_library_id || materialId,
          sub_material_library_id: template.sub_material_library_id || null,
          conversion_coefficient: template.conversion_coefficient || 1.0,
          is_linked_to_work: template.is_linked_to_work !== false,
          notes: template.notes?.trim() || null
        })
        .select()
        .single();

      console.log('📦 Create result:', { data, error });

      if (error) {
        console.error('❌ Failed to create template item:', error);
        return { error: error.message };
      }

      console.log('✅ Template item created successfully');
      return { data };
    } catch (error) {
      console.error('💥 Exception in create:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};