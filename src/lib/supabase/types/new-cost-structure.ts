// Types for New Cost Structure

// ============= MAIN TABLES =============

export interface CostCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DetailCostCategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  base_price: number;
  market_price: number | null;
  price_date: string;
  specifications: Record<string, any>;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  category?: CostCategory;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  level: number;
  path: string[];
  coordinates: any | null;
  metadata: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  parent?: Location;
  children?: Location[];
}

// ============= MAPPING TABLES =============

export interface CategoryLocationMapping {
  id: string;
  detail_category_id: string;
  location_id: string;
  quantity: number;
  unit_price: number;
  total_price: number; // Generated
  discount_percent: number;
  final_price: number; // Generated
  notes: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  detail_category?: DetailCostCategory;
  location?: Location;
}

export interface TenderCostMapping {
  id: string;
  tender_id: string;
  category_location_id: string;
  quantity_multiplier: number;
  price_adjustment: number;
  markup_percent: number;
  base_quantity: number | null;
  base_price: number | null;
  final_quantity: number | null;
  final_price: number | null;
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  is_included: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  category_location?: CategoryLocationMapping;
}

// ============= VIEW TYPES =============

export interface TenderCostView {
  id: string;
  tender_id: string;
  category_location_id: string;
  quantity_multiplier: number;
  price_adjustment: number;
  markup_percent: number;
  approval_status: string;
  is_included: boolean;
  notes: string | null;
  // From category_location_mapping
  base_quantity: number;
  base_unit_price: number;
  base_final_price: number;
  // Calculated
  final_quantity: number;
  final_price: number;
  // Category info
  detail_category_id: string;
  detail_category_code: string;
  detail_category_name: string;
  unit: string;
  category_id: string;
  category_code: string;
  category_name: string;
  // Location info
  location_id: string;
  location_code: string;
  location_name: string;
  location_level: number;
  location_path: string[];
}

// ============= INPUT TYPES =============

export interface CreateCostCategoryInput {
  code: string;
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateDetailCostCategoryInput {
  category_id: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  base_price: number;
  market_price?: number;
  price_date?: string;
  specifications?: Record<string, any>;
  tags?: string[];
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateLocationInput {
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  level?: number;
  coordinates?: any;
  metadata?: Record<string, any>;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateCategoryLocationMappingInput {
  detail_category_id: string;
  location_id: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  notes?: string;
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export interface CreateTenderCostMappingInput {
  tender_id: string;
  category_location_id: string;
  quantity_multiplier?: number;
  price_adjustment?: number;
  markup_percent?: number;
  approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
  notes?: string;
  is_included?: boolean;
  sort_order?: number;
}

// ============= IMPORT TYPES =============

export interface ImportCostRow {
  rowNumber: number;
  // Cost Category columns (1-3)
  categoryCode: string;
  categoryName: string;
  categoryDescription: string;
  // Detail Cost Category columns (4-5)
  detailCode: string;
  detailName: string;
  detailUnit?: string;
  detailPrice?: number;
  // Location column (6+)
  locationCode: string;
  locationName: string;
  locationParent?: string;
  // Additional mapping data
  quantity?: number;
  unitPrice?: number;
  discount?: number;
}

export interface ParsedImportData {
  categories: Map<string, CreateCostCategoryInput>;
  detailCategories: Map<string, CreateDetailCostCategoryInput & { rowNumber: number }>;
  locations: Map<string, CreateLocationInput & { rowNumber: number }>;
  mappings: Array<{
    rowNumber: number;
    detailCategoryCode: string;
    locationCode: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  }>;
}

export interface ImportResult {
  success: boolean;
  categoriesCreated: number;
  detailCategoriesCreated: number;
  locationsCreated: number;
  mappingsCreated: number;
  errors: string[];
}