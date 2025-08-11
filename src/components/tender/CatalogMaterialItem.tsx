import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import type { BOQItem } from '../../lib/supabase/types';

interface CatalogMaterialItemProps {
  material: BOQItem;
  onRemove?: () => void;
  onEdit?: (material: BOQItem, updates: Partial<BOQItem>) => void;
  className?: string;
}

export const CatalogMaterialItem: React.FC<CatalogMaterialItemProps> = ({
  material,
  onRemove,
  onEdit,
  className = '',
}) => {
  const { token } = theme.useToken();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `catalog:${material.id}`,
    data: {
      type: 'material',
      item: material,
      sourceType: 'catalog',
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'opacity 0.2s',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`catalog-material-item bg-white p-3 rounded-lg border ${
        isDragging ? 'border-blue-400 shadow-lg z-50' : 'border-gray-200'
      } hover:border-gray-300 transition-all ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 gap-2">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="drag-handle cursor-move text-gray-400 hover:text-gray-600"
            title="Перетащите на работу для создания связи"
          >
            <HolderOutlined />
          </div>
          
          {/* Material Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="material-badge px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                📦 Материал
              </span>
              <span className="text-sm font-medium text-gray-700">
                {material.description}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatQuantity(material.quantity)} {material.unit} × {formatCurrency(material.unit_rate)}/ед.
              {material.consumption_coefficient && material.consumption_coefficient !== 1 && (
                <span className="ml-2">
                  К.расх: {material.consumption_coefficient}
                </span>
              )}
              {material.conversion_coefficient && material.conversion_coefficient !== 1 && (
                <span className="ml-2">
                  К.пер: {material.conversion_coefficient}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-600">
            {formatCurrency(material.total_amount || 0)}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 p-1 transition-colors"
              title="Удалить"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Drag Hint */}
      {!isDragging && (
        <div className="text-xs text-gray-400 mt-2 opacity-0 hover:opacity-100 transition-opacity">
          💡 Перетащите на работу для привязки
        </div>
      )}
    </div>
  );
};