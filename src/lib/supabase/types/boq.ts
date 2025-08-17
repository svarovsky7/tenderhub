/**
 * BOQ and Client Position Types
 * Contains BOQ items, client positions, and hierarchical structure types
 */

import type { Database, BOQItemType, ClientPositionStatus } from './database';
import type { Material, WorkItem } from './library';

// Basic BOQ and client position types from database
export type BOQItem = Database['public']['Tables']['boq_items']['Row'];
export type BOQItemInsert = Database['public']['Tables']['boq_items']['Insert'];
export type BOQItemUpdate = Database['public']['Tables']['boq_items']['Update'];

export type ClientPosition = Database['public']['Tables']['client_positions']['Row'];
export type ClientPositionInsert = Database['public']['Tables']['client_positions']['Insert'];
export type ClientPositionUpdate = Database['public']['Tables']['client_positions']['Update'];

// Extended BOQ types with relationships
export interface BOQItemWithLibrary extends BOQItem {
  material?: Material;
  work_item?: WorkItem;
  work_link?: any; // Link to work if this is a material
  linked_materials?: any[]; // Materials linked to this work
  consumption_coefficient?: number; // Коэффициент расхода материала
  conversion_coefficient?: number; // Коэффициент перевода единиц
}

export interface BOQItemWithPosition extends BOQItemWithLibrary {
  client_position?: ClientPosition;
}

// Extended client position types
export interface ClientPositionSummary extends ClientPosition {
  items_count?: number;
  materials_count?: number;
  works_count?: number;
}

export interface ClientPositionWithItems extends ClientPosition {
  boq_items?: BOQItemWithLibrary[];
  items_count?: number;
  materials_count?: number;
  works_count?: number;
}

// Hierarchy-specific operation types
export interface HierarchyMoveOperation {
  itemId: string;
  sourcePositionId: string;
  targetPositionId: string;
  newSortOrder?: number;
}

export interface BulkBOQInsert {
  client_position_id: string;
  items: BOQItemInsert[];
}

export interface PositionReorderOperation {
  positionId: string;
  newNumber: number;
}

// Performance optimization types
export interface HierarchyLoadOptions {
  include_items?: boolean;
  limit?: number;
  offset?: number;
  positions_only?: boolean;
}

// Filter types
export interface BOQFilters {
  tender_id?: string;
  client_position_id?: string;
  item_type?: BOQItemType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
  search?: string;
}

export interface ClientPositionFilters {
  tender_id?: string;
  // Note: status field removed from schema
  category?: string[];
  min_cost?: number;
  max_cost?: number;
  search?: string;
}