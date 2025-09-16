import React, { useState, useMemo, useCallback } from 'react';
// Контроль логирования
const ENABLE_DETAILED_LOGGING = false;

const debugLog = (message: string, ...args: any[]) => {
  if (ENABLE_DETAILED_LOGGING) {
    console.log(message, ...args);
  }
};
import { Card, Row, Col, Button, Space, Typography, Spin, Alert, Input } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useClientPositionsOptimized } from '../../hooks/useClientPositions';
import VirtualizedClientPositionsList from '../common/VirtualizedClientPositionsList';
import { ClientPositionSkeleton } from '../common/ClientPositionSkeleton';
import ClientPositionCardStreamlined from './ClientPositionCardStreamlined';
import type { ClientPositionFilters, ClientPositionSummary } from '../../lib/supabase/types';
import { formatCurrency } from '../../utils/formatters';

const { Title, Text } = Typography;
const { Search } = Input;

interface OptimizedTenderBOQManagerProps {
  tenderId: string;
  useVirtualScrolling?: boolean;
  pageSize?: number;
}

const OptimizedTenderBOQManager: React.FC<OptimizedTenderBOQManagerProps> = ({
  tenderId,
  useVirtualScrolling = true,
  pageSize = 50,
}) => {

  // Local state
  const [selectedPosition, setSelectedPosition] = useState<ClientPositionSummary | null>(null);
  const [filters, setFilters] = useState<ClientPositionFilters>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data with React Query
  const {
    data: positionsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useClientPositionsOptimized(
    tenderId,
    filters,
    { page: currentPage, limit: pageSize },
    {
      enabled: !!tenderId,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Memoized calculations
  const stats = useMemo(() => {
    if (!positionsData?.data) return { totalPositions: 0, totalCost: 0, totalBOQItems: 0 };

    const positions = positionsData.data;
    const totalPositions = positionsData.pagination?.total || positions.length;
    const totalCost = positions.reduce((sum, pos) =>
      sum + (pos.total_materials_cost || 0) + (pos.total_works_cost || 0), 0
    );
    const totalBOQItems = positions.reduce((sum, pos) =>
      sum + (pos.boq_items_count || 0), 0
    );

    return { totalPositions, totalCost, totalBOQItems };
  }, [positionsData]);

  // Event handlers
  const handlePositionClick = useCallback((position: ClientPositionSummary) => {
    debugLog('📍 Position selected:', position.id, position.work_name);
    setSelectedPosition(position);
  }, []);

  const handlePositionEdit = useCallback((position: ClientPositionSummary) => {
    debugLog('✏️ Edit position:', position.id);
    // Implementation for editing
    setSelectedPosition(position);
  }, []);

  const handlePositionDelete = useCallback((position: ClientPositionSummary) => {
    debugLog('🗑️ Delete position:', position.id);
    // Implementation for deletion
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <div className="mb-4">
            <Title level={2} className="mb-0">Позиции заказчика</Title>
            <Text type="secondary">Тендер: {tenderId}</Text>
          </div>
        </Card>
        <ClientPositionSkeleton count={8} showSearch />
      </div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <Alert
            message="Ошибка загрузки позиций"
            description={error?.message || 'Не удалось загрузить позиции заказчика'}
            type="error"
            action={
              <Button size="small" danger onClick={handleRefresh}>
                Повторить
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="tender-boq-manager-optimized">
      {/* Header with stats */}
      <Card className="mb-4">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} className="mb-2">
              Позиции заказчика
              {isFetching && <Spin size="small" className="ml-2" />}
            </Title>
            <Text type="secondary">Тендер: {tenderId}</Text>
          </Col>
          <Col>
            <Space direction="vertical" align="end">
              <div>
                <Text strong>Всего позиций: </Text>
                <Text>{stats.totalPositions}</Text>
              </div>
              <div>
                <Text strong>Элементов BOQ: </Text>
                <Text>{stats.totalBOQItems}</Text>
              </div>
              <div>
                <Text strong className="text-lg">Общая стоимость: </Text>
                <Text strong className="text-lg text-blue-600">
                  {formatCurrency(stats.totalCost)}
                </Text>
              </div>
            </Space>
          </Col>
        </Row>

        {/* Action buttons */}
        <div className="mt-4">
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
            >
              Добавить позицию
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isFetching}
            >
              Обновить
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={16}>
        {/* Left panel - Positions list */}
        <Col span={selectedPosition ? 12 : 24}>
          <div className="positions-panel">
            {useVirtualScrolling ? (
              <VirtualizedClientPositionsList
                tenderId={tenderId}
                filters={filters}
                onItemClick={handlePositionClick}
                onItemEdit={handlePositionEdit}
                onItemDelete={handlePositionDelete}
                showSearch={true}
                showActions={true}
                height="75vh"
                itemHeight={200}
              />
            ) : (
              <Card>
                <div className="mb-4">
                  <Search
                    placeholder="Поиск по наименованию, номеру позиции или примечанию"
                    onSearch={handleSearchChange}
                    onChange={(e) => {
                      if (!e.target.value) {
                        handleSearchChange('');
                      }
                    }}
                    allowClear
                    style={{ width: 400 }}
                  />
                </div>

                <div className="positions-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {positionsData?.data.map((position) => (
                    <div
                      key={position.id}
                      className={`position-item cursor-pointer p-3 border-b hover:bg-gray-50 ${
                        selectedPosition?.id === position.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handlePositionClick(position)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Text strong>
                              {position.item_no ? `${position.item_no}.` : ''} {position.work_name}
                            </Text>
                            {position.is_additional && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                                ДОП
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                            <div>Позиция: {position.position_number}</div>
                            <div>Единица: {position.unit}</div>
                            <div>Объем: {position.volume || position.manual_volume || '—'}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            <div>М: {formatCurrency(position.total_materials_cost || 0)}</div>
                            <div>Р: {formatCurrency(position.total_works_cost || 0)}</div>
                          </div>
                          <div className="font-bold text-blue-600">
                            {formatCurrency((position.total_materials_cost || 0) + (position.total_works_cost || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </Col>

        {/* Right panel - Position details */}
        {selectedPosition && (
          <Col span={12}>
            <div className="position-details-panel">
              <ClientPositionCardStreamlined
                position={selectedPosition}
                tenderId={tenderId}
                onClose={() => setSelectedPosition(null)}
                onUpdate={(updatedPosition) => {
                  debugLog('📝 Position updated:', updatedPosition);
                  // The React Query cache will be automatically updated by the hook
                }}
              />
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default OptimizedTenderBOQManager;