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
};