import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import type { TenderFilters } from '../types';
// Note: TenderStatus import removed as status field was removed from schema

interface UseTenderFiltersReturn {
  filters: TenderFilters;
  handleSearch: (value: string) => void;
  // handleStatusFilter removed as status field was removed from schema
  handleDateFilter: (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => void;
  handleFiltersChange: (newFilters: Partial<TenderFilters>) => void;
  resetFilters: () => void;
}

const initialFilters: TenderFilters = {
  search: '',
  // Note: status filter removed as status field was removed from schema
  client_name: '',
  date_from: '',
  date_to: ''
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

  // Note: status filter handler removed as status field was removed from schema

  // Handle date range filter
  const handleDateFilter = useCallback((dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    console.log('📅 Date filter changed:', dates);
    const newFilters = {
      ...filters,
      date_from: dates?.[0]?.format('YYYY-MM-DD') || '',
      date_to: dates?.[1]?.format('YYYY-MM-DD') || ''
    };
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
    // handleStatusFilter removed as status field was removed from schema
    handleDateFilter,
    handleFiltersChange,
    resetFilters
  };
};