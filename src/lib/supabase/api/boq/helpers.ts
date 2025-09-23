import { supabase } from '../../client';

/**
 * Helper function to batch load cost category displays
 * Eliminates N+1 queries when loading multiple BOQ items
 */
export async function batchLoadCostCategories(
  items: any[]
): Promise<Record<string, string>> {
  console.log('🚀 batchLoadCostCategories called with', items.length, 'items');

  // Filter items that have detail_cost_category_id
  const itemsWithCategoryIds = items.filter(item => item.detail_cost_category_id);

  if (itemsWithCategoryIds.length === 0) {
    console.log('📊 No items with detail_cost_category_id, returning empty map');
    return {};
  }

  // Get unique category IDs
  const categoryIds = [...new Set(
    itemsWithCategoryIds
      .map(item => item.detail_cost_category_id)
      .filter(Boolean)
  )];

  console.log('🔍 Batch loading', categoryIds.length, 'unique cost categories');

  try {
    // Fetch all categories - simplified query without !inner
    const { data: categories, error } = await supabase
      .from('detail_cost_categories')
      .select('id, name, cost_category_id, location_id')
      .in('id', categoryIds);

    if (error) {
      console.error('❌ Failed to batch load cost categories:', error);
      return {};
    }

    // Build display map - we'll just return IDs for components to handle display
    const displayMap: Record<string, string> = {};

    if (categories && categories.length > 0) {
      // Map each category ID to itself - components will handle display fetching
      for (const cat of categories) {
        if (cat.id) {
          displayMap[cat.id] = cat.id; // Component will handle display
        }
      }
    }

    console.log('✅ Successfully loaded', Object.keys(displayMap).length, 'category displays');
    return displayMap;

  } catch (err) {
    console.error('💥 Exception in batchLoadCostCategories:', err);
    return {};
  }
}

/**
 * Apply cost category displays to items
 */
export function applyCostCategoryDisplays(
  items: any[],
  displayMap: Record<string, string>
): any[] {
  return items.map(item => {
    if (item.detail_cost_category_id && displayMap[item.detail_cost_category_id]) {
      return {
        ...item,
        cost_category_display: displayMap[item.detail_cost_category_id]
      };
    }
    return item;
  });
}

/**
 * Helper to load and apply cost categories in one operation
 */
export async function enrichItemsWithCostCategories(items: any[]): Promise<any[]> {
  const displayMap = await batchLoadCostCategories(items);
  return applyCostCategoryDisplays(items, displayMap);
}