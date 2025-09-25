/**
 * Calculate total amount for BOQ items with all necessary adjustments
 * This function is used both in header and table footer to ensure consistent totals
 */
export const calculateBOQItemsTotal = (
  boqItems: any[] | undefined,
  sortedBOQItems?: any[] // Optional, only needed for linked materials calculation
): number => {
  if (!boqItems || boqItems.length === 0) return 0;

  // Use sortedBOQItems if provided, otherwise use boqItems
  const itemsForLookup = sortedBOQItems || boqItems;

  return boqItems.reduce((sum: number, item: any) => {
    let quantity = item.quantity || 0;
    const unitRate = item.unit_rate || 0;

    // For linked materials, recalculate quantity based on work quantity
    if (item.work_link && (item.item_type === 'material' || item.item_type === 'sub_material')) {
      const work = itemsForLookup.find((boqItem: any) => {
        // Check different link types
        if (item.work_link.work_boq_item_id &&
            item.work_link.work_boq_item_id === boqItem.id &&
            boqItem.item_type === 'work') {
          return true;
        }
        if (item.work_link.sub_work_boq_item_id &&
            item.work_link.sub_work_boq_item_id === boqItem.id &&
            boqItem.item_type === 'sub_work') {
          return true;
        }
        return false;
      });

      if (work) {
        // Get coefficients from BOQ item first, then from work_link
        const consumptionCoef = item.consumption_coefficient ||
                               item.work_link.material_quantity_per_work || 1;
        const conversionCoef = item.conversion_coefficient ||
                              item.work_link.usage_coefficient || 1;
        const workQuantity = work.quantity || 0;
        quantity = workQuantity * consumptionCoef * conversionCoef;

        console.log('🔗 Linked material quantity calculation:', {
          material: item.description,
          work: work.description,
          workQuantity,
          consumptionCoef,
          conversionCoef,
          calculatedQuantity: quantity
        });
      }
    }

    // Apply currency conversion if needed
    const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate
      ? item.currency_rate
      : 1;
    let itemTotal = quantity * unitRate * currencyMultiplier;

    // Add delivery cost for materials
    if (item.item_type === 'material' || item.item_type === 'sub_material') {
      const deliveryType = item.delivery_price_type;
      const deliveryAmount = item.delivery_amount || 0;

      if (deliveryType === 'amount') {
        // Fixed amount per unit (already in RUB)
        itemTotal += deliveryAmount * quantity;
      } else if (deliveryType === 'not_included') {
        // 3% of base cost
        itemTotal += itemTotal * 0.03;
      }
    }

    return sum + itemTotal;
  }, 0);
};