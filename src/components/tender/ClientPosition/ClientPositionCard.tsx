import React, { useEffect, useMemo } from 'react';
import { Card, Form, Empty, Button, Space, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

// Hooks
import { usePositionState } from './hooks/usePositionState';
import { useCommercialCalculations } from './hooks/useCommercialCalculations';

// Components
import PositionHeader from './components/PositionHeader';
import PositionStatistics from './components/PositionStatistics';
import BOQTable from './components/BOQTable';
import WorkEditForm from './forms/WorkEditForm';
import MaterialEditForm from './forms/MaterialEditForm';

// API and types
import { boqApi } from '../../../lib/supabase/api';
import { getActiveTenderMarkup } from '../../../lib/supabase/api/tender-markup';
import { debugLog } from '../../../utils/debug-logger';
import { useDebounce } from '../../../utils/debounce';
import type { ClientPositionWithDetails, BOQItemWithLibrary } from '../../../lib/supabase/types';

interface ClientPositionCardProps {
  position: ClientPositionWithDetails;
  onUpdate: () => void;
  level?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  loading?: boolean;
  works?: BOQItemWithLibrary[];
}

/**
 * Refactored ClientPositionCard component
 * Manages a single client position with its BOQ items
 */
const ClientPositionCard: React.FC<ClientPositionCardProps> = ({
  position,
  onUpdate,
  level = 0,
  isExpanded = false,
  onToggle = () => {},
  loading: parentLoading = false,
  works = []
}) => {
  debugLog.log('🚀 ClientPositionCard render:', {
    positionId: position.id,
    itemsCount: position.boq_items?.length || 0,
    isExpanded
  });

  // Forms
  const [quickAddForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [workEditForm] = Form.useForm();

  // State management
  const {
    loading,
    setLoading,
    editingMaterialId,
    setEditingMaterialId,
    editingWorkId,
    setEditingWorkId,
    quickAddMode,
    setQuickAddMode,
    localBOQItems,
    setLocalBOQItems,
    tenderMarkup,
    setTenderMarkup,
    totalItems,
    materialsCount,
    worksCount,
    totalCost,
    refreshData
  } = usePositionState(position);

  // Load tender markup
  const { data: markupData } = useQuery({
    queryKey: ['tenderMarkup', position.tender_id],
    queryFn: async () => {
      const result = await getActiveTenderMarkup(position.tender_id);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!position.tender_id
  });

  useEffect(() => {
    if (markupData) {
      setTenderMarkup(markupData);
    }
  }, [markupData, setTenderMarkup]);

  // Commercial calculations
  const { commercialCosts, calculateCommercialCost, saveCommercialFields } = useCommercialCalculations({
    tenderMarkup,
    positionBoqItems: position.boq_items
  });

  // Update local BOQ items when position changes
  useEffect(() => {
    setLocalBOQItems(position.boq_items || []);
  }, [position.boq_items, setLocalBOQItems]);

  // Sorted BOQ items
  const sortedBOQItems = useMemo(() => {
    if (!localBOQItems || localBOQItems.length === 0) {
      return [];
    }

    return [...localBOQItems].sort((a, b) => {
      // Sort by item_number or sort_order
      const aNum = a.item_number || a.sort_order || 0;
      const bNum = b.item_number || b.sort_order || 0;
      return aNum - bNum;
    });
  }, [localBOQItems]);

  // Handle work edit
  const handleEditWork = (item: BOQItemWithLibrary) => {
    debugLog.log('✏️ Editing work:', item);
    setEditingWorkId(item.id);
    workEditForm.setFieldsValue({
      item_type: item.item_type,
      description: item.description,
      unit: item.unit || 'шт',
      quantity: item.quantity || 0,
      unit_rate: item.unit_rate || 0,
      currency_type: item.currency_type || 'RUB',
      currency_rate: item.currency_rate || 1,
      quote_link: item.quote_link,
      note: item.note
    });
  };

  // Handle material edit
  const handleEditMaterial = (item: BOQItemWithLibrary) => {
    debugLog.log('✏️ Editing material:', item);
    setEditingMaterialId(item.id);

    // Set form values
    editForm.setFieldsValue({
      item_type: item.item_type,
      description: item.description,
      material_type: item.material_type || 'main',
      work_id: item.work_link?.work_boq_item_id || item.work_link?.sub_work_boq_item_id,
      unit: item.unit || 'шт',
      base_quantity: item.base_quantity,
      consumption_coefficient: item.consumption_coefficient || 1,
      conversion_coefficient: item.conversion_coefficient || 1,
      quantity: item.quantity || 0,
      unit_rate: item.unit_rate || 0,
      delivery_price_type: item.delivery_price_type || 'included',
      delivery_amount: item.delivery_amount || 0
    });
  };

  // Save work edit (debounced)
  const handleSaveWorkEditImmediate = async (values: any) => {
    if (!editingWorkId) return;

    debugLog.log('💾 Saving work edit:', values);
    setLoading(true);

    try {
      const result = await boqApi.update(editingWorkId, values);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Работа обновлена');
      setEditingWorkId(null);
      workEditForm.resetFields();
      refreshData();
      onUpdate();
    } catch (error) {
      debugLog.error('❌ Work update error:', error);
      message.error('Ошибка обновления работы');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkEdit = useDebounce(handleSaveWorkEditImmediate, 300);

  // Save material edit (debounced)
  const handleSaveMaterialEditImmediate = async (values: any) => {
    if (!editingMaterialId) return;

    debugLog.log('💾 Saving material edit:', values);
    setLoading(true);

    try {
      const result = await boqApi.update(editingMaterialId, values);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Материал обновлен');
      setEditingMaterialId(null);
      editForm.resetFields();
      refreshData();
      onUpdate();
    } catch (error) {
      debugLog.error('❌ Material update error:', error);
      message.error('Ошибка обновления материала');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaterialEdit = useDebounce(handleSaveMaterialEditImmediate, 300);

  // Handle item delete
  const handleDeleteItem = async (itemId: string) => {
    setLoading(true);
    try {
      const result = await boqApi.delete(itemId);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Элемент удален');
      refreshData();
      onUpdate();
    } catch (error) {
      debugLog.error('❌ Delete error:', error);
      message.error('Ошибка удаления элемента');
    } finally {
      setLoading(false);
    }
  };

  // Handle item duplicate
  const handleDuplicateItem = async (item: BOQItemWithLibrary) => {
    setLoading(true);
    try {
      const newItem = {
        ...item,
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        description: `${item.description} (копия)`
      };

      const result = await boqApi.create(newItem);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Элемент дублирован');
      refreshData();
      onUpdate();
    } catch (error) {
      debugLog.error('❌ Duplicate error:', error);
      message.error('Ошибка дублирования элемента');
    } finally {
      setLoading(false);
    }
  };

  // Handle link material to work
  const handleLinkMaterial = (workId: string) => {
    // This would typically open a modal to link materials
    message.info('Функция связывания материалов будет реализована');
  };

  // Position type checks
  const isFolder = position.is_folder;
  const isAdditional = position.is_additional;
  const canAddItems = !isFolder || isAdditional;

  return (
    <Card
      className="mb-4 shadow-sm hover:shadow-md transition-shadow"
      loading={parentLoading || loading}
    >
      {/* Header */}
      <PositionHeader
        position={position}
        isExpanded={isExpanded}
        onToggle={onToggle}
        level={level}
        totalItems={totalItems}
        totalCost={totalCost}
      />

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4">
          {/* Statistics */}
          {totalItems > 0 && (
            <PositionStatistics
              totalItems={totalItems}
              worksCount={worksCount}
              materialsCount={materialsCount}
              totalCost={totalCost}
              commercialCosts={commercialCosts}
              manualVolume={position.manual_volume}
              manualNote={position.manual_note}
              unit={position.unit}
            />
          )}

          {/* BOQ Items Table */}
          {sortedBOQItems.length > 0 ? (
            <div className="mt-4">
              <BOQTable
                items={sortedBOQItems}
                editingItemId={editingWorkId || editingMaterialId}
                editForm={
                  editingWorkId ? (
                    <WorkEditForm
                      item={sortedBOQItems.find(item => item.id === editingWorkId)!}
                      form={workEditForm}
                      tenderMarkup={tenderMarkup}
                      onSave={handleSaveWorkEdit}
                      onCancel={() => {
                        setEditingWorkId(null);
                        workEditForm.resetFields();
                      }}
                      loading={loading}
                    />
                  ) : editingMaterialId ? (
                    <MaterialEditForm
                      item={sortedBOQItems.find(item => item.id === editingMaterialId)!}
                      form={editForm}
                      works={works}
                      onSave={handleSaveMaterialEdit}
                      onCancel={() => {
                        setEditingMaterialId(null);
                        editForm.resetFields();
                      }}
                      loading={loading}
                    />
                  ) : null
                }
                onEdit={(item) => {
                  if (item.item_type === 'work' || item.item_type === 'sub_work') {
                    handleEditWork(item);
                  } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
                    handleEditMaterial(item);
                  }
                }}
                onDelete={handleDeleteItem}
                onDuplicate={handleDuplicateItem}
                onLinkMaterial={handleLinkMaterial}
                loading={loading}
                canEdit={canAddItems}
              />
            </div>
          ) : (
            <Empty
              description={canAddItems ? "Нет добавленных элементов" : "Структурный элемент не содержит элементов"}
              className="py-8"
            >
              {canAddItems && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickAddMode(true)}
                >
                  Добавить первый элемент
                </Button>
              )}
            </Empty>
          )}

          {/* Quick Add Mode */}
          {quickAddMode && canAddItems && (
            <Card className="mt-4 bg-blue-50">
              <Space>
                <span>Режим быстрого добавления активен</span>
                <Button size="small" onClick={() => setQuickAddMode(false)}>
                  Закрыть
                </Button>
              </Space>
            </Card>
          )}
        </div>
      )}
    </Card>
  );
};

export default React.memo(ClientPositionCard, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.position.id === nextProps.position.id &&
    prevProps.position.boq_items?.length === nextProps.position.boq_items?.length &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.loading === nextProps.loading &&
    JSON.stringify(prevProps.position.updated_at) === JSON.stringify(nextProps.position.updated_at)
  );
});