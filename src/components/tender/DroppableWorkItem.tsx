import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDndContext } from '@dnd-kit/core';
import { CloseOutlined, EditOutlined } from '@ant-design/icons';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { EditableBOQItem } from './EditableBOQItem';
import type { BOQItem } from '../../lib/supabase/types';

interface DroppableWorkItemProps {
  item: BOQItem;
  linkedMaterialsTotal?: number;
  onRemove?: (e: React.MouseEvent) => void;
  onEdit?: (item: BOQItem, updates: Partial<BOQItem>) => Promise<void>;
  children?: React.ReactNode;
  className?: string;
}

export const DroppableWorkItem: React.FC<DroppableWorkItemProps> = ({
  item,
  linkedMaterialsTotal = 0,
  onRemove,
  onEdit,
  children,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Get current drag context to check what's being dragged
  const { active } = useDndContext();
  const activeDragData = active?.data?.current;
  const isDraggingMaterial = activeDragData?.type === 'material';
  
  // Make work droppable for materials
  const { setNodeRef, isOver } = useDroppable({
    id: item.id,
    data: {
      type: 'work',
      item: item
    }
  });

  // Проверяем, наведен ли материал на работу
  const isHoveringMaterialOverWork = isOver && isDraggingMaterial;

  const handleEdit = async (item: BOQItem, updates: Partial<BOQItem>) => {
    if (onEdit) {
      await onEdit(item, updates);
      setIsEditing(false);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing && onEdit) {
    return (
      <div className="mb-2">
        <EditableBOQItem
          item={item}
          onSave={handleEdit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`p-2 rounded border-2 ${
        isHoveringMaterialOverWork ? 'border-orange-400 bg-orange-50 shadow-md' : 
        'border-gray-200 bg-gray-50'
      } ${className || ''} transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                isHoveringMaterialOverWork 
                  ? 'bg-orange-200 text-orange-800' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                🔧
              </span>
              <span className={`text-xs font-medium ${
                isHoveringMaterialOverWork ? 'text-orange-700' : 'text-gray-700'
              }`}>
                {item.description}
              </span>
              {isHoveringMaterialOverWork && (
                <span className="text-xs text-orange-600 font-semibold animate-pulse">
                  ← Отпустите здесь для привязки
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {formatQuantity(item.quantity)} {item.unit} × {formatCurrency(item.unit_rate)}/ед.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-gray-800">
            {formatCurrency(item.total_amount || 0)}
          </div>
          {onEdit && (
            <button
              onClick={handleStartEdit}
              className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
              title="Редактировать"
            >
              <EditOutlined style={{ fontSize: '12px' }} />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 p-1 transition-colors"
              title="Удалить"
            >
              <CloseOutlined style={{ fontSize: '12px' }} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};