import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { EditableBOQItem } from './EditableBOQItem';
import type { BOQItem } from '../../lib/supabase/types';

interface SortableBOQItemProps {
  item: BOQItem & { is_linked_material?: boolean };
  linkedMaterialsTotal?: number;
  onRemove: (e: React.MouseEvent) => void;
  onEdit?: (item: BOQItem, updates: Partial<BOQItem>) => Promise<void>;
  children?: React.ReactNode;
}

export const SortableBOQItem: React.FC<SortableBOQItemProps> = ({
  item,
  linkedMaterialsTotal = 0,
  onRemove,
  onEdit,
  children
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const isDraggable = item.item_type === 'material' && !item.is_linked_material && !isEditing;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
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
  };

  // Класс для работы, которая может принимать материалы
  const isDropZone = item.item_type === 'work';
  const dropZoneClass = isDropZone && isOver ? 'bg-blue-50 border-blue-400' : '';

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
      style={style}
      className={`bg-gray-50 p-2 rounded border ${
        isDragging ? 'border-blue-400 shadow-lg z-50' : 'border-gray-200'
      } ${dropZoneClass} ${item.is_linked_material ? 'ml-6 opacity-75' : ''} transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 gap-2">
          {isDraggable && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-move text-gray-400 hover:text-gray-600"
              title="Перетащите материал на работу для создания связи"
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
              {item.is_linked_material && (
                <span className="text-xs text-gray-500 italic">
                  (связан)
                </span>
              )}
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
          <div className="text-right">
            {item.item_type === 'work' && linkedMaterialsTotal > 0 ? (
              <>
                <div className="text-xs text-gray-500">
                  Работа: {formatCurrency(item.total_amount || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  Материалы: {formatCurrency(linkedMaterialsTotal)}
                </div>
                <div className="font-semibold text-blue-600 border-t border-gray-300 pt-1">
                  Итого: {formatCurrency((item.total_amount || 0) + linkedMaterialsTotal)}
                </div>
              </>
            ) : (
              <span className="font-semibold text-blue-600">
                {formatCurrency(item.total_amount || 0)}
              </span>
            )}
          </div>
          {!item.is_linked_material && (
            <>
              {onEdit && (
                <button
                  onClick={handleStartEdit}
                  className="text-blue-500 hover:text-blue-700 p-0.5 transition-colors duration-200"
                  title="Редактировать"
                >
                  <EditOutlined style={{ fontSize: '14px' }} />
                </button>
              )}
              <button
                onClick={onRemove}
                className="text-red-500 hover:text-red-700 p-0.5 transition-colors duration-200"
                title="Удалить"
              >
                <CloseOutlined style={{ fontSize: '14px' }} />
              </button>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};