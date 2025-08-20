import React, { useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { getDetailCategoryDisplay } from '../../lib/supabase/api/construction-costs';

interface CostCategoryDisplayProps {
  detailCategoryId: string | null;
}

const CostCategoryDisplay: React.FC<CostCategoryDisplayProps> = ({ detailCategoryId }) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detailCategoryId) {
      setDisplayValue('');
      return;
    }

    const loadDisplay = async () => {
      setLoading(true);
      try {
        const { data, error } = await getDetailCategoryDisplay(detailCategoryId);
        if (!error && data) {
          setDisplayValue(data);
        }
      } catch (err) {
        console.error('❌ Failed to load cost category display:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDisplay();
  }, [detailCategoryId]);

  if (!detailCategoryId) {
    return <div className="text-xs text-gray-400 text-center">—</div>;
  }

  if (loading) {
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

export default CostCategoryDisplay;