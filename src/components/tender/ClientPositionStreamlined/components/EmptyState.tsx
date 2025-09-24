import React from 'react';
import { Empty, Button, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  canAddItems: boolean;
  positionIcon: React.ReactNode;
  positionLabel: string;
  onAddFirstItem: () => void;
}

/**
 * Компонент для отображения пустого состояния когда нет элементов в позиции
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  canAddItems,
  positionIcon,
  positionLabel,
  onAddFirstItem
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <Empty
        description={canAddItems ? "Нет добавленных элементов" : (
          <span className="flex items-center justify-center gap-2">
            <Tooltip title={positionLabel}>
              <span className="text-lg cursor-help">{positionIcon}</span>
            </Tooltip>
            Структурный элемент не содержит элементов
          </span>
        )}
        className="py-4"
      >
        {canAddItems && (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={onAddFirstItem}
          >
            Добавить первый элемент
          </Button>
        )}
      </Empty>
    </div>
  );
};