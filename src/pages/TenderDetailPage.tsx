import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Breadcrumb,
  Alert,
  Spin,
  Empty,
  FloatButton,
  Tooltip,
  message
} from 'antd';
import {
  PlusOutlined,
  FolderOpenOutlined,
  CalculatorOutlined,
  DragOutlined,
  ExpandOutlined,
  CompressOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import ClientPositionCard from '../components/tender/ClientPositionCard';
import AddPositionModal from '../components/tender/AddPositionModal';
import LibrarySelector from '../components/tender/LibrarySelector';
import { hierarchyApi, clientPositionsApi } from '../lib/supabase/api';
import type { 
  TenderWithFullHierarchy,
  TenderSummary,
  BOQItemInsert
} from '../lib/supabase/types';

const { Title, Text, Paragraph } = Typography;

interface TenderDetailPageProps {
  // Support for both URL param and direct tender ID
  tenderId?: string;
}

const TenderDetailPage: React.FC<TenderDetailPageProps> = ({ tenderId: propTenderId }) => {
  const { tenderId: urlTenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const tenderId = propTenderId || urlTenderId!;

  // State Management
  const [tenderData, setTenderData] = useState<TenderWithFullHierarchy | null>(null);
  const [summary, setSummary] = useState<TenderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [addPositionVisible, setAddPositionVisible] = useState(false);
  const [libraryModalVisible, setLibraryModalVisible] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);

  // Data Loading
  const loadTenderData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [tenderResult, summaryResult] = await Promise.all([
        hierarchyApi.getTenderWithPositions(tenderId, { include_items: true }),
        hierarchyApi.getTenderSummary(tenderId)
      ]);

      if (tenderResult.error) {
        throw new Error(tenderResult.error);
      }

      if (summaryResult.error) {
        console.warn('Failed to load summary:', summaryResult.error);
      }

      setTenderData(tenderResult.data!);
      setSummary(summaryResult.data || null);
      
      // Auto-expand first few positions for better UX
      if (tenderResult.data?.client_positions) {
        const autoExpand = new Set(
          tenderResult.data.client_positions.slice(0, 3).map((pos: any) => pos.id)
        );
        setExpandedPositions(autoExpand as Set<string>);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tender data');
      console.error('Error loading tender data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    loadTenderData();
  }, [loadTenderData]);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag & Drop Handlers
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;
    if (!tenderData?.client_positions) return;

    const oldIndex = tenderData.client_positions.findIndex(pos => pos.id === active.id);
    const newIndex = tenderData.client_positions.findIndex(pos => pos.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update UI optimistically
    const newPositions = arrayMove(tenderData.client_positions, oldIndex, newIndex);
    setTenderData({
      ...tenderData,
      client_positions: newPositions
    });

    // Save changes
    setSaving(true);
    try {
      const reorderOperations = newPositions.map((pos, index) => ({
        positionId: pos.id,
        newNumber: index + 1
      }));

      const result = await clientPositionsApi.reorder(tenderId, reorderOperations);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Позиции успешно переупорядочены');
    } catch (err) {
      message.error('Ошибка переупорядочивания позиций');
      // Reload to restore correct state
      void loadTenderData();
    } finally {
      setSaving(false);
    }
  }, [tenderData, tenderId, loadTenderData]);

  // Position Management
  const handlePositionToggle = useCallback((positionId: string) => {
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(positionId)) {
        newSet.delete(positionId);
      } else {
        newSet.add(positionId);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedPositions(new Set());
    } else {
      const allIds = new Set(tenderData?.client_positions?.map(pos => pos.id) || []);
      setExpandedPositions(allIds);
    }
    setAllExpanded(!allExpanded);
  }, [allExpanded, tenderData?.client_positions]);

  // Library Integration
  const handleAddItemsFromLibrary = useCallback((positionId: string) => {
    setSelectedPositionId(positionId);
    setLibraryModalVisible(true);
  }, []);

  const handleLibraryItemsSelected = useCallback(async (items: BOQItemInsert[]) => {
    if (!selectedPositionId) return;

    setSaving(true);
    try {
      // const result = await hierarchyApi.bulkCreateInPosition(selectedPositionId, items);
      // if (result.error) {
      //   throw new Error(result.error);
      // }

      message.success(`Добавлено ${items.length} элементов`);
      loadTenderData(); // Refresh data
    } catch (err) {
      message.error('Ошибка добавления элементов');
      console.error('Error adding items:', err);
    } finally {
      setSaving(false);
      setLibraryModalVisible(false);
      setSelectedPositionId(null);
    }
  }, [selectedPositionId, loadTenderData]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="Загрузка структуры тендера..." />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Ошибка загрузки"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadTenderData}>
              Повторить
            </Button>
          }
        />
      </div>
    );
  }

  // Empty State
  if (!tenderData) {
    return (
      <div className="p-6">
        <Empty description="Тендер не найден" />
      </div>
    );
  }

  const positions = tenderData.client_positions || [];
  const totalPositions = positions.length;
  const totalItems = summary?.total_items_count || 0;
  const totalCost = summary?.total_tender_cost || 0;

  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-none">
          <Breadcrumb className="mb-4">
            <Breadcrumb.Item>
              <Button 
                type="link" 
                onClick={() => navigate('/tenders')}
                className="p-0"
              >
                Тендеры
              </Button>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{tenderData.title}</Breadcrumb.Item>
          </Breadcrumb>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Title level={2} className="mb-2">
                <FolderOpenOutlined className="mr-2" />
                {tenderData.title}
              </Title>
              
              <div className="flex items-center gap-4 mb-4">
                <Tag color={tenderData.status === 'active' ? 'green' : 'default'}>
                  {tenderData.status}
                </Tag>
                <Text type="secondary">
                  {tenderData.client_name}
                </Text>
                <Text type="secondary">
                  №{tenderData.tender_number}
                </Text>
              </div>

              {tenderData.description && (
                <Paragraph className="text-gray-600 max-w-3xl">
                  {tenderData.description}
                </Paragraph>
              )}
            </div>

            {/* Action Buttons */}
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadTenderData}>
                Обновить
              </Button>
              <Button icon={<ExportOutlined />}>
                Экспорт
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setAddPositionVisible(true)}
              >
                Добавить позицию
              </Button>
            </Space>
          </div>

          {/* Statistics */}
          <Row gutter={16} className="mt-6">
            <Col span={6}>
              <Statistic 
                title="Позиций заказчика" 
                value={totalPositions}
                prefix={<FolderOpenOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Всего элементов" 
                value={totalItems}
                prefix={<DragOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Общая стоимость" 
                value={totalCost}
                precision={2}
                suffix="₽"
                prefix={<CalculatorOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="Точность оценки" 
                value={75} // Temporarily hardcoded until field is added to DB
                precision={1}
                suffix="%"
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        {/* Toolbar */}
        <Card className="mb-6">
          <div className="flex justify-between items-center">
            <Space>
              <Button
                icon={allExpanded ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={handleExpandAll}
              >
                {allExpanded ? 'Свернуть все' : 'Развернуть все'}
              </Button>
              <Text type="secondary">
                {expandedPositions.size} из {totalPositions} позиций развернуто
              </Text>
            </Space>

            <Space>
              <Button 
                type="dashed" 
                icon={<PlusOutlined />}
                onClick={() => setAddPositionVisible(true)}
              >
                Новая позиция
              </Button>
            </Space>
          </div>
        </Card>

        {/* Positions List */}
        {positions.length === 0 ? (
          <Card>
            <Empty
              description="Позиции заказчика не созданы"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setAddPositionVisible(true)}
              >
                Создать первую позицию
              </Button>
            </Empty>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={positions.map(pos => pos.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {positions.map((position) => (
                  <ClientPositionCard
                    key={position.id}
                    position={position}
                    isExpanded={expandedPositions.has(position.id)}
                    onToggle={() => handlePositionToggle(position.id)}
                    onAddItems={() => handleAddItemsFromLibrary(position.id)}
                    onUpdate={loadTenderData}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Floating Action Button */}
      <FloatButton.Group
        trigger="click"
        type="primary"
        style={{ right: 24, bottom: 24 }}
        icon={<PlusOutlined />}
      >
        <Tooltip title="Добавить позицию" placement="left">
          <FloatButton 
            icon={<FolderOpenOutlined />}
            onClick={() => setAddPositionVisible(true)}
          />
        </Tooltip>
        <Tooltip title="Добавить элементы" placement="left">
          <FloatButton 
            icon={<DragOutlined />}
            onClick={() => {
              if (positions.length > 0) {
                setSelectedPositionId(positions[0].id);
                setLibraryModalVisible(true);
              } else {
                message.info('Сначала создайте позицию заказчика');
              }
            }}
          />
        </Tooltip>
      </FloatButton.Group>

      {/* Modals */}
      <AddPositionModal
        visible={addPositionVisible}
        tenderId={tenderId}
        onClose={() => setAddPositionVisible(false)}
        onSuccess={() => {
          setAddPositionVisible(false);
          loadTenderData();
        }}
      />

      <LibrarySelector
        visible={libraryModalVisible}
        onClose={() => {
          setLibraryModalVisible(false);
          setSelectedPositionId(null);
        }}
        onSelect={handleLibraryItemsSelected}
        multiple={true}
      />

      {/* Loading overlay for background operations */}
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <Spin size="large" tip="Сохранение..." />
        </div>
      )}
    </div>
  );
};

export default TenderDetailPage;