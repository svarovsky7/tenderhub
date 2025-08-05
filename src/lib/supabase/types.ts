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
          client_position_id: string | null;
          sub_number: number | null;
          sort_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tender_id: string;
          item_number?: string;
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
          client_position_id?: string | null;
          sub_number?: number | null;
          sort_order?: number | null;
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
      client_positions: {
        Row: {
          id: string;
          tender_id: string;
          position_number: number;
          title: string;
          description: string | null;
          category: string | null;
          priority: number | null;
          status: 'active' | 'inactive' | 'completed';
          total_materials_cost: number | null;
          total_works_cost: number | null;
          total_position_cost: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tender_id: string;
          position_number?: number;
          title: string;
          description?: string | null;
          category?: string | null;
          priority?: number | null;
          status?: 'active' | 'inactive' | 'completed';
          total_materials_cost?: number | null;
          total_works_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tender_id?: string;
          position_number?: number;
          title?: string;
          description?: string | null;
          category?: string | null;
          priority?: number | null;
          status?: 'active' | 'inactive' | 'completed';
          total_materials_cost?: number | null;
          total_works_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
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
          tender_number: string;
          submission_deadline: string | null;
          estimated_value: number | null;
          status: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
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
          estimated_value?: number | null;
          status?: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
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
          estimated_value?: number | null;
          status?: 'draft' | 'active' | 'submitted' | 'awarded' | 'closed';
          created_by?: string;
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
      tender_client_works: {
        Row: {
          id: string;
          tender_id: string;
          item_no: number;
          work_name: string;
          unit: string;
          client_volume: number;
          client_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tender_id: string;
          item_no: number;
          work_name: string;
          unit: string;
          client_volume: number;
          client_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tender_id?: string;
          item_no?: number;
          work_name?: string;
          unit?: string;
          client_volume?: number;
          client_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tender_client_works_tender_id_fkey';
            columns: ['tender_id'];
            isOneToOne: false;
            referencedRelation: 'tenders';
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'Administrator' | 'Engineer' | 'View-only';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'Administrator' | 'Engineer' | 'View-only';
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
    Functions: {
      bulk_insert_boq_items: {
        Args: {
          p_tender_id: string;
          p_items: Json;
        };
        Returns: number;
      };
      bulk_insert_boq_items_to_position: {
        Args: {
          p_client_position_id: string;
          p_items: Json;
        };
        Returns: number;
      };
      get_next_client_position_number: {
        Args: {
          p_tender_id: string;
        };
        Returns: number;
      };
      get_next_sub_number: {
        Args: {
          p_client_position_id: string;
        };
        Returns: number;
      };
      renumber_client_positions: {
        Args: {
          p_tender_id: string;
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
      client_position_status: 'active' | 'inactive' | 'completed';
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
export type ClientPositionStatus = Database['public']['Enums']['client_position_status'];
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

export type ClientPosition = Database['public']['Tables']['client_positions']['Row'];
export type ClientPositionInsert = Database['public']['Tables']['client_positions']['Insert'];
export type ClientPositionUpdate = Database['public']['Tables']['client_positions']['Update'];

export type Material = Database['public']['Tables']['materials_library']['Row'];
export type MaterialInsert = Database['public']['Tables']['materials_library']['Insert'];
export type MaterialUpdate = Database['public']['Tables']['materials_library']['Update'];

export type WorkItem = Database['public']['Tables']['works_library']['Row'];
export type WorkItemInsert = Database['public']['Tables']['works_library']['Insert'];
export type WorkItemUpdate = Database['public']['Tables']['works_library']['Update'];

export type ClientWork = Database['public']['Tables']['tender_client_works']['Row'];
export type ClientWorkInsert = Database['public']['Tables']['tender_client_works']['Insert'];
export type ClientWorkUpdate = Database['public']['Tables']['tender_client_works']['Update'];

export type HistoryLog = Database['public']['Tables']['history_log']['Row'];

// Simple types for summary data (calculated from base tables)  
export interface BOQSummary {
  tender_id: string;
  total_items: number;
  total_amount: number;
  materials_count: number;
  works_count: number;
}

export interface ClientPositionSummary extends ClientPosition {
  items_count?: number;
  materials_count?: number;
  works_count?: number;
}

export interface TenderSummary extends Tender {
  positions_count: number;
  total_items: number;
  total_amount: number;
  materials_count: number;
  works_count: number;
}

export interface TenderHierarchy {
  id: string;
  tender_id: string;
  position_number?: number;
  sub_number?: number;
  title: string;
  description?: string | null;
  total_amount?: number;
}

// Extended database types with additional properties
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

export interface ClientPositionWithItems extends ClientPosition {
  boq_items?: BOQItemWithLibrary[];
  items_count?: number;
  materials_count?: number;
  works_count?: number;
}

export interface BOQItemWithPosition extends BOQItemWithLibrary {
  client_position?: ClientPosition;
}

export interface CreateUserProfile {
  email: string;
  full_name: string;
  role?: UserRole;
  organization_id?: string;
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
  client_position_id?: string;
  item_type?: BOQItemType[];
  category?: string[];
  min_amount?: number;
  max_amount?: number;
  search?: string;
}

export interface ClientPositionFilters {
  tender_id?: string;
  status?: ClientPositionStatus[];
  category?: string[];
  min_cost?: number;
  max_cost?: number;
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

// Hierarchy-specific types
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

export interface TenderWithFullHierarchy extends Tender {
  client_positions?: ClientPositionWithItems[];
  summary?: TenderSummary;
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

// Additional types
export type Work = Database['public']['Tables']['works_library']['Row'];
export type Session = any; // Will be properly typed later

// Auth types
export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  error: string | null;
}

// Common UI utility types
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

// Form utility types
export interface FormFieldRule {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
}

// API utility types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, any>;
}

export type ApiResult<T = any> = SuccessResponse<T> | ErrorResponse;

// Component event handler types
export interface TableChangeHandler {
  (pagination: PaginationState, filters?: Record<string, any>, sorter?: any): void;
}

export interface SearchHandler {
  (value: string): void;
}

export interface FilterChangeHandler<T = any> {
  (filters: T): void;
}

// Drag and drop types
export interface DragEndHandler {
  (event: { active: { id: string }; over: { id: string } | null }): void;
}

// Modal and dialog types
export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  onClose: () => void;
  onCancel?: () => void;
  title?: React.ReactNode;
  width?: number | string;
}

export interface ConfirmationModalProps extends ModalProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

// Form submission types
export interface FormSubmitHandler<T = any> {
  (values: T): Promise<void> | void;
}

export interface FormValidationHandler {
  (rule: any, value: any): Promise<void>;
}

// Generic CRUD operation types
export interface CreateOperation<T> {
  data: T;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export interface UpdateOperation<T> {
  id: string;
  data: Partial<T>;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export interface DeleteOperation {
  id: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Selection and multi-selection types
export interface SelectionState {
  selectedKeys: string[];
  selectedItems: any[];
}

export interface SelectionHandler {
  (keys: string[], items?: any[]): void;
}

// Export and import types
export interface ExportOptions {
  format: 'xlsx' | 'pdf' | 'csv';
  filename?: string;
  includeHeaders?: boolean;
  selectedOnly?: boolean;
}

export interface ImportResult {
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{ row: number; message: string }>;
}

// Notification types
export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
}

// Route and navigation types
export interface RouteParams {
  [key: string]: string | undefined;
}

export interface NavigationHandler {
  (path: string, params?: RouteParams): void;
}

// Permission and role types
export interface PermissionCheck {
  action: string;
  resource: string;
  userRole: UserRole;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}