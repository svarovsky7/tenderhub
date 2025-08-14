import React, { useState, useEffect } from 'react';
import { message, Spin, Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import OptimizedClientPositionCard from './OptimizedClientPositionCard';
import { clientPositionsApi } from '../../lib/supabase/api';
import type { ClientPositionWithItems } from '../../lib/supabase/types';

interface OptimizedBOQManagerProps {
  tenderId: string;
}

const OptimizedBOQManager: React.FC<OptimizedBOQManagerProps> = ({ tenderId }) => {
  const [positions, setPositions] = useState<ClientPositionWithItems[]>([]);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadPositions = async () => {
    console.log('🚀 [loadPositions] called for tender:', tenderId);
    setLoading(true);
    try {
      const result = await clientPositionsApi.getByTenderId(tenderId);
      if (result.error) {
        console.error('❌ [loadPositions] failed:', result.error);
        throw new Error(result.error);
      }
      console.log('✅ [loadPositions] completed:', result.data?.length, 'positions');
      setPositions(result.data || []);
    } catch (error) {
      console.error('💥 [loadPositions] error:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenderId) {
      loadPositions();
    }
  }, [tenderId]);

  const togglePosition = (positionId: string) => {
    console.log('🔄 [togglePosition] called for:', positionId);
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
    } else {
      newExpanded.add(positionId);
    }
    setExpandedPositions(newExpanded);
  };

  const handleAddItems = () => {
    console.log('🚀 [handleAddItems] called');
    message.info('Открытие каталога для добавления элементов');
  };

  const handleCreatePosition = async () => {
    console.log('🚀 [handleCreatePosition] called');
    message.info('Создание новой позиции заказчика');
    // TODO: Implement position creation modal
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Загрузка позиций..." />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <Empty 
          description="Нет позиций заказчика"
          className="py-8"
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreatePosition}
          >
            Создать первую позицию
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-500 text-sm">Всего позиций:</span>
              <span className="ml-2 text-lg font-semibold">{positions.length}</span>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Общая стоимость:</span>
              <span className="ml-2 text-lg font-semibold text-blue-600">
                {positions.reduce((sum, p) => sum + (p.total_position_cost || 0), 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
              </span>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleCreatePosition}
          >
            Добавить позицию
          </Button>
        </div>
      </div>

      {/* Position cards */}
      {positions.map(position => (
        <OptimizedClientPositionCard
          key={position.id}
          position={position}
          isExpanded={expandedPositions.has(position.id)}
          onToggle={() => togglePosition(position.id)}
          onAddItems={handleAddItems}
          onUpdate={loadPositions}
          tenderId={tenderId}
        />
      ))}
    </div>
  );
};

export default OptimizedBOQManager;