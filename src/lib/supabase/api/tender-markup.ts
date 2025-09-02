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
    mechanization_service: markup.mechanization_service ?? 0,
    mbp_gsm: markup.mbp_gsm ?? 0,
    warranty_period: markup.warranty_period ?? 0,
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
  
  // ПРЕДВАРИТЕЛЬНЫЕ РАСЧЕТЫ: Службы от базовых работ ПЗ
  const mechanizationServiceCost = baseCosts.works * (safeMarkup.mechanization_service / 100);
  const mbpGsmCost = baseCosts.works * (safeMarkup.mbp_gsm / 100);
  const warrantyPeriodCost = baseCosts.works * (safeMarkup.warranty_period / 100);
  console.log('⚙️ [Службы] Механизация:', mechanizationServiceCost, 'МБП+ГСМ:', mbpGsmCost, 'Гарантия:', warrantyPeriodCost);
  
  // ЭТАП 1: Применяем процент "Работы 1,6" к сумме (Работы ПЗ + Служба механизации)
  const worksBaseWithMechanization = baseCosts.works + mechanizationServiceCost;
  const worksAfter16 = worksBaseWithMechanization * (safeMarkup.works_16_markup / 100);
  console.log('💼 [Этап 1] (Работы ПЗ + Механизация) * Работы 1,6%:', worksBaseWithMechanization, '*', safeMarkup.works_16_markup + '%', '=', worksAfter16);
  
  // ЭТАП 2: Применяем "Работы РОСТ" к сумме (Работы ПЗ + Работы 1,6 + Служба механизации + МБП+ГСМ)
  const worksGrowthBase = baseCosts.works + worksAfter16 + mechanizationServiceCost + mbpGsmCost;
  const worksGrowthAmount = worksGrowthBase * (safeMarkup.works_cost_growth / 100);
  const worksWithGrowth = worksGrowthBase + worksGrowthAmount;
  console.log('📈 [Этап 2] (Работы ПЗ + Работы 1,6 + Служба механизации + МБП+ГСМ) * Работы РОСТ%:', 
    '(' + baseCosts.works.toFixed(2), '+', worksAfter16.toFixed(2), '+', mechanizationServiceCost.toFixed(2), '+', mbpGsmCost.toFixed(2) + ')', 
    '*', safeMarkup.works_cost_growth + '%', '=', worksGrowthAmount, '→ Итого:', worksWithGrowth);
  
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
  
  // Добавляем все дополнительные службы к общему итогу
  const subtotalAfterGrowth = materialsWithGrowth + worksWithGrowth + submaterialsWithGrowth + subworksWithGrowth + mbpGsmCost + warrantyPeriodCost;
  
  // НЕПРЕДВИДЕННЫЕ ЗАТРАТЫ: Применяем % к (Работы ПЗ + Материалы ПЗ + МБП+ГСМ + Служба механизации + Работы РОСТ (результат) + Материалы РОСТ (результат) + Работы 1,6)
  const contingencyBase = baseCosts.works + baseCosts.materials + mbpGsmCost + mechanizationServiceCost + worksGrowthAmount + materialsGrowthAmount + worksAfter16;
  const contingencyCost = contingencyBase * (safeMarkup.contingency_costs / 100);
  console.log('⚠️ [Непредвиденные] (Работы ПЗ + Материалы ПЗ + МБП+ГСМ + Служба механизации + Работы РОСТ (результат) + Материалы РОСТ (результат) + Работы 1,6) * Непредвиденные%:', 
    '(' + baseCosts.works.toFixed(2), '+', baseCosts.materials.toFixed(2), '+', mbpGsmCost.toFixed(2), '+', 
    mechanizationServiceCost.toFixed(2), '+', worksGrowthAmount.toFixed(2), '+', materialsGrowthAmount.toFixed(2), '+',
    worksAfter16.toFixed(2) + ')', '*', safeMarkup.contingency_costs + '%', '=', contingencyCost.toFixed(2));
  
  const subtotalWithContingency = subtotalAfterGrowth + contingencyCost;
  
  // Разделяем на собственные силы и субподряд для ООЗ
  const ownForcesBase = materialsWithGrowth + worksWithGrowth;
  const subcontractBase = submaterialsWithGrowth + subworksWithGrowth;
  
  // ООЗ СУБПОДРЯД: Применяем % к сумме Субматериалов РОСТ и Субработ РОСТ
  const overheadSubcontract = subcontractBase * (safeMarkup.overhead_subcontract / 100);
  console.log('🏗️ [ООЗ Субподряд] (Субматериалы РОСТ + Субработы РОСТ) * ООЗ субподряд%:', '(' + submaterialsWithGrowth.toFixed(2), '+', subworksWithGrowth.toFixed(2) + ')', '*', safeMarkup.overhead_subcontract + '%', '=', overheadSubcontract.toFixed(2));
  
  // ООЗ СОБСТВЕННЫЕ СИЛЫ: Применяем % к (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ (результат) + Работы РОСТ (результат) + Непредвиденные)
  const overheadOwnForcesBase = baseCosts.works + mechanizationServiceCost + worksAfter16 + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost;
  const overheadOwnForces = overheadOwnForcesBase * (safeMarkup.overhead_own_forces / 100);
  console.log('🏭 [ООЗ Собств. силы] (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ (результат) + Работы РОСТ (результат) + Непредвиденные) * ООЗ%:', 
    '(' + baseCosts.works.toFixed(2), '+', mechanizationServiceCost.toFixed(2), '+', worksAfter16.toFixed(2), '+', baseCosts.materials.toFixed(2), '+', 
    mbpGsmCost.toFixed(2), '+', materialsGrowthAmount.toFixed(2), '+', worksGrowthAmount.toFixed(2), '+', 
    contingencyCost.toFixed(2) + ')', '*', safeMarkup.overhead_own_forces + '%', '=', overheadOwnForces.toFixed(2));
  
  const subtotalWithOverhead = subtotalWithContingency + overheadOwnForces + overheadSubcontract;
  
  // ОФЗ (общефирменные затраты): Применяем % к (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ + Работы РОСТ + Непредвиденные + ООЗ собств. силы)
  const generalCostsBase = baseCosts.works + mechanizationServiceCost + worksAfter16 + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost + overheadOwnForces;
  const generalCosts = generalCostsBase * (safeMarkup.general_costs_without_subcontract / 100);
  console.log('🏢 [ОФЗ] (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ + Работы РОСТ + Непредвиденные + ООЗ собств. силы) * ОФЗ%:', 
    '(' + baseCosts.works.toFixed(2), '+', mechanizationServiceCost.toFixed(2), '+', worksAfter16.toFixed(2), '+', baseCosts.materials.toFixed(2), '+', 
    mbpGsmCost.toFixed(2), '+', materialsGrowthAmount.toFixed(2), '+', worksGrowthAmount.toFixed(2), '+', 
    contingencyCost.toFixed(2), '+', overheadOwnForces.toFixed(2) + ')', '*', safeMarkup.general_costs_without_subcontract + '%', '=', generalCosts.toFixed(2));
  
  const subtotalWithGeneralCosts = subtotalWithOverhead + generalCosts;
  
  // ПРИБЫЛЬ СОБСТВЕННЫХ СИЛ: Применяем % к (все компоненты ОФЗ + результат ОФЗ)
  const profitOwnForcesBase = baseCosts.works + mechanizationServiceCost + worksAfter16 + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost + overheadOwnForces + generalCosts;
  const profitOwnForces = profitOwnForcesBase * (safeMarkup.profit_own_forces / 100);
  console.log('💰 [Прибыль собств. силы] (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ + Работы РОСТ + Непредвиденные + ООЗ собств. силы + ОФЗ) * Прибыль%:', 
    '(' + baseCosts.works.toFixed(2), '+', mechanizationServiceCost.toFixed(2), '+', worksAfter16.toFixed(2), '+', baseCosts.materials.toFixed(2), '+', 
    mbpGsmCost.toFixed(2), '+', materialsGrowthAmount.toFixed(2), '+', worksGrowthAmount.toFixed(2), '+', 
    contingencyCost.toFixed(2), '+', overheadOwnForces.toFixed(2), '+', generalCosts.toFixed(2) + ')', '*', safeMarkup.profit_own_forces + '%', '=', profitOwnForces.toFixed(2));
  
  // ПРИБЫЛЬ СУБПОДРЯДА: Применяем % к сумме (Субматериалы РОСТ + Субработы РОСТ + ООЗ субподряда)
  // База для расчета: полные суммы субматериалов и субработ с ростом + ООЗ субподряда
  const subcontractProfitBase = submaterialsWithGrowth + subworksWithGrowth + overheadSubcontract;
  const profitSubcontract = subcontractProfitBase * (safeMarkup.profit_subcontract / 100);
  console.log('💰 [Прибыль субподряд] (Субматериалы РОСТ + Субработы РОСТ + ООЗ Субподряд) * Прибыль%:', 
    '(' + submaterialsWithGrowth.toFixed(2), '+', subworksWithGrowth.toFixed(2), '+', 
    overheadSubcontract.toFixed(2) + ')', '*', safeMarkup.profit_subcontract + '%', '=', profitSubcontract.toFixed(2));
  
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
    
    // Новые службы
    mechanizationServiceCost,
    mbpGsmCost,
    warrantyPeriodCost,
    
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