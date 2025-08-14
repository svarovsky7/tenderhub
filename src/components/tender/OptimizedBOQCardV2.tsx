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
  Input,
  InputNumber,
  Select,
  message,
  Checkbox,
  Divider,
  Modal,
  Row,
  Col
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
  CloseOutlined,
  ExclamationCircleOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface MaterialItem {
  id: string;
  name: string;
  description?: string;
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
  id: number | string;
  name: string;
  code?: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  positions: number;
  materials: MaterialItem[];
}

interface OptimizedBOQCardV2Props {
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
  onMoveItem?: (item: any, fromWorkId: string, toWorkId: string) => void;
  onDuplicateItem?: (workId: string, materialId: string) => void;
  onDeleteItem?: (workId: string, materialId: string) => void;
  onReorderItem?: (workId: string, materialId: string, direction: 'up' | 'down') => void;
}

const OptimizedBOQCardV2: React.FC<OptimizedBOQCardV2Props> = ({
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
  allWorkLinks,
  onMoveItem,
  onDuplicateItem,
  onDeleteItem,
  onReorderItem
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expandedWorks, setExpandedWorks] = useState<Set<string | number>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<{ item: MaterialItem; fromWorkId: string } | null>(null);
  const [quickAddData, setQuickAddData] = useState({
    type: 'work' as 'work' | 'material',
    name: '',
    quantity: 1,
    unit: 'м²',
    price: 0,
    targetWorkId: '',
    delivery_price_type: 'included' as 'included' | 'not_included' | 'amount',
    delivery_amount: 0
  });

  // Format currency
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(value);
  }, []);

  // Toggle work expansion
  const toggleWork = useCallback((workId: number | string) => {
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

  // Handle move item
  const handleMoveItem = (item: MaterialItem, fromWorkId: string) => {
    setItemToMove({ item, fromWorkId });
    setShowMoveModal(true);
  };

  // Execute move
  const executeMoveItem = (toWorkId: string) => {
    if (itemToMove && onMoveItem) {
      onMoveItem(itemToMove.item, itemToMove.fromWorkId, toWorkId);
      setShowMoveModal(false);
      setItemToMove(null);
      message.success('Материал перемещен');
    }
  };

  // Mock work items from position data
  const workItems = useMemo(() => {
    if (!position.boq_items) return [];
    
    const works = position.boq_items.filter(item => item.item_type === 'work');
    return works.map(work => {
      const materials = allWorkLinks[work.id] || [];
      return {
        id: work.id,
        name: work.description || work.name,
        code: work.code || '',
        quantity: work.quantity || 0,
        unit: work.unit || '',
        totalPrice: work.total_amount || 0,
        positions: materials.length,
        materials: materials.map((link: any) => ({
          id: link.material_boq_item_id || link.id,
          name: link.material_description || link.description,
          quantity: link.material_quantity || link.quantity,
          unit: link.material_unit || link.unit,
          unitPrice: link.material_unit_rate || link.unit_rate,
          totalPrice: link.calculated_total || link.total_amount || 0,
          delivery: link.delivery_price_type || 'included',
          isDelivery: true,
          consumption_coefficient: link.material_consumption_coefficient,
          conversion_coefficient: link.material_conversion_coefficient,
          material_quantity_per_work: link.material_quantity_per_work,
          usage_coefficient: link.usage_coefficient,
          delivery_price_type: link.delivery_price_type,
          delivery_amount: link.delivery_amount
        }))
      };
    }) as WorkItem[];
  }, [position.boq_items, allWorkLinks]);

  // Handle quick add
  const handleQuickAdd = () => {
    if (!quickAddData.name || !quickAddData.price) {
      message.error('Заполните обязательные поля');
      return;
    }

    // Here you would call the actual API to add the item
    message.success(`${quickAddData.type === 'work' ? 'Работа' : 'Материал'} добавлен`);
    setQuickAddData({
      type: 'work',
      name: '',
      quantity: 1,
      unit: 'м²',
      price: 0,
      targetWorkId: '',
      delivery_price_type: 'included',
      delivery_amount: 0
    });
  };

  return (
    <Card
      className="mb-4 shadow-sm hover:shadow-md transition-shadow"
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
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title={<><ToolOutlined className="text-blue-600" /> Добавить работу</>}>
                  <Space direction="vertical" className="w-full">
                    <Input
                      placeholder="Название работы..."
                      value={quickAddData.type === 'work' ? quickAddData.name : ''}
                      onChange={e => setQuickAddData({...quickAddData, type: 'work', name: e.target.value})}
                    />
                    <Space.Compact className="w-full">
                      <InputNumber
                        placeholder="Количество"
                        value={quickAddData.quantity}
                        onChange={value => setQuickAddData({...quickAddData, quantity: value || 1})}
                        style={{ width: '40%' }}
                      />
                      <Select
                        value={quickAddData.unit}
                        onChange={value => setQuickAddData({...quickAddData, unit: value})}
                        style={{ width: '30%' }}
                      >
                        <Option value="м²">м²</Option>
                        <Option value="м³">м³</Option>
                        <Option value="шт">шт</Option>
                        <Option value="кг">кг</Option>
                      </Select>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleQuickAdd}>
                        Добавить
                      </Button>
                    </Space.Compact>
                  </Space>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card size="small" title={<><BgColorsOutlined className="text-green-600" /> Добавить материал</>}>
                  <Space direction="vertical" className="w-full">
                    <Search
                      placeholder="Поиск материала..."
                      value={quickAddData.type === 'material' ? quickAddData.name : ''}
                      onChange={e => setQuickAddData({...quickAddData, type: 'material', name: e.target.value})}
                    />
                    <Space.Compact className="w-full">
                      <InputNumber
                        placeholder="Кол-во"
                        value={quickAddData.quantity}
                        onChange={value => setQuickAddData({...quickAddData, quantity: value || 1})}
                        style={{ width: '25%' }}
                      />
                      <InputNumber
                        placeholder="Цена"
                        value={quickAddData.price}
                        onChange={value => setQuickAddData({...quickAddData, price: value || 0})}
                        style={{ width: '25%' }}
                      />
                      <Select
                        placeholder="К работе..."
                        value={quickAddData.targetWorkId}
                        onChange={value => setQuickAddData({...quickAddData, targetWorkId: value})}
                        style={{ width: '25%' }}
                      >
                        {workItems.map(work => (
                          <Option key={work.id} value={work.id}>{work.name}</Option>
                        ))}
                      </Select>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleQuickAdd}>
                        Добавить
                      </Button>
                    </Space.Compact>
                    
                    {/* Delivery price section for materials */}
                    {quickAddData.type === 'material' && (
                      <Card size="small" className="bg-blue-50">
                        <Space direction="vertical" className="w-full" size="small">
                          <Text strong className="text-blue-700">Параметры доставки</Text>
                          <Select
                            value={quickAddData.delivery_price_type}
                            onChange={value => setQuickAddData({...quickAddData, delivery_price_type: value})}
                            className="w-full"
                          >
                            <Option value="included">
                              <TruckOutlined /> В цене (включена в стоимость)
                            </Option>
                            <Option value="not_included">
                              <TruckOutlined /> Не в цене (оплачивается отдельно)
                            </Option>
                            <Option value="amount">
                              <TruckOutlined /> Сумма (указать конкретную сумму)
                            </Option>
                          </Select>
                          
                          {quickAddData.delivery_price_type === 'amount' && (
                            <InputNumber
                              placeholder="Сумма доставки"
                              value={quickAddData.delivery_amount}
                              onChange={value => setQuickAddData({...quickAddData, delivery_amount: value || 0})}
                              className="w-full"
                              addonAfter="₽"
                            />
                          )}
                        </Space>
                      </Card>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </Space>
        </div>
      )}

      {/* Selected items action bar */}
      {selectedItems.size > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b">
          <Space>
            <Tag color="warning">Выбрано: {selectedItems.size}</Tag>
            <Button size="small" type="primary" ghost>Переместить</Button>
            <Button size="small" type="primary" ghost>Копировать</Button>
            <Button size="small" danger>Удалить</Button>
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
                    <Button
                      type="text"
                      icon={expandedWorks.has(work.id) ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        toggleWork(work.id);
                      }}
                    />
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
                    <Text strong className="text-lg text-blue-600">
                      {formatCurrency(work.totalPrice)}
                    </Text>
                    <Space size="small">
                      <Tooltip title="Редактировать">
                        <Button type="text" icon={<EditOutlined />} size="small" />
                      </Tooltip>
                      <Tooltip title="Дублировать">
                        <Button type="text" icon={<CopyOutlined />} size="small" />
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                      </Tooltip>
                    </Space>
                  </div>
                </div>
              </div>

              {/* Materials List */}
              {expandedWorks.has(work.id) && (
                <div className="bg-gray-50 px-8 py-2">
                  <div className="text-xs text-gray-500 mb-2">
                    Связанные материалы (используйте стрелки для изменения порядка, перетащите для перемещения)
                  </div>
                  
                  {work.materials.length === 0 ? (
                    <div className="py-4 text-center text-gray-400">
                      <BgColorsOutlined className="text-2xl mb-2" />
                      <div>Нет связанных материалов</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {work.materials.map((material, materialIndex) => {
                        const isEditing = editingLinkId === material.id;
                        
                        return (
                          <div
                            key={material.id}
                            className={`bg-white rounded px-3 py-2 ${
                              isEditing ? 'ring-2 ring-blue-500' : 'hover:shadow-sm'
                            } transition-all group`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  checked={selectedItems.has(material.id)}
                                  onChange={() => onItemSelect(material.id)}
                                />
                                
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
                                
                                {/* Action buttons */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip title="Переместить вверх">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<ArrowUpOutlined />}
                                      disabled={materialIndex === 0}
                                      onClick={() => onReorderItem?.(work.id.toString(), material.id, 'up')}
                                    />
                                  </Tooltip>
                                  
                                  <Tooltip title="Переместить вниз">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<ArrowDownOutlined />}
                                      disabled={materialIndex === work.materials.length - 1}
                                      onClick={() => onReorderItem?.(work.id.toString(), material.id, 'down')}
                                    />
                                  </Tooltip>
                                  
                                  <Tooltip title="Переместить в другую работу">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<SwapOutlined />}
                                      className="text-purple-500"
                                      onClick={() => handleMoveItem(material, work.id.toString())}
                                    />
                                  </Tooltip>
                                  
                                  {!isEditing ? (
                                    <>
                                      <Tooltip title="Редактировать">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => onEditLink(material.id, material)}
                                        />
                                      </Tooltip>
                                      
                                      <Tooltip title="Дублировать">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<CopyOutlined />}
                                          className="text-green-500"
                                          onClick={() => onDuplicateItem?.(work.id.toString(), material.id)}
                                        />
                                      </Tooltip>
                                      
                                      <Tooltip title="Удалить">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<DeleteOutlined />}
                                          danger
                                          onClick={() => onDeleteItem?.(work.id.toString(), material.id)}
                                        />
                                      </Tooltip>
                                    </>
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
                            </div>

                            {/* Inline Edit Form */}
                            {isEditing && (
                              <div className="mt-3 pt-3 border-t">
                                <Row gutter={[8, 8]}>
                                  <Col span={4}>
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
                                  </Col>
                                  <Col span={4}>
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
                                  </Col>
                                  <Col span={4}>
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
                                  </Col>
                                  <Col span={4}>
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
                                  </Col>
                                  <Col span={4}>
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
                                  </Col>
                                  <Col span={4}>
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
                                  </Col>
                                </Row>
                                
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

      {/* Move Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined className="text-purple-600" />
            Переместить "{itemToMove?.item.name}"
          </Space>
        }
        open={showMoveModal}
        onCancel={() => {
          setShowMoveModal(false);
          setItemToMove(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowMoveModal(false)}>
            Отмена
          </Button>
        ]}
      >
        <div className="space-y-2">
          {workItems
            .filter(w => w.id.toString() !== itemToMove?.fromWorkId)
            .map(work => (
              <Card
                key={work.id}
                hoverable
                onClick={() => executeMoveItem(work.id.toString())}
                className="cursor-pointer"
              >
                <div>
                  <Text strong>{work.name}</Text>
                  <div>
                    <Text type="secondary" className="text-sm">
                      {work.positions} позиций
                    </Text>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      </Modal>
    </Card>
  );
};

export default OptimizedBOQCardV2;