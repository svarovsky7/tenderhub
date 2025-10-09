import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface PositionSummaryProps {
  totalCost: number;
  worksCount: number;
  materialsCount: number;
}

/**
 * Компонент отображения итоговой суммы и статистики позиции
 */
export const PositionSummary: React.FC<PositionSummaryProps> = ({
  totalCost,
  worksCount,
  materialsCount
}) => {
  return (
    <div className="flex flex-col gap-1">
      {/* Total Cost */}
      <div>
        <Text strong className="text-lg text-green-700 whitespace-nowrap">
          {Math.round(totalCost).toLocaleString('ru-RU')} ₽
        </Text>
      </div>

      {/* Statistics */}
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap">
          <Text className="text-gray-600 text-xs">Р: </Text>
          <Text strong className="text-green-600 text-xs">{worksCount}</Text>
        </span>
        <span className="whitespace-nowrap">
          <Text className="text-gray-600 text-xs">М: </Text>
          <Text strong className="text-blue-600 text-xs">{materialsCount}</Text>
        </span>
      </div>
    </div>
  );
};