// Shared utilities for API modules

// Generic error handler
export const handleSupabaseError = (error: unknown, operation: string): string => {
  console.error(`${operation} error:`, error);
  
  if ((error as any)?.code === 'PGRST116') {
    return 'No records found';
  }
  
  if ((error as any)?.code === '23505') {
    return 'A record with this information already exists';
  }
  
  if ((error as any)?.code === '23503') {
    return 'Referenced record does not exist';
  }
  
  if ((error as any)?.code === '42501') {
    return 'Insufficient permissions for this operation';
  }
  
  return (error as any)?.message || `Failed to ${operation.toLowerCase()}`;
};

// Generic pagination helper
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export const applyPagination = (query: any, options: PaginationOptions = {}) => {
  const { page = 1, limit = 20 } = options;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  return query.range(from, to);
};