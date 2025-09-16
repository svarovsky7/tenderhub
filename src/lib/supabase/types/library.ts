/**
 * Materials and Works Library Types
 * Contains material and work item catalog types
 */

import type { Database } from './database';

// Basic library types from database
export type Material = Database['public']['Tables']['materials_library']['Row'];
export type MaterialInsert = Database['public']['Tables']['materials_library']['Insert'];
export type MaterialUpdate = Database['public']['Tables']['materials_library']['Update'];

export type WorkItem = Database['public']['Tables']['works_library']['Row'];
export type WorkItemInsert = Database['public']['Tables']['works_library']['Insert'];
export type WorkItemUpdate = Database['public']['Tables']['works_library']['Update'];

// Extended types with additional fields used in application
export interface MaterialExtended extends Material {
  code?: string;
  base_price?: number;
}

export interface WorkItemExtended extends WorkItem {
  code?: string;
  base_price?: number;
}

// Alias for backward compatibility
export type Work = Database['public']['Tables']['works_library']['Row'];

// Filter types for libraries
export interface MaterialFilters {
  search?: string;
}

export interface WorkItemFilters {
  search?: string;
}