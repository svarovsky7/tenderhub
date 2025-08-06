/**
 * Tender-Related Types
 * Contains tender, client works, and tender summary types
 */

import type { Database, TenderStatus } from './database';

// Basic tender types from database
export type Tender = Database['public']['Tables']['tenders']['Row'];
export type TenderInsert = Database['public']['Tables']['tenders']['Insert'];
export type TenderUpdate = Database['public']['Tables']['tenders']['Update'];

// Client works types
export type ClientWork = Database['public']['Tables']['tender_client_works']['Row'];
export type ClientWorkInsert = Database['public']['Tables']['tender_client_works']['Insert'];
export type ClientWorkUpdate = Database['public']['Tables']['tender_client_works']['Update'];

// History log type
export type HistoryLog = Database['public']['Tables']['history_log']['Row'];

// Extended tender types with relationships
export interface BOQSummary {
  tender_id: string;
  total_items: number;
  total_amount: number;
  materials_count: number;
  works_count: number;
}

export interface TenderSummary extends Tender {
  positions_count: number;
  total_items: number;
  total_amount: number;
  materials_count: number;
  works_count: number;
}

export interface TenderWithSummary extends Tender {
  boq_summary?: BOQSummary;
  total_items?: number;
  boq_total_value?: number;
}

// Hierarchy types
export interface TenderHierarchy {
  id: string;
  tender_id: string;
  position_number?: number;
  sub_number?: number;
  title: string;
  description?: string | null;
  total_amount?: number;
}

// Full hierarchy type (requires forward reference)
export interface TenderWithFullHierarchy extends Tender {
  client_positions?: any[]; // Will be properly typed as ClientPositionWithItems[] when imported
  summary?: TenderSummary;
}

// Filter types for tenders
export interface TenderFilters {
  status?: TenderStatus[];
  client_name?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}