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
  console.log('🚀 Расчет коммерческой стоимости работы (исправленная формула)');
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

  // 4. Работа 1,6 = (Работа ПЗ + Работа СМ) * 1.6
  // works_16_markup содержит процент увеличения (60% означает коэффициент 1.6)
  const work16 = (baseCost + mechanizationCost) * (1 + markups.works_16_markup / 100);
  console.log('4️⃣ Работа 1,6:', work16, `(коэф ${1 + markups.works_16_markup / 100})`);

  // 5. Работы Рост = (Работа 1,6 + МБП+ГСМ) * (1 + процент)
  const worksCostGrowth = (work16 + mbpGsmCost) * (1 + markups.works_cost_growth / 100);
  console.log('5️⃣ Работы Рост:', worksCostGrowth, `(+${markups.works_cost_growth}%)`);

  // Рост работ для данной работы = (базовые работы + механизация + Работы 1,6 + МБП) * процент роста
  const worksGrowthAmount = (baseCost + mechanizationCost + work16 + mbpGsmCost) * (markups.works_cost_growth / 100);
  console.log('💹 Рост работ (результат):', worksGrowthAmount, `(+${markups.works_cost_growth}%)`);

  // 6. Непредвиденные = (Работа 1,6 + МБП+ГСМ) * (1 + процент)
  // ИСПРАВЛЕНО: используем (1 + процент), а не просто процент
  const contingencyBase = work16 + mbpGsmCost;
  const contingencyCosts = contingencyBase * (1 + markups.contingency_costs / 100);
  console.log('6️⃣ Непредвиденные затраты:', contingencyCosts, `(база: ${contingencyBase} = Работа1,6 + МБП+ГСМ, коэф: ${1 + markups.contingency_costs / 100})`);

  // 7. ООЗ = (Непредвиденные + Работы Рост - Работы 1,6 - МБП) * (1 + процент)
  // ИСПРАВЛЕНО: используем (1 + процент), а не просто процент
  const oozBase = contingencyCosts + worksCostGrowth - work16 - mbpGsmCost;
  const ooz = oozBase * (1 + markups.overhead_own_forces / 100);
  console.log('7️⃣ ООЗ собств. силы:', ooz, `(база: ${oozBase} = Непредвиденные + Работы Рост - Работы 1,6 - МБП, коэф: ${1 + markups.overhead_own_forces / 100})`);

  // 8. ОФЗ = ООЗ * (1 + процент)
  // ИСПРАВЛЕНО: используем (1 + процент), а не просто процент
  const ofz = ooz * (1 + markups.general_costs_without_subcontract / 100);
  console.log('8️⃣ ОФЗ (без субподряда):', ofz, `(база: ${ooz} = ООЗ, коэф: ${1 + markups.general_costs_without_subcontract / 100})`);

  // 9. Прибыль = ОФЗ * (1 + процент)
  // ИСПРАВЛЕНО: используем (1 + процент), а не просто процент
  const profit = ofz * (1 + markups.profit_own_forces / 100);
  console.log('9️⃣ Прибыль собств. силы:', profit, `(база: ${ofz} = ОФЗ, коэф: ${1 + markups.profit_own_forces / 100})`);

  // Итоговая коммерческая стоимость = Прибыль + Гарантийный период
  const totalCommercialCost = profit + warrantyCost;
  
  console.log('✅ ИТОГО коммерческая стоимость:', totalCommercialCost);
  console.log('📈 Коэффициент увеличения:', (totalCommercialCost / baseCost).toFixed(2));
  
  return totalCommercialCost;
}

/**
 * Расчет коммерческой наценки для основного материала
 * Основной материал - это материал, связанный с работой через work_material_links
 * 
 * @param baseCost - Базовая стоимость материала (Материалы ПЗ = unit_rate * quantity + delivery)
 * @param markups - Проценты накруток из БД
 * @returns Объект с базовой стоимостью материала и наценкой для перевода в работы
 */
