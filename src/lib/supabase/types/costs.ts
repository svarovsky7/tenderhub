/**
 * Construction Cost Types
 * Defines types for cost categories, detailed costs and locations
 */

import type { Database } from './database';

export type CostCategory = Database['public']['Tables']['cost_categories']['Row'];
export type CostCategoryInsert = Database['public']['Tables']['cost_categories']['Insert'];

export type DetailCostCategory = Database['public']['Tables']['detail_cost_categories']['Row'];
export type DetailCostCategoryInsert = Database['public']['Tables']['detail_cost_categories']['Insert'];

export type Location = Database['public']['Tables']['location']['Row'];
export type LocationInsert = Database['public']['Tables']['location']['Insert'];

// Extended type combining related entities
export interface DetailCostWithRelations extends DetailCostCategory {
  cost_categories?: CostCategory;
  location?: Location;
}

