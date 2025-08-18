/**
 * Database Functions Type Definitions
 * All stored procedures and functions with their argument and return types
 */

import type { Json } from './base';

export type DatabaseFunctions = {
  bulk_insert_boq_items: {
    Args: {
      p_tender_id: string;
      p_items: Json;
    };
    Returns: number;
  };
  bulk_insert_boq_items_to_position: {
    Args: {
      p_client_position_id: string;
      p_items: Json;
    };
    Returns: number;
  };
  get_next_client_position_number: {
    Args: {
      p_tender_id: string;
    };
    Returns: number;
  };
  get_next_sub_number: {
    Args: {
      p_client_position_id: string;
    };
    Returns: number;
  };
  renumber_client_positions: {
    Args: {
      p_tender_id: string;
    };
    Returns: number;
  };
  get_user_organization: {
    Args: Record<PropertyKey, never>;
    Returns: string;
  };
  get_user_role: {
    Args: Record<PropertyKey, never>;
    Returns: 'Administrator' | 'Engineer' | 'View-only';
  };
  get_materials_for_work: {
    Args: {
      p_work_boq_item_id: string;
    };
    Returns: Array<{
      link_id: string;
      material_id: string;
      material_description: string;
      material_unit: string;
      material_quantity: number;
      material_unit_rate: number;
      total_needed: number;
      total_cost: number;
    }>;
  };
  get_works_using_material: {
    Args: {
      p_material_boq_item_id: string;
    };
    Returns: Array<{
      link_id: string;
      work_id: string;
      work_description: string;
      work_unit: string;
      work_quantity: number;
      work_unit_rate: number;
      total_material_usage: number;
    }>;
  };
  schema_cache_purge: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
};