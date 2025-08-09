import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined, CloseOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import type { BOQItem } from '../../lib/supabase/types';

interface DraggableBOQItemProps {
  item: BOQItem;
  isDraggable: boolean;
  onRemove: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export const DraggableBOQItem: React.FC<DraggableBOQItemProps> = ({
  item,
  isDraggable,
  onRemove,
  children
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: item.id,
    disabled: !isDraggable,
    data: {
      type: item.item_type,
      item: item
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDraggable ? 'move' : 'default'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 p-2 rounded border ${
        isDragging ? 'border-blue-400 shadow-lg' : 'border-gray-200'
      } ${item.item_type === 'material' ? 'ml-6' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 gap-2">
          {isDraggable && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-move text-gray-400 hover:text-gray-600"
            >
              <HolderOutlined />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                item.item_type === 'work' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {item.item_type === 'work' ? '🔧' : '📦'}
              </span>
              <span className="text-xs text-gray-700 font-medium">
                {item.description}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {formatQuantity(item.quantity)} {item.unit} × {formatCurrency(item.unit_rate)}/ед.
              {item.consumption_coefficient && item.consumption_coefficient !== 1 && (
                <span className="ml-2">
                  К.расх: {item.consumption_coefficient}
                </span>
              )}
              {item.conversion_coefficient && item.conversion_coefficient !== 1 && (
                <span className="ml-2">
                  К.пер: {item.conversion_coefficient}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-600">
            {formatCurrency(item.total_amount)}
          </span>
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 p-0.5 transition-colors duration-200"
          >
            <CloseOutlined style={{ fontSize: '14px' }} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};