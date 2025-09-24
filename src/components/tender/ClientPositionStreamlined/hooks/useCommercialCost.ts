import { useCallback, useMemo } from 'react';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';
import { boqApi } from '../../../../lib/supabase/api';
import {
  calculateWorkCommercialCost,
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateSubcontractWorkCommercialCost,
  calculateSubcontractMaterialCommercialCost,
  calculateAuxiliarySubcontractMaterialCommercialCost
} from '../../../../utils/calculateCommercialCost';

interface UseCommercialCostProps {
  position: any;
  tenderMarkup: any;
}

export const useCommercialCost = ({ position, tenderMarkup }: UseCommercialCostProps) => {
  // Function to calculate commercial cost for a BOQ item
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
      const work = position.boq_items?.find((item: any) => {
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

  // Calculate position-level commercial costs split between works and materials
  const commercialCosts = useMemo(() => {
    if (!position.boq_items || !tenderMarkup) {
      return { works: 0, materials: 0, total: 0, breakdown: [] };
    }

    let worksTotal = 0;
    let materialsTotal = 0;
    const breakdown: any[] = [];

    position.boq_items.forEach((item: any) => {
      const commercialCost = calculateCommercialCost(item);

      // Create detailed breakdown for each item
      let quantity = item.quantity || 0;
      const unitRate = item.unit_rate || 0;

      // For linked materials, calculate actual quantity
      if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
        const work = position.boq_items?.find((w: any) => {
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

      // Determine contribution to works or materials
      let itemWorksContribution = 0;
      let itemMaterialsContribution = 0;

      if (item.item_type === 'work' || item.item_type === 'sub_work') {
        itemWorksContribution = commercialCost;
      } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
        const isAuxiliary = item.material_type === 'auxiliary';
        if (isAuxiliary) {
          // Вспомогательный материал - вся стоимость идет в работы
          itemWorksContribution = commercialCost;
          itemMaterialsContribution = 0;
        } else {
          // Основной материал - база остается в материалах, наценка идет в работы
          itemMaterialsContribution = baseCost;
          itemWorksContribution = commercialCost - baseCost;
        }
      }

      worksTotal += itemWorksContribution;
      materialsTotal += itemMaterialsContribution;

      breakdown.push({
        id: item.id,
        description: item.description,
        type: item.item_type,
        materialType: item.material_type,
        quantity,
        unitRate,
        baseCost,
        commercialCost,
        worksContribution: itemWorksContribution,
        materialsContribution: itemMaterialsContribution
      });
    });

    const totalCommercial = worksTotal + materialsTotal;

    console.log('📊 Commercial costs breakdown:', {
      works: worksTotal,
      materials: materialsTotal,
      total: totalCommercial,
      itemsCount: breakdown.length
    });

    return { works: worksTotal, materials: materialsTotal, total: totalCommercial, breakdown };
  }, [position.boq_items, tenderMarkup, calculateCommercialCost]);

  return {
    calculateCommercialCost,
    saveCommercialFields,
    commercialCosts
  };
};