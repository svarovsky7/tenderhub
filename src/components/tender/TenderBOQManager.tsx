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
  Select
} from 'antd';
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
import { clientPositionsApi, boqItemsApi } from '../../lib/supabase/api';
import type { ClientPosition, BOQItem } from '../../lib/supabase/types';
import ClientPositionForm from './ClientPositionForm';

const { Title, Text } = Typography;

interface TenderBOQManagerProps {
  tenderId: string;
}

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  items_count?: number;
}

const EditableContext = React.createContext<FormInstance<BOQItem> | null>(null);

const EditableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
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

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: `Введите ${title}` }]}
        >
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
  const handleAddNewItem = (positionId: string) => {
    console.log('🖱️ Add new BOQ item clicked', { positionId });
    const newItem: BOQItem & { isNew?: boolean } = {
      id: 'new',
      isNew: true,
      item_type: 'work',
      description: '',
      unit: '',
      quantity: 0,
      unit_rate: 0,
      total_amount: 0,
    };
    setPositions((prev) =>
      prev.map((p) =>
        p.id === positionId
          ? { ...p, boq_items: [...(p.boq_items || []), newItem] }
          : p
      )
    );
    form.setFieldsValue(newItem);
    setEditingKey('new');
    setEditingPositionId(positionId);
  };

  const isEditing = (record: BOQItem, positionId: string) =>
    record.id === editingKey && positionId === editingPositionId;

  const edit = (record: BOQItem, positionId: string) => {
    console.log('✏️ Edit BOQ item', { positionId, recordId: record.id });
    form.setFieldsValue({ ...record });
    setEditingKey(record.id);
    setEditingPositionId(positionId);
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
        const updated = {
          ...item,
          ...row,
          total_amount: (row.quantity ?? item.quantity) * (row.unit_rate ?? item.unit_rate),
        };
        if (key === 'new') {
          console.log('📡 Calling boqItemsApi.create', updated);
          const { id: _id, isNew, ...payload } = updated as BOQItem & {
            isNew?: boolean;
          };
          const createPayload: Partial<BOQItem> & {
            tender_id: string;
            client_position_id: string;
          } = {
            ...payload,
            tender_id: tenderId,
            client_position_id: positionId,
          };
          const result = await boqItemsApi.create(createPayload);
          console.log('📩 boqItemsApi.create result', result);
          if (result.error || !result.data) {
            message.error('Не удалось сохранить элемент');
            console.error('❌ Create BOQ item error', result.error);
            return;
          }
          newData[index] = result.data;
        } else {
          console.log('📡 Calling boqItemsApi.update', { id: key, payload: updated });
          const result = await boqItemsApi.update(
            key as string,
            updated as Partial<BOQItem>
          );
          console.log('📩 boqItemsApi.update result', result);
          if (result.error) {
            message.error('Не удалось обновить элемент');
            console.error('❌ Update BOQ item error', result.error);
            return;
          }
          newData[index] = updated as BOQItem;
        }
        setPositions((prev) =>
          prev.map((p) => (p.id === positionId ? { ...p, boq_items: newData } : p))
        );
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
        title: '№',
        dataIndex: 'sub_number',
        key: 'sub_number',
        width: 60,
        render: (_value, record) => <Text strong>{record.item_number}</Text>,
      },
      {
        title: 'Тип',
        dataIndex: 'item_type',
        key: 'item_type',
        width: 80,
        editable: true,
        render: (type) => (
          <Tag
            color={type === 'material' ? 'blue' : 'green'}
            icon={type === 'material' ? <AppstoreOutlined /> : <ToolOutlined />}
          >
            {type === 'material' ? 'Материал' : 'Работа'}
          </Tag>
        ),
      },
      {
        title: 'Наименование',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        editable: true,
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
        ),
      },
      {
        title: 'Ед.изм.',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
        align: 'center',
        editable: true,
      },
      {
        title: 'Количество',
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
        render: (value) => (
          <Text strong style={{ color: '#52c41a' }}>
            {Number(value).toLocaleString('ru-RU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ₽
          </Text>
        ),
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
              : col.dataIndex === 'item_type'
                ? 'select'
                : 'text',
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
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddNewItem(position.id)}
                    >
                      Добавить элемент
                    </Button>
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

                  <Form form={form} component={false}>
                    <Table
                      components={{
                        body: {
                          row: EditableRow,
                          cell: EditableCell,
                        },
                      }}
                      columns={getBoqColumns(position.id)}
                      dataSource={position.boq_items || []}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      locale={{
                        emptyText: (
                          <Empty
                            description="Элементы BOQ не добавлены"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          >
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleAddNewItem(position.id)}
                            >
                              Добавить элемент BOQ
                            </Button>
                          </Empty>
                        ),
                      }}
                    />
                  </Form>
                </div>
              )
            }))}
          />
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

    </div>
  );
};

export default TenderBOQManager;
