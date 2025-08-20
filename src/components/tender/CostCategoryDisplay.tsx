import React, { memo } from 'react';
import { Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getDetailCategoryDisplay } from '../../lib/supabase/api/construction-costs';

interface CostCategoryDisplayProps {
  detailCategoryId: string | null;
}

const CostCategoryDisplay: React.FC<CostCategoryDisplayProps> = ({ detailCategoryId }) => {
  // Use React Query for caching
  const { data: displayValue = '', isLoading } = useQuery({
    queryKey: ['costCategoryDisplay', detailCategoryId],
    queryFn: async () => {
      if (!detailCategoryId) return '';
      
      const { data, error } = await getDetailCategoryDisplay(detailCategoryId);
      if (error) {
        console.error('❌ Failed to load cost category display:', error);
        return '';
      }
      return data || '';
    },
    enabled: !!detailCategoryId,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  if (!detailCategoryId) {
    return <div className="text-xs text-gray-400 text-center">—</div>;
  }

  if (isLoading) {
    return <div className="text-xs text-gray-400 text-center">Загрузка...</div>;
  }

  if (!displayValue) {
    return <div className="text-xs text-gray-400 text-center">—</div>;
  }

  // Split the display value into parts for better formatting
  const parts = displayValue.split(' → ');
  if (parts.length === 3) {
    return (
      <Tooltip title={displayValue} placement="left">
        <div className="py-1 text-center">
          <div className="text-[10px] text-gray-500 font-medium leading-tight">
            {parts[0]}
          </div>
          <div className="text-[11px] text-gray-700 font-medium leading-tight mt-0.5">
            {parts[1]}
          </div>
          <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
            📍 {parts[2]}
          </div>
        </div>
      </Tooltip>
    );
  }

  // If format is not standard, show as is
  return (
    <Tooltip title={displayValue} placement="left">
      <div className="text-[11px] text-gray-600 leading-relaxed py-1 text-center">
        {displayValue.replace(/ → /g, ' / ')}
      </div>
    </Tooltip>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CostCategoryDisplay, (prevProps, nextProps) => {
  return prevProps.detailCategoryId === nextProps.detailCategoryId;
});