/**
 * Cost Categories Views Type Definitions
 */

export type CostCategoriesViews = {
  v_tender_costs: {
    Row: {
      id: string;
      tender_id: string;
      category_location_id: string;
      quantity_multiplier: number;
      price_adjustment: number;
      markup_percent: number;
      approval_status: string;
      is_included: boolean;
      notes: string | null;
      base_quantity: number;
      base_unit_price: number;
      base_final_price: number;
      final_quantity: number;
      final_price: number;
      detail_category_id: string;
      detail_category_code: string;
      detail_category_name: string;
      unit: string;
      category_id: string;
      category_code: string;
      category_name: string;
      location_id: string;
      location_code: string;
      location_name: string;
      location_level: number;
      location_path: string[];
    };
    Relationships: [];
  };
};