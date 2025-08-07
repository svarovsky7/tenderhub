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
  Progress,
  Form,
  Input,
  InputNumber,
  Select,
  Modal,
  Tabs,
  List,
  Checkbox,
  Badge,
  Divider,
  Spin
} from 'antd';
import QuickAddSearchBar from './QuickAddSearchBar';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  ToolOutlined,
  AppstoreOutlined,
  DollarOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FormInstance } from 'antd';
import { clientPositionsApi, boqItemsApi, materialsApi, worksApi } from '../../lib/supabase/api';
import type { ClientPosition, BOQItem, BOQItemInsert, Material, WorkItem } from '../../lib/supabase/types';
import ClientPositionForm from './ClientPositionForm';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TenderBOQManagerProps {
  tenderId: string;
}

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  items_count?: number;
}

const EditableContext = React.createContext<FormInstance<BOQItem> | null>(null);

// Each row now uses the common form instance provided via context
const EditableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  return <tr {...props} />;
};

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: keyof BOQItem;
  title: React.ReactNode;
  inputType: 'number' | 'text' | 'select';
  children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({
  editing,
  dataIndex,
  title,
  inputType,
  children,
  ...restProps
}) => {
  let inputNode: React.ReactNode;

  if (inputType === 'number') {
    inputNode = <InputNumber />;
  } else if (inputType === 'select') {
    inputNode = (
      <Select
        options={[
          { value: 'material', label: 'Материал' },
          { value: 'work', label: 'Работа' }
        ]}
      />
    );
  } else {
    inputNode = <Input />;
  }

  const rules = [{ required: true, message: `Введите ${title}` }];
  if (dataIndex === 'quantity') {
    rules.push({ type: 'number', min: 0.0001, message: 'Количество должно быть больше 0' });
  }
  if (dataIndex === 'unit_rate') {
    rules.push({ type: 'number', min: 0, message: 'Цена не может быть отрицательной' });
  }

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item name={dataIndex} style={{ margin: 0 }} rules={rules}>
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const TenderBOQManager: React.FC<TenderBOQManagerProps> = ({ tenderId }) => {
  const [positions, setPositions] = useState<PositionWithItems[]>([]);
  const [positionFormVisible, setPositionFormVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<ClientPosition | null>(null);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPositionId, setExpandedPositionId] = useState<string | null>(null);

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

  // Update form when editing item changes
  useEffect(() => {
    if (editingItem && editModalVisible) {
      form.setFieldsValue(editingItem);
    }
  }, [editingItem, editModalVisible, form]);





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

  const handleQuickAdd = useCallback(
    async (
      item: Material | WorkItem,
      type: 'material' | 'work',
      quantity: number,
      consumptionCoefficient: number,
      conversionCoefficient: number,
      positionId: string
    ) => {
      console.log('🚀 Quick add item to position:', {
        item: item.name,
        type,
        quantity,
        consumptionCoefficient,
        conversionCoefficient,
        positionId
      });
    
    try {
      // Find position to calculate next item number
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        console.error('❌ Position not found:', positionId);
        throw new Error('Позиция не найдена');
      }
      
      const existingItems = position.boq_items || [];
      const lastItemNumber = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => item.sub_number || 0))
        : 0;
      
      const newItemData: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: positionId,
        item_number: `${position.position_number}.${lastItemNumber + 1}`,
        sub_number: lastItemNumber + 1,
        sort_order: lastItemNumber + 1,
        item_type: type,
        description: item.name,
        unit: item.unit,
        quantity: quantity,
        unit_rate: 0, // Will be set manually by user
        material_id: type === 'material' ? item.id : null,
        work_id: type === 'work' ? item.id : null,
        consumption_coefficient: type === 'material' ? consumptionCoefficient : undefined,
        conversion_coefficient: type === 'material' ? conversionCoefficient : undefined
      };

      console.log('📡 Creating new BOQ item:', newItemData);
      
      const result = await boqItemsApi.create(newItemData);
      console.log('📦 Create result:', result);
      
      if (result.error) {
        console.error('❌ Create failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ BOQ item created successfully');
      message.success(`${type === 'material' ? 'Материал' : 'Работа'} "${item.name}" добавлена в позицию`);
      loadPositions(); // Reload to get updated data
    } catch (error) {
      console.error('💥 Quick add error:', error);
      message.error('Ошибка добавления элемента');
    }
  }, [positions, tenderId, loadPositions]);

  const handleTogglePosition = useCallback((positionId: string) => {
    console.log('🔄 Toggling position:', positionId);
    setExpandedPositionId(prev => prev === positionId ? null : positionId);
  }, []);

  // BOQ Item handlers
  const handleAddNewItem = (positionId: string) => {
    console.log('🖱️ Add new BOQ item clicked', { positionId });
    const position = positions.find((p) => p.id === positionId);
    console.log('📊 Position current items count:', position?.items_count);
    const newItem: BOQItem & { isNew?: boolean } = {
      id: 'new',
      isNew: true,
      item_type: 'work',
      description: '',
      unit: '',
      quantity: 1,
      unit_rate: 0,
      total_amount: 0,
    };
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? {
              ...p,
              boq_items: [...(p.boq_items || []), newItem],
              items_count: (p.items_count || 0) + 1,
            }
          : p
      )
    );
    console.log('📈 New items count:', (position?.items_count || 0) + 1);
    form.setFieldsValue(newItem);
    setEditingKey('new');
    setEditingPositionId(positionId);
  };

  const isEditing = (record: BOQItem, positionId: string) =>
    record.id === editingKey && positionId === editingPositionId;

  const edit = (record: BOQItem, positionId: string) => {
    console.log('✏️ Edit BOQ item', { positionId, recordId: record.id });
    setEditingItem(record);
    setEditingPositionId(positionId);
    setEditModalVisible(true);
  };

  const cancelEdit = () => {
    console.log('🛑 Edit cancel');
    setEditingKey('');
    setEditingPositionId(null);
  };

  const save = async (positionId: string, key: React.Key) => {
    console.log('💾 Save BOQ item', { positionId, key });
    try {
      const row = (await form.validateFields()) as Partial<BOQItem>;
      const position = positions.find((p) => p.id === positionId);
      if (!position) return;
      const newData = [...(position.boq_items || [])];
      const index = newData.findIndex((item) => item.id === key);
      if (index > -1) {
        const item = newData[index];
        const quantity = row.quantity ?? item.quantity;
        const unitRate = row.unit_rate ?? item.unit_rate;

        if (quantity <= 0) {
          message.error('Количество должно быть больше 0');
          console.error('❌ Invalid quantity', { quantity });
          return;
        }
        if (unitRate < 0) {
          message.error('Цена не может быть отрицательной');
          console.error('❌ Invalid unit_rate', { unitRate });
          return;
        }

        const updated = {
          ...item,
          ...row,
          quantity,
          unit_rate: unitRate,
          total_amount: quantity * unitRate,
        };
        console.log('📊 Items count before save:', (position.boq_items || []).length);
        if (key === 'new') {
          const {
            id: _id,
            isNew,
            total_amount: _totalAmount,
            item_number: _itemNumber,
            sub_number: _subNumber,
            sort_order: _sortOrder,
            ...payload
          } = updated as BOQItem & { isNew?: boolean };
          const createPayload: Partial<BOQItem> & {
            tender_id: string;
            client_position_id: string;
          } = {
            ...payload,
            tender_id: tenderId,
            client_position_id: positionId,
          };
          console.log('📡 Calling boqItemsApi.create', createPayload);
          const result = await boqItemsApi.create(createPayload);
          console.log('📩 boqItemsApi.create result', result);
          if (result.error || !result.data) {
            message.error('Не удалось сохранить элемент');
            console.error('❌ Create BOQ item error', result.error);
            return;
          }
          const savedItem = {
            ...updated,
            ...result.data,
            total_amount: quantity * unitRate,
          };
          console.log('💾 Merging created item into state', savedItem);
          newData[index] = savedItem;
        } else {
          const { total_amount: _totalAmount, ...updatePayload } =
            updated as BOQItem;
          console.log('📡 Calling boqItemsApi.update', {
            id: key,
            payload: updatePayload,
          });
          const result = await boqItemsApi.update(
            key as string,
            updatePayload as Partial<BOQItem>
          );
          console.log('📩 boqItemsApi.update result', result);
          if (result.error || !result.data) {
            message.error('Не удалось обновить элемент');
            console.error('❌ Update BOQ item error', result.error);
            return;
          }
          const savedItem = { ...updated, ...result.data, total_amount: quantity * unitRate };
          console.log('💾 Merging updated item into state', savedItem);
          newData[index] = savedItem;
        }
        setPositions((prev) =>
          prev.map((p) =>
            p.id === positionId
              ? { ...p, boq_items: newData, items_count: newData.length }
              : p
          )
        );
        console.log('📈 Items count after save:', newData.length);
        form.resetFields();
        setEditingKey('');
        setEditingPositionId(null);
        message.success('Элемент сохранен');
      }
    } catch (err) {
      console.error('💥 Save failed', err);
    }
  };

  const handleDeleteBOQItem = async (itemId: string) => {
    console.log('🖱️ Delete BOQ item clicked', { itemId });
    try {
      console.log('📡 Calling boqItemsApi.delete', { itemId });
      const result = await boqItemsApi.delete(itemId);
      console.log('📩 boqItemsApi.delete result', result);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Элемент BOQ удален');
      loadPositions();
    } catch (error) {
      console.error('❌ Delete BOQ item error', error);
      message.error(`Ошибка удаления элемента: ${error}`);
    }
  };

  // BOQ Items table columns
  const getBoqColumns = (positionId: string): ColumnsType<BOQItem> => {
    const columns: (ColumnsType<BOQItem>[number] & {
      editable?: boolean;
      dataIndex?: keyof BOQItem;
    })[] = [
      {
        title: '№ п.п',
        dataIndex: 'sub_number',
        key: 'sub_number',
        width: 60,
        render: (_value, record) => <Text strong>{record.item_number}</Text>,
      },
      {
        title: 'Наименование работ',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        editable: true,
        render: (text, record) => (
          <div>
            <Text strong>{text}</Text>
            <div>
              <Tag
                color={record.item_type === 'material' ? 'blue' : 'green'}
                icon={record.item_type === 'material' ? <AppstoreOutlined /> : <ToolOutlined />}
                size="small"
                className="mt-1"
              >
                {record.item_type === 'material' ? 'Материал' : 'Работа'}
              </Tag>
            </div>
          </div>
        ),
      },
      {
        title: 'Ед. изм.',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
        align: 'center',
        editable: true,
      },
      {
        title: 'Объем работ',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        align: 'right',
        editable: true,
        render: (value) =>
          Number(value).toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          }),
      },
      // Note: client_note is at position level, not BOQ item level - removed this column
      {
        title: 'Цена за ед.',
        dataIndex: 'unit_rate',
        key: 'unit_rate',
        width: 120,
        align: 'right',
        editable: true,
        render: (value) =>
          `${Number(value).toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ₽`,
      },
      {
        title: 'Сумма',
        dataIndex: 'total_amount',
        key: 'total_amount',
        width: 130,
        align: 'right',
        render: (value, record) => {
          const editing = isEditing(record, positionId);
          const qty = editing ? form.getFieldValue('quantity') ?? record.quantity : record.quantity;
          const rate = editing ? form.getFieldValue('unit_rate') ?? record.unit_rate : record.unit_rate;
          const amount = Number(qty) * Number(rate);
          return (
            <Text strong style={{ color: '#52c41a' }}>
              {Number(amount).toLocaleString('ru-RU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} ₽
            </Text>
          );
        },
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 100,
        render: (_: unknown, record: BOQItem) => {
          const editable = isEditing(record, positionId);
          return editable ? (
            <Space size="small">
              <Tooltip title="Сохранить">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => save(positionId, record.id)}
                />
              </Tooltip>
              <Tooltip title="Отмена">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={cancelEdit}
                />
              </Tooltip>
            </Space>
          ) : (
            <Space size="small">
              <Tooltip title="Редактировать">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => edit(record, positionId)}
                />
              </Tooltip>
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
            </Space>
          );
        },
      },
    ];

    return columns.map((col) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record: BOQItem) => ({
          record,
          inputType:
            col.dataIndex === 'quantity' || col.dataIndex === 'unit_rate'
              ? 'number'
              : 'text', // Removed item_type select since it's now shown as tag
          dataIndex: col.dataIndex!,
          title: col.title,
          editing: isEditing(record, positionId),
        }),
      };
    });
  };

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
          <div className="space-y-4">
            {/* Render each position as a clickable card */}
            {positions.map((position) => (
              <Card 
                key={position.id} 
                className="position-card border border-gray-200 shadow-sm"
                title={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Text strong className="text-lg text-blue-600">
                        Позиция {position.position_number}
                      </Text>
                      <Text strong className="text-base">
                        {position.title}
                      </Text>
                      <Tag color="blue" size="small">
                        {(position.boq_items || []).length} элементов
                      </Tag>
                    </div>
                    <Space>
                      <Button
                        type="text" 
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditPosition(position)}
                      >
                        Редактировать
                      </Button>
                      <Popconfirm
                        title="Удалить позицию?"
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
                        >
                          Удалить
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                }
                bodyStyle={{ padding: 0 }}
              >
                {/* Quick Add Search Bar */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <Text strong className="block mb-3 text-gray-700">
                    Быстрое добавление в позицию {position.position_number}
                  </Text>
                  <QuickAddSearchBar
                    onAddItem={(item, type, quantity, consumption, conversion) =>
                      handleQuickAdd(item, type, quantity, consumption || 1, conversion || 1, position.id)
                    }
                    placeholder="Поиск материалов и работ для добавления в позицию..."
                  />
                </div>

                {/* BOQ Items */}
                <div className="p-4">
                  {(position.boq_items || []).length === 0 ? (
                    <Empty 
                      size="small"
                      description="В позиции пока нет элементов"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    <div className="space-y-3">
                      {(position.boq_items || []).map((item, itemIndex) => (
                        <Card 
                          key={`${position.id}-${item.id}`} 
                          size="small"
                          className="border-l-4 border-l-blue-500 hover:shadow-md transition-all"
                        >
                          <div 
                            className="p-2"
                          >
                    <Row gutter={16} align="middle">
                      <Col span={2}>
                        <Text strong className="text-lg text-blue-600">
                          {position.position_number}.{itemIndex + 1}
                        </Text>
                      </Col>
                      <Col span={8}>
                        <div>
                          <Text strong className="text-base block">
                            {item.description}
                          </Text>
                          <Tag
                            color={item.item_type === 'material' ? 'blue' : 'green'}
                            icon={item.item_type === 'material' ? <AppstoreOutlined /> : <ToolOutlined />}
                            size="small"
                          >
                            {item.item_type === 'material' ? 'Материал' : 'Работа'}
                          </Tag>
                        </div>
                      </Col>
                      <Col span={3}>
                        <div className="text-center">
                          <Text type="secondary" className="block text-xs">Ед. изм.</Text>
                          <Text strong>{item.unit}</Text>
                        </div>
                      </Col>
                      <Col span={3}>
                        <div className="text-center">
                          <Text type="secondary" className="block text-xs">Объем работ</Text>
                          <Text strong>
                            {Number(item.quantity).toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 4,
                            })}
                          </Text>
                        </div>
                      </Col>
                      <Col span={4}>
                        <div className="text-center">
                          <Text type="secondary" className="block text-xs">Примечание Заказчика</Text>
                          <Text type="secondary">{position.client_note || '-'}</Text>
                        </div>
                      </Col>
                      <Col span={2}>
                        <div className="text-center">
                          <Text type="secondary" className="block text-xs">Цена</Text>
                          <Text strong>
                            {Number(item.unit_rate).toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ₽
                          </Text>
                        </div>
                      </Col>
                      <Col span={2}>
                        <Space>
                          <Tooltip title="Редактировать">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                edit(item, position.id);
                              }}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="Удалить элемент?"
                            description="Это действие нельзя отменить."
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDeleteBOQItem(item.id);
                            }}
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
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      </Col>
                    </Row>
                  </div>
                  
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            
          </div>
        )}
      </Card>

      {/* Modals */}
      <ClientPositionForm
        tenderId={tenderId}
        visible={positionFormVisible}
        onCancel={() => setPositionFormVisible(false)}
        onSuccess={handlePositionSuccess}
        editingPosition={editingPosition}
      />

      {/* BOQ Item Edit Modal */}
      <Modal
        title="Редактирование элемента BOQ"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingItem(null);
          setEditingPositionId(null);
        }}
        onOk={() => {
          if (editingItem && editingPositionId) {
            form.validateFields().then(async (values) => {
              try {
                const quantity = Number(values.quantity);
                const unitRate = Number(values.unit_rate);
                
                if (quantity <= 0) {
                  message.error('Количество должно быть больше 0');
                  return;
                }
                if (unitRate < 0) {
                  message.error('Цена не может быть отрицательной');
                  return;
                }

                const updatePayload = {
                  ...values,
                  quantity,
                  unit_rate: unitRate
                };

                const result = await boqItemsApi.update(editingItem.id, updatePayload);
                if (result.error) {
                  throw new Error(result.error);
                }

                message.success('Элемент обновлен');
                setEditModalVisible(false);
                setEditingItem(null);
                setEditingPositionId(null);
                form.resetFields();
                loadPositions();
              } catch (error) {
                message.error(`Ошибка обновления: ${error}`);
              }
            });
          }
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {editingItem && (
          <Form
            form={form}
            layout="vertical"
            initialValues={editingItem}
            key={editingItem.id} // Force re-render when item changes
          >
          <Form.Item
            name="description"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование' }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="Ед. изм."
                rules={[{ required: true, message: 'Введите единицу измерения' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[
                  { required: true, message: 'Введите количество' },
                  { type: 'number', min: 0.0001, message: 'Количество должно быть больше 0' }
                ]}
              >
                <InputNumber className="w-full" precision={4} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_rate"
                label="Цена за ед."
                rules={[
                  { required: true, message: 'Введите цену' },
                  { type: 'number', min: 0, message: 'Цена не может быть отрицательной' }
                ]}
              >
                <InputNumber 
                  className="w-full" 
                  precision={2}
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="item_type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select>
              <Select.Option value="material">Материал</Select.Option>
              <Select.Option value="work">Работа</Select.Option>
            </Select>
          </Form.Item>
          </Form>
        )}
      </Modal>


    </div>
  );
};

export default TenderBOQManager;
