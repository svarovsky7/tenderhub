export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      boq_items: {
        Row: {
          id: string;
          tender_id: string;
          item_number: string;
          item_type: 'work' | 'material';
          description: string;
          unit: string;
          quantity: number;
          unit_rate: number;
          total_amount: number | null;
          material_id: string | null;
          work_id: string | null;
          library_material_id: string | null;
          library_work_id: string | null;
          category: string | null;
          subcategory: string | null;
          notes: string | null;
          markup_percentage: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tender_id: string;
          item_number: string;
          item_type: 'work' | 'material';
          description: string;
          unit: string;
          quantity: number;
          unit_rate: number;
          material_id?: string | null;
          work_id?: string | null;
          library_material_id?: string | null;
          library_work_id?: string | null;
          category?: string | null;
          subcategory?: string | null;
          notes?: string | null;
          markup_percentage?: number | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tender_id?: string;
          item_number?: string;
          item_type?: 'work' | 'material';
          description?: string;
          unit?: string;
          quantity?: number;
          unit_rate?: number;
          material_id?: string | null;
          work_id?: string | null;
          category?: string | null;
          subcategory?: string | null;
          notes?: string | null;
          markup_percentage?: number | null;
          created_by?: string;
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
      history_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          old_data: Json | null;
          new_data: Json | null;
          changed_fields: string[] | null;
          changed_by: string | null;
          changed_at: string;
          ip_address: unknown | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE';
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          changed_by?: string | null;
          changed_at?: string;
          ip_address?: unknown | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action?: 'INSERT' | 'UPDATE' | 'DELETE';
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          changed_by?: string | null;
          changed_at?: string;
          ip_address?: unknown | null;
          user_agent?: string | null;
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
          code: string;
          name: string;
          description: string | null;
          unit: string;
          base_price: number;
          supplier: string | null;
          category: string | null;
          organization_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          unit: string;
          base_price: number;
          supplier?: string | null;
          category?: string | null;
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          unit?: string;
          base_price?: number;
          supplier?: string | null;
          category?: string | null;
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenders: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          client_name: string;
          project_location: string | null;
          tender_number: string;
          submission_deadline: string | null;
          estimated_value: number | null;
          status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
          created_by: string;
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          client_name: string;
          project_location?: string | null;
          tender_number: string;
          submission_deadline?: string | null;
          estimated_value?: number | null;
          status?: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
          created_by: string;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          client_name?: string;
          project_location?: string | null;
          tender_number?: string;
          submission_deadline?: string | null;
          estimated_value?: number | null;
          status?: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
          created_by?: string;
          organization_id?: string | null;
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
          full_name: string;
          role: 'Administrator' | 'Engineer' | 'View-only';
          organization_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'Administrator' | 'Engineer' | 'View-only';
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'Administrator' | 'Engineer' | 'View-only';
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      works_library: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          unit: string;
          base_price: number;
          base_rate: number;
          labor_component: number | null;
          complexity: 'low' | 'medium' | 'high' | null;
          category: string | null;
          organization_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          unit: string;
          base_price: number;
          base_rate: number;
          labor_component?: number | null;
          complexity?: 'low' | 'medium' | 'high' | null;
          category?: string | null;
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          unit?: string;
          base_price?: number;
          base_rate?: number;
          labor_component?: number | null;
          complexity?: 'low' | 'medium' | 'high' | null;
          category?: string | null;
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
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
          project_location: string | null;
          tender_number: string | null;
          submission_deadline: string | null;
          estimated_value: number | null;
          status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed' | null;
          created_by: string | null;
          organization_id: string | null;
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
    Functions: {
      bulk_insert_boq_items: {
        Args: {
          p_tender_id: string;
          p_items: Json;
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
    Enums: {
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE';
      boq_item_type: 'work' | 'material';
      tender_status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
      user_role: 'Administrator' | 'Engineer' | 'View-only';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for better developer experience
export type UserRole = Database['public']['Enums']['user_role'];
export type TenderStatus = Database['public']['Enums']['tender_status'];
export type BOQItemType = Database['public']['Enums']['boq_item_type'];
export type AuditAction = Database['public']['Enums']['audit_action'];

export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Tender = Database['public']['Tables']['tenders']['Row'];
export type TenderInsert = Database['public']['Tables']['tenders']['Insert'];
export type TenderUpdate = Database['public']['Tables']['tenders']['Update'];

export type BOQItem = Database['public']['Tables']['boq_items']['Row'];
export type BOQItemInsert = Database['public']['Tables']['boq_items']['Insert'];
export type BOQItemUpdate = Database['public']['Tables']['boq_items']['Update'];

export type Material = Database['public']['Tables']['materials_library']['Row'];
export type MaterialInsert = Database['public']['Tables']['materials_library']['Insert'];
export type MaterialUpdate = Database['public']['Tables']['materials_library']['Update'];

export type WorkItem = Database['public']['Tables']['works_library']['Row'];
export type WorkItemInsert = Database['public']['Tables']['works_library']['Insert'];
export type WorkItemUpdate = Database['public']['Tables']['works_library']['Update'];

export type HistoryLog = Database['public']['Tables']['history_log']['Row'];

export type BOQSummary = Database['public']['Views']['boq_summary']['Row'];
export type TenderAnalytics = Database['public']['Views']['tender_analytics']['Row'];

// Custom types for application logic
export interface AuthUser extends User {
  auth_id: string;
}

export interface TenderWithSummary extends Tender {
  boq_summary?: BOQSummary;
  total_items?: number;
  boq_total_value?: number;
}

export interface BOQItemWithLibrary extends BOQItem {
  material?: Material;
  work_item?: WorkItem;
}

export interface CreateUserProfile {
  email: string;
  full_name: string;
  role?: UserRole;
  organization_id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  full_name: string;
  role?: UserRole;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Filter and query types
export interface TenderFilters {
  status?: TenderStatus[];
  client_name?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface BOQFilters {
  tender_id?: string;
  item_type?: BOQItemType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
  search?: string;
}

export interface MaterialFilters {
  category?: string[];
  supplier?: string[];
  is_active?: boolean;
  search?: string;
  price_range?: [number, number];
}

export interface WorkItemFilters {
  category?: string[];
  is_active?: boolean;
  search?: string;
  price_range?: [number, number];
}

// Additional types
export type Work = Database['public']['Tables']['works_library']['Row'];
export type Session = any; // Will be properly typed later
export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
  role: 'Administrator' | 'Engineer' | 'View-only';
}

export interface TenderWithSummary extends Tender {
  total_items?: number | null;
  boq_total_value?: number | null;
  cost_accuracy_percentage?: number | null;
}