export function calculateMainMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): { materialCost: number; workMarkup: number } {
  console.log('🚀 Расчет коммерческой стоимости ОСНОВНОГО материала');
  console.log('📊 Материалы ПЗ:', baseCost);

  // 1. Материалы РОСТ = Материалы ПЗ * (1 + процент)
  const materialsGrowth = baseCost * (1 + markups.materials_cost_growth / 100);
  console.log('1️⃣ Материалы РОСТ:', materialsGrowth, `(+${markups.materials_cost_growth}%)`);

  // 2. Непредвиденные затраты на материалы = Материалы ПЗ * (1 + процент)
  const contingencyMaterials = baseCost * (1 + markups.contingency_costs / 100);
  console.log('2️⃣ Непредвиденные затраты на материалы:', contingencyMaterials, `(+${markups.contingency_costs}%)`);

  // 3. ООЗ мат = (Непредвиденные + Материалы рост - Материалы ПЗ) * (1 + процент ООЗ)
  const oozMat = (contingencyMaterials + materialsGrowth - baseCost) * 
                 (1 + markups.overhead_own_forces / 100);
  console.log('3️⃣ ООЗ мат:', oozMat, `(+${markups.overhead_own_forces}%)`);

  // 4. ОФЗ мат = ООЗ мат * (1 + процент ОФЗ)
  const ofzMat = oozMat * (1 + markups.general_costs_without_subcontract / 100);
  console.log('4️⃣ ОФЗ мат:', ofzMat, `(+${markups.general_costs_without_subcontract}%)`);

  // 5. Прибыль мат = ОФЗ мат * (1 + процент Прибыли собств. сил)
  const profitMat = ofzMat * (1 + markups.profit_own_forces / 100);
  console.log('5️⃣ Прибыль мат:', profitMat, `(+${markups.profit_own_forces}%)`);

  // Итоговая коммерческая стоимость
  const totalCommercialCost = profitMat;
  const totalMarkup = totalCommercialCost - baseCost;

  console.log('✅ Материал остается (Материалы ПЗ):', baseCost);
  console.log('✅ Наценка переходит в работы:', totalMarkup);
  console.log('📈 Коэффициент увеличения:', (totalCommercialCost / baseCost).toFixed(2));
  
  // Возвращаем объект с базовой стоимостью материала и наценкой для работ
  return {
    materialCost: baseCost,  // В материале остается только Материал ПЗ
    workMarkup: totalMarkup   // Вся наценка переходит в коммерческую стоимость работ
  };
}

/**
 * Расчет коммерческой стоимости вспомогательного материала
 * Вспомогательный материал - это материал БЕЗ связи с работой
 * 
 * @param baseCost - Базовая стоимость материала (unit_rate * quantity + delivery)
 * @param markups - Проценты накруток из БД
 * @returns Объект с нулевой стоимостью материала и полной наценкой для работ
 */
export function calculateAuxiliaryMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): { materialCost: number; workMarkup: number } {
  console.log('🚀 Расчет коммерческой стоимости ВСПОМОГАТЕЛЬНОГО материала');
  console.log('📊 Базовая стоимость:', baseCost);

  // Для вспомогательного материала используем те же формулы, что и для основного
  const result = calculateMainMaterialCommercialCost(baseCost, markups);
  
  // Но вся стоимость (включая базовую) переходит в работы
  const totalToWorks = baseCost + result.workMarkup;
  
  console.log('✅ Материал остается: 0 (все переходит в работы)');
  console.log('✅ Переходит в работы:', totalToWorks);
  
  return {
    materialCost: 0,           // В материале не остается ничего
    workMarkup: totalToWorks   // Вся стоимость переходит в работы
  };
}

/**
 * Расчет коммерческой стоимости материала (общая функция)
 * 
 * @param baseCost - Базовая стоимость материала (unit_rate * quantity + delivery)
 * @param markups - Проценты накруток из БД
 * @param isLinked - Связан ли материал с работой (true = основной, false = вспомогательный)
 * @returns Коммерческая стоимость материала
 */
