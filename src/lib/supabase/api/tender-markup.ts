import { supabase } from '../client';
import type { 
  TenderMarkupPercentages, 
  CreateTenderMarkupPercentages, 
  UpdateTenderMarkupPercentages,
  DEFAULT_MARKUP_PERCENTAGES 
} from '../types/tender-markup';

/**
 * Получить активные проценты накруток для тендера
 */
export const getActiveTenderMarkup = async (tenderId: string): Promise<TenderMarkupPercentages | null> => {
  console.log('🚀 [getActiveTenderMarkup] Getting active markup for tender:', tenderId);
  
  const { data, error } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Запись не найдена, создадим значения по умолчанию
      console.log('📝 [getActiveTenderMarkup] No markup found, creating default');
      return await createTenderMarkup({
        tender_id: tenderId,
        ...DEFAULT_MARKUP_PERCENTAGES
      });
    }
    console.error('❌ [getActiveTenderMarkup] Error:', error);
    throw error;
  }

  console.log('✅ [getActiveTenderMarkup] Success:', data);
  return data;
};

/**
 * Получить все проценты накруток для тендера (включая неактивные)
 */
export const getAllTenderMarkups = async (tenderId: string): Promise<TenderMarkupPercentages[]> => {
  console.log('🚀 [getAllTenderMarkups] Getting all markups for tender:', tenderId);
  
  const { data, error } = await supabase
    .from('tender_markup_percentages')
    .select('*')
    .eq('tender_id', tenderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [getAllTenderMarkups] Error:', error);
    throw error;
  }

  console.log('✅ [getAllTenderMarkups] Success:', data?.length, 'records');
  return data || [];
};

/**
 * Создать новые проценты накруток
 */
export const createTenderMarkup = async (markup: CreateTenderMarkupPercentages): Promise<TenderMarkupPercentages> => {
  console.log('🚀 [createTenderMarkup] Creating markup:', markup);
  
  const { data, error } = await supabase
    .from('tender_markup_percentages')
    .insert(markup)
    .select()
    .single();

  if (error) {
    console.error('❌ [createTenderMarkup] Error:', error);
    throw error;
  }

  console.log('✅ [createTenderMarkup] Success:', data);
  return data;
};

/**
 * Обновить проценты накруток
 */
export const updateTenderMarkup = async (
  id: string, 
  updates: UpdateTenderMarkupPercentages
): Promise<TenderMarkupPercentages> => {
  console.log('🚀 [updateTenderMarkup] Updating markup:', id, updates);
  
  const { data, error } = await supabase
    .from('tender_markup_percentages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ [updateTenderMarkup] Error:', error);
    throw error;
  }

  console.log('✅ [updateTenderMarkup] Success:', data);
  return data;
};

/**
 * Активировать конкретную конфигурацию накруток (деактивирует все остальные для тендера)
 */
export const activateTenderMarkup = async (
  id: string, 
  tenderId: string
): Promise<TenderMarkupPercentages> => {
  console.log('🚀 [activateTenderMarkup] Activating markup:', id, 'for tender:', tenderId);
  
  // Сначала деактивируем все остальные для этого тендера
  await supabase
    .from('tender_markup_percentages')
    .update({ is_active: false })
    .eq('tender_id', tenderId)
    .neq('id', id);

  // Затем активируем нужную
  const { data, error } = await supabase
    .from('tender_markup_percentages')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ [activateTenderMarkup] Error:', error);
    throw error;
  }

  console.log('✅ [activateTenderMarkup] Success:', data);
  return data;
};

/**
 * Удалить конфигурацию накруток
 */
export const deleteTenderMarkup = async (id: string): Promise<void> => {
  console.log('🚀 [deleteTenderMarkup] Deleting markup:', id);
  
  const { error } = await supabase
    .from('tender_markup_percentages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ [deleteTenderMarkup] Error:', error);
    throw error;
  }

  console.log('✅ [deleteTenderMarkup] Success');
};

