import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface PositionSummaryProps {
  totalCost: number;
  worksCount: number;
  materialsCount: number;
}

/**
 * Компонент отображения итоговой суммы и статистики позиции
 */
export const PositionSummary: React.FC<PositionSummaryProps> = React.memo(({
  totalCost,
  worksCount,
  materialsCount
}) => {
  const { theme } = useTheme();

  // Memoize formatted cost
  const formattedCost = React.useMemo(() =>
    Math.round(totalCost).toLocaleString('ru-RU'),
    [totalCost]
  );

  return (
    <div className="flex flex-col gap-1">
      {/* Total Cost */}
      <div>
        <strong
          className="text-lg whitespace-nowrap"
          style={{
            fontWeight: 600,
            color: theme === 'dark' ? '#73d13d' : '#389e0d'
          }}
        >
          {formattedCost} ₽
        </strong>
      </div>

      {/* Statistics */}
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">
          <span
            className="text-xs"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}
          >
            Р:{' '}
          </span>
          <strong
            className="text-xs"
            style={{
              fontWeight: 600,
              color: theme === 'dark' ? '#73d13d' : '#52c41a'
            }}
          >
            {worksCount}
          </strong>
        </span>
        <span className="whitespace-nowrap">
          <span
            className="text-xs"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}
          >
            М:{' '}
          </span>
          <strong
            className="text-xs"
            style={{
              fontWeight: 600,
              color: theme === 'dark' ? '#40a9ff' : '#1890ff'
            }}
          >
            {materialsCount}
          </strong>
        </span>
      </div>
    </div>
  );
});