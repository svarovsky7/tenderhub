import React, { memo, useCallback, useState, useMemo } from 'react';
import { Card, Button, Collapse, Badge, Spin, Empty, message } from 'antd';
import {
  PlusOutlined,
  DownOutlined,
  UpOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import OptimizedBOQItemRow from './OptimizedBOQItemRow';
import { BOQItemEditForm } from './BOQItemEditForm';
import { MaterialMoveModal } from './MaterialMoveModal';
import { formatCurrency } from '../../utils/formatters';
import type { ClientPosition, BOQItem } from '../../lib/supabase/types';

interface OptimizedPositionCardProps {
  position: ClientPosition & {
    boq_items?: BOQItem[];
    total_position_cost?: number;
  };
  isExpanded: boolean;
  isLoading: boolean;
  workLinks: Record<string, any[]>;
  onToggle: () => void;
  onAddItem: (positionId: string, itemData: any) => Promise<void>;
  onUpdateItem: (itemId: string, updates: Partial<BOQItem>) => Promise<void>;
  onDeleteItem: (itemId: string, positionId: string) => Promise<void>;
  onMoveMaterial: (materialId: string, targetWorkId: string) => Promise<void>;
  onUpdateLink: (linkId: string, updates: any) => Promise<void>;
  onDeleteLink: (linkId: string) => Promise<void>;
}

const OptimizedPositionCard: React.FC<OptimizedPositionCardProps> = memo(({
  position,
  isExpanded,
  isLoading,
  workLinks,
  onToggle,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveMaterial,
  onUpdateLink,
  onDeleteLink
}) => {
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [moveModal, setMoveModal] = useState<{
    visible: boolean;
    item: BOQItem | null;
  }>({ visible: false, item: null });
  const [addingItem, setAddingItem] = useState(false);

  // Group items by type
  const { works, materials, linkedMaterials, additionalItems } = useMemo(() => {
    const items = position.boq_items || [];
    const works: BOQItem[] = [];
    const materials: BOQItem[] = [];
    const linkedMaterials: BOQItem[] = [];
    const additionalItems: BOQItem[] = [];

    items.forEach(item => {
      if (item.is_additional) {
        additionalItems.push(item);
      } else if ((item as any).is_linked_material) {
        linkedMaterials.push(item);
      } else if (item.item_type === 'work') {
        works.push(item);
      } else if (item.item_type === 'material' || item.item_type === 'unlinked_material') {
        materials.push(item);
      }
    });

    return { works, materials, linkedMaterials, additionalItems };
  }, [position.boq_items]);

  // Calculate totals
  const totalCost = position.total_position_cost || 0;
  const itemCount = (position.boq_items || []).length;

  // Handle item edit
  const handleEditItem = useCallback((item: BOQItem) => {
    setEditingItem(item);
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(async (updates: Partial<BOQItem>) => {
    if (!editingItem) return;

    try {
      await onUpdateItem(editingItem.id, updates);
      setEditingItem(null);
      message.success('Позиция обновлена');
    } catch (error) {
      console.error('❌ Error updating item:', error);
      message.error('Ошибка обновления позиции');
    }
  }, [editingItem, onUpdateItem]);

  // Handle move material
  const handleMoveMaterial = useCallback(async (targetWorkId: string) => {
    if (!moveModal.item) return;

    try {
      await onMoveMaterial(moveModal.item.id, targetWorkId);
      setMoveModal({ visible: false, item: null });
      message.success('Материал перемещен');
    } catch (error) {
      console.error('❌ Error moving material:', error);
      message.error('Ошибка перемещения материала');
    }
  }, [moveModal.item, onMoveMaterial]);

  // Handle quick add item
  const handleQuickAdd = useCallback(async () => {
    setAddingItem(true);
    try {
      // Simple quick add - just create a placeholder item
      await onAddItem(position.id, {
        item_type: 'work',
        description: 'Новая работа',
        quantity: 1,
        unit: 'шт',
        unit_rate: 0
      });
      message.success('Позиция добавлена');
    } catch (error) {
      console.error('❌ Error adding item:', error);
      message.error('Ошибка добавления позиции');
    } finally {
      setAddingItem(false);
    }
  }, [position.id, onAddItem]);

  return (
    <>
      <Card
        className={`mb-4 transition-all duration-300 ${
          isExpanded ? 'shadow-lg border-blue-400' : 'shadow hover:shadow-md'
        }`}
        bodyStyle={{ padding: 0 }}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 cursor-pointer transition-colors ${
            isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="text"
                icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                size="small"
              />
              <div>
                <span className="font-medium text-gray-800">
                  {position.position_number}. {position.name}
                </span>
                {position.is_additional && (
                  <Badge
                    count="ДОП"
                    className="ml-2"
                    style={{ backgroundColor: '#fa8c16' }}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge count={itemCount} showZero className="mr-2">
                <span className="text-sm text-gray-500">позиций</span>
              </Badge>
              <span className="font-semibold text-lg">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <Collapse activeKey={isExpanded ? ['content'] : []} ghost>
          <Collapse.Panel key="content" showArrow={false} header={null}>
            <div className="px-4 py-3 border-t">
              {isLoading ? (
                <div className="text-center py-8">
                  <Spin tip="Загрузка позиций..." />
                </div>
              ) : itemCount === 0 ? (
                <Empty
                  description="Нет позиций"
                  className="py-8"
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleQuickAdd}
                    loading={addingItem}
                  >
                    Добавить позицию
                  </Button>
                </Empty>
              ) : (
                <>
                  {/* Action buttons */}
                  <div className="flex justify-between mb-3">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleQuickAdd}
                      loading={addingItem}
                      size="small"
                    >
                      Добавить позицию
                    </Button>
                  </div>

                  {/* Items table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 border-r">№</th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 border-r">Наименование</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r">Ед.</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-600 border-r">Кол-во</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-600 border-r">Цена</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-600 border-r">Доставка</th>
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-600 border-r">Сумма</th>
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-600">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Works */}
                        {works.map(item => (
                          <OptimizedBOQItemRow
                            key={item.id}
                            item={item}
                            isWork={true}
                            isMaterial={false}
                            isLinkedMaterial={false}
                            onEdit={handleEditItem}
                            onDelete={(id) => onDeleteItem(id, position.id)}
                            enableInlineEdit={true}
                            onQuickUpdate={onUpdateItem}
                          />
                        ))}

                        {/* Linked Materials */}
                        {linkedMaterials.map(item => (
                          <OptimizedBOQItemRow
                            key={item.id}
                            item={item}
                            isWork={false}
                            isMaterial={true}
                            isLinkedMaterial={true}
                            onEdit={handleEditItem}
                            onDelete={(id) => onDeleteItem(id, position.id)}
                            onMove={(item) => setMoveModal({ visible: true, item })}
                            onUpdateLink={onUpdateLink}
                            onDeleteLink={onDeleteLink}
                            enableInlineEdit={true}
                            onQuickUpdate={onUpdateItem}
                          />
                        ))}

                        {/* Unlinked Materials */}
                        {materials.map(item => (
                          <OptimizedBOQItemRow
                            key={item.id}
                            item={item}
                            isWork={false}
                            isMaterial={true}
                            isLinkedMaterial={false}
                            onEdit={handleEditItem}
                            onDelete={(id) => onDeleteItem(id, position.id)}
                            onMove={(item) => setMoveModal({ visible: true, item })}
                            enableInlineEdit={true}
                            onQuickUpdate={onUpdateItem}
                          />
                        ))}

                        {/* Additional items */}
                        {additionalItems.map(item => (
                          <OptimizedBOQItemRow
                            key={item.id}
                            item={item}
                            isWork={item.item_type === 'work'}
                            isMaterial={item.item_type === 'material' || item.item_type === 'unlinked_material'}
                            isLinkedMaterial={false}
                            isAdditional={true}
                            onEdit={handleEditItem}
                            onDelete={(id) => onDeleteItem(id, position.id)}
                            enableInlineEdit={false}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="mt-3 pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Итого: {itemCount} позиций
                    </span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </Collapse.Panel>
        </Collapse>
      </Card>

      {/* Edit modal */}
      <BOQItemEditForm
        visible={!!editingItem}
        item={editingItem}
        onSave={handleSaveEdit}
        onCancel={() => setEditingItem(null)}
      />

      {/* Move material modal */}
      {moveModal.item && (
        <MaterialMoveModal
          visible={moveModal.visible}
          materialId={moveModal.item.id}
          materialName={moveModal.item.description || ''}
          currentWorkId={moveModal.item.work_id || null}
          currentWorkName={''}
          isLinkedMaterial={(moveModal.item as any).is_linked_material || false}
          linkId={(moveModal.item as any).link_id}
          availableWorks={works}
          onMove={handleMoveMaterial}
          onCancel={() => setMoveModal({ visible: false, item: null })}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.position.id === nextProps.position.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.position.total_position_cost === nextProps.position.total_position_cost &&
    prevProps.position.boq_items?.length === nextProps.position.boq_items?.length
  );
});

OptimizedPositionCard.displayName = 'OptimizedPositionCard';

export default OptimizedPositionCard;