/**
 * Рассчитать финансовые показатели с учетом новых накруток
 */
export const calculateMarkupFinancials = (
  baseCosts: {
    materials: number;
    works: number;
    submaterials: number;
    subworks: number;
  },
  markup: TenderMarkupPercentages
) => {
  console.log('🚀 [calculateMarkupFinancials] Calculating with new markup structure:', baseCosts, markup);
  
  // Безопасно извлекаем значения с fallback на 0
  const safeMarkup = {
    works_16_markup: markup.works_16_markup ?? 160,
    works_cost_growth: markup.works_cost_growth ?? 5,
    materials_cost_growth: markup.materials_cost_growth ?? 3,
    subcontract_works_cost_growth: markup.subcontract_works_cost_growth ?? 7,
    subcontract_materials_cost_growth: markup.subcontract_materials_cost_growth ?? 4,
    contingency_costs: markup.contingency_costs ?? 2,
    overhead_own_forces: markup.overhead_own_forces ?? 8,
    overhead_subcontract: markup.overhead_subcontract ?? 6,
    general_costs_without_subcontract: markup.general_costs_without_subcontract ?? 5,
    profit_own_forces: markup.profit_own_forces ?? 12,
    profit_subcontract: markup.profit_subcontract ?? 8
  };
  
  console.log('🔍 [calculateMarkupFinancials] Safe markup values:', safeMarkup);
  
  // ЭТАП 1: Применяем процент "Работы 1,6" к базовым работам ПЗ
  const worksAfter16 = baseCosts.works * (safeMarkup.works_16_markup / 100);
  console.log('💼 [Этап 1] Работы ПЗ * Работы 1,6%:', baseCosts.works, '*', safeMarkup.works_16_markup + '%', '=', worksAfter16);
  
  // ЭТАП 2: Применяем "Работы РОСТ" к результату Этапа 1 
  const worksWithGrowth = worksAfter16 * (1 + safeMarkup.works_cost_growth / 100);
  console.log('📈 [Этап 2] Результат Этапа 1 * Работы РОСТ%:', worksAfter16, '* (1 +', safeMarkup.works_cost_growth + '%)', '=', worksWithGrowth);
  
  // ЭТАП для МАТЕРИАЛОВ: Применяем "Рост стоимости материалов" к Материалам ПЗ
  const materialsGrowthAmount = baseCosts.materials * (safeMarkup.materials_cost_growth / 100);
  const materialsWithGrowth = baseCosts.materials + materialsGrowthAmount;
  console.log('📦 [Материалы] Материалы ПЗ * Рост материалов%:', baseCosts.materials, '*', safeMarkup.materials_cost_growth + '%', '=', materialsGrowthAmount, '→ Итого:', materialsWithGrowth);
  
  // ЭТАП для СУБПОДРЯДНЫХ МАТЕРИАЛОВ: Применяем "Рост материалов субподряда" к Субматериалам ПЗ
  const submaterialsGrowthAmount = baseCosts.submaterials * (safeMarkup.subcontract_materials_cost_growth / 100);
  const submaterialsWithGrowth = baseCosts.submaterials + submaterialsGrowthAmount;
  console.log('🏗️ [Субматериалы] Субматериалы ПЗ * Рост субматериалов%:', baseCosts.submaterials, '*', safeMarkup.subcontract_materials_cost_growth + '%', '=', submaterialsGrowthAmount, '→ Итого:', submaterialsWithGrowth);
  
  // ЭТАП для СУБПОДРЯДНЫХ РАБОТ: Применяем "Рост работ субподряда" к Субработам ПЗ
  const subworksGrowthAmount = baseCosts.subworks * (safeMarkup.subcontract_works_cost_growth / 100);
  const subworksWithGrowth = baseCosts.subworks + subworksGrowthAmount;
  console.log('👷 [Субработы] Субработы ПЗ * Рост субработ%:', baseCosts.subworks, '*', safeMarkup.subcontract_works_cost_growth + '%', '=', subworksGrowthAmount, '→ Итого:', subworksWithGrowth);
  
  const subtotalAfterGrowth = materialsWithGrowth + worksWithGrowth + submaterialsWithGrowth + subworksWithGrowth;
  
  // НЕПРЕДВИДЕННЫЕ ЗАТРАТЫ: Применяем % только к Работам РОСТ + Материалам РОСТ (без субподряда)
  const contingencyBase = worksWithGrowth + materialsWithGrowth;
  const contingencyCost = contingencyBase * (safeMarkup.contingency_costs / 100);
  console.log('⚠️ [Непредвиденные] (Работы РОСТ + Материалы РОСТ) * Непредвиденные%:', '(' + worksWithGrowth.toFixed(2), '+', materialsWithGrowth.toFixed(2) + ')', '*', safeMarkup.contingency_costs + '%', '=', contingencyCost.toFixed(2));
  
  const subtotalWithContingency = subtotalAfterGrowth + contingencyCost;
  
  // Разделяем на собственные силы и субподряд для ООЗ
  const ownForcesBase = materialsWithGrowth + worksWithGrowth;
  const subcontractBase = submaterialsWithGrowth + subworksWithGrowth;
  
  // ООЗ СУБПОДРЯД: Применяем % к сумме Субматериалов ПЗ и Субработ ПЗ (базовые значения, не с ростом!)
  const overheadSubcontractBase = baseCosts.submaterials + baseCosts.subworks;
  const overheadSubcontract = overheadSubcontractBase * (safeMarkup.overhead_subcontract / 100);
  console.log('🏗️ [ООЗ Субподряд] (Субмат ПЗ + Субраб ПЗ) * ООЗ субподряд%:', '(' + baseCosts.submaterials.toFixed(2), '+', baseCosts.subworks.toFixed(2) + ')', '*', safeMarkup.overhead_subcontract + '%', '=', overheadSubcontract.toFixed(2));
  
  // Добавляем ООЗ собственные силы (пока оставляем старую логику, потом уточним)
  const overheadOwnForces = ownForcesBase * (safeMarkup.overhead_own_forces / 100);
  
  const subtotalWithOverhead = subtotalWithContingency + overheadOwnForces + overheadSubcontract;
  
  // Добавляем ОФЗ (общие фирменные затраты) - только для собственных сил
  const generalCosts = ownForcesBase * (safeMarkup.general_costs_without_subcontract / 100);
  
  const subtotalWithGeneralCosts = subtotalWithOverhead + generalCosts;
  
  // Добавляем прибыль раздельно для собственных сил и субподряда
  const profitOwnForces = ownForcesBase * (safeMarkup.profit_own_forces / 100);
  const profitSubcontract = subcontractBase * (safeMarkup.profit_subcontract / 100);
  
  const totalProfit = profitOwnForces + profitSubcontract;
  const totalCostWithProfit = subtotalWithGeneralCosts + totalProfit;
  
  const result = {
    // Базовые затраты с коэффициентами и ростом
    materialsWithGrowth,
    worksWithGrowth: worksWithGrowth,
    worksAfter16,
    submaterialsWithGrowth,
    subworksWithGrowth,
    subtotalAfterGrowth,
    
    // Дополнительные расходы
    contingencyCost,
    overheadOwnForces,
    overheadSubcontract,
    generalCosts,
    
    // Прибыль
    profitOwnForces,
    profitSubcontract,
    totalProfit,
    
    // Итоги
    totalCostWithProfit,
    
    // Детализация для отображения
    breakdown: {
      baseCosts,
      markupPercentages: safeMarkup,
      calculatedCosts: {
        ownForcesBase,
        subcontractBase,
        contingency: contingencyCost,
        overheadOwn: overheadOwnForces,
        overheadSub: overheadSubcontract,
        generalCosts: generalCosts,
        profitOwn: profitOwnForces,
        profitSub: profitSubcontract
      }
    }
  };
  
  console.log('✅ [calculateMarkupFinancials] New structure result:', result);
  return result;
};