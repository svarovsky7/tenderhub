import type { TenderMarkupPercentages } from '../lib/supabase/types/tender-markup';

/**
 * Расчет коммерческой стоимости работы на основе процентов накруток
 * 
 * @param baseCost - Базовая стоимость работы (Работа ПЗ = unit_rate * quantity)
 * @param markups - Проценты накруток из БД
 * @returns Коммерческая стоимость работы
 */
export function calculateWorkCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): number {
  console.log('🚀 Расчет коммерческой стоимости работы');
  console.log('📊 Базовая стоимость (Работа ПЗ):', baseCost);
  console.log('📊 Проценты накруток:', markups);

  // 1. Служба механизации (СМ)
  const mechanizationCost = baseCost * (markups.mechanization_service / 100);
  console.log('1️⃣ Служба механизации:', mechanizationCost, `(${markups.mechanization_service}%)`);

  // 2. МБП+ГСМ
  const mbpGsmCost = baseCost * (markups.mbp_gsm / 100);
  console.log('2️⃣ МБП+ГСМ:', mbpGsmCost, `(${markups.mbp_gsm}%)`);

  // 3. Гарантийный период
  const warrantyCost = baseCost * (markups.warranty_period / 100);
  console.log('3️⃣ Гарантийный период:', warrantyCost, `(${markups.warranty_period}%)`);

  // 4. Работа 1,6 = (Работа ПЗ + Работа СМ) * (1 + процент)
  // Внимание: works_16_markup уже содержит 160%, значит нужно делить на 100
  const work16 = (baseCost + mechanizationCost) * (markups.works_16_markup / 100);
  console.log('4️⃣ Работа 1,6:', work16, `(коэф ${markups.works_16_markup / 100})`);

  // 5. Работы Рост = (Работа 1,6 + МБП+ГСМ) * (1 + процент)
  const worksCostGrowth = (work16 + mbpGsmCost) * (1 + markups.works_cost_growth / 100);
  console.log('5️⃣ Работы Рост:', worksCostGrowth, `(+${markups.works_cost_growth}%)`);

  // 6. Непредвиденные = (Работа 1,6 + МБП) * (1 + процент)
  const contingencyCosts = (work16 + mbpGsmCost) * (1 + markups.contingency_costs / 100);
  console.log('6️⃣ Непредвиденные затраты:', contingencyCosts, `(+${markups.contingency_costs}%)`);

  // 7. ООЗ = (Работы Рост + Непредвиденные - Работа 1,6 - МБП) * (1 + процент)
  const ooz = (worksCostGrowth + contingencyCosts - work16 - mbpGsmCost) * 
              (1 + markups.overhead_own_forces / 100);
  console.log('7️⃣ ООЗ собств. силы:', ooz, `(+${markups.overhead_own_forces}%)`);

  // 8. ОФЗ = ООЗ * (1 + процент)
  const ofz = ooz * (1 + markups.general_costs_without_subcontract / 100);
  console.log('8️⃣ ОФЗ (без субподряда):', ofz, `(+${markups.general_costs_without_subcontract}%)`);

  // 9. Прибыль собственные силы = ОФЗ * (1 + процент)
  const profit = ofz * (1 + markups.profit_own_forces / 100);
  console.log('9️⃣ Прибыль собств. силы:', profit, `(+${markups.profit_own_forces}%)`);

  // Добавляем гарантийный период к итоговой стоимости
  const totalCommercialCost = profit + warrantyCost;
  
  console.log('✅ ИТОГО коммерческая стоимость:', totalCommercialCost);
  console.log('📈 Коэффициент увеличения:', (totalCommercialCost / baseCost).toFixed(2));
  
  return totalCommercialCost;
}

/**
 * Расчет коммерческой стоимости материала на основе процентов накруток
 * 
 * @param baseCost - Базовая стоимость материала (unit_rate * quantity + delivery)
 * @param markups - Проценты накруток из БД
 * @returns Коммерческая стоимость материала
 */
export function calculateMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): number {
  console.log('🚀 Расчет коммерческой стоимости материала');
  console.log('📊 Базовая стоимость:', baseCost);

  // Для материалов применяется только рост стоимости материалов
  const commercialCost = baseCost * (1 + markups.materials_cost_growth / 100);
  
  console.log('✅ Коммерческая стоимость материала:', commercialCost, 
              `(+${markups.materials_cost_growth}%)`);
  
  return commercialCost;
}

/**
 * Расчет коммерческой стоимости субподрядной работы
 * 
 * @param baseCost - Базовая стоимость субподрядной работы
 * @param markups - Проценты накруток из БД
 * @returns Коммерческая стоимость субподрядной работы
 */
export function calculateSubcontractWorkCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): number {
  console.log('🚀 Расчет коммерческой стоимости субподрядной работы');
  console.log('📊 Базовая стоимость:', baseCost);

  // Для субподряда применяются свои коэффициенты
  const costGrowth = baseCost * (1 + markups.subcontract_works_cost_growth / 100);
  const overhead = costGrowth * (1 + markups.overhead_subcontract / 100);
  const profit = overhead * (1 + markups.profit_subcontract / 100);
  
  console.log('✅ Коммерческая стоимость субподряда:', profit);
  
  return profit;
}

/**
 * Расчет коммерческой стоимости субподрядного материала
 * 
 * @param baseCost - Базовая стоимость субподрядного материала
 * @param markups - Проценты накруток из БД
 * @returns Коммерческая стоимость субподрядного материала
 */
export function calculateSubcontractMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): number {
  console.log('🚀 Расчет коммерческой стоимости субподрядного материала');
  console.log('📊 Базовая стоимость:', baseCost);

  // Для субподрядных материалов применяется рост стоимости материалов субподряда
  const commercialCost = baseCost * (1 + markups.subcontract_materials_cost_growth / 100);
  
  console.log('✅ Коммерческая стоимость субподрядного материала:', commercialCost,
              `(+${markups.subcontract_materials_cost_growth}%)`);
  
  return commercialCost;
}

/**
 * Определить коммерческую стоимость BOQ item в зависимости от его типа
 * 
 * @param itemType - Тип элемента (work, material, sub_work, sub_material)
 * @param baseCost - Базовая стоимость элемента
 * @param markups - Проценты накруток из БД
 * @returns Коммерческая стоимость элемента
 */
export function calculateBOQItemCommercialCost(
  itemType: 'work' | 'material' | 'sub_work' | 'sub_material',
  baseCost: number,
  markups: TenderMarkupPercentages
): number {
  switch (itemType) {
    case 'work':
      return calculateWorkCommercialCost(baseCost, markups);
    case 'material':
      return calculateMaterialCommercialCost(baseCost, markups);
    case 'sub_work':
      return calculateSubcontractWorkCommercialCost(baseCost, markups);
    case 'sub_material':
      return calculateSubcontractMaterialCommercialCost(baseCost, markups);
    default:
      console.warn('⚠️ Неизвестный тип элемента:', itemType);
      return baseCost;
  }
}