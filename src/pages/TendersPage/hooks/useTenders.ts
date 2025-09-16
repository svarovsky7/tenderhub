import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { tendersApi } from '../../../lib/supabase/api';
import type { TenderWithSummary, TenderFilters, TenderStatistics } from '../types';

interface UseTendersReturn {
  tenders: TenderWithSummary[];
  loading: boolean;
  stats: TenderStatistics;
  loadTenders: () => Promise<void>;
}

export const useTenders = (
  filters: TenderFilters
): UseTendersReturn => {
  console.log('🚀 useTenders hook initialized');
  console.log('📋 Initial filters:', filters);

  const [tenders, setTenders] = useState<TenderWithSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate statistics - active based on deadline
  const now = dayjs();
  const activeTenders = tenders.filter(t =>
    t.submission_deadline && dayjs(t.submission_deadline).isAfter(now)
  );

  const stats: TenderStatistics = {
    total: tenders.length,
    active: activeTenders.length, // Count tenders with non-expired deadline as active
    submitted: 0,
    won: 0,
    totalValue: tenders.reduce((sum, t) => sum + (t.boq_total_value || 0), 0) // Using BOQ value instead of estimated_value
  };

  console.log('📊 Calculated stats:', stats);

  // Load tenders from API
  const loadTenders = useCallback(async () => {
    console.log('🔄 loadTenders called');
    console.log('📋 Current filters:', filters);
    
    setLoading(true);
    
    try {
      console.log('📡 Calling tendersApi.getAll...');
      const result = await tendersApi.getAll(filters, {
        page: 1,
        limit: 10000  // Large number to get all tenders
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

      console.log('✅ Tenders state updated successfully');
    } catch (error) {
      console.error('💥 Load tenders error:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setLoading(false);
      console.log('🏁 loadTenders finished');
    }
  }, [filters]);

  // Load tenders when dependencies change
  useEffect(() => {
    console.log('🔄 Effect triggered, loading tenders...');
    loadTenders();
  }, [loadTenders]);

  return {
    tenders,
    loading,
    stats,
    loadTenders
  };
};