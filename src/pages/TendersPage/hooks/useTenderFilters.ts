import { useState, useCallback } from 'react';
import type { TenderFilters } from '../types';

interface UseTenderFiltersReturn {
  filters: TenderFilters;
  handleSearch: (value: string) => void;
  handleFiltersChange: (newFilters: Partial<TenderFilters>) => void;
  resetFilters: () => void;
}

const initialFilters: TenderFilters = {
  search: '',
  client_name: ''
};

export const useTenderFilters = (
  onFiltersChange?: (filters: TenderFilters) => void
): UseTenderFiltersReturn => {
  console.log('🚀 useTenderFilters hook initialized');

  const [filters, setFilters] = useState<TenderFilters>(initialFilters);

  console.log('📋 Current filters state:', filters);

  // Handle search filter
  const handleSearch = useCallback((value: string) => {
    console.log('🔍 Search filter changed:', value);
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [filters, onFiltersChange]);


  // Handle any filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<TenderFilters>) => {
    console.log('📝 Filters changed:', newFilters);
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  }, [filters, onFiltersChange]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    console.log('🔄 Resetting filters to initial state');
    setFilters(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [onFiltersChange]);

  return {
    filters,
    handleSearch,
    handleFiltersChange,
    resetFilters
  };
};