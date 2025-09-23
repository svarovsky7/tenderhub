import { useCallback, useEffect, useMemo } from 'react';
import { getActiveTenderMarkup } from '../../../../lib/supabase/api/tender-markup';
import { boqApi } from '../../../../lib/supabase/api';
import {
  calculateWorkCommercialCost,
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateSubcontractWorkCommercialCost,
  calculateSubcontractMaterialCommercialCost,
  calculateAuxiliarySubcontractMaterialCommercialCost
} from '../../../../utils/calculateCommercialCost';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

interface UseCommercialCalculationsProps {
  position: any;
  tenderId: string;
  tenderMarkup: any;
}

export const useCommercialCalculations = ({
  position,
  tenderId,
  tenderMarkup
}: UseCommercialCalculationsProps) => {

  // Function to calculate commercial cost
  const calculateCommercialCost = useCallback((record: BOQItemWithLibrary) => {
    if (!tenderMarkup) {
      console.log('⚠️ TenderMarkup is not loaded yet');
      return 0;
    }

    // Calculate base cost with delivery
    let quantity = record.quantity || 0;
    const unitRate = record.unit_rate || 0;

    // For linked materials, calculate quantity based on work volume
    if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
      const work = position.boq_items?.find(item => {
        if (record.work_link.work_boq_item_id &&
            item.id === record.work_link.work_boq_item_id &&
            item.item_type === 'work') {
          return true;
        }
        if (record.work_link.sub_work_boq_item_id &&
            item.id === record.work_link.sub_work_boq_item_id &&
            item.item_type === 'sub_work') {
          return true;
        }
        return false;
      });

      if (work) {
        const consumptionCoef = record.consumption_coefficient ||
                               record.work_link.material_quantity_per_work || 1;
        const conversionCoef = record.conversion_coefficient ||
                              record.work_link.usage_coefficient || 1;
        const workQuantity = work.quantity || 0;
        quantity = workQuantity * consumptionCoef * conversionCoef;
      }
    }

    // Calculate base cost including delivery
    let baseCost = quantity * unitRate;

    // Add delivery for materials
    if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
      const deliveryType = record.delivery_price_type || 'included';
      const deliveryAmount = record.delivery_amount || 0;

      if ((deliveryType === 'amount' || deliveryType === 'not_included') && deliveryAmount > 0) {
        baseCost = baseCost + (deliveryAmount * quantity);
      }
    }

    // Calculate commercial cost based on item type
    let commercialCost = baseCost;

    switch (record.item_type) {
      case 'work':
        commercialCost = calculateWorkCommercialCost(baseCost, tenderMarkup);
        break;
      case 'material':
        // Определяем тип материала и рассчитываем коммерческую стоимость
        const isAuxiliary = record.material_type === 'auxiliary';
        if (isAuxiliary) {
          const result = calculateAuxiliaryMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        } else {
          const result = calculateMainMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        }
        break;
      case 'sub_work':
        commercialCost = calculateSubcontractWorkCommercialCost(baseCost, tenderMarkup);
        break;
      case 'sub_material':
        // Определяем тип субматериала и рассчитываем коммерческую стоимость
        const isSubAuxiliary = record.material_type === 'auxiliary';
        if (isSubAuxiliary) {
          const result = calculateAuxiliarySubcontractMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        } else {
          const result = calculateSubcontractMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        }
        break;
    }

    return commercialCost;
  }, [tenderMarkup, position.boq_items]);

  // Function to save commercial fields to database
  const saveCommercialFields = useCallback(async (itemId: string, commercialCost: number, baseCost: number) => {
    if (!tenderMarkup || baseCost <= 0) return;

    const markupCoefficient = commercialCost / baseCost;

    try {
      console.log('🚀 Saving commercial fields:', { itemId, commercialCost, markupCoefficient });
      const result = await boqApi.updateCommercialFields(itemId, commercialCost, markupCoefficient);

      if (result.error) {
        console.error('❌ Failed to save commercial fields:', result.error);
      } else {
        console.log('✅ Commercial fields saved successfully');
      }
    } catch (error) {
      console.error('💥 Exception saving commercial fields:', error);
    }
  }, [tenderMarkup]);

  // Auto-save commercial fields when values change
  useEffect(() => {
    if (!position.boq_items || !tenderMarkup) return;

    const savePromises = position.boq_items.map(async (item) => {
      const commercialCost = calculateCommercialCost(item);

      // Calculate base cost properly based on item type - same logic as in calculateCommercialCost
      // Include currency conversion if not RUB
      const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate
        ? item.currency_rate
        : 1;
      let baseCost = (item.quantity || 0) * (item.unit_rate || 0) * currencyMultiplier;

      // Add delivery only for materials with appropriate delivery type
      if ((item.item_type === 'material' || item.item_type === 'sub_material')) {
        const deliveryType = item.delivery_price_type || 'included';
        const deliveryAmount = item.delivery_amount || 0;

        if (deliveryType === 'amount') {
          // Fixed amount per unit (already in RUB)
          baseCost = baseCost + (deliveryAmount * (item.quantity || 0));
        } else if (deliveryType === 'not_included') {
          // 3% of base cost
          baseCost = baseCost + (baseCost * 0.03);
        }
      }

      console.log('💾 Saving commercial fields:', {
        itemId: item.id,
        itemType: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unitRate: item.unit_rate,
        deliveryAmount: item.delivery_amount,
        deliveryType: item.delivery_price_type,
        baseCost: baseCost,
        commercialCost: commercialCost,
        coefficient: baseCost > 0 ? (commercialCost / baseCost).toFixed(3) : 'N/A'
      });

      if (commercialCost > 0 && baseCost > 0) {
        await saveCommercialFields(item.id, commercialCost, baseCost);
      }
    });

    Promise.allSettled(savePromises);
  }, [position.boq_items, tenderMarkup, calculateCommercialCost, saveCommercialFields]);

  // Calculate position-level commercial costs split between works and materials with detailed breakdown
  const commercialCosts = useMemo(() => {
    if (!position.boq_items || !tenderMarkup) {
      return { works: 0, materials: 0, total: 0, breakdown: [] };
    }

    let worksTotal = 0;
    let materialsTotal = 0;
    const breakdown: any[] = [];

    position.boq_items.forEach(item => {
      const commercialCost = calculateCommercialCost(item);

      // Create detailed breakdown for each item
      let quantity = item.quantity || 0;
      const unitRate = item.unit_rate || 0;

      // For linked materials, calculate actual quantity
      if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
        const work = position.boq_items?.find(w => {
          if (item.work_link.work_boq_item_id &&
              w.id === item.work_link.work_boq_item_id &&
              w.item_type === 'work') {
            return true;
          }
          if (item.work_link.sub_work_boq_item_id &&
              w.id === item.work_link.sub_work_boq_item_id &&
              w.item_type === 'sub_work') {
            return true;
          }
          return false;
        });

        if (work) {
          const consumptionCoef = item.consumption_coefficient ||
                                 item.work_link.material_quantity_per_work || 1;
          const conversionCoef = item.conversion_coefficient ||
                                item.work_link.usage_coefficient || 1;
          const workQuantity = work.quantity || 0;
          quantity = workQuantity * consumptionCoef * conversionCoef;
        }
      }

      // Calculate base cost with delivery
      let baseCost = quantity * unitRate;
      const deliveryType = item.delivery_price_type || 'included';
      const deliveryAmount = item.delivery_amount || 0;

      if ((deliveryType === 'amount' || deliveryType === 'not_included') && deliveryAmount > 0) {
        baseCost = baseCost + (deliveryAmount * quantity);
      }

      // Create detailed stages for each item type
      let stages = [];
      let itemWorksContribution = 0;
      let itemMaterialsContribution = 0;

      if (item.item_type === 'work') {
        // Work item - detailed calculation stages
        const mechanizationCost = baseCost * (tenderMarkup.mechanization_service / 100);
        const mbpGsmCost = baseCost * (tenderMarkup.mbp_gsm / 100);
        const warrantyCost = baseCost * (tenderMarkup.warranty_period / 100);
        const work16 = (baseCost + mechanizationCost) * (1 + tenderMarkup.works_16_markup / 100);
        const worksCostGrowth = (work16 + mbpGsmCost) * (1 + tenderMarkup.works_cost_growth / 100);
        const contingencyCosts = (work16 + mbpGsmCost) * (1 + tenderMarkup.contingency_costs / 100);
        const ooz = (worksCostGrowth + contingencyCosts - work16 - mbpGsmCost) * (1 + tenderMarkup.overhead_own_forces / 100);
        const ofz = ooz * (1 + tenderMarkup.general_costs_without_subcontract / 100);
        const profit = ofz * (1 + tenderMarkup.profit_own_forces / 100);
        const totalCommercial = profit + warrantyCost;

        stages = [
          { name: 'Работа ПЗ (база)', value: baseCost },
          { name: 'Служба механизации', value: mechanizationCost, percent: tenderMarkup.mechanization_service },
          { name: 'МБП+ГСМ', value: mbpGsmCost, percent: tenderMarkup.mbp_gsm },
          { name: 'Работа 1,6', value: work16, formula: `(База + СМ) × ${1 + tenderMarkup.works_16_markup / 100}` },
          { name: 'Рост работ', value: worksCostGrowth, percent: tenderMarkup.works_cost_growth },
          { name: 'Непредвиденные', value: contingencyCosts, percent: tenderMarkup.contingency_costs },
          { name: 'ООЗ собств. силы', value: ooz, percent: tenderMarkup.overhead_own_forces },
          { name: 'ОФЗ (без субподр.)', value: ofz, percent: tenderMarkup.general_costs_without_subcontract },
          { name: 'Прибыль собств. силы', value: profit, percent: tenderMarkup.profit_own_forces },
          { name: 'Гарантийный период', value: warrantyCost, percent: tenderMarkup.warranty_period },
          { name: 'ИТОГО коммерческая', value: totalCommercial, isTotal: true }
        ];
        itemWorksContribution = commercialCost;

      } else if (item.item_type === 'sub_work') {
        // Subcontract work
        const subcontractGrowth = baseCost * (1 + tenderMarkup.subcontract_works_cost_growth / 100);
        const subcontractOverhead = subcontractGrowth * (1 + tenderMarkup.overhead_subcontract / 100);
        const subcontractProfit = subcontractOverhead * (1 + tenderMarkup.profit_subcontract / 100);

        stages = [
          { name: 'СУБРАБ ПЗ (база)', value: baseCost },
          { name: 'Субраб РОСТ', value: subcontractGrowth, percent: tenderMarkup.subcontract_works_cost_growth },
          { name: 'Субраб ООЗ', value: subcontractOverhead, percent: tenderMarkup.overhead_subcontract },
          { name: 'Субраб прибыль', value: subcontractProfit, percent: tenderMarkup.profit_subcontract, isTotal: true }
        ];
        itemWorksContribution = commercialCost;

      } else if (item.item_type === 'material') {
        // Определяем тип материала (основной или вспомогательный)
        const isAuxiliary = item.material_type === 'auxiliary';

        // Рассчитываем полную коммерческую стоимость материала
        const materialsGrowth = baseCost * (1 + tenderMarkup.materials_cost_growth / 100);
        const contingencyMaterials = baseCost * (1 + tenderMarkup.contingency_costs / 100);
        const oozMat = (materialsGrowth + contingencyMaterials - baseCost) * (1 + tenderMarkup.overhead_own_forces / 100);
        const ofzMat = oozMat * (1 + tenderMarkup.general_costs_without_subcontract / 100);
        const profitMat = ofzMat * (1 + tenderMarkup.profit_own_forces / 100);
        const markup = profitMat - baseCost;

        if (isAuxiliary) {
          // Вспомогательный материал - наценённая стоимость переходит в работы
          stages = [
            { name: 'Материал вспомогательный ПЗ', value: baseCost },
            { name: 'Материалы РОСТ', value: materialsGrowth, percent: tenderMarkup.materials_cost_growth },
            { name: 'Непредвиденные мат.', value: contingencyMaterials, percent: tenderMarkup.contingency_costs },
            { name: 'ООЗ мат', value: oozMat, percent: tenderMarkup.overhead_own_forces },
            { name: 'ОФЗ мат', value: ofzMat, percent: tenderMarkup.general_costs_without_subcontract },
            { name: 'Прибыль мат', value: profitMat, percent: tenderMarkup.profit_own_forces },
            { name: '→ Наценённая стоимость в работы', value: profitMat, highlight: 'work', isTotal: true },
            { name: '→ В материалах остается', value: 0, highlight: 'material' }
          ];
          itemMaterialsContribution = 0; // Ничего не остается в материалах
          itemWorksContribution = profitMat; // Вся стоимость переходит в работы
        } else {
          // Основной материал - база остается, наценка переходит в работы
          stages = [
            { name: 'Материал основной ПЗ (база)', value: baseCost },
            { name: 'Материалы РОСТ', value: materialsGrowth, percent: tenderMarkup.materials_cost_growth },
            { name: 'Непредвиденные мат.', value: contingencyMaterials, percent: tenderMarkup.contingency_costs },
            { name: 'ООЗ мат', value: oozMat, percent: tenderMarkup.overhead_own_forces },
            { name: 'ОФЗ мат', value: ofzMat, percent: tenderMarkup.general_costs_without_subcontract },
            { name: 'Прибыль мат', value: profitMat, percent: tenderMarkup.profit_own_forces },
            { name: '→ В материалах остается', value: baseCost, highlight: 'material' },
            { name: '→ В работы переходит', value: markup, highlight: 'work' }
          ];
          itemMaterialsContribution = baseCost; // Базовая стоимость остается в материалах
          itemWorksContribution = markup; // Наценка переходит в работы
        }

      } else if (item.item_type === 'sub_material') {
        // Определяем тип субматериала (основной или вспомогательный)
        const isAuxiliary = item.material_type === 'auxiliary';

        // Рассчитываем полную коммерческую стоимость субматериала
        const submatGrowth = baseCost * (1 + tenderMarkup.subcontract_works_cost_growth / 100);
        const submatOverhead = submatGrowth * (1 + tenderMarkup.overhead_subcontract / 100);
        const submatProfit = submatOverhead * (1 + tenderMarkup.profit_subcontract / 100);
        const markup = submatProfit - baseCost;

        if (isAuxiliary) {
          // Вспомогательный субматериал - наценённая стоимость переходит в субработы
          stages = [
            { name: 'Субматериал вспомогательный ПЗ', value: baseCost },
            { name: 'Субмат РОСТ', value: submatGrowth, percent: tenderMarkup.subcontract_works_cost_growth },
            { name: 'Субмат ООЗ', value: submatOverhead, percent: tenderMarkup.overhead_subcontract },
            { name: 'Субмат прибыль', value: submatProfit, percent: tenderMarkup.profit_subcontract },
            { name: '→ Наценённая стоимость в субработы', value: submatProfit, highlight: 'work', isTotal: true },
            { name: '→ В материалах остается', value: 0, highlight: 'material' }
          ];
          itemMaterialsContribution = 0; // Ничего не остается в материалах
          itemWorksContribution = submatProfit; // ВСЯ стоимость переходит в работы
        } else {
          // Основной субматериал - база остается, наценка переходит в субработы
          stages = [
            { name: 'Субматериал основной ПЗ (база)', value: baseCost },
            { name: 'Субмат РОСТ', value: submatGrowth, percent: tenderMarkup.subcontract_works_cost_growth },
            { name: 'Субмат ООЗ', value: submatOverhead, percent: tenderMarkup.overhead_subcontract },
            { name: 'Субмат прибыль', value: submatProfit, percent: tenderMarkup.profit_subcontract },
            { name: '→ В материалах остается', value: baseCost, highlight: 'material' },
            { name: '→ В субраб. переходит', value: markup, highlight: 'work' }
          ];
          itemMaterialsContribution = baseCost; // Базовая стоимость остается в материалах
          itemWorksContribution = markup; // Наценка переходит в работы
        }
      }

      breakdown.push({
        item: item.description || 'Без названия',
        type: item.item_type,
        baseCost,
        commercialCost,
        stages,
        worksContribution: itemWorksContribution,
        materialsContribution: itemMaterialsContribution
      });

      // Add to totals
      worksTotal += itemWorksContribution;
      materialsTotal += itemMaterialsContribution;
    });

    return {
      works: worksTotal,
      materials: materialsTotal,
      total: worksTotal + materialsTotal,
      breakdown
    };
  }, [position.boq_items, tenderMarkup, calculateCommercialCost]);

  return {
    calculateCommercialCost,
    saveCommercialFields,
    commercialCosts
  };
};