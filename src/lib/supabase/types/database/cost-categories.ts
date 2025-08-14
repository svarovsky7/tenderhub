/**
 * Cost Categories Database Type Definitions
 * Tables for construction cost management
 */

export type CostCategoriesTables = {
  cost_categories: {
    Row: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      sort_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      code: string;
      name: string;
      description?: string | null;
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      code?: string;
      name?: string;
      description?: string | null;
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  
  detail_cost_categories: {
    Row: {
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
    };
    Insert: {
      id?: string;
      category_id: string;
      code: string;
      name: string;
      description?: string | null;
      unit: string;
      base_price?: number;
      market_price?: number | null;
      price_date?: string;
      specifications?: Record<string, any>;
      tags?: string[];
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      category_id?: string;
      code?: string;
      name?: string;
      description?: string | null;
      unit?: string;
      base_price?: number;
      market_price?: number | null;
      price_date?: string;
      specifications?: Record<string, any>;
      tags?: string[];
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "detail_cost_categories_category_id_fkey";
        columns: ["category_id"];
        referencedRelation: "cost_categories";
        referencedColumns: ["id"];
      }
    ];
  };
  
  location: {
    Row: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      parent_id: string | null;
      level: number;
      path: string[];
      coordinates: Record<string, any> | null;
      metadata: Record<string, any>;
      sort_order: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      code: string;
      name: string;
      description?: string | null;
      parent_id?: string | null;
      level?: number;
      path?: string[];
      coordinates?: Record<string, any> | null;
      metadata?: Record<string, any>;
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      code?: string;
      name?: string;
      description?: string | null;
      parent_id?: string | null;
      level?: number;
      path?: string[];
      coordinates?: Record<string, any> | null;
      metadata?: Record<string, any>;
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "location_parent_id_fkey";
        columns: ["parent_id"];
        referencedRelation: "location";
        referencedColumns: ["id"];
      }
    ];
  };
  
  category_location_mapping: {
    Row: {
      id: string;
      detail_category_id: string;
      location_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      discount_percent: number;
      final_price: number;
      notes: string | null;
      metadata: Record<string, any>;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      detail_category_id: string;
      location_id: string;
      quantity?: number;
      unit_price?: number;
      discount_percent?: number;
      notes?: string | null;
      metadata?: Record<string, any>;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      detail_category_id?: string;
      location_id?: string;
      quantity?: number;
      unit_price?: number;
      discount_percent?: number;
      notes?: string | null;
      metadata?: Record<string, any>;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "category_location_mapping_detail_category_id_fkey";
        columns: ["detail_category_id"];
        referencedRelation: "detail_cost_categories";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "category_location_mapping_location_id_fkey";
        columns: ["location_id"];
        referencedRelation: "location";
        referencedColumns: ["id"];
      }
    ];
  };
  
  tender_cost_mapping: {
    Row: {
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
    };
    Insert: {
      id?: string;
      tender_id: string;
      category_location_id: string;
      quantity_multiplier?: number;
      price_adjustment?: number;
      markup_percent?: number;
      base_quantity?: number | null;
      base_price?: number | null;
      final_quantity?: number | null;
      final_price?: number | null;
      approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
      approved_by?: string | null;
      approved_at?: string | null;
      notes?: string | null;
      is_included?: boolean;
      sort_order?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tender_id?: string;
      category_location_id?: string;
      quantity_multiplier?: number;
      price_adjustment?: number;
      markup_percent?: number;
      base_quantity?: number | null;
      base_price?: number | null;
      final_quantity?: number | null;
      final_price?: number | null;
      approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
      approved_by?: string | null;
      approved_at?: string | null;
      notes?: string | null;
      is_included?: boolean;
      sort_order?: number;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "tender_cost_mapping_tender_id_fkey";
        columns: ["tender_id"];
        referencedRelation: "tenders";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "tender_cost_mapping_category_location_id_fkey";
        columns: ["category_location_id"];
        referencedRelation: "category_location_mapping";
        referencedColumns: ["id"];
      }
    ];
  };
};