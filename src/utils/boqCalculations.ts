import type { BOQItem } from '../lib/supabase/types';

/**
 * Calculate total price for a BOQ item including delivery
 */
export const calculateItemTotal = (item: BOQItem): number => {
  const priceInRub = item.unit_rate || 0;
  const deliveryAmount = item.delivery_amount || 0;
  return (priceInRub + deliveryAmount) * item.quantity;
};

/**
 * Calculate total cost for a list of BOQ items
 */
export const calculateTotalCost = (items: BOQItem[]): number => {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};

/**
 * Filter out linked materials from BOQ items
 */
export const filterNonLinkedItems = (items: BOQItem[]): BOQItem[] => {
  return items.filter(item => !(item as any).is_linked_material);
};

/**
 * Group BOQ items by type
 */
export const groupItemsByType = (items: BOQItem[]) => {
  const works: BOQItem[] = [];
  const materials: BOQItem[] = [];
  const linkedMaterials: BOQItem[] = [];
  const additionalItems: BOQItem[] = [];

  items.forEach(item => {
    if (item.is_additional) {
      additionalItems.push(item);
    } else if ((item as any).is_linked_material) {
      linkedMaterials.push(item);
    } else if (item.item_type === 'work') {
      works.push(item);
    } else if (item.item_type === 'material' || item.item_type === 'unlinked_material') {
      materials.push(item);
    }
  });

  return { works, materials, linkedMaterials, additionalItems };
};

/**
 * Check if item is a work
 */
export const isWork = (item: BOQItem): boolean => {
  return item.item_type === 'work';
};

/**
 * Check if item is a material
 */
export const isMaterial = (item: BOQItem): boolean => {
  return item.item_type === 'material' || item.item_type === 'unlinked_material';
};

/**
 * Check if item is linked material
 */
export const isLinkedMaterial = (item: BOQItem): boolean => {
  return !!(item as any).is_linked_material;
};

/**
 * Generate next item number for BOQ items
 */
export const generateNextItemNumber = (existingItems: BOQItem[], itemType: string): number => {
  const sameTypeItems = existingItems.filter(item => item.item_type === itemType);
  const maxNumber = sameTypeItems.reduce((max, item) => {
    // item_number is a string in the database, need to parse it
    const num = parseInt(item.item_number || '0', 10) || 0;
    return num > max ? num : max;
  }, 0);
  return maxNumber + 1;
};

/**
 * Sort BOQ items by item number and sub number
 */
export const sortBOQItems = (items: BOQItem[]): BOQItem[] => {
  return [...items].sort((a, b) => {
    // item_number is a string, need to parse
    const numA = parseInt(a.item_number || '0', 10) || 0;
    const numB = parseInt(b.item_number || '0', 10) || 0;

    if (numA !== numB) {
      return numA - numB;
    }

    const subA = a.sub_number || 0;
    const subB = b.sub_number || 0;

    return subA - subB;
  });
};