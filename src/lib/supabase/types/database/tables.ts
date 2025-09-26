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
      item_type: 'work' | 'material' | 'sub_work' | 'sub_material';
      description: string;
      unit: string;
      quantity: number;
      unit_rate: number;
      total_amount: number;
      material_id: string | null;
      work_id: string | null;
      consumption_coefficient: number | null;
      conversion_coefficient: number | null;
      base_quantity: number | null;
      material_type?: 'main' | 'auxiliary' | null;
      category?: string | null;
      subcategory?: string | null;
      notes?: string | null;
      delivery_price_type?: 'included' | 'not_included' | 'amount' | null;
      delivery_amount?: number | null;
      created_at: string;
      updated_at: string;
      imported_at: string | null;
      currency_type: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      currency_rate: number | null;
    };
    Insert: {
      id?: string;
      tender_id: string;
      client_position_id?: string | null;
      item_number?: string;
      sub_number?: number;
      sort_order?: number;
      item_type: 'work' | 'material' | 'sub_work' | 'sub_material';
      description: string;
      unit: string;
      quantity: number;
      unit_rate: number;
      material_id?: string | null;
      work_id?: string | null;
      material_type?: 'main' | 'auxiliary' | null;
      consumption_coefficient?: number | null;
      conversion_coefficient?: number | null;
      base_quantity?: number | null;
      category?: string | null;
      subcategory?: string | null;
      notes?: string | null;
      delivery_price_type?: 'included' | 'not_included' | 'amount' | null;
      delivery_amount?: number | null;
      imported_at?: string | null;
      created_at?: string;
      updated_at?: string;
      currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      currency_rate?: number | null;
    };
    Update: {
      id?: string;
      tender_id?: string;
      client_position_id?: string | null;
      item_number?: string;
      sub_number?: number;
      sort_order?: number;
      item_type?: 'work' | 'material' | 'sub_work' | 'sub_material';
      description?: string;
      unit?: string;
      quantity?: number;
      unit_rate?: number;
      material_id?: string | null;
      work_id?: string | null;
      consumption_coefficient?: number | null;
      conversion_coefficient?: number | null;
      base_quantity?: number | null;
      material_type?: 'main' | 'auxiliary' | null;
      category?: string | null;
      subcategory?: string | null;
      notes?: string | null;
      delivery_price_type?: 'included' | 'not_included' | 'amount' | null;
      delivery_amount?: number | null;
      imported_at?: string | null;
      created_at?: string;
      updated_at?: string;
      currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      currency_rate?: number | null;
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
      manual_note: string | null;   // Примечание ГП (генподряда)
      client_note: string | null; // Примечание из Excel
      position_type: 'article' | 'section' | 'subsection' | 'header' | 'subheader' | 'executable'; // Тип позиции
      hierarchy_level: number;    // Уровень иерархии (1-6)
      is_additional: boolean;    // Флаг для ДОП работ
      parent_position_id: string | null; // Ссылка на родительскую позицию для ДОП работ
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
      manual_note?: string | null;   // Примечание ГП (генподряда)
      client_note?: string | null; // Примечание из Excel
      position_type?: 'article' | 'section' | 'subsection' | 'header' | 'subheader' | 'executable'; // Тип позиции
      hierarchy_level?: number;   // Уровень иерархии (1-6)
      is_additional?: boolean;   // Флаг для ДОП работ
      parent_position_id?: string | null; // Ссылка на родительскую позицию для ДОП работ
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
      manual_note?: string | null;   // Примечание ГП (генподряда)
      client_note?: string | null; // Примечание из Excel
      position_type?: 'article' | 'section' | 'subsection' | 'header' | 'subheader' | 'executable'; // Тип позиции
      hierarchy_level?: number;   // Уровень иерархии (1-6)
      is_additional?: boolean;   // Флаг для ДОП работ
      parent_position_id?: string | null; // Ссылка на родительскую позицию для ДОП работ
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
      },
      {
        foreignKeyName: 'client_positions_parent_position_id_fkey';
        columns: ['parent_position_id'];
        isOneToOne: false;
        referencedRelation: 'client_positions';
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
      unit: string;
      item_type: string | null;
      material_type: string | null;
      consumption_coefficient: number | null;
      conversion_coefficient: number | null;
      unit_rate: number | null;
      currency_type: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      delivery_price_type: 'included' | 'not_included' | 'amount' | null;
      delivery_amount: number | null;
      quote_link: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      unit: string;
      item_type?: string | null;
      material_type?: string | null;
      consumption_coefficient?: number | null;
      conversion_coefficient?: number | null;
      unit_rate?: number | null;
      currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      delivery_price_type?: 'included' | 'not_included' | 'amount' | null;
      delivery_amount?: number | null;
      quote_link?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      unit?: string;
      item_type?: string | null;
      material_type?: string | null;
      consumption_coefficient?: number | null;
      conversion_coefficient?: number | null;
      unit_rate?: number | null;
      currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      delivery_price_type?: 'included' | 'not_included' | 'amount' | null;
      delivery_amount?: number | null;
      quote_link?: string | null;
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
      version: number;
      area_sp: number | null;
      area_client: number | null;
      usd_rate: number | null;
      eur_rate: number | null;
      cny_rate: number | null;
      upload_folder: string | null;
      bsm_link: string | null;
      tz_clarification_link: string | null;
      qa_form_link: string | null;
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
      version?: number;
      area_sp?: number | null;
      area_client?: number | null;
      usd_rate?: number | null;
      eur_rate?: number | null;
      cny_rate?: number | null;
      upload_folder?: string | null;
      bsm_link?: string | null;
      tz_clarification_link?: string | null;
      qa_form_link?: string | null;
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
      version?: number;
      area_sp?: number | null;
      area_client?: number | null;
      usd_rate?: number | null;
      eur_rate?: number | null;
      cny_rate?: number | null;
      upload_folder?: string | null;
      bsm_link?: string | null;
      tz_clarification_link?: string | null;
      qa_form_link?: string | null;
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
      unit: string;
      item_type: string | null;
      unit_rate: number | null;
      currency_type: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      unit: string;
      item_type?: string | null;
      unit_rate?: number | null;
      currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      unit?: string;
      item_type?: string | null;
      unit_rate?: number | null;
      currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY' | null;
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
  work_material_links: {
    Row: {
      id: string;
      client_position_id: string;
      work_boq_item_id: string;
      material_boq_item_id: string;
      sub_work_boq_item_id: string | null;
      sub_material_boq_item_id: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      client_position_id: string;
      work_boq_item_id?: string;
      material_boq_item_id?: string;
      sub_work_boq_item_id?: string | null;
      sub_material_boq_item_id?: string | null;
      notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      client_position_id?: string;
      work_boq_item_id?: string;
      material_boq_item_id?: string;
      sub_work_boq_item_id?: string | null;
      sub_material_boq_item_id?: string | null;
      notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'fk_work_material_links_position';
        columns: ['client_position_id'];
        isOneToOne: false;
        referencedRelation: 'client_positions';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'fk_work_material_links_work';
        columns: ['work_boq_item_id'];
        isOneToOne: false;
        referencedRelation: 'boq_items';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'fk_work_material_links_material';
        columns: ['material_boq_item_id'];
        isOneToOne: false;
        referencedRelation: 'boq_items';
        referencedColumns: ['id'];
      }
    ];
  };
  work_material_templates: {
    Row: {
      id: string;
      template_name: string;
      template_description: string | null;
      work_library_id: string | null;
      sub_work_library_id: string | null;
      material_library_id: string | null;
      sub_material_library_id: string | null;
      is_linked_to_work: boolean;
      notes: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      template_name: string;
      template_description?: string | null;
      work_library_id?: string | null;
      sub_work_library_id?: string | null;
      material_library_id?: string | null;
      sub_material_library_id?: string | null;
      is_linked_to_work?: boolean;
      notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      template_name?: string;
      template_description?: string | null;
      work_library_id?: string | null;
      sub_work_library_id?: string | null;
      material_library_id?: string | null;
      sub_material_library_id?: string | null;
      is_linked_to_work?: boolean;
      notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'work_material_templates_work_library_id_fkey';
        columns: ['work_library_id'];
        isOneToOne: false;
        referencedRelation: 'works_library';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'work_material_templates_sub_work_library_id_fkey';
        columns: ['sub_work_library_id'];
        isOneToOne: false;
        referencedRelation: 'works_library';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'work_material_templates_material_library_id_fkey';
        columns: ['material_library_id'];
        isOneToOne: false;
        referencedRelation: 'materials_library';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'work_material_templates_sub_material_library_id_fkey';
        columns: ['sub_material_library_id'];
        isOneToOne: false;
        referencedRelation: 'materials_library';
        referencedColumns: ['id'];
      }
    ];
  };
  cost_categories: {
    Row: {
      id: string;
      code: string | null;
      name: string;
      unit: string | null;
      description: string | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      code?: string | null;
      name: string;
      unit?: string | null;
      description?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      code?: string | null;
      name?: string;
      unit?: string | null;
      description?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  location: {
    Row: {
      id: string;
      country: string | null;
      region: string | null;
      city: string | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      country?: string | null;
      region?: string | null;
      city?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      country?: string | null;
      region?: string | null;
      city?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  detail_cost_categories: {
    Row: {
      id: string;
      cost_category_id: string;
      location_id: string;
      name: string;
      unit: string | null;
      unit_cost: number | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      cost_category_id: string;
      location_id: string;
      name: string;
      unit?: string | null;
      unit_cost?: number | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      cost_category_id?: string;
      location_id?: string;
      name?: string;
      unit?: string | null;
      unit_cost?: number | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'detail_cost_categories_cost_category_id_fkey';
        columns: ['cost_category_id'];
        isOneToOne: false;
        referencedRelation: 'cost_categories';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'detail_cost_categories_location_id_fkey';
        columns: ['location_id'];
        isOneToOne: false;
        referencedRelation: 'location';
        referencedColumns: ['id'];
      }
    ];
  };
};