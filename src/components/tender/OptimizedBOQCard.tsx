import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Typography,
  Button,
  Tag,
  Tooltip,
  Dropdown,
  Space,
  Badge,
  Collapse,
  InputNumber,
  Select,
  message,
  Checkbox,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  DragOutlined,
  MoreOutlined,
  ToolOutlined,
  BgColorsOutlined,
  CalculatorOutlined,
  SearchOutlined,
  TruckOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LinkOutlined,
  DisconnectOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  delivery: string;
  isDelivery?: boolean;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  material_quantity_per_work?: number;
  usage_coefficient?: number;
  delivery_price_type?: 'included' | 'not_included' | 'amount';
  delivery_amount?: number;
}

interface WorkItem {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  positions: number;
  materials: MaterialItem[];
}

interface OptimizedBOQCardProps {
  position: {
    id: string;
    position_number: number;
    work_name: string;
    total_position_cost: number;
    materials_count: number;
    works_count: number;
    boq_items?: any[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  onAddItems: () => void;
  onUpdate: () => void;
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
  editingLinkId: string | null;
  editingLinkData: any;
  onEditLink: (linkId: string, data: any) => void;
  onSaveLink: (linkId: string, materialId: string) => void;
  onCancelEdit: () => void;
  allWorkLinks: Record<string, any[]>;
}

const OptimizedBOQCard: React.FC<OptimizedBOQCardProps> = ({
  position,
  isExpanded,
  onToggle,
  onAddItems,
  onUpdate,
  selectedItems,
  onItemSelect,
  editingLinkId,
  editingLinkData,
  onEditLink,
  onSaveLink,
  onCancelEdit,
  allWorkLinks
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expandedWorks, setExpandedWorks] = useState<Set<number>>(new Set());

  // Format currency
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(value);
  }, []);

  // Toggle work expansion
  const toggleWork = useCallback((workId: number) => {
    setExpandedWorks(prev => {
      const next = new Set(prev);
      if (next.has(workId)) {
        next.delete(workId);
      } else {
        next.add(workId);
      }
      return next;
    });
  }, []);

  // Get delivery type label
  const getDeliveryLabel = (type?: string, amount?: number) => {
    switch (type) {
      case 'included':
        return <Tag color="green" icon={<TruckOutlined />}>В цене</Tag>;
      case 'not_included':
        return <Tag color="orange" icon={<TruckOutlined />}>Не в цене</Tag>;
      case 'amount':
        return <Tag color="blue" icon={<TruckOutlined />}>{formatCurrency(amount || 0)}</Tag>;
      default:
        return null;
    }
  };

