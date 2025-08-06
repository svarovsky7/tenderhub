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

// Alias for backward compatibility
export type Work = Database['public']['Tables']['works_library']['Row'];

// Filter types for libraries
export interface MaterialFilters {
  category?: string[];
  search?: string;
}

export interface WorkItemFilters {
  category?: string[];
  search?: string;
}