export function calculateMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages,
  isLinked: boolean = false
): number {
  // Для обратной совместимости возвращаем просто базовую стоимость
  // В новой логике нужно использовать calculateMainMaterialCommercialCost или calculateAuxiliaryMaterialCommercialCost
  if (isLinked) {
    const result = calculateMainMaterialCommercialCost(baseCost, markups);
    return result.materialCost; // Возвращаем только то, что остается в материале
  } else {
    const result = calculateAuxiliaryMaterialCommercialCost(baseCost, markups);
    return result.materialCost; // Для вспомогательного всегда 0
  }
}

/**
 * Расчет коммерческой стоимости субподрядной работы
 * 
 * @param baseCost - Базовая стоимость субподрядной работы (СУБРАБ ПЗ)
 * @param markups - Проценты накруток из БД
 * @returns Коммерческая стоимость субподрядной работы
 */
export function calculateSubcontractWorkCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): number {
  console.log('🚀 Расчет коммерческой стоимости субподрядной работы');
  console.log('📊 СУБРАБ ПЗ (базовая стоимость):', baseCost);

  // 1. Субраб РОСТ = СУБРАБ ПЗ * (1 + процент СУБРАБ РОСТ)
  const subcontractGrowth = baseCost * (1 + markups.subcontract_works_cost_growth / 100);
  console.log('1️⃣ Субраб РОСТ:', subcontractGrowth, `(+${markups.subcontract_works_cost_growth}%)`);

  // 2. Субраб ООЗ = Субраб РОСТ * (1 + процент субподряд ООЗ)
  const subcontractOverhead = subcontractGrowth * (1 + markups.overhead_subcontract / 100);
  console.log('2️⃣ Субраб ООЗ:', subcontractOverhead, `(+${markups.overhead_subcontract}%)`);

  // 3. Субраб прибыль = Субраб ООЗ * (1 + процент прибыль субподряда)
  const subcontractProfit = subcontractOverhead * (1 + markups.profit_subcontract / 100);
  console.log('3️⃣ Субраб прибыль:', subcontractProfit, `(+${markups.profit_subcontract}%)`);
  
  console.log('✅ Итоговая коммерческая стоимость СУБРАБ:', subcontractProfit);
  console.log('📈 Коэффициент увеличения:', (subcontractProfit / baseCost).toFixed(2));
  
  return subcontractProfit;
}

/**
 * Расчет коммерческой стоимости субподрядного материала
 * 
 * @param baseCost - Базовая стоимость субподрядного материала (Субмат ПЗ)
 * @param markups - Проценты накруток из БД
 * @returns Объект с коммерческой стоимостью материала и наценкой для субподрядных работ
 */
export function calculateSubcontractMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): { materialCost: number; workMarkup: number } {
  console.log('🚀 Расчет коммерческой стоимости субподрядного материала');
  console.log('📊 Субмат ПЗ (базовая стоимость):', baseCost);

  // 1. Субмат РОСТ = Субмат ПЗ * (1 + процент РОСТ субподряда)
  const submatGrowth = baseCost * (1 + markups.subcontract_works_cost_growth / 100);
  console.log('1️⃣ Субмат РОСТ:', submatGrowth, `(+${markups.subcontract_works_cost_growth}%)`);
  
  // 2. Субмат ООЗ = Субмат РОСТ * (1 + процент ООЗ субподряда)
  const submatOverhead = submatGrowth * (1 + markups.overhead_subcontract / 100);
  console.log('2️⃣ Субмат ООЗ:', submatOverhead, `(+${markups.overhead_subcontract}%)`);
  
  // 3. Субмат прибыль = Субмат ООЗ * (1 + процент прибыль субподряда)
  const submatProfit = submatOverhead * (1 + markups.profit_subcontract / 100);
  console.log('3️⃣ Субмат прибыль:', submatProfit, `(+${markups.profit_subcontract}%)`);
  
  // Наценка = Субмат прибыль - Субмат ПЗ
  const markup = submatProfit - baseCost;
  
  console.log('✅ Субмат коммерческая стоимость:', baseCost, '(остается Субмат ПЗ)');
  console.log('➕ Наценка для добавления к субподрядным работам:', markup);
  console.log('📈 Коэффициент увеличения:', (submatProfit / baseCost).toFixed(2));
  
  return {
    materialCost: baseCost,  // Коммерческая стоимость субмат = Субмат ПЗ
    workMarkup: markup       // Наценка переходит в субподрядные работы
  };
}

