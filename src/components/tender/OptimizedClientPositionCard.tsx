import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Typography,
  Button,
  Tag,
  Progress,
  Tooltip,
  Dropdown,
  Modal,
  Form,
  Input,
  Select,
  message,
  Badge,
  InputNumber,
  Tabs,
  Empty,
  List,
  Space,
  Divider
} from 'antd';
import {
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ToolOutlined,
  BgColorsOutlined,
  CalculatorOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { clientPositionsApi, boqApi, materialsApi, worksApi } from '../../lib/supabase/api';
import type { 
  ClientPositionWithItems, 
  ClientPositionUpdate,
  Material,
  WorkItem,
  BOQItemInsert,
  BOQItemWithLibrary,
  BOQItemUpdate
} from '../../lib/supabase/types';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface OptimizedClientPositionCardProps {
  position: ClientPositionWithItems;
  isExpanded: boolean;
  onToggle: () => void;
  onAddItems: () => void;
  onUpdate: () => void;
  tenderId: string;
}

interface QuickAddFormData {
  type: 'work' | 'material';
  name: string;
  code?: string;
  volume?: number;
  unit: string;
  pricePerUnit?: number;
  conversionFactor?: number;
  consumptionFactor?: number;
  targetWorkId?: string;
}

interface MoveModalState {
  visible: boolean;
  item: BOQItemWithLibrary | null;
  fromWorkId: string | null;
}

const statusColors = {
  active: 'green',
  inactive: 'default',
  completed: 'blue'
} as const;

const statusLabels = {
  active: 'Активна',
  inactive: 'Неактивна',
  completed: 'Завершена'
} as const;

const OptimizedClientPositionCard: React.FC<OptimizedClientPositionCardProps> = ({
  position,
  isExpanded,
  onToggle,
  onAddItems,
  onUpdate,
  tenderId
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [moveModal, setMoveModal] = useState<MoveModalState>({ visible: false, item: null, fromWorkId: null });
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [quickAddType, setQuickAddType] = useState<'work' | 'material'>('work');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const [inlineEditForm] = Form.useForm();

  // Group items by work
  const groupedItems = useMemo(() => {
    const items = position.boq_items || [];
    const works = new Map<string, BOQItemWithLibrary[]>();
    const materials: BOQItemWithLibrary[] = [];
    
    items.forEach(item => {
      if (item.item_type === 'work') {
        if (!works.has(item.id)) {
          works.set(item.id, []);
        }
      } else if (item.item_type === 'material') {
        // Find parent work if linked
        if (item.parent_id) {
          const workItems = works.get(item.parent_id) || [];
          workItems.push(item);
          works.set(item.parent_id, workItems);
        } else {
          materials.push(item);
        }
      }
    });
    
    return { works, materials };
  }, [position.boq_items]);

  // Computed properties
  const totalItems = position.boq_items?.length || 0;
  const materialsCount = position.materials_count || 0;
  const worksCount = position.works_count || 0;
  const totalCost = position.total_position_cost || 0;
  const materialsPercent = totalItems > 0 ? Math.round((materialsCount / totalItems) * 100) : 0;
  const worksPercent = totalItems > 0 ? Math.round((worksCount / totalItems) * 100) : 0;

  // Handlers
  const handleEdit = useCallback(() => {
    form.setFieldsValue({
      title: position.title,
      description: position.description,
      category: position.category,
      status: position.status,
      priority: position.priority
    });
    setEditModalVisible(true);
  }, [position, form]);

  const handleSave = useCallback(async (values: ClientPositionUpdate) => {
    setLoading(true);
    console.log('🚀 [handleSave] called with:', values);
    try {
      const updates: ClientPositionUpdate = {
        title: values.title,
        description: values.description,
        category: values.category,
        status: values.status,
        priority: values.priority
      };

      const result = await clientPositionsApi.update(position.id, updates);
      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ [handleSave] completed');
      message.success('Позиция обновлена');
      setEditModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('❌ [handleSave] failed:', error);
      message.error('Ошибка обновления позиции');
    } finally {
      setLoading(false);
    }
  }, [position.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    console.log('🚀 [handleDelete] called');
    try {
      const result = await clientPositionsApi.delete(position.id);
      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ [handleDelete] completed');
      message.success('Позиция удалена');
      setDeleteModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('❌ [handleDelete] failed:', error);
      message.error('Ошибка удаления позиции');
    } finally {
      setLoading(false);
    }
  }, [position.id, onUpdate]);

  const handleQuickAddWork = useCallback(async (values: any) => {
    console.log('🚀 [handleQuickAddWork] called with:', values);
    setLoading(true);
    
    try {
      const existingItems = position.boq_items || [];
      const lastItemNumber = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => item.sub_number || 0))
        : 0;
      
      const totalPrice = parseFloat(values.volume || 0) * parseFloat(values.pricePerUnit || 0);
      
      const newWorkData: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        item_number: `${position.position_number}.${lastItemNumber + 1}`,
        sub_number: lastItemNumber + 1,
        sort_order: lastItemNumber + 1,
        item_type: 'work',
        description: values.name,
        unit: values.unit,
        quantity: parseFloat(values.volume || 0),
        unit_rate: parseFloat(values.pricePerUnit || 0),
        total_cost: totalPrice,
        work_id: null
      };

      console.log('📡 Creating new work:', newWorkData);
      
      const result = await boqApi.create(newWorkData);
      console.log('📦 Create result:', result);
      
      if (result.error) {
        console.error('❌ Create failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Work created successfully');
      message.success(`Работа "${values.name}" добавлена`);
      quickAddForm.resetFields();
      onUpdate();
    } catch (error) {
      console.error('💥 Quick add work error:', error);
      message.error('Ошибка добавления работы');
    } finally {
      setLoading(false);
    }
  }, [position, tenderId, onUpdate, quickAddForm]);

  const handleQuickAddMaterial = useCallback(async (values: any) => {
    console.log('🚀 [handleQuickAddMaterial] called with:', values);
    setLoading(true);
    
    try {
      if (!values.targetWorkId) {
        message.error('Выберите работу для привязки материала');
        return;
      }

      const existingItems = position.boq_items || [];
      const lastItemNumber = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => item.sub_number || 0))
        : 0;
      
      const conversionFactor = parseFloat(values.conversionFactor || 1);
      const consumptionFactor = parseFloat(values.consumptionFactor || 1);
      const pricePerUnit = parseFloat(values.pricePerUnit || 0);
      const totalPrice = conversionFactor * consumptionFactor * pricePerUnit;
      
      const newMaterialData: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        parent_id: values.targetWorkId,
        item_number: `${position.position_number}.${lastItemNumber + 1}`,
        sub_number: lastItemNumber + 1,
        sort_order: lastItemNumber + 1,
        item_type: 'material',
        description: values.name,
        unit: values.unit,
        quantity: 1,
        unit_rate: pricePerUnit,
        total_cost: totalPrice,
        consumption_coefficient: consumptionFactor,
        conversion_coefficient: conversionFactor,
        material_id: null
      };

      console.log('📡 Creating new material:', newMaterialData);
      
      const result = await boqApi.create(newMaterialData);
      console.log('📦 Create result:', result);
      
      if (result.error) {
        console.error('❌ Create failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Material created successfully');
      message.success(`Материал "${values.name}" добавлен к выбранной работе`);
      quickAddForm.resetFields();
      onUpdate();
    } catch (error) {
      console.error('💥 Quick add material error:', error);
      message.error('Ошибка добавления материала');
    } finally {
      setLoading(false);
    }
  }, [position, tenderId, onUpdate, quickAddForm]);

  const handleMoveItem = useCallback((item: BOQItemWithLibrary, fromWorkId: string | null) => {
    console.log('🚀 [handleMoveItem] called with:', { item: item.description, fromWorkId });
    setMoveModal({ visible: true, item, fromWorkId });
  }, []);

  const handleMoveToWork = useCallback(async (targetWorkId: string) => {
    if (!moveModal.item) return;
    
    console.log('🚀 [handleMoveToWork] called with:', { targetWorkId });
    setLoading(true);
    
    try {
      const updates: BOQItemUpdate = {
        parent_id: targetWorkId
      };
      
      const result = await boqApi.update(moveModal.item.id, updates);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('✅ Item moved successfully');
      message.success('Материал перемещен');
      setMoveModal({ visible: false, item: null, fromWorkId: null });
      onUpdate();
    } catch (error) {
      console.error('❌ Move failed:', error);
      message.error('Ошибка перемещения материала');
    } finally {
      setLoading(false);
    }
  }, [moveModal.item, onUpdate]);

  const handleInlineEdit = useCallback(async (itemId: string, values: any) => {
    console.log('🚀 [handleInlineEdit] called with:', { itemId, values });
    setLoading(true);
    
    try {
      const conversionFactor = parseFloat(values.conversion_coefficient || 1);
      const consumptionFactor = parseFloat(values.consumption_coefficient || 1);
      const pricePerUnit = parseFloat(values.unit_rate || 0);
      const totalPrice = conversionFactor * consumptionFactor * pricePerUnit;
      
      const updates: BOQItemUpdate = {
        conversion_coefficient: conversionFactor,
        consumption_coefficient: consumptionFactor,
        unit_rate: pricePerUnit,
        total_cost: totalPrice
      };
      
      const result = await boqApi.update(itemId, updates);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('✅ Item updated successfully');
      message.success('Элемент обновлен');
      setEditingItemId(null);
      onUpdate();
    } catch (error) {
      console.error('❌ Update failed:', error);
      message.error('Ошибка обновления элемента');
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    console.log('🚀 [handleDeleteItem] called with:', itemId);
    setLoading(true);
    
    try {
      const result = await boqApi.delete(itemId);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('✅ Item deleted successfully');
      message.success('Элемент удален');
      onUpdate();
    } catch (error) {
      console.error('❌ Delete failed:', error);
      message.error('Ошибка удаления элемента');
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  const handleDuplicateItem = useCallback(async (item: BOQItemWithLibrary) => {
    console.log('🚀 [handleDuplicateItem] called with:', item.description);
    setLoading(true);
    
    try {
      const newItemData: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        parent_id: item.parent_id,
        item_number: `${item.item_number}_copy`,
        sub_number: (item.sub_number || 0) + 0.1,
        sort_order: (item.sort_order || 0) + 0.1,
        item_type: item.item_type,
        description: `${item.description} (копия)`,
        unit: item.unit,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        total_cost: item.total_cost,
        consumption_coefficient: item.consumption_coefficient,
        conversion_coefficient: item.conversion_coefficient,
        material_id: item.material_id,
        work_id: item.work_id
      };
      
      const result = await boqApi.create(newItemData);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('✅ Item duplicated successfully');
      message.success('Элемент продублирован');
      onUpdate();
    } catch (error) {
      console.error('❌ Duplicate failed:', error);
      message.error('Ошибка дублирования элемента');
    } finally {
      setLoading(false);
    }
  }, [position.id, tenderId, onUpdate]);

  // Get available works for material linking
  const availableWorks = useMemo(() => {
    return (position.boq_items || []).filter(item => item.item_type === 'work');
  }, [position.boq_items]);

  // Menu items for dropdown
  const menuItems = useMemo((): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Просмотр деталей',
      onClick: () => onToggle()
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: handleEdit
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Дублировать',
      onClick: () => message.info('Функция дублирования будет реализована в следующей версии')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: () => setDeleteModalVisible(true)
    }
  ], [onToggle, handleEdit]);

  // Render work with materials
  const renderWorkWithMaterials = (work: BOQItemWithLibrary, materials: BOQItemWithLibrary[]) => {
    const isWorkExpanded = selectedItems.has(work.id);
    
    return (
      <div key={work.id} className="bg-white border border-gray-200 rounded-lg shadow-sm mb-2">
        {/* Work Header */}
        <div className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newSelected = new Set(selectedItems);
                  if (newSelected.has(work.id)) {
                    newSelected.delete(work.id);
                  } else {
                    newSelected.add(work.id);
                  }
                  setSelectedItems(newSelected);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isWorkExpanded ? 
                  <ArrowUpOutlined className="text-gray-600" /> : 
                  <ArrowDownOutlined className="text-gray-600" />
                }
              </button>
              
              <ToolOutlined className="text-green-500" />
              
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">
                  {work.sub_number}. {work.description}
                </span>
                {work.quantity && (
                  <span className="text-sm text-gray-600">
                    {work.quantity} {work.unit}
                  </span>
                )}
                {materials.length > 0 && (
                  <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                    {materials.length} мат.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-blue-600">
                {(work.total_cost || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
              </span>
              <div className="flex items-center gap-1">
                <Tooltip title="Редактировать">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingItemId(work.id)}
                  />
                </Tooltip>
                <Tooltip title="Копировать">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleDuplicateItem(work)}
                  />
                </Tooltip>
                <Tooltip title="Удалить">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteItem(work.id)}
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Materials List */}
        {isWorkExpanded && materials.length > 0 && (
          <div className="bg-gray-50">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
              <Text className="text-sm text-gray-600">
                <strong>Привязанные материалы:</strong>
              </Text>
            </div>

            {materials.map((material) => (
              <div key={material.id} className="border-b border-gray-200 last:border-b-0">
                <div className="px-6 py-3 flex items-center justify-between hover:bg-white transition-colors group">
                  <div className="flex items-center gap-3">
                    <BgColorsOutlined className="text-blue-500" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{material.description}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mt-1">
                        К.перевода: {material.conversion_coefficient || 1} | 
                        К.расхода: {material.consumption_coefficient || 1} | 
                        Цена: {(material.unit_rate || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽/{material.unit}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {(material.total_cost || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip title="Переместить в другую работу">
                        <Button
                          type="text"
                          size="small"
                          icon={<SwapOutlined />}
                          onClick={() => handleMoveItem(material, work.id)}
                        />
                      </Tooltip>
                      <Tooltip title="Редактировать">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setEditingItemId(material.id)}
                        />
                      </Tooltip>
                      <Tooltip title="Копировать">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => handleDuplicateItem(material)}
                        />
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteItem(material.id)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Inline Edit */}
                {editingItemId === material.id && (
                  <div className="px-6 pb-4 bg-white border-t border-gray-200">
                    <Form
                      form={inlineEditForm}
                      layout="inline"
                      initialValues={{
                        conversion_coefficient: material.conversion_coefficient || 1,
                        consumption_coefficient: material.consumption_coefficient || 1,
                        unit_rate: material.unit_rate || 0
                      }}
                      onFinish={(values) => handleInlineEdit(material.id, values)}
                    >
                      <Form.Item name="conversion_coefficient" label="К. перевода">
                        <InputNumber min={0} step={0.01} style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item name="consumption_coefficient" label="К. расхода">
                        <InputNumber min={0} step={0.01} style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item name="unit_rate" label="Цена за ед.">
                        <InputNumber min={0} step={0.01} style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item>
                        <Space>
                          <Button type="primary" htmlType="submit" size="small">
                            Сохранить
                          </Button>
                          <Button size="small" onClick={() => setEditingItemId(null)}>
                            Отмена
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="transition-all duration-200">
      <Card
        className={`
          position-card hover:shadow-lg transition-shadow duration-200
          ${isExpanded ? 'ring-2 ring-blue-200' : ''}
        `}
        bodyStyle={{ padding: 0 }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Position Icon & Number */}
              <div className="flex items-center gap-2">
                <Badge count={position.position_number} color="blue">
                  {isExpanded ? (
                    <FolderOpenOutlined className="text-xl text-blue-500" />
                  ) : (
                    <FolderOutlined className="text-xl text-gray-500" />
                  )}
                </Badge>
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <Title level={5} className="mb-1 truncate">
                  {position.title}
                </Title>
                {position.description && (
                  <Text type="secondary" className="text-sm block truncate">
                    {position.description}
                  </Text>
                )}
              </div>

              {/* Status & Category */}
              <div className="flex items-center gap-2">
                <Tag color={statusColors[position.status]}>
                  {statusLabels[position.status]}
                </Tag>
                {position.category && (
                  <Tag>{position.category}</Tag>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Быстрое добавление">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickAddModalVisible(true)}
                  className="hover:bg-green-50 hover:text-green-600"
                />
              </Tooltip>

              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  className="hover:bg-gray-100"
                />
              </Dropdown>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <CalculatorOutlined className="text-gray-400" />
              <Text strong className="text-lg">
                {totalCost.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
              </Text>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <BgColorsOutlined className="text-blue-500" />
                <Text>{materialsCount} мат.</Text>
              </div>
              <div className="flex items-center gap-1">
                <ToolOutlined className="text-green-500" />
                <Text>{worksCount} раб.</Text>
              </div>
            </div>

            {totalItems > 0 && (
              <div className="flex-1 max-w-xs">
                <Text type="secondary" className="text-xs block mb-1">
                  Материалы / Работы
                </Text>
                <Progress
                  percent={materialsPercent}
                  success={{ percent: worksPercent }}
                  size="small"
                  showInfo={false}
                  strokeColor="#1890ff"
                />
              </div>
            )}
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="bg-gray-50">
            {/* Works and Materials List */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Title level={5} className="mb-0">
                  Работы и материалы ({totalItems})
                </Title>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickAddModalVisible(true)}
                >
                  Быстрое добавление
                </Button>
              </div>

              {totalItems === 0 ? (
                <Empty description="Нет добавленных элементов" />
              ) : (
                <div className="space-y-2">
                  {Array.from(groupedItems.works.entries()).map(([workId, materials]) => {
                    const work = position.boq_items?.find(item => item.id === workId && item.item_type === 'work');
                    if (!work) return null;
                    return renderWorkWithMaterials(work, materials);
                  })}
                  
                  {groupedItems.materials.length > 0 && (
                    <div className="mt-4">
                      <Title level={5} className="text-gray-600 mb-2">
                        Непривязанные материалы
                      </Title>
                      {groupedItems.materials.map(material => (
                        <div key={material.id} className="bg-white border border-gray-200 rounded p-3 mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BgColorsOutlined className="text-gray-400" />
                              <Text>{material.description}</Text>
                            </div>
                            <Button
                              type="link"
                              size="small"
                              icon={<LinkOutlined />}
                              onClick={() => handleMoveItem(material, null)}
                            >
                              Привязать к работе
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Quick Add Modal */}
      <Modal
        title="Быстрое добавление"
        open={quickAddModalVisible}
        onCancel={() => {
          setQuickAddModalVisible(false);
          quickAddForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Tabs 
          activeKey={quickAddType} 
          onChange={(key) => setQuickAddType(key as 'work' | 'material')}
        >
          <TabPane tab={<span><ToolOutlined /> Работа</span>} key="work">
            <Form
              form={quickAddForm}
              layout="vertical"
              onFinish={handleQuickAddWork}
            >
              <Form.Item
                name="name"
                label="Наименование работы"
                rules={[{ required: true, message: 'Введите название работы' }]}
              >
                <Input placeholder="Введите название работы..." />
              </Form.Item>

              <div className="grid grid-cols-3 gap-4">
                <Form.Item
                  name="volume"
                  label="Объем"
                  rules={[{ required: true, message: 'Введите объем' }]}
                >
                  <InputNumber 
                    placeholder="1000" 
                    style={{ width: '100%' }}
                    min={0}
                  />
                </Form.Item>

                <Form.Item
                  name="unit"
                  label="Единица измерения"
                  initialValue="м²"
                >
                  <Select>
                    <Select.Option value="м²">м²</Select.Option>
                    <Select.Option value="м³">м³</Select.Option>
                    <Select.Option value="шт">шт</Select.Option>
                    <Select.Option value="кг">кг</Select.Option>
                    <Select.Option value="т">т</Select.Option>
                    <Select.Option value="м">м</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="pricePerUnit"
                  label="Цена за единицу (₽)"
                  rules={[{ required: true, message: 'Введите цену' }]}
                >
                  <InputNumber 
                    placeholder="24191.136" 
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                  />
                </Form.Item>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setQuickAddModalVisible(false)}>
                  Отмена
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Добавить работу
                </Button>
              </div>
            </Form>
          </TabPane>

          <TabPane tab={<span><BgColorsOutlined /> Материал</span>} key="material">
            <Form
              form={quickAddForm}
              layout="vertical"
              onFinish={handleQuickAddMaterial}
            >
              <Form.Item
                name="name"
                label="Наименование материала"
                rules={[{ required: true, message: 'Введите название материала' }]}
              >
                <Input 
                  placeholder="Поиск или введите название..." 
                  prefix={<SearchOutlined />}
                />
              </Form.Item>

              <Form.Item
                name="targetWorkId"
                label="Привязать к работе"
                rules={[{ required: true, message: 'Выберите работу' }]}
              >
                <Select placeholder="Выберите работу...">
                  {availableWorks.map(work => (
                    <Select.Option key={work.id} value={work.id}>
                      {work.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <div className="grid grid-cols-4 gap-4">
                <Form.Item
                  name="conversionFactor"
                  label="К. перевода"
                  rules={[{ required: true, message: 'Введите коэффициент' }]}
                >
                  <InputNumber 
                    placeholder="100" 
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                  />
                </Form.Item>

                <Form.Item
                  name="consumptionFactor"
                  label="К. расхода"
                  rules={[{ required: true, message: 'Введите коэффициент' }]}
                >
                  <InputNumber 
                    placeholder="7" 
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                  />
                </Form.Item>

                <Form.Item
                  name="pricePerUnit"
                  label="Цена за ед. (₽)"
                  rules={[{ required: true, message: 'Введите цену' }]}
                >
                  <InputNumber 
                    placeholder="44.00" 
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                  />
                </Form.Item>

                <Form.Item
                  name="unit"
                  label="Единица"
                  initialValue="шт"
                >
                  <Select>
                    <Select.Option value="шт">шт</Select.Option>
                    <Select.Option value="К/т">К/т</Select.Option>
                    <Select.Option value="К/м²">К/м²</Select.Option>
                    <Select.Option value="К/м³">К/м³</Select.Option>
                    <Select.Option value="К/кг">К/кг</Select.Option>
                  </Select>
                </Form.Item>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setQuickAddModalVisible(false)}>
                  Отмена
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Добавить материал
                </Button>
              </div>
            </Form>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Move Material Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SwapOutlined className="text-purple-600" />
            <span>Переместить "{moveModal.item?.description}"</span>
          </div>
        }
        open={moveModal.visible}
        onCancel={() => setMoveModal({ visible: false, item: null, fromWorkId: null })}
        footer={null}
      >
        <div className="mt-4">
          <Text className="block mb-3">Выберите работу для привязки материала:</Text>
          <List
            dataSource={availableWorks.filter(w => w.id !== moveModal.fromWorkId)}
            renderItem={(work) => (
              <List.Item
                className="cursor-pointer hover:bg-gray-50 px-3 py-2 rounded"
                onClick={() => handleMoveToWork(work.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <Text strong>{work.description}</Text>
                    <div className="text-sm text-gray-500">
                      {work.quantity} {work.unit}
                    </div>
                  </div>
                  <ArrowDownOutlined className="text-gray-400" />
                </div>
              </List.Item>
            )}
            locale={{ emptyText: 'Нет доступных работ' }}
          />
        </div>
      </Modal>

      {/* Edit Position Modal */}
      <Modal
        title="Редактировать позицию"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          className="mt-4"
        >
          <Form.Item
            name="title"
            label="Название позиции"
            rules={[{ required: true, message: 'Введите название позиции' }]}
          >
            <Input placeholder="Название позиции заказчика" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              placeholder="Подробное описание позиции"
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="category"
              label="Категория"
            >
              <Input placeholder="Категория работ" />
            </Form.Item>

            <Form.Item
              name="status"
              label="Статус"
              rules={[{ required: true, message: 'Выберите статус' }]}
            >
              <Select placeholder="Выберите статус">
                <Select.Option value="active">Активна</Select.Option>
                <Select.Option value="inactive">Неактивна</Select.Option>
                <Select.Option value="completed">Завершена</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="priority"
            label="Приоритет"
          >
            <Select placeholder="Выберите приоритет">
              <Select.Option value={1}>Высокий</Select.Option>
              <Select.Option value={2}>Средний</Select.Option>
              <Select.Option value={3}>Низкий</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Button onClick={() => setEditModalVisible(false)}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Сохранить
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Удалить позицию"
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onOk={handleDelete}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ danger: true, loading }}
      >
        <p>
          Вы уверены, что хотите удалить позицию <strong>"{position.title}"</strong>?
        </p>
        {totalItems > 0 && (
          <p className="text-amber-600">
            Внимание: Также будут удалены все {totalItems} элементов в этой позиции.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default OptimizedClientPositionCard;