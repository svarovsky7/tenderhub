import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { theme } from 'antd';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { SortableBOQItem } from './SortableBOQItem';
import type { BOQItem } from '../../lib/supabase/types';

interface WorkCardProps {
  work: BOQItem;
  materials: any[];
  allWorkLinks: Record<string, any[]>;
  onRemoveMaterial?: (materialId: string) => void;
  onEditMaterial?: (material: any) => void;
  onUpdateWork?: (work: BOQItem, updates: Partial<BOQItem>) => void;
  className?: string;
}

export const WorkCard: React.FC<WorkCardProps> = ({
  work,
  materials = [],
  allWorkLinks,
  onRemoveMaterial,
  onEditMaterial,
  onUpdateWork,
  className = '',
}) => {
  const { token } = theme.useToken();
  
  // Make the entire card droppable
  const { setNodeRef, isOver, active } = useDroppable({
    id: `work-${work.id}`,
    data: {
      type: 'work',
      workId: work.id,
      work,
    },
  });

  // Check if the dragged item is a material
  const isDraggingMaterial = active?.data.current?.type === 'material';
  
  // Calculate total materials cost
  const linkedMaterialsTotal = useMemo(() => {
    if (!allWorkLinks[work.id]) return 0;
    return allWorkLinks[work.id].reduce((sum: number, link: any) => {
      return sum + (link.calculated_total || 0);
    }, 0);
  }, [allWorkLinks, work.id]);

  // Determine card styles based on drag state
  const cardStyles = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      transition: 'all 0.2s ease',
      borderRadius: '8px',
      border: '1px solid',
      padding: '12px',
    };

    if (isOver && isDraggingMaterial) {
      // Highlighted state when material is hovering
      return {
        ...baseStyles,
        backgroundColor: token.colorWarningBg,
        borderColor: token.colorWarningBorder,
        boxShadow: `0 0 0 2px ${token.colorWarningBorder}20`,
        transform: 'scale(1.02)',
      };
    }

    // Default state
    return {
      ...baseStyles,
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
    };
  }, [isOver, isDraggingMaterial, token]);

  // Sort materials by order_index if available
  const sortedMaterials = useMemo(() => {
    return [...materials].sort((a, b) => 
      (a.order_index || 0) - (b.order_index || 0)
    );
  }, [materials]);

  const materialIds = sortedMaterials.map(m => `material-${m.id}`);

  return (
    <div
      ref={setNodeRef}
      style={cardStyles}
      className={`work-card ${className} ${isOver && isDraggingMaterial ? 'drag-over' : ''}`}
      data-work-id={work.id}
    >
      {/* Work Header */}
      <div className="work-header mb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="work-type-badge px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                🔧 Работа
              </span>
              <h4 className="font-medium text-sm text-gray-800">
                {work.description}
              </h4>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatQuantity(work.quantity)} {work.unit} × {formatCurrency(work.unit_rate)}/ед.
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              Работа: {formatCurrency(work.total_amount || 0)}
            </div>
            {linkedMaterialsTotal > 0 && (
              <>
                <div className="text-xs text-gray-500">
                  Материалы: {formatCurrency(linkedMaterialsTotal)}
                </div>
                <div className="font-semibold text-blue-600 border-t border-gray-300 pt-1 mt-1">
                  Итого: {formatCurrency((work.total_amount || 0) + linkedMaterialsTotal)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Materials List with Sortable Context */}
      {sortedMaterials.length > 0 ? (
        <div className="materials-list">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Привязанные материалы:
            {isOver && isDraggingMaterial && (
              <span className="ml-2 text-orange-600 animate-pulse">
                Отпустите для добавления
              </span>
            )}
          </div>
          <SortableContext
            items={materialIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedMaterials.map((material) => (
                <SortableBOQItem
                  key={material.id}
                  item={material}
                  isDraggable={true}
                  dragData={{
                    type: 'material',
                    item: material,
                    sourceType: 'work',
                    sourceWorkId: work.id,
                    linkId: material.link_id,
                  }}
                  onRemove={onRemoveMaterial ? () => onRemoveMaterial(material.id) : undefined}
                  onEdit={onEditMaterial}
                  className="material-item"
                />
              ))}
            </div>
          </SortableContext>
        </div>
      ) : (
        <div className="empty-materials py-8 text-center">
          <div className="text-gray-400 text-sm">
            {isOver && isDraggingMaterial ? (
              <span className="text-orange-600 font-medium animate-pulse">
                Отпустите материал здесь
              </span>
            ) : (
              'Нет привязанных материалов'
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Перетащите материал сюда для привязки
          </div>
        </div>
      )}

      {/* Drop Indicator Overlay */}
      {isOver && isDraggingMaterial && (
        <div className="drop-indicator absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-orange-500 opacity-10 rounded-lg animate-pulse" />
        </div>
      )}
    </div>
  );
};