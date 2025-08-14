// Types for Construction Costs tables

export interface ConstructionCostCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConstructionCost {
  id: string;
  category_id: string | null;
  name: string;
  code: string;
  unit: string;
  base_price: number;
  market_price: number | null;
  price_date: string;
  supplier: string | null;
  description: string | null;
  specifications: Record<string, any>;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  category?: ConstructionCostCategory;
}

export interface ConstructionCostHistory {
  id: string;
  cost_id: string;
  price: number;
  price_date: string;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  // Relations
  cost?: ConstructionCost;
}

export interface TenderConstructionCost {
  id: string;
  tender_id: string;
  cost_id: string;
  quantity: number;
  unit_price: number;
  total_price: number; // Generated column
  markup_percent: number;
  final_price: number; // Generated column
  notes: string | null;
  is_included: boolean;
  sort_order: number;
  group_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  cost?: ConstructionCost;
  group?: TenderCostGroup;
}

export interface TenderCostGroup {
  id: string;
  tender_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  costs?: TenderConstructionCost[];
}

// Input types for creating/updating
export interface CreateConstructionCostInput {
  category_id?: string;
  name: string;
  code: string;
  unit: string;
  base_price: number;
  market_price?: number;
  price_date?: string;
  supplier?: string;
  description?: string;
  specifications?: Record<string, any>;
  tags?: string[];
  is_active?: boolean;
}

export interface UpdateConstructionCostInput extends Partial<CreateConstructionCostInput> {
  id: string;
}

export interface CreateTenderConstructionCostInput {
  tender_id: string;
  cost_id: string;
  quantity: number;
  unit_price: number;
  markup_percent?: number;
  notes?: string;
  is_included?: boolean;
  sort_order?: number;
  group_id?: string;
}

export interface UpdateTenderConstructionCostInput extends Partial<CreateTenderConstructionCostInput> {
  id: string;
}

export interface CreateCostCategoryInput {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCostCategoryInput extends Partial<CreateCostCategoryInput> {
  id: string;
}

export interface CreateTenderCostGroupInput {
  tender_id: string;
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateTenderCostGroupInput extends Partial<CreateTenderCostGroupInput> {
  id: string;
}

// Filter types
export interface ConstructionCostFilters {
  category_id?: string;
  is_active?: boolean;
  search?: string;
  tags?: string[];
  min_price?: number;
  max_price?: number;
  supplier?: string;
}

export interface TenderConstructionCostFilters {
  tender_id: string;
  group_id?: string;
  is_included?: boolean;
  search?: string;
}

// Aggregate types
export interface TenderCostSummary {
  total_base: number;
  total_with_markup: number;
  items_count: number;
  categories_count: number;
}

export interface CostPriceTrend {
  price_date: string;
  price: number;
  supplier: string | null;
  price_change: number;
  change_percent: number;
}

// Extended types with relations
export interface ConstructionCostWithCategory extends ConstructionCost {
  category: ConstructionCostCategory;
}

export interface TenderConstructionCostWithDetails extends TenderConstructionCost {
  cost: ConstructionCostWithCategory;
  group: TenderCostGroup | null;
}

export interface TenderCostGroupWithCosts extends TenderCostGroup {
  costs: TenderConstructionCostWithDetails[];
  total_base: number;
  total_with_markup: number;
}

export interface CategoryWithChildren extends ConstructionCostCategory {
  children?: CategoryWithChildren[];
  costs_count?: number;
}