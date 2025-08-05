/**
 * Database Views Type Definitions
 * All database views with their row structures and relationships
 */

export type DatabaseViews = {
  boq_summary: {
    Row: {
      tender_id: string | null;
      total_items: number | null;
      material_items: number | null;
      work_items: number | null;
      total_value: number | null;
      avg_item_value: number | null;
      max_item_value: number | null;
    };
    Relationships: [];
  };
  client_positions_summary: {
    Row: {
      id: string | null;
      tender_id: string | null;
      position_number: number | null;
      title: string | null;
      category: string | null;
      status: 'active' | 'inactive' | 'completed' | null;
      items_count: number | null;
      materials_count: number | null;
      works_count: number | null;
      total_materials_cost: number | null;
      total_works_cost: number | null;
      total_position_cost: number | null;
      materials_percentage: number | null;
      works_percentage: number | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Relationships: [];
  };
  tender_hierarchy: {
    Row: {
      tender_id: string | null;
      tender_title: string | null;
      tender_number: string | null;
      tender_status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed' | null;
      client_position_id: string | null;
      position_number: number | null;
      position_title: string | null;
      position_category: string | null;
      total_position_cost: number | null;
      boq_item_id: string | null;
      item_number: string | null;
      sub_number: number | null;
      item_description: string | null;
      item_type: 'work' | 'material' | null;
      quantity: number | null;
      unit_rate: number | null;
      item_total: number | null;
      unit: string | null;
      material_name: string | null;
      material_code: string | null;
      work_name: string | null;
      work_code: string | null;
    };
    Relationships: [];
  };
  tender_summary: {
    Row: {
      tender_id: string | null;
      title: string | null;
      tender_number: string | null;
      status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed' | null;
      estimated_value: number | null;
      positions_count: number | null;
      total_items_count: number | null;
      total_materials_cost: number | null;
      total_works_cost: number | null;
      total_tender_cost: number | null;
      cost_variance_percentage: number | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Relationships: [];
  };
  slow_queries: {
    Row: {
      query: string | null;
      calls: number | null;
      total_exec_time: number | null;
      mean_exec_time: number | null;
      max_exec_time: number | null;
      rows: number | null;
      hit_percent: number | null;
    };
    Relationships: [];
  };
  tender_analytics: {
    Row: {
      id: string | null;
      title: string | null;
      description: string | null;
      client_name: string | null;
      tender_number: string | null;
      submission_deadline: string | null;
      estimated_value: number | null;
      status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed' | null;
      created_by: string | null;
      created_at: string | null;
      updated_at: string | null;
      total_items: number | null;
      boq_total_value: number | null;
      cost_accuracy_percentage: number | null;
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
};