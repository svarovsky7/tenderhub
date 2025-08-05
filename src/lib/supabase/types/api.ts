/**
 * API Response and Operation Types
 * Contains API response formats, CRUD operation types, and success/error patterns
 */

// Basic API response types
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

// Success/Error response patterns
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