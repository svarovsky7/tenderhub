/**
 * Утилиты для расчета объемов материалов при связывании с работами
 */

/**
 * Рассчитывает объем материала по формуле:
 * объем = manual_volume × consumption_coefficient × conversion_coefficient × usage_coefficient
 * 
 * @param manualVolume - Объем работы из client_positions.manual_volume
 * @param consumptionCoefficient - Коэффициент расхода материала
 * @param conversionCoefficient - Коэффициент перевода единиц измерения материала
 * @param usageCoefficient - Коэффициент использования из связи (по умолчанию 1)
 * @returns Рассчитанный объем материала
 */
export function calculateMaterialVolume(
  manualVolume: number | null | undefined,
  consumptionCoefficient: number | null | undefined,
  conversionCoefficient: number | null | undefined,
  usageCoefficient: number | null | undefined = 1
): number {
  const volume = manualVolume ?? 0;
  const consumption = consumptionCoefficient ?? 1;
  const conversion = conversionCoefficient ?? 1;
  const usage = usageCoefficient ?? 1;
  
  const result = volume * consumption * conversion * usage;
  
  console.log('📊 Material volume calculation:', {
    manualVolume: volume,
    consumptionCoefficient: consumption,
    conversionCoefficient: conversion,
    usageCoefficient: usage,
    result
  });
  
  return result;
}

/**
 * Рассчитывает стоимость материала
 * @param volume - Рассчитанный объем материала
 * @param unitRate - Стоимость за единицу материала
 * @returns Общая стоимость
 */
export function calculateMaterialCost(
  volume: number,
  unitRate: number | null | undefined
): number {
  const rate = unitRate ?? 0;
  return volume * rate;
}

/**
 * Обновляет данные связи материала с правильным расчетом объема
 * @param link - Данные связи из API
 * @param manualVolume - Объем работы из позиции
 * @param materialData - Данные материала (для коэффициентов)
 * @returns Обновленные данные связи
 */
export function updateLinkWithCalculatedVolume(
  link: any,
  manualVolume: number | null | undefined,
  materialData?: {
    consumption_coefficient?: number | null;
    conversion_coefficient?: number | null;
  }
): any {
  const consumptionCoeff = materialData?.consumption_coefficient ?? link.material_consumption_coefficient ?? 1;
  const conversionCoeff = materialData?.conversion_coefficient ?? link.material_conversion_coefficient ?? 1;
  const usageCoeff = link.usage_coefficient ?? 1;
  
  const calculatedVolume = calculateMaterialVolume(
    manualVolume,
    consumptionCoeff,
    conversionCoeff,
    usageCoeff
  );
  
  const calculatedCost = calculateMaterialCost(
    calculatedVolume,
    link.material_unit_rate
  );
  
  return {
    ...link,
    total_material_needed: calculatedVolume,
    calculated_material_volume: calculatedVolume,
    total_cost: calculatedCost,
    calculated_total_cost: calculatedCost
  };
}