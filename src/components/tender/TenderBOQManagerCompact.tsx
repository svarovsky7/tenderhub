import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin, message, Empty, Button, Input, Card, Space } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { clientPositionsApi, tendersApi } from '../../lib/supabase/api';
import { useBOQItems } from '../../hooks/useBOQItems';
import { useWorkMaterialLinks } from '../../hooks/useWorkMaterialLinks';
import ClientPositionCardStreamlined from './ClientPositionCardStreamlined';
import AddPositionModal from './AddPositionModal';
import { calculateTotalCost, filterNonLinkedItems } from '../../utils/boqCalculations';
import { formatCurrency } from '../../utils/formatters';
import type { ClientPosition, BOQItem } from '../../lib/supabase/types';

interface TenderBOQManagerCompactProps {
  tenderId: string;
  onStatsUpdate?: (stats: { works: number; materials: number; total: number; positions: number }) => void;
}

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  total_position_cost?: number;
}

/**
 * Compact version of TenderBOQManager with modular components
 * Keeps file size under 600 lines while maintaining all functionality
 */
const TenderBOQManagerCompact: React.FC<TenderBOQManagerCompactProps> = ({ tenderId, onStatsUpdate }) => {
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tender, setTender] = useState<{ usd_rate?: number | null; eur_rate?: number | null; cny_rate?: number | null; } | null>(null);

  // Load tender data for currency rates
  React.useEffect(() => {
    const loadTenderData = async () => {
      if (!tenderId) return;

      try {
        const { data, error } = await tendersApi.getById(tenderId);

        if (error) {
          console.error('❌ Error loading tender:', error);
          return;
        }

        if (data) {
          const tenderData = {
            usd_rate: data.usd_rate || null,
            eur_rate: data.eur_rate || null,
            cny_rate: data.cny_rate || null
          };
          setTender(tenderData);
        }
      } catch (error) {
        console.error('💥 Critical error loading tender:', error);
      }
    };

    loadTenderData();
  }, [tenderId]);

  // Use custom hooks
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

  // Load positions
  const {
    data: positionsData,
    isLoading: positionsLoading,
    error: positionsError,
    refetch: refetchPositions
  } = useQuery({
    queryKey: ['positions', tenderId],
    queryFn: async () => {
      console.log('🚀 Loading positions for tender:', tenderId);
      const { data: positionsData, error } = await clientPositionsApi.getByTenderId(tenderId);
      const positions = positionsData?.items || [];

      if (error) throw error;

      const positionsWithItems: PositionWithItems[] = [];

      for (const position of (positions || [])) {
        const items = loadedPositionItems[position.id] || [];
        const total = calculateTotalCost(filterNonLinkedItems(items));

        positionsWithItems.push({
          ...position,
          boq_items: items,
          total_position_cost: total
        });
      }

      return { positions: positionsWithItems };
    },
    enabled: !!tenderId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Handle position toggle
  const handlePositionToggle = useCallback(async (positionId: string) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
    } else {
      newExpanded.add(positionId);

      if (!loadedPositionItems[positionId]) {
        await loadPositionItems(positionId);
        const items = loadedPositionItems[positionId] || [];
        await loadPositionWorkLinks(positionId, items);
      }
    }
    setExpandedPositions(newExpanded);
  }, [expandedPositions, loadedPositionItems, loadPositionItems, loadPositionWorkLinks]);


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


  // Filter positions by search
  const filteredPositions = React.useMemo(() => {
    const positions = positionsData?.positions || [];
    if (!searchTerm) return positions;

    return positions.filter(pos =>
      pos.position_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.position_number?.toString().includes(searchTerm)
    );
  }, [positionsData, searchTerm]);

  // Calculate totals and statistics
  const totalCost = React.useMemo(() => {
    return filteredPositions.reduce((sum, pos) => sum + (pos.total_position_cost || 0), 0);
  }, [filteredPositions]);

  // Update parent component stats
  React.useEffect(() => {
    if (onStatsUpdate && filteredPositions.length > 0) {
      const totalWorks = filteredPositions.reduce((sum, pos) => {
        const works = (pos.boq_items || []).filter(item => item.item_type === 'work');
        return sum + works.length;
      }, 0);

      const totalMaterials = filteredPositions.reduce((sum, pos) => {
        const materials = (pos.boq_items || []).filter(item => item.item_type === 'material');
        return sum + materials.length;
      }, 0);

      onStatsUpdate({
        works: totalWorks,
        materials: totalMaterials,
        total: totalCost,
        positions: filteredPositions.length
      });
    }
  }, [filteredPositions, totalCost, onStatsUpdate]);

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

  return (
    <div className="p-4">
      {/* Header */}
      <Card className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Билль объемов заказа (БОЗ)</h2>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddPosition(true)}
            >
              Добавить позицию
            </Button>
          </Space>
        </div>

        {/* Search */}
        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск по позициям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          className="mb-4"
        />

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredPositions.length}
            </div>
            <div className="text-sm text-gray-500">Позиций клиента</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredPositions.reduce((sum, pos) =>
                sum + (pos.boq_items?.length || 0), 0
              )}
            </div>
            <div className="text-sm text-gray-500">Позиций БОЗ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalCost)}
            </div>
            <div className="text-sm text-gray-500">Общая стоимость</div>
          </div>
        </div>
      </Card>

      {/* Positions list */}
      {filteredPositions.length === 0 ? (
        <Empty
          description={searchTerm ? "Позиции не найдены" : "Нет позиций клиента"}
          className="py-12"
        >
          {!searchTerm && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddPosition(true)}
            >
              Добавить первую позицию
            </Button>
          )}
        </Empty>
      ) : (
        <div className="space-y-4">
          {filteredPositions.map(position => (
            <ClientPositionCardStreamlined
              key={position.id}
              position={{
                ...position,
                boq_items: loadedPositionItems[position.id] || position.boq_items || []
              }}
              isExpanded={expandedPositions.has(position.id)}
              onToggle={() => handlePositionToggle(position.id)}
              onUpdate={refetchPositions}
              tenderId={tenderId}
              tender={tender}
            />
          ))}
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

export default TenderBOQManagerCompact;