import React, { useState, useCallback } from 'react';
import {
  Card,
  Typography,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Badge,
  Space,
  Tooltip,
  Empty,
  Table,
  InputNumber
} from 'antd';
import {
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  SearchOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { clientPositionsApi, boqApi } from '../../lib/supabase/api';
import type { 
  ClientPositionUpdate,
  BOQItemWithLibrary
} from '../../lib/supabase/types';

// Extended type with proper fields
interface ClientPositionWithItems {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  total_materials_cost: number;
  total_works_cost: number;
  created_at: string;
  updated_at: string;
  // Extended fields for UI
  title?: string;
  description?: string | null;
  category?: string | null;
  status?: 'active' | 'inactive' | 'completed';
  boq_items?: BOQItemWithLibrary[];
  materials_count?: number;
  works_count?: number;
  total_position_cost?: number;
}

const { Title, Text } = Typography;

interface ClientPositionCardSimpleProps {
  position: ClientPositionWithItems;
  isExpanded: boolean;
  onToggle: () => void;
  onAddItems: () => void;
  onUpdate: () => void;
  tenderId: string;
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

const ClientPositionCardSimple: React.FC<ClientPositionCardSimpleProps> = ({
  position,
  isExpanded,
  onToggle,
  onAddItems,
  onUpdate,
  tenderId
}) => {
  console.log('🚀 ClientPositionCardSimple rendered:', position.id);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Computed properties
  const totalItems = position.boq_items?.length || 0;
  const materialsCount = position.materials_count || 0;
  const worksCount = position.works_count || 0;
  const totalCost = position.total_position_cost || 0;

  // Handlers
  const handleEdit = useCallback(() => {
    console.log('🔍 Opening edit modal for position:', position.id);
    form.setFieldsValue({
      title: position.title,
      description: position.description,
      category: position.category,
      status: position.status
    });
    setEditModalVisible(true);
  }, [position, form]);

  const handleSave = useCallback(async (values: ClientPositionUpdate) => {
    console.log('🚀 Saving position updates:', values);
    setLoading(true);
    try {
      const result = await clientPositionsApi.update(position.id, values);
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Position updated successfully');
      message.success('Позиция обновлена');
      setEditModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления позиции');
    } finally {
      setLoading(false);
    }
  }, [position.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    console.log('🗑️ Deleting position:', position.id);
    setLoading(true);
    try {
      const result = await clientPositionsApi.delete(position.id);
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Position deleted successfully');
      message.success('Позиция удалена');
      setDeleteModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('❌ Delete error:', error);
      message.error('Ошибка удаления позиции');
    } finally {
      setLoading(false);
    }
  }, [position.id, onUpdate]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    console.log('🗑️ Deleting BOQ item:', itemId);
    try {
      const result = await boqApi.delete(itemId);
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ BOQ item deleted successfully');
      message.success('Элемент удален');
      onUpdate();
    } catch (error) {
      console.error('❌ Delete item error:', error);
      message.error('Ошибка удаления элемента');
    }
  }, [onUpdate]);

  const handleUpdateItemQuantity = useCallback(async (itemId: string, quantity: number) => {
    console.log('🔢 Updating item quantity:', { itemId, quantity });
    try {
      const result = await boqApi.update(itemId, { quantity });
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Quantity updated successfully');
      onUpdate();
    } catch (error) {
      console.error('❌ Update quantity error:', error);
      message.error('Ошибка обновления количества');
    }
  }, [onUpdate]);

  const handleUpdateItemRate = useCallback(async (itemId: string, unit_rate: number) => {
    console.log('💰 Updating item rate:', { itemId, unit_rate });
    try {
      const result = await boqApi.update(itemId, { unit_rate });
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Rate updated successfully');
      onUpdate();
    } catch (error) {
      console.error('❌ Update rate error:', error);
      message.error('Ошибка обновления цены');
    }
  }, [onUpdate]);

  // Table columns
  const columns: ColumnsType<BOQItemWithLibrary> = [
    {
      title: '№',
      dataIndex: 'item_number',
      key: 'item_number',
      width: 80,
      render: (text) => <Text className="font-mono">{text}</Text>
    },
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'work' ? 'green' : 'blue'}>
          {type === 'work' ? 'Работа' : 'Материал'}
        </Tag>
      )
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (value, record) => (
        editingItem === record.id ? (
          <InputNumber
            value={value}
            min={0}
            precision={2}
            style={{ width: '100%' }}
            onChange={(val) => {
              if (val !== null) {
                handleUpdateItemQuantity(record.id, val);
                setEditingItem(null);
              }
            }}
            onBlur={() => setEditingItem(null)}
            autoFocus
          />
        ) : (
          <div 
            onClick={() => setEditingItem(record.id)}
            className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
          >
            {value?.toFixed(2)}
          </div>
        )
      )
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center'
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      render: (value, record) => (
        <InputNumber
          value={value}
          min={0}
          precision={2}
          style={{ width: '100%' }}
          formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value!.replace(/₽\s?|(,*)/g, '')}
          onChange={(val) => {
            if (val !== null) {
              handleUpdateItemRate(record.id, val);
            }
          }}
        />
      )
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const total = (record.quantity || 0) * (record.unit_rate || 0);
        return (
          <Text strong>
            {total.toLocaleString('ru-RU', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })} ₽
          </Text>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(record.id)}
        />
      )
    }
  ];

  return (
    <Card
      className={`
        position-card hover:shadow-lg transition-shadow duration-200
        ${isExpanded ? 'ring-2 ring-blue-200' : ''}
      `}
      bodyStyle={{ padding: 0 }}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Position Icon & Number */}
            <Badge count={position.position_number} color="blue">
              {isExpanded ? (
                <FolderOpenOutlined className="text-xl text-blue-500" />
              ) : (
                <FolderOutlined className="text-xl text-gray-500" />
              )}
            </Badge>

            {/* Title & Description */}
            <div className="flex-1">
              <Title level={5} className="mb-0">
                {position.title || position.work_name}
              </Title>
              {position.description && (
                <Text type="secondary" className="text-sm">
                  {position.description}
                </Text>
              )}
            </div>

            {/* Status & Stats */}
            <Space size="large">
              {position.status && (
                <Tag color={statusColors[position.status]}>
                  {statusLabels[position.status]}
                </Tag>
              )}
              
              <div className="flex items-center gap-4">
                <Text>Материалы: {materialsCount}</Text>
                <Text>Работы: {worksCount}</Text>
              </div>

              <div className="flex items-center gap-2">
                <CalculatorOutlined className="text-gray-400" />
                <Text strong className="text-lg">
                  {totalCost.toLocaleString('ru-RU', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })} ₽
                </Text>
              </div>
            </Space>
          </div>

          {/* Action Buttons */}
          <Space onClick={(e) => e.stopPropagation()}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAddItems}
            >
              Добавить
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              Изменить
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeleteModalVisible(true)}
            >
              Удалить
            </Button>
          </Space>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4">
          {totalItems > 0 ? (
            <>
              <div className="flex justify-between items-center mb-3">
                <Title level={5} className="mb-0">
                  Материалы и работы ({totalItems})
                </Title>
                <Button
                  type="dashed"
                  size="small"
                  icon={<SearchOutlined />}
                  onClick={onAddItems}
                >
                  Добавить из справочника
                </Button>
              </div>
              
              <Table
                columns={columns}
                dataSource={position.boq_items || []}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ y: 400 }}
                summary={(pageData) => {
                  const total = pageData.reduce((sum, item) => 
                    sum + (item.quantity || 0) * (item.unit_rate || 0), 0
                  );
                  return (
                    <Table.Summary>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                          <Text strong>Итого:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text strong className="text-lg">
                            {total.toLocaleString('ru-RU', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })} ₽
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            </>
          ) : (
            <Empty
              description="Нет добавленных материалов и работ"
              className="py-8"
            >
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={onAddItems}
              >
                Добавить из справочника
              </Button>
            </Empty>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        title="Редактировать позицию"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
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

          <div className="flex justify-end gap-2 pt-4 border-t">
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
    </Card>
  );
};

export default ClientPositionCardSimple;