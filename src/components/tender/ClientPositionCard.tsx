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
  Badge
} from 'antd';
import {
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  MoreOutlined,
  ToolOutlined,
  BgColorsOutlined,
  CalculatorOutlined,
  EyeOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BOQItemList from './BOQItemList';
import { clientPositionsApi } from '../../lib/supabase/api';
import type { 
  ClientPositionWithItems, 
  ClientPositionUpdate
} from '../../lib/supabase/types';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

interface ClientPositionCardProps {
  position: ClientPositionWithItems;
  isExpanded: boolean;
  onToggle: () => void;
  onAddItems: () => void;
  onUpdate: () => void;
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

const ClientPositionCard: React.FC<ClientPositionCardProps> = ({
  position,
  isExpanded,
  onToggle,
  onAddItems,
  onUpdate
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // DnD Kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.id });

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

      message.success('Позиция обновлена');
      setEditModalVisible(false);
      onUpdate();
    } catch (error) {
      message.error('Ошибка обновления позиции');
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  }, [position.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    try {
      const result = await clientPositionsApi.delete(position.id);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Позиция удалена');
      setDeleteModalVisible(false);
      onUpdate();
    } catch (error) {
      message.error('Ошибка удаления позиции');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  }, [position.id, onUpdate]);

  const handleDuplicate = useCallback(async () => {
    setLoading(true);
    try {
      // Create duplicate position (API should handle this)
      message.info('Функция дублирования будет реализована в следующей версии');
    } catch {
      message.error('Ошибка дублирования позиции');
    } finally {
      setLoading(false);
    }
  }, []);

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
      onClick: handleDuplicate
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
  ], [onToggle, handleEdit, handleDuplicate]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        transition-all duration-200 
        ${isDragging ? 'z-50' : ''}
      `}
    >
      <Card
        className={`
          position-card hover:shadow-lg transition-shadow duration-200
          ${isExpanded ? 'ring-2 ring-blue-200' : ''}
          ${isDragging ? 'shadow-2xl border-blue-400' : ''}
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
                  {/* Drag Handle */}
                  <div
                    {...attributes}
                    {...listeners}
                    className="p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing transition-colors duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DragOutlined className="text-gray-400" />
                  </div>

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
                  <Tooltip title="Добавить элементы">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={onAddItems}
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
                    {totalCost.toLocaleString('ru-RU')} ₽
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
                {/* Position Details */}
                {(position.description || position.category) && (
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {position.description && (
                        <div>
                          <Text type="secondary" className="text-xs uppercase tracking-wide">
                            Описание
                          </Text>
                          <Text className="block mt-1">{position.description}</Text>
                        </div>
                      )}
                      {position.category && (
                        <div>
                          <Text type="secondary" className="text-xs uppercase tracking-wide">
                            Категория
                          </Text>
                          <Text className="block mt-1">{position.category}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BOQ Items */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <Title level={5} className="mb-0">
                      Материалы и работы ({totalItems})
                    </Title>
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={onAddItems}
                    >
                      Добавить элементы
                    </Button>
                  </div>

                  <BOQItemList
                    items={position.boq_items || []}
                    clientPositionId={position.id}
                    onUpdate={onUpdate}
                    maxHeight={400}
                  />
                </div>
              </div>
            )}
        </Card>

        {/* Edit Modal */}
        <Modal
            title="Редактировать позицию"
            open={editModalVisible}
            onCancel={() => setEditModalVisible(false)}
            footer={null}
            destroyOnHidden
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

export default ClientPositionCard;