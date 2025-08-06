import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Collapse,
  Statistic,
  Row,
  Col,
  Popconfirm,
  message,
  Empty,
  Tooltip,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  ToolOutlined,
  AppstoreOutlined,
  DollarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { clientPositionsApi, boqItemsApi } from '../../lib/supabase/api';
import type { ClientPosition, BOQItem } from '../../lib/supabase/types';
import ClientPositionForm from './ClientPositionForm';
import InlineBoqItemForm from './InlineBoqItemForm';

const { Title, Text } = Typography;

interface TenderBOQManagerProps {
  tenderId: string;
}

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  items_count?: number;
}

const TenderBOQManager: React.FC<TenderBOQManagerProps> = ({ tenderId }) => {
  const [positions, setPositions] = useState<PositionWithItems[]>([]);
  const [positionFormVisible, setPositionFormVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<ClientPosition | null>(null);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlinePositionId, setInlinePositionId] = useState<string | null>(null);

  // Load positions and their BOQ items
  const loadPositions = useCallback(async () => {
    try {
      const result = await clientPositionsApi.getByTenderId(tenderId);
      if (result.error) {
        throw new Error(result.error);
      }

      const positionsWithItems: PositionWithItems[] = [];
      
      for (const position of result.data || []) {
        const boqResult = await boqItemsApi.getByPosition(position.id);
        positionsWithItems.push({
          ...position,
          boq_items: boqResult.data || [],
          items_count: (boqResult.data || []).length
        });
      }

      setPositions(positionsWithItems);
    } catch (error) {
      message.error(`Ошибка загрузки позиций: ${error}`);
      console.error('Load positions error:', error);
    }
  }, [tenderId]);

  useEffect(() => {
    if (tenderId) {
      loadPositions();
    }
  }, [tenderId, loadPositions]);

  // Position handlers
  const handleCreatePosition = () => {
    setEditingPosition(null);
    setPositionFormVisible(true);
  };

  const handleEditPosition = (position: ClientPosition) => {
    setEditingPosition(position);
    setPositionFormVisible(true);
  };

  const handleDeletePosition = async (positionId: string) => {
    try {
      const result = await clientPositionsApi.delete(positionId);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Позиция удалена');
      loadPositions();
    } catch (error) {
      message.error(`Ошибка удаления позиции: ${error}`);
    }
  };

  const handlePositionSuccess = () => {
    setPositionFormVisible(false);
    setEditingPosition(null);
    loadPositions();
  };

  // BOQ Item handlers
  const handleAddInlineItem = (positionId: string) => {
    console.log('🖱️ Add inline item clicked for position:', positionId);
    console.log('🎛️ showInlineForm state change:', {
      previous: showInlineForm,
      next: true,
    });
    setInlinePositionId(positionId);
    setShowInlineForm(true);
  };

  const handleInlineSuccess = () => {
    console.log('✅ Inline BOQ item saved');
    setShowInlineForm(false);
    setInlinePositionId(null);
    loadPositions();
  };

  const handleInlineCancel = () => {
    console.log('🚫 Inline BOQ item creation cancelled');
    setShowInlineForm(false);
    setInlinePositionId(null);
  };

  const handleDeleteBOQItem = async (itemId: string) => {
    try {
      const result = await boqItemsApi.delete(itemId);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Элемент BOQ удален');
      loadPositions();
    } catch (error) {
      message.error(`Ошибка удаления элемента: ${error}`);
    }
  };

  // BOQ Items table columns
  const boqColumns: ColumnsType<BOQItem> = [
    {
      title: '№',
      dataIndex: 'sub_number',
      key: 'sub_number',
      width: 60,
      render: (_value, record) => (
        <Text strong>{record.item_number}</Text>
      )
    },
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 80,
      render: (type) => (
        <Tag 
          color={type === 'material' ? 'blue' : 'green'}
          icon={type === 'material' ? <AppstoreOutlined /> : <ToolOutlined />}
        >
          {type === 'material' ? 'Материал' : 'Работа'}
        </Tag>
      )
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.category && (
            <div>
              <Text type="secondary" className="text-xs">
                {record.category}
                {record.subcategory && ` / ${record.subcategory}`}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center'
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (value) => Number(value).toLocaleString('ru-RU', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 4 
      })
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      align: 'right',
      render: (value) => `${Number(value).toLocaleString('ru-RU', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })} ₽`
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 130,
      align: 'right',
      render: (value) => (
        <Text strong style={{ color: '#52c41a' }}>
          {Number(value).toLocaleString('ru-RU', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
          })} ₽
        </Text>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Удалить элемент BOQ?"
          description="Это действие нельзя отменить."
          onConfirm={() => handleDeleteBOQItem(record.id)}
          okText="Удалить"
          cancelText="Отмена"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="Удалить">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
            />
          </Tooltip>
        </Popconfirm>
      )
    }
  ];

  // Calculate totals
  const totals = positions.reduce((acc, position) => ({
    positions: acc.positions + 1,
    items: acc.items + (position.items_count || 0),
    materials_cost: acc.materials_cost + (position.total_materials_cost || 0),
    works_cost: acc.works_cost + (position.total_works_cost || 0),
    total_cost: acc.total_cost + (position.total_materials_cost || 0) + (position.total_works_cost || 0)
  }), {
    positions: 0,
    items: 0,
    materials_cost: 0,
    works_cost: 0,
    total_cost: 0
  });

  const getPositionProgress = (position: PositionWithItems) => {
    const itemsCount = position.items_count || 0;
    if (itemsCount === 0) return 0;
    // Simple progress calculation based on items count
    return Math.min(100, (itemsCount / 10) * 100);
  };

  return (
    <div className="w-full">
      {/* Summary Statistics */}
      <Card className="mb-6">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Позиций заказчика"
              value={totals.positions}
              prefix={<FolderOpenOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Элементов BOQ"
              value={totals.items}
              prefix={<AppstoreOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Стоимость материалов"
              value={totals.materials_cost}
              precision={2}
              suffix="₽"
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Общая стоимость"
              value={totals.total_cost}
              precision={2}
              suffix="₽"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Card
        title={
          <div className="flex justify-between items-center">
            <Title level={4} className="mb-0">
              Позиции заказчика и элементы BOQ
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreatePosition}
            >
              Добавить позицию
            </Button>
          </div>
        }
      >
        {positions.length === 0 ? (
          <Empty
            description="Позиции заказчика не найдены"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreatePosition}
            >
              Создать первую позицию
            </Button>
          </Empty>
        ) : (
          <Collapse 
            className="w-full"
            expandIconPosition="end"
            items={positions.map((position) => ({
              key: position.id,
              label: (
                  <div className="flex justify-between items-center w-full mr-4">
                    <div className="flex items-center gap-3">
                      <Text strong className="text-lg">
                        {position.position_number}. {position.title}
                      </Text>
                      <Tag color={position.status === 'active' ? 'green' : 'default'}>
                        {position.status === 'active' ? 'Активна' : 'Неактивна'}
                      </Tag>
                      {position.category && (
                        <Tag color="blue">{position.category}</Tag>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Text type="secondary">
                        {position.items_count || 0} элементов
                      </Text>
                      <Text strong style={{ color: '#52c41a' }}>
                        {((position.total_materials_cost || 0) + (position.total_works_cost || 0))
                          .toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </Text>
                      <Progress 
                        type="circle" 
                        size={32} 
                        percent={getPositionProgress(position)}
                        showInfo={false}
                      />
                    </div>
                  </div>
                ),
              extra: (
                  <Space size="small" onClick={(e) => e.stopPropagation()}>
                    {!(showInlineForm && inlinePositionId === position.id) && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleAddInlineItem(position.id)}
                      >
                        Добавить элемент
                      </Button>
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditPosition(position)}
                    />
                    <Popconfirm
                      title="Удалить позицию?"
                      description="Все элементы BOQ в этой позиции также будут удалены."
                      onConfirm={() => handleDeletePosition(position.id)}
                      okText="Удалить"
                      cancelText="Отмена"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                      />
                    </Popconfirm>
                  </Space>
                ),
              children: (
                <div className="pl-4">
                  {position.description && (
                    <Text type="secondary" className="block mb-4">
                      {position.description}
                    </Text>
                  )}
                  
                  <Row gutter={16} className="mb-4">
                    <Col span={8}>
                      <Statistic
                        title="Материалы"
                        value={position.total_materials_cost || 0}
                        precision={2}
                        suffix="₽"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Работы"
                        value={position.total_works_cost || 0}
                        precision={2}
                        suffix="₽"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Всего по позиции"
                        value={(position.total_materials_cost || 0) + (position.total_works_cost || 0)}
                        precision={2}
                        suffix="₽"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  </Row>

                  {showInlineForm && inlinePositionId === position.id && (
                    <InlineBoqItemForm
                      tenderId={tenderId}
                      positionId={position.id}
                      onSuccess={handleInlineSuccess}
                      onCancel={handleInlineCancel}
                    />
                  )}

                  <Table
                    columns={boqColumns}
                    dataSource={position.boq_items || []}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Элементы BOQ не добавлены"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )
                    }}
                  />
                </div>
              )
            }))}
          />
        )}
      </Card>
      <ClientPositionForm
        tenderId={tenderId}
        visible={positionFormVisible}
        onCancel={() => setPositionFormVisible(false)}
        onSuccess={handlePositionSuccess}
        editingPosition={editingPosition}
      />
    </div>
  );
};

export default TenderBOQManager;