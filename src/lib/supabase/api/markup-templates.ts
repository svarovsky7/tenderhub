import { supabase } from '../client';
import type { 
  MarkupTemplate,
  CreateMarkupTemplate,
  UpdateMarkupTemplate
} from '../types/tender-markup';

/**
 * Получить все шаблоны накруток
 */
export const getAllMarkupTemplates = async (): Promise<MarkupTemplate[]> => {
  console.log('🚀 [getAllMarkupTemplates] Getting all markup templates');
  
  const { data, error } = await supabase
    .from('markup_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');

  if (error) {
    console.error('❌ [getAllMarkupTemplates] Error:', error);
    throw error;
  }

  console.log('✅ [getAllMarkupTemplates] Success:', data?.length, 'templates');
  return data || [];
};

/**
 * Получить шаблон по умолчанию
 */
export const getDefaultMarkupTemplate = async (): Promise<MarkupTemplate | null> => {
  console.log('🚀 [getDefaultMarkupTemplate] Getting default template');
  
  const { data, error } = await supabase
    .from('markup_templates')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('📝 [getDefaultMarkupTemplate] No default template found');
      return null;
    }
    console.error('❌ [getDefaultMarkupTemplate] Error:', error);
    throw error;
  }

  console.log('✅ [getDefaultMarkupTemplate] Success:', data);
  return data;
};

/**
 * Получить шаблон по ID
 */
export const getMarkupTemplateById = async (id: string): Promise<MarkupTemplate | null> => {
  console.log('🚀 [getMarkupTemplateById] Getting template:', id);
  
  const { data, error } = await supabase
    .from('markup_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('📝 [getMarkupTemplateById] Template not found');
      return null;
    }
    console.error('❌ [getMarkupTemplateById] Error:', error);
    throw error;
  }

  console.log('✅ [getMarkupTemplateById] Success:', data);
  return data;
};

/**
 * Создать новый шаблон
 */
export const createMarkupTemplate = async (template: CreateMarkupTemplate): Promise<MarkupTemplate> => {
  console.log('🚀 [createMarkupTemplate] Creating template:', template);
  
  const { data, error } = await supabase
    .from('markup_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('❌ [createMarkupTemplate] Error:', error);
    throw error;
  }

  console.log('✅ [createMarkupTemplate] Success:', data);
  return data;
};

/**
 * Обновить шаблон
 */
export const updateMarkupTemplate = async (
  id: string,
  updates: UpdateMarkupTemplate
): Promise<MarkupTemplate> => {
  console.log('🚀 [updateMarkupTemplate] Updating template:', id, updates);
  
  const { data, error } = await supabase
    .from('markup_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ [updateMarkupTemplate] Error:', error);
    throw error;
  }

  console.log('✅ [updateMarkupTemplate] Success:', data);
  return data;
};

/**
 * Удалить шаблон
 */
export const deleteMarkupTemplate = async (id: string): Promise<void> => {
  console.log('🚀 [deleteMarkupTemplate] Deleting template:', id);
  
  const { error } = await supabase
    .from('markup_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ [deleteMarkupTemplate] Error:', error);
    throw error;
  }

  console.log('✅ [deleteMarkupTemplate] Success');
};

/**
 * Установить шаблон по умолчанию
 */
export const setDefaultMarkupTemplate = async (id: string): Promise<MarkupTemplate> => {
  console.log('🚀 [setDefaultMarkupTemplate] Setting default template:', id);
  
  // Сначала снимаем флаг по умолчанию со всех шаблонов
  await supabase
    .from('markup_templates')
    .update({ is_default: false })
    .neq('id', id);

  // Затем устанавливаем флаг для выбранного шаблона
  const { data, error } = await supabase
    .from('markup_templates')
    .update({ is_default: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ [setDefaultMarkupTemplate] Error:', error);
    throw error;
  }

  console.log('✅ [setDefaultMarkupTemplate] Success:', data);
  return data;
};

/**
 * Применить шаблон к тендеру
 */
export const applyTemplateToTender = async (
  tenderId: string,
  templateId: string
): Promise<string> => {
  console.log('🚀 [applyTemplateToTender] Applying template:', templateId, 'to tender:', tenderId);
  
  const { data, error } = await supabase
    .rpc('apply_markup_template', {
      p_tender_id: tenderId,
      p_template_id: templateId
    });

  if (error) {
    console.error('❌ [applyTemplateToTender] Error:', error);
    throw error;
  }

  console.log('✅ [applyTemplateToTender] Success: New markup ID:', data);
  return data;
};

/**
 * Создать шаблон из текущих накруток тендера
 */
export const createTemplateFromTenderMarkup = async (
  tenderId: string,
  templateName: string,
  description?: string
): Promise<MarkupTemplate> => {
  console.log('🚀 [createTemplateFromTenderMarkup] Creating template from tender:', tenderId);
  
  // Получаем активные накрутки тендера
  const { data: markupData, error: markupError } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (markupError) {
    console.error('❌ [createTemplateFromTenderMarkup] Error getting markup:', markupError);
    throw markupError;
  }

  // Создаем шаблон на основе накруток
  const template: CreateMarkupTemplate = {
    name: templateName,
    description: description,
    works_16_markup: markupData.works_16_markup,
    mechanization_service: markupData.mechanization_service,
    mbp_gsm: markupData.mbp_gsm,
    warranty_period: markupData.warranty_period,
    works_cost_growth: markupData.works_cost_growth,
    materials_cost_growth: markupData.materials_cost_growth,
    subcontract_works_cost_growth: markupData.subcontract_works_cost_growth,
    subcontract_materials_cost_growth: markupData.subcontract_materials_cost_growth,
    contingency_costs: markupData.contingency_costs,
    overhead_own_forces: markupData.overhead_own_forces,
    overhead_subcontract: markupData.overhead_subcontract,
    general_costs_without_subcontract: markupData.general_costs_without_subcontract,
    profit_own_forces: markupData.profit_own_forces,
    profit_subcontract: markupData.profit_subcontract
  };

  const { data, error } = await supabase
    .from('markup_templates')
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error('❌ [createTemplateFromTenderMarkup] Error creating template:', error);
    throw error;
  }

  console.log('✅ [createTemplateFromTenderMarkup] Success:', data);
  return data;
};