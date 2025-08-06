import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { tendersApi } from '../../../lib/supabase/api';
import type { TenderWithSummary, TenderFilters, TenderStatistics } from '../types';

interface UseTendersReturn {
  tenders: TenderWithSummary[];
  loading: boolean;
  pagination: TablePaginationConfig;
  stats: TenderStatistics;
  loadTenders: () => Promise<void>;
  handleTableChange: (pagination: TablePaginationConfig) => void;
}

export const useTenders = (
  filters: TenderFilters,
  initialPagination: TablePaginationConfig
): UseTendersReturn => {
  console.log('🚀 useTenders hook initialized');
  console.log('📋 Initial filters:', filters);
  console.log('📄 Initial pagination:', initialPagination);

  const [tenders, setTenders] = useState<TenderWithSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>(initialPagination);

  // Calculate statistics
  const stats: TenderStatistics = {
    total: tenders.length,
    active: tenders.filter(t => t.status === 'active').length,
    submitted: tenders.filter(t => t.status === 'submitted').length,
    won: tenders.filter(t => t.status === 'awarded').length,
    totalValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0)
  };

  console.log('📊 Calculated stats:', stats);

  // Load tenders from API
  const loadTenders = useCallback(async () => {
    console.log('🔄 loadTenders called');
    console.log('📋 Current filters:', filters);
    console.log('📄 Current pagination:', {
      current: pagination.current,
      pageSize: pagination.pageSize
    });
    
    setLoading(true);
    
    try {
      console.log('📡 Calling tendersApi.getAll...');
      const result = await tendersApi.getAll(filters, {
        page: pagination.current,
        limit: pagination.pageSize
      });

      console.log('📦 tendersApi.getAll result:', result);

      if (result.error) {
        console.error('❌ API returned error:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Setting new tenders data:', {
        tendersCount: result.data?.length || 0,
        totalFromPagination: result.pagination?.total || 0
      });

      setTenders(result.data || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0
      }));

      console.log('✅ Tenders state updated successfully');
    } catch (error) {
      console.error('💥 Load tenders error:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setLoading(false);
      console.log('🏁 loadTenders finished');
    }
  }, [filters, pagination.current, pagination.pageSize]);

  // Handle table pagination changes
  const handleTableChange = useCallback((newPagination: TablePaginationConfig) => {
    console.log('📄 Table pagination changed:', newPagination);
    setPagination(prev => ({
      ...prev,
      current: newPagination.current || 1,
      pageSize: newPagination.pageSize || 20
    }));
  }, []);

  // Load tenders when dependencies change
  useEffect(() => {
    console.log('🔄 Effect triggered, loading tenders...');
    loadTenders();
  }, [loadTenders]);

  return {
    tenders,
    loading,
    pagination,
    stats,
    loadTenders,
    handleTableChange
  };
};