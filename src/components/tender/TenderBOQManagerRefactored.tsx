import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin, message, Empty, Button } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi } from '../../lib/supabase/api';
import { useBOQItems } from '../../hooks/useBOQItems';
import { useWorkMaterialLinks } from '../../hooks/useWorkMaterialLinks';
import OptimizedPositionCard from './OptimizedPositionCard';
import AddPositionModal from './AddPositionModal';
import type { ClientPosition, BOQItem } from '../../lib/supabase/types';

interface TenderBOQManagerRefactoredProps {
  tenderId: string;
}

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  total_position_cost?: number;
}

const TenderBOQManagerRefactored: React.FC<TenderBOQManagerRefactoredProps> = ({ tenderId }) => {
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [showAddPosition, setShowAddPosition] = useState(false);

  // Use custom hooks for BOQ management
  const {
    loadedPositionItems,
    loadingPositionItems,
    loadPositionItems,
    addBOQItem,
    updateBOQItem,
    deleteBOQItem,
    updatePositionTotals
  } = useBOQItems(tenderId);

  const {
    allWorkLinks,
    loadPositionWorkLinks,
    updateLink,
    deleteLink,
    createLink,
    moveMaterialToWork
  } = useWorkMaterialLinks();

  // Load positions with React Query
  const {
    data: positionsData,
    isLoading: positionsLoading,
    error: positionsError,
    refetch: refetchPositions
  } = useQuery({
    queryKey: ['positions', tenderId],
    queryFn: async () => {
      console.log('🚀 Loading positions for tender:', tenderId);

      // Load positions
      const { data: positionsData, error } = await clientPositionsApi.getByTenderId(tenderId);
      const positions = positionsData?.items || [];

      if (error) throw error;

      console.log('✅ Loaded positions:', positions?.length || 0);

      // Load BOQ items for each position
      const positionsWithItems: PositionWithItems[] = [];

      for (const position of (positions || [])) {
        // Get BOQ items from cache or load them
        const items = loadedPositionItems[position.id] || [];

        // Calculate total
        const total = items.reduce((sum, item) => {
          const priceInRub = item.unit_rate || 0;
          const deliveryAmount = item.delivery_amount || 0;
          return sum + (priceInRub + deliveryAmount) * item.quantity;
        }, 0);

        positionsWithItems.push({
          ...position,
          boq_items: items,
          total_position_cost: total
        });
      }

      return { positions: positionsWithItems };
    },
    enabled: !!tenderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  // Handle position toggle
  const handlePositionToggle = useCallback(async (positionId: string) => {
    if (selectedPositionId === positionId) {
      // Closing position
      setSelectedPositionId(null);
    } else {
      // Opening position
      setSelectedPositionId(positionId);

      // Load BOQ items if not loaded
      if (!loadedPositionItems[positionId]) {
        await loadPositionItems(positionId);

        // Load work links
        const items = loadedPositionItems[positionId] || [];
        await loadPositionWorkLinks(positionId, items);
      }
    }
  }, [selectedPositionId, loadedPositionItems, loadPositionItems, loadPositionWorkLinks]);

  // Handle add BOQ item
  const handleAddBOQItem = useCallback(async (positionId: string, itemData: any) => {
    const newItem = await addBOQItem(positionId, itemData);

    if (newItem) {
      // Update position totals
      const items = [...(loadedPositionItems[positionId] || []), newItem];
      await updatePositionTotals(positionId, items);

      // Refresh positions
      await refetchPositions();
    }
  }, [addBOQItem, loadedPositionItems, updatePositionTotals, refetchPositions]);

  // Handle update BOQ item
  const handleUpdateBOQItem = useCallback(async (itemId: string, updates: Partial<BOQItem>) => {
    const success = await updateBOQItem(itemId, updates);

    if (success) {
      // Find position and update totals
      const position = positionsData?.positions.find(p =>
        p.boq_items?.some(item => item.id === itemId)
      );

      if (position) {
        const items = loadedPositionItems[position.id] || [];
        await updatePositionTotals(position.id, items);
      }

      // Refresh positions
      await refetchPositions();
    }
  }, [updateBOQItem, positionsData, loadedPositionItems, updatePositionTotals, refetchPositions]);

  // Handle delete BOQ item
  const handleDeleteBOQItem = useCallback(async (itemId: string, positionId: string) => {
    const success = await deleteBOQItem(itemId, positionId);

    if (success) {
      // Update position totals
      const items = loadedPositionItems[positionId] || [];
      await updatePositionTotals(positionId, items);

      // Refresh positions
      await refetchPositions();
    }
  }, [deleteBOQItem, loadedPositionItems, updatePositionTotals, refetchPositions]);

  // Handle move material
  const handleMoveMaterial = useCallback(async (materialId: string, targetWorkId: string) => {
    // Find the material item
    const position = positionsData?.positions.find(p =>
      p.boq_items?.some(item => item.id === materialId)
    );

    if (!position) return;

    const materialItem = position.boq_items?.find(item => item.id === materialId);
    if (!materialItem) return;

    // Check if it's a linked material
    if ((materialItem as any).is_linked_material && (materialItem as any).link_id) {
      // Move linked material to another work
      await moveMaterialToWork((materialItem as any).link_id, materialItem.work_id || '', targetWorkId);
    } else {
      // Create new link for unlinked material
      await createLink(targetWorkId, materialItem.material_id || '', {
        consumption_coefficient: materialItem.consumption_coefficient || 1,
        conversion_coefficient: materialItem.conversion_coefficient || 1
      }, 1);

      // Delete the unlinked material
      await deleteBOQItem(materialId, position.id);
    }

    // Refresh data
    await refetchPositions();
  }, [positionsData, moveMaterialToWork, createLink, deleteBOQItem, refetchPositions]);

  // Handle update link
  const handleUpdateLink = useCallback(async (linkId: string, updates: any) => {
    // Find work quantity for calculations
    const workItem = positionsData?.positions
      .flatMap(p => p.boq_items || [])
      .find(item => item.item_type === 'work' && allWorkLinks[item.work_id || '']?.some(l => l.id === linkId));

    if (workItem) {
      await updateLink(linkId, updates, workItem.quantity);
      await refetchPositions();
    }
  }, [positionsData, allWorkLinks, updateLink, refetchPositions]);

  // Handle delete link
  const handleDeleteLink = useCallback(async (linkId: string) => {
    await deleteLink(linkId);
    await refetchPositions();
  }, [deleteLink, refetchPositions]);

  // Handle add position
  const handleAddPosition = useCallback(async (positionData: any) => {
    try {
      const { data: newPosition, error } = await clientPositionsApi.create({
        tender_id: tenderId,
        ...positionData
      });

      if (error) throw error;

      message.success('Позиция добавлена');
      setShowAddPosition(false);
      await refetchPositions();
    } catch (error) {
      console.error('❌ Error adding position:', error);
      message.error('Ошибка добавления позиции');
    }
  }, [tenderId, refetchPositions]);

  // Error state
  if (positionsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Empty description="Ошибка загрузки данных" />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetchPositions()}
          className="mt-4"
        >
          Повторить
        </Button>
      </div>
    );
  }

  // Loading state
  if (positionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large" tip="Загрузка позиций БОЗ..." />
      </div>
    );
  }

  const positions = positionsData?.positions || [];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Билль объемов заказа (БОЗ)</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowAddPosition(true)}
        >
          Добавить позицию клиента
        </Button>
      </div>

      {/* Positions list */}
      {positions.length === 0 ? (
        <Empty
          description="Нет позиций клиента"
          className="py-12"
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddPosition(true)}
          >
            Добавить первую позицию
          </Button>
        </Empty>
      ) : (
        <div className="space-y-4">
          {positions.map(position => (
            <OptimizedPositionCard
              key={position.id}
              position={{
                ...position,
                boq_items: loadedPositionItems[position.id] || position.boq_items || []
              }}
              isExpanded={selectedPositionId === position.id}
              isLoading={loadingPositionItems[position.id] || false}
              workLinks={allWorkLinks}
              onToggle={() => handlePositionToggle(position.id)}
              onAddItem={handleAddBOQItem}
              onUpdateItem={handleUpdateBOQItem}
              onDeleteItem={handleDeleteBOQItem}
              onMoveMaterial={handleMoveMaterial}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {positions.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gray-600">Всего позиций клиента: </span>
              <span className="font-semibold">{positions.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Общая стоимость: </span>
              <span className="text-xl font-bold text-green-600">
                {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  minimumFractionDigits: 2
                }).format(
                  positions.reduce((sum, pos) => sum + (pos.total_position_cost || 0), 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add position modal */}
      {showAddPosition && (
        <AddPositionModal
          visible={showAddPosition}
          onAdd={handleAddPosition}
          onCancel={() => setShowAddPosition(false)}
          tenderId={tenderId}
        />
      )}
    </div>
  );
};

export default TenderBOQManagerRefactored;