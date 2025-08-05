// Main Supabase configuration exports
export { supabase, getSupabaseClient, isSupabaseConfigured } from './client';

// Type exports
export type {
  Database,
  User,
  UserRole,
  TenderStatus,
  BOQItemType,
  AuditAction,
  Tender,
  TenderInsert,
  TenderUpdate,
  BOQItem,
  BOQItemInsert,
  BOQItemUpdate,
  Material,
  MaterialInsert,
  MaterialUpdate,
  WorkItem,
  WorkItemInsert,
  WorkItemUpdate,
  HistoryLog,
  BOQSummary,
  TenderAnalytics,
  TenderWithSummary,
  BOQItemWithLibrary,
  ApiResponse,
  PaginatedResponse,
  TenderFilters,
  BOQFilters,
  MaterialFilters,
  WorkItemFilters,
  ClientPosition,
  ClientPositionInsert,
  ClientPositionUpdate,
  ClientPositionWithItems,
  TenderWithFullHierarchy,
  // Utility types
  AuthState,
  BaseComponentProps,
  LoadingState,
  PaginationState,
  SelectOption,
  ApiResult,
  ModalProps,
  ConfirmationModalProps,
  ExportOptions,
  ImportResult,
  NotificationConfig,
} from './types';

// API exports
export {
  tendersApi,
  boqApi,
  materialsApi,
  worksApi,
  usersApi,
  hierarchyApi,
  clientPositionsApi,
  subscriptions,
} from './api';

// Hooks exports
export {
  useRealtime,
  useLoading,
  useApiResponse,
} from './hooks';

// Constants and helpers
export const SUPABASE_CONFIG = {
  TABLES: {
    USERS: 'users',
    TENDERS: 'tenders',
    BOQ_ITEMS: 'boq_items',
    MATERIALS_LIBRARY: 'materials_library',
    WORKS_LIBRARY: 'works_library',
    HISTORY_LOG: 'history_log',
  },
  VIEWS: {
    BOQ_SUMMARY: 'boq_summary',
    TENDER_ANALYTICS: 'tender_analytics',
    SLOW_QUERIES: 'slow_queries',
  },
  FUNCTIONS: {
    BULK_INSERT_BOQ_ITEMS: 'bulk_insert_boq_items',
    GET_USER_ROLE: 'get_user_role',
    GET_USER_ORGANIZATION: 'get_user_organization',
  },
  ENUMS: {
    USER_ROLE: ['Administrator', 'Engineer', 'View-only'] as const,
    TENDER_STATUS: ['draft', 'active', 'submitted', 'awarded', 'closed'] as const,
    BOQ_ITEM_TYPE: ['work', 'material'] as const,
    AUDIT_ACTION: ['INSERT', 'UPDATE', 'DELETE'] as const,
  },
} as const;

// Error handling helpers
export const isSupabaseError = (error: any): boolean => {
  return error && (error.code || error.message);
};

export const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        return 'No records found';
      case '23505':
        return 'A record with this information already exists';
      case '23503':
        return 'Referenced record does not exist';
      case '42501':
        return 'Insufficient permissions for this operation';
      default:
        return `Database error: ${error.code}`;
    }
  }
  
  return 'Unknown error occurred';
};

// Format helpers
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(dateObj);
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Utility functions
export const generateTenderNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `TND-${year}-${timestamp}`;
};

export const calculateBOQTotal = (items: any[]): number => {
  return items.reduce((total, item) => total + (item.total_amount || 0), 0);
};

export const groupBOQByCategory = (items: any[]): Record<string, any[]> => {
  return items.reduce((groups, item) => {
    const category = item.category || 'Uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, any[]>);
};

export const sortBOQItems = (items: any[], sortBy: 'item_number' | 'total_amount' | 'description' = 'item_number'): any[] => {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'item_number':
        return a.item_number.localeCompare(b.item_number, undefined, { numeric: true });
      case 'total_amount':
        return (b.total_amount || 0) - (a.total_amount || 0);
      case 'description':
        return a.description.localeCompare(b.description);
      default:
        return 0;
    }
  });
};

// Export version info
export const SUPABASE_INTEGRATION_VERSION = '1.0.0';
export const LAST_UPDATED = '2025-08-04';