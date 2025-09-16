// Types for name tables
export interface MaterialName {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface WorkName {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Extended types with joined names
export interface MaterialLibraryWithName {
  id: string;
  name_id: string;
  name?: string; // From joined material_names table
  item_type: 'material' | 'sub_material';
  unit: string;
  unit_cost?: number;
  material_type?: 'main' | 'auxiliary';
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkLibraryWithName {
  id: string;
  name_id: string;
  name?: string; // From joined work_names table
  item_type: 'work' | 'sub_work';
  unit: string;
  unit_rate?: number;
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}