/**
 * Расчет коммерческой стоимости вспомогательного субподрядного материала
 * Вспомогательный субматериал - это субматериал БЕЗ связи с субработой
 * 
 * @param baseCost - Базовая стоимость субматериала (unit_rate * quantity + delivery)
 * @param markups - Проценты накруток из БД
 * @returns Объект с нулевой стоимостью материала и полной стоимостью для субработ
 */
export function calculateAuxiliarySubcontractMaterialCommercialCost(
  baseCost: number,
  markups: TenderMarkupPercentages
): { materialCost: number; workMarkup: number } {
  console.log('🚀 Расчет коммерческой стоимости ВСПОМОГАТЕЛЬНОГО субматериала');
  console.log('📊 Базовая стоимость:', baseCost);

  // 1. Субмат РОСТ = Субмат ПЗ * (1 + процент РОСТ субподряда)
  const submatGrowth = baseCost * (1 + markups.subcontract_works_cost_growth / 100);
  console.log('1️⃣ Субмат РОСТ:', submatGrowth, `(+${markups.subcontract_works_cost_growth}%)`);
  
  // 2. Субмат ООЗ = Субмат РОСТ * (1 + процент ООЗ субподряда)
  const submatOverhead = submatGrowth * (1 + markups.overhead_subcontract / 100);
  console.log('2️⃣ Субмат ООЗ:', submatOverhead, `(+${markups.overhead_subcontract}%)`);
  
  // 3. Субмат прибыль = Субмат ООЗ * (1 + процент прибыль субподряда)
  const submatProfit = submatOverhead * (1 + markups.profit_subcontract / 100);
  console.log('3️⃣ Субмат прибыль:', submatProfit, `(+${markups.profit_subcontract}%)`);
  
  console.log('✅ Материал остается: 0 (все переходит в субработы)');
  console.log('✅ Переходит в субработы:', submatProfit, '(вся коммерческая стоимость)');
  console.log('📈 Коэффициент увеличения:', (submatProfit / baseCost).toFixed(2));
  
  return {
    materialCost: 0,           // В материале не остается ничего
    workMarkup: submatProfit   // Вся коммерческая стоимость переходит в субработы
  };
}

/**
 * Определить коммерческую стоимость BOQ item в зависимости от его типа
 * 
 * @param itemType - Тип элемента (work, material, sub_work, sub_material)
 * @param baseCost - Базовая стоимость элемента
 * @param markups - Проценты накруток из БД
 * @param isLinked - Для материалов: связан ли с работой (true = основной, false = вспомогательный)
 * @returns Коммерческая стоимость элемента
 */
export function calculateBOQItemCommercialCost(
  itemType: 'work' | 'material' | 'sub_work' | 'sub_material',
  baseCost: number,
  markups: TenderMarkupPercentages,
  isLinked: boolean = false
): number {
  switch (itemType) {
    case 'work':
      return calculateWorkCommercialCost(baseCost, markups);
    case 'material':
      return calculateMaterialCommercialCost(baseCost, markups, isLinked);
    case 'sub_work':
      return calculateSubcontractWorkCommercialCost(baseCost, markups);
    case 'sub_material':
      if (isLinked) {
        // Основной субматериал - возвращаем только базовую стоимость
        const result = calculateSubcontractMaterialCommercialCost(baseCost, markups);
        return result.materialCost; // Возвращаем Субмат ПЗ
      } else {
        // Вспомогательный субматериал - возвращаем 0 (все переходит в работы)
        return 0;
      }
    default:
      console.warn('⚠️ Неизвестный тип элемента:', itemType);
      return baseCost;
  }
}