  // Action menu for materials
  const getMaterialActions = (material: MaterialItem, workId: number): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: () => onEditLink(material.id, material)
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Дублировать'
    },
    {
      key: 'move',
      icon: <SwapOutlined />,
      label: 'Переместить'
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true
    }
  ];

  // Mock work items (replace with actual data)
  const workItems = useMemo(() => {
    // This would come from position.boq_items filtered by type
    return [
      {
        id: 1,
        name: 'Демонтаж существующих строений',
        code: '816 м3',
        quantity: 1000,
        unit: 'м3',
        totalPrice: 24191136,
        positions: 3,
        materials: allWorkLinks[1] || []
      },
      {
        id: 2,
        name: 'Монтаж забора',
        code: '',
        quantity: 200,
        unit: 'м²',
        totalPrice: 60000,
        positions: 2,
        materials: allWorkLinks[2] || []
      }
    ] as WorkItem[];
  }, [allWorkLinks]);

  return (
    <Card
      className="mb-4 shadow-sm"
      bodyStyle={{ padding: 0 }}
      title={
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />}
              onClick={onToggle}
              size="small"
            />
            <div>
              <Title level={5} className="mb-0">
                {position.position_number}. {position.work_name}
              </Title>
              <Space size="small">
                <Text type="secondary" className="text-xs">
                  Работ: {position.works_count}
                </Text>
                <Divider type="vertical" />
                <Text type="secondary" className="text-xs">
                  Материалов: {position.materials_count}
                </Text>
              </Space>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Title level={4} className="mb-0 text-blue-600">
              {formatCurrency(position.total_position_cost)}
            </Title>
            <Space size="small">
              <Tooltip title="Быстрое добавление">
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-green-600"
                />
              </Tooltip>
              <Tooltip title="Калькулятор">
                <Button type="text" icon={<CalculatorOutlined />} />
              </Tooltip>
              <Dropdown
                menu={{
                  items: [
                    { key: 'edit', icon: <EditOutlined />, label: 'Редактировать' },
                    { key: 'copy', icon: <CopyOutlined />, label: 'Дублировать' },
                    { type: 'divider' },
                    { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить', danger: true }
                  ]
                }}
              >
                <Button type="text" icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          </div>
        </div>
      }
    >
      {/* Quick Add Section */}
      {showQuickAdd && (
        <div className="px-4 py-3 bg-gray-50 border-b">
          <Space direction="vertical" className="w-full" size="small">
            <Text strong>Быстрое добавление</Text>
            <div className="grid grid-cols-2 gap-4">
              <Space.Compact className="w-full">
                <Select placeholder="Тип" style={{ width: '30%' }}>
                  <Option value="work">Работа</Option>
                  <Option value="material">Материал</Option>
                </Select>
                <SearchOutlined className="mx-2 text-gray-400" />
                <Select
                  showSearch
                  placeholder="Выберите из справочника..."
                  className="flex-1"
                  notFoundContent="Не найдено"
                />
              </Space.Compact>
              <Space.Compact className="w-full">
                <InputNumber placeholder="Кол-во" style={{ width: '30%' }} />
                <InputNumber placeholder="Цена" style={{ width: '30%' }} />
                <Button type="primary" icon={<PlusOutlined />}>
                  Добавить
                </Button>
              </Space.Compact>
            </div>
          </Space>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="divide-y">
          {workItems.map((work, index) => (
            <div key={work.id} className="bg-white">
              {/* Work Header */}
              <div
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleWork(work.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ToolOutlined className="text-blue-500" />
                    <Space size="small">
                      <Text strong>
                        {index + 1}. {work.name}
                      </Text>
                      {work.code && (
                        <Tag color="blue">{work.code}</Tag>
                      )}
                      <Text type="secondary" className="text-sm">
                        {work.quantity} {work.unit}
                      </Text>
                      <Badge count={work.positions} showZero className="bg-blue-100">
                        <Text type="secondary" className="text-xs px-2">
                          позиций
                        </Text>
                      </Badge>
                    </Space>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Text strong className="text-lg">
                      {formatCurrency(work.totalPrice)}
                    </Text>
                    <Button
                      type="text"
                      icon={expandedWorks.has(work.id) ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      size="small"
                    />
                  </div>
                </div>
              </div>

              {/* Materials List */}
              {expandedWorks.has(work.id) && (
                <div className="bg-gray-50 px-8 py-2">
                  <div className="text-xs text-gray-500 mb-2">
                    Связанные материалы (перетащите для связывания)
                  </div>
                  
                  {work.materials.length === 0 ? (
                    <div className="py-4 text-center text-gray-400">
                      <BgColorsOutlined className="text-2xl mb-2" />
                      <div>Нет связанных материалов</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {work.materials.map((material) => {
                        const isEditing = editingLinkId === material.id;
                        
                        return (
                          <div
                            key={material.id}
                            className={`bg-white rounded px-3 py-2 ${
                              isEditing ? 'ring-2 ring-blue-500' : 'hover:shadow-sm'
                            } transition-all`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  checked={selectedItems.has(material.id)}
                                  onChange={() => onItemSelect(material.id)}
                                />
                                <DragOutlined className="text-gray-400 cursor-move" />
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Text strong>{material.name}</Text>
                                    {getDeliveryLabel(material.delivery_price_type, material.delivery_amount)}
                                  </div>
                                  
                                  <Space size="small" className="text-xs text-gray-500">
                                    <span>К.расх: {material.consumption_coefficient || 1}</span>
                                    <Divider type="vertical" />
                                    <span>К.пер: {material.conversion_coefficient || 1}</span>
                                    <Divider type="vertical" />
                                    <span>Цена: {formatCurrency(material.unitPrice)}/{material.unit}</span>
                                  </Space>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <Text strong className="text-blue-600">
                                  {formatCurrency(material.totalPrice)}
                                </Text>
                                
                                {!isEditing ? (
                                  <Space size="small">
                                    <Tooltip title="Редактировать">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => onEditLink(material.id, material)}
                                      />
                                    </Tooltip>
                                    <Tooltip title="Отвязать">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<DisconnectOutlined />}
                                        className="text-orange-500"
                                      />
                                    </Tooltip>
                                  </Space>
                                ) : (
                                  <Space size="small">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<SaveOutlined />}
                                      className="text-green-500"
                                      onClick={() => onSaveLink(material.id, material.id)}
                                    />
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<CloseOutlined />}
                                      onClick={onCancelEdit}
                                    />
                                  </Space>
                                )}
                              </div>
                            </div>

                            {/* Inline Edit Form */}
                            {isEditing && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="grid grid-cols-6 gap-2">
                                  <div>
                                    <Text className="text-xs text-gray-600">К. расхода</Text>
                                    <InputNumber
                                      size="small"
                                      value={editingLinkData.consumption_coefficient}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        consumption_coefficient: value
                                      })}
                                      className="w-full"
                                      step={0.0001}
                                    />
                                  </div>
                                  <div>
                                    <Text className="text-xs text-gray-600">К. перевода</Text>
                                    <InputNumber
                                      size="small"
                                      value={editingLinkData.conversion_coefficient}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        conversion_coefficient: value
                                      })}
                                      className="w-full"
                                      step={0.0001}
                                    />
                                  </div>
                                  <div>
                                    <Text className="text-xs text-gray-600">Цена (₽)</Text>
                                    <InputNumber
                                      size="small"
                                      value={editingLinkData.unit_rate}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        unit_rate: value
                                      })}
                                      className="w-full"
                                      step={0.01}
                                    />
                                  </div>
                                  <div>
                                    <Text className="text-xs text-gray-600">Кол-во на ед.</Text>
                                    <InputNumber
                                      size="small"
                                      value={editingLinkData.material_quantity_per_work}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        material_quantity_per_work: value
                                      })}
                                      className="w-full"
                                      step={0.0001}
                                    />
                                  </div>
                                  <div>
                                    <Text className="text-xs text-gray-600">К. использ.</Text>
                                    <InputNumber
                                      size="small"
                                      value={editingLinkData.usage_coefficient}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        usage_coefficient: value
                                      })}
                                      className="w-full"
                                      step={0.0001}
                                    />
                                  </div>
                                  <div>
                                    <Text className="text-xs text-gray-600">Доставка</Text>
                                    <Select
                                      size="small"
                                      value={editingLinkData.delivery_price_type}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        delivery_price_type: value,
                                        delivery_amount: value === 'amount' ? editingLinkData.delivery_amount : 0
                                      })}
                                      className="w-full"
                                    >
                                      <Option value="included">В цене</Option>
                                      <Option value="not_included">Не в цене</Option>
                                      <Option value="amount">Сумма</Option>
                                    </Select>
                                  </div>
                                </div>
                                
                                {editingLinkData.delivery_price_type === 'amount' && (
                                  <div className="mt-2">
                                    <Text className="text-xs text-gray-600">Сумма доставки (₽)</Text>
                                    <InputNumber
                                      size="small"
                                      value={editingLinkData.delivery_amount}
                                      onChange={(value) => onEditLink(material.id, {
                                        ...editingLinkData,
                                        delivery_amount: value
                                      })}
                                      className="w-32"
                                      step={0.01}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default OptimizedBOQCard;