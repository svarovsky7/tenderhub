/**
 * Extended types for client positions with proper fields
 * These types extend the base database types with additional computed fields
 */

import type { ClientPosition, BOQItemWithLibrary } from './boq';

// Extended client position with all required fields
export interface ExtendedClientPosition extends ClientPosition {
  // Add fields that are commonly used but not in base type
  title?: string;
  description?: string | null;
  category?: string | null;
  status?: 'active' | 'inactive' | 'completed';
  priority?: number;
  total_position_cost?: number;
}

// Client position with items and computed fields
export interface ExtendedClientPositionWithItems extends ExtendedClientPosition {
  boq_items?: BOQItemWithLibrary[];
  items_count?: number;
  materials_count?: number;
  works_count?: number;
}

// For compatibility with existing code
export type ClientPositionSimple = ExtendedClientPosition;
export type ClientPositionWithItemsSimple = ExtendedClientPositionWithItems;