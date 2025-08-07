/**
 * Database Tables Type Definitions
 * All table schemas with Row, Insert, Update, and Relationships types
 */

import type { Json } from './base';

export type DatabaseTables = {
  boq_items: {
    Row: {
      id: string;
      tender_id: string;
      client_position_id: string | null;
      item_number: string;
      sub_number: number;
      sort_order: number;
      item_type: 'work' | 'material';
      description: string;
      unit: string;
      quantity: number;
      unit_rate: number;
      total_amount: number;
      material_id: string | null;
      work_id: string | null;
      created_at: string;
      updated_at: string;
      imported_at: string | null;
    };
    Insert: {
      id?: string;
      tender_id: string;
      client_position_id?: string | null;
      item_number: string;
      sub_number?: number;
      sort_order?: number;
      item_type: 'work' | 'material';
      description: string;
      unit: string;
      quantity: number;
      unit_rate: number;
      material_id?: string | null;
      work_id?: string | null;
      imported_at?: string | null;
      client_position_id?: string | null;
      sub_number?: number | null;
      sort_order?: number | null;
      created_by?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tender_id?: string;
      client_position_id?: string | null;
      item_number?: string;
      sub_number?: number;
      sort_order?: number;
      item_type?: 'work' | 'material';
      description?: string;
      unit?: string;
      quantity?: number;
      unit_rate?: number;
      material_id?: string | null;
      work_id?: string | null;
      imported_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'boq_items_created_by_fkey';
        columns: ['created_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'boq_items_material_id_fkey';
        columns: ['material_id'];
        isOneToOne: false;
        referencedRelation: 'materials_library';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'boq_items_tender_id_fkey';
        columns: ['tender_id'];
        isOneToOne: false;
        referencedRelation: 'tenders';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'boq_items_work_id_fkey';
        columns: ['work_id'];
        isOneToOne: false;
        referencedRelation: 'works_library';
        referencedColumns: ['id'];
      }
    ];
  };
  client_positions: {
    Row: {
      id: string;
      tender_id: string;
      position_number: number;
      item_no: string;           // № п/п из Excel
      work_name: string;         // Наименование работ из Excel
      total_materials_cost: number;
      total_works_cost: number;
      created_at: string;
      updated_at: string;
      unit: string | null;       // Ед. изм. из Excel
      volume: number | null;     // Объем работ из Excel
      manual_volume: number | null; // Объем, заданный вручную
      client_note: string | null; // Примечание из Excel
    };
    Insert: {
      id?: string;
      tender_id: string;
      position_number?: number;
      item_no: string;           // № п/п из Excel
      work_name: string;         // Наименование работ из Excel
      total_materials_cost?: number;
      total_works_cost?: number;
      unit?: string | null;      // Ед. изм. из Excel
      volume?: number | null;    // Объем работ из Excel
      manual_volume?: number | null; // Объем, заданный вручную
      client_note?: string | null; // Примечание из Excel
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tender_id?: string;
      position_number?: number;
      item_no?: string;          // № п/п из Excel
      work_name?: string;        // Наименование работ из Excel
      total_materials_cost?: number;
      total_works_cost?: number;
      unit?: string | null;      // Ед. изм. из Excel
      volume?: number | null;    // Объем работ из Excel
      manual_volume?: number | null; // Объем, заданный вручную
      client_note?: string | null; // Примечание из Excel
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'client_positions_created_by_fkey';
        columns: ['created_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'client_positions_tender_id_fkey';
        columns: ['tender_id'];
        isOneToOne: false;
        referencedRelation: 'tenders';
        referencedColumns: ['id'];
      }
    ];
  };
  history_log: {
    Row: {
      id: string;
      table_name: string;
      record_id: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      old_data: Json | null;
      new_data: Json | null;
      changed_by: string | null;
      changed_at: string;
    };
    Insert: {
      id?: string;
      table_name: string;
      record_id: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      old_data?: Json | null;
      new_data?: Json | null;
      changed_by?: string | null;
      changed_at?: string;
    };
    Update: {
      id?: string;
      table_name?: string;
      record_id?: string;
      operation?: 'INSERT' | 'UPDATE' | 'DELETE';
      old_data?: Json | null;
      new_data?: Json | null;
      changed_by?: string | null;
      changed_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'history_log_changed_by_fkey';
        columns: ['changed_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  materials_library: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      unit: string;
      category: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      description?: string | null;
      unit: string;
      category?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      description?: string | null;
      unit?: string;
      category?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'materials_library_created_by_fkey';
        columns: ['created_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  tender_client_works: {
    Row: {
      id: string;
      tender_id: string;
      work_number: string;
      work_name: string;
      unit: string | null;
      quantity: number | null;
      unit_price: number | null;
      total_cost: number | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tender_id: string;
      work_number: string;
      work_name: string;
      unit?: string | null;
      quantity?: number | null;
      unit_price?: number | null;
      total_cost?: number | null;
      notes?: string | null;
      created_by?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tender_id?: string;
      work_number?: string;
      work_name?: string;
      unit?: string | null;
      quantity?: number | null;
      unit_price?: number | null;
      total_cost?: number | null;
      notes?: string | null;
      created_by?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'tender_client_works_created_by_fkey';
        columns: ['created_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'tender_client_works_tender_id_fkey';
        columns: ['tender_id'];
        isOneToOne: false;
        referencedRelation: 'tenders';
        referencedColumns: ['id'];
      }
    ];
  };
  tenders: {
    Row: {
      id: string;
      title: string;
      description: string | null;
      client_name: string;
      tender_number: string;
      submission_deadline: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      title: string;
      description?: string | null;
      client_name: string;
      tender_number: string;
      submission_deadline?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      title?: string;
      description?: string | null;
      client_name?: string;
      tender_number?: string;
      submission_deadline?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'tenders_created_by_fkey';
        columns: ['created_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  users: {
    Row: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      role: 'Administrator' | 'Engineer' | 'View-only';
      is_active: boolean;
      last_sign_in_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      email: string;
      full_name?: string | null;
      avatar_url?: string | null;
      role?: 'Administrator' | 'Engineer' | 'View-only';
      is_active?: boolean;
      last_sign_in_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      email?: string;
      full_name?: string | null;
      avatar_url?: string | null;
      role?: 'Administrator' | 'Engineer' | 'View-only';
      is_active?: boolean;
      last_sign_in_at?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  works_library: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      unit: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      description?: string | null;
      unit: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      description?: string | null;
      unit?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'works_library_created_by_fkey';
        columns: ['created_by'];
        isOneToOne: false;
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
};