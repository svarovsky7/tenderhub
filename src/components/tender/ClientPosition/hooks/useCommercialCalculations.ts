import { useCallback, useMemo } from 'react';
import { message } from 'antd';
import { boqApi } from '../../../../lib/supabase/api';
import { calculateWorkCommercialCost } from '../../../../utils/calculateCommercialCost';
import { debugLog } from '../../../../utils/debug-logger';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

interface CommercialCalculationProps {
  tenderMarkup: any;
  positionBoqItems?: BOQItemWithLibrary[];
}

export function useCommercialCalculations({ tenderMarkup, positionBoqItems }: CommercialCalculationProps) {

  // Calculate commercial cost for a single item
  const calculateCommercialCost = useCallback((record: BOQItemWithLibrary) => {
    if (!tenderMarkup) {
      debugLog.log('⚠️ TenderMarkup is not loaded yet');
      return 0;
    }

    // Get base cost
    let baseCost = 0;
    const quantity = record.quantity || 0;
    const unitRate = record.unit_rate || 0;

    // Apply currency conversion if needed
    const currencyMultiplier = record.currency_type && record.currency_type !== 'RUB' && record.currency_rate
      ? record.currency_rate
      : 1;

    baseCost = quantity * unitRate * currencyMultiplier;

    // Calculate commercial cost based on item type
    let commercialCost = baseCost;

    if (record.item_type === 'work') {
      // For works, apply full commercial calculation
      commercialCost = calculateWorkCommercialCost(baseCost, {
        mechanization_service: tenderMarkup.mechanization_percentage || 0,
        mbp_gsm: tenderMarkup.mbp_gsm_percentage || 0,
        warranty_period: tenderMarkup.warranty_percentage || 0,
        works_16_markup: tenderMarkup.works_16_markup_percentage || 0,
        works_cost_growth: tenderMarkup.growth_percentage || 0,
        contingency_costs: tenderMarkup.contingency_percentage || 0,
        overhead_own_forces: tenderMarkup.ooz_percentage || 0,
        general_costs_without_subcontract: tenderMarkup.ofz_percentage || 0,
        profit_own_forces: tenderMarkup.profit_percentage || 0,
        materials_cost_growth: 0,
        auxiliary_materials_markup: 0,
        subcontract_markup_percentage: 0
      });
    } else if (record.item_type === 'sub_work') {
      // For subcontract works, apply subcontract markup
      const subcontractMarkup = tenderMarkup.subcontract_markup_percentage || 0;
      commercialCost = baseCost * (1 + subcontractMarkup / 100);
    } else if (record.item_type === 'material' || record.item_type === 'sub_material') {
      // For materials, apply material markups
      const materialOhMarkup = tenderMarkup.material_oh_percentage || 0;
      const materialProfitMarkup = tenderMarkup.material_profit_percentage || 0;
      const totalMaterialMarkup = materialOhMarkup + materialProfitMarkup;
      commercialCost = baseCost * (1 + totalMaterialMarkup / 100);
    }

    return commercialCost;
  }, [tenderMarkup]);

  // Save commercial fields to database
  const saveCommercialFields = useCallback(async (itemId: string, commercialCost: number, baseCost: number) => {
    if (!tenderMarkup || baseCost <= 0) return;

    const markupCoefficient = commercialCost / baseCost;

    try {
      debugLog.log('🚀 Saving commercial fields:', { itemId, commercialCost, markupCoefficient });
      const result = await boqApi.updateCommercialFields(itemId, commercialCost, markupCoefficient);

      if (result.error) {
        debugLog.error('❌ Failed to save commercial fields:', result.error);
      } else {
        debugLog.log('✅ Commercial fields saved successfully');
      }
    } catch (error) {
      debugLog.error('💥 Exception saving commercial fields:', error);
    }
  }, [tenderMarkup]);

  // Calculate position-level commercial costs
  const commercialCosts = useMemo(() => {
    if (!positionBoqItems || !tenderMarkup) {
      return { works: 0, materials: 0, total: 0, breakdown: [] };
    }

    let worksTotal = 0;
    let materialsTotal = 0;
    const breakdown: any[] = [];

    positionBoqItems.forEach(item => {
      const commercialCost = calculateCommercialCost(item);

      // Create detailed breakdown for each item
      let quantity = item.quantity || 0;
      const unitRate = item.unit_rate || 0;

      // Apply currency conversion if needed
      const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate
        ? item.currency_rate
        : 1;

      const baseCost = quantity * unitRate * currencyMultiplier;
      const markupAmount = commercialCost - baseCost;
      const markupPercentage = baseCost > 0 ? (markupAmount / baseCost) * 100 : 0;

      breakdown.push({
        id: item.id,
        description: item.description,
        item_type: item.item_type,
        quantity,
        unit_rate: unitRate,
        base_cost: baseCost,
        commercial_cost: commercialCost,
        markup_amount: markupAmount,
        markup_percentage: markupPercentage
      });

      // Add to totals
      if (item.item_type === 'work' || item.item_type === 'sub_work') {
        worksTotal += commercialCost;
      } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
        materialsTotal += commercialCost;
      }
    });

    return {
      works: worksTotal,
      materials: materialsTotal,
      total: worksTotal + materialsTotal,
      breakdown
    };
  }, [positionBoqItems, tenderMarkup, calculateCommercialCost]);

  return {
    calculateCommercialCost,
    saveCommercialFields,
    commercialCosts
  };
}