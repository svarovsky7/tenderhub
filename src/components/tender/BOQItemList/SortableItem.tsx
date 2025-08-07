import React, { useCallback } from 'react';
import {
  Typography,
  Button,
  Tag,
  Input,
  InputNumber,
  Dropdown,
  Space
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  MoreOutlined,
  ToolOutlined,
  BgColorsOutlined,
  SaveOutlined,
  CloseOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MenuProps } from 'antd';
import type { SortableItemProps } from './types';

const { Text } = Typography;

const SortableItem: React.FC<SortableItemProps> = ({
  item,
  isLoading,
  editingItem,
  editable,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  setEditingItem
}) => {
  console.log('🚀 SortableItem rendered for item:', item.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditing = editingItem?.id === item.id;

  const handleEditInputChange = useCallback((value: string | number | null) => {
    console.log('📝 Edit input changed:', { itemId: item.id, field: editingItem?.field, value });
    if (editingItem && value !== null) {
      setEditingItem({ ...editingItem, value });
    }
  }, [editingItem, setEditingItem, item.id]);

  const handleStartEdit = useCallback((field: 'description' | 'quantity' | 'unit_rate') => {
    console.log('✏️ Starting edit for field:', { itemId: item.id, field });
    const currentValue = field === 'description' ? item.description : 
                        field === 'quantity' ? item.quantity : item.unit_rate;
    onStartEdit(item.id, field, currentValue);
  }, [item, onStartEdit]);

  const handleSaveEdit = useCallback(() => {
    console.log('💾 Saving edit:', editingItem);
    onSaveEdit();
  }, [onSaveEdit, editingItem]);

  const handleCancelEdit = useCallback(() => {
    console.log('❌ Canceling edit for item:', item.id);
    onCancelEdit();
  }, [onCancelEdit, item.id]);

  const handleDelete = useCallback(() => {
    console.log('🗑️ Delete clicked for item:', item.id);
    onDelete(item.id);
  }, [onDelete, item.id]);

  const handleDuplicate = useCallback(() => {
    console.log('📋 Duplicate clicked for item:', item.id);
    onDuplicate(item);
  }, [onDuplicate, item]);

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit-description',
      label: 'Редактировать описание',
      icon: <EditOutlined />,
      onClick: () => handleStartEdit('description'),
      disabled: !editable || isLoading
    },
    {
      key: 'edit-quantity',
      label: 'Изменить количество',
      icon: <EditOutlined />,
      onClick: () => handleStartEdit('quantity'),
      disabled: !editable || isLoading
    },
    {
      key: 'edit-rate',
      label: 'Изменить расценку',
      icon: <EditOutlined />,
      onClick: () => handleStartEdit('unit_rate'),
      disabled: !editable || isLoading
    },
    {
      type: 'divider'
    },
    {
      key: 'duplicate',
      label: 'Дублировать',
      icon: <CopyOutlined />,
      onClick: handleDuplicate,
      disabled: isLoading
    },
    {
      key: 'delete',
      label: 'Удалить',
      icon: <DeleteOutlined />,
      onClick: handleDelete,
      disabled: !editable || isLoading,
      danger: true
    }
  ];

  const typeIcon = item.item_type === 'material' ? 
    <BgColorsOutlined style={{ color: '#1890ff' }} /> : 
    <ToolOutlined style={{ color: '#52c41a' }} />;

  const typeColor = item.item_type === 'material' ? 'blue' : 'green';
  const typeLabel = item.item_type === 'material' ? 'Материал' : 'Работа';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow
        ${isDragging ? 'shadow-lg' : ''}
        ${isEditing ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1"
          >
            <DragOutlined />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Text strong className="text-sm">{item.item_number}</Text>
              <Tag color={typeColor} icon={typeIcon}>
                {typeLabel}
              </Tag>
            </div>

            <div>
              {isEditing && editingItem?.field === 'description' ? (
                <div className="space-y-2">
                  <Input
                    value={editingItem.value as string}
                    onChange={(e) => handleEditInputChange(e.target.value)}
                    onPressEnter={handleSaveEdit}
                    autoFocus
                  />
                  <Space>
                    <Button 
                      size="small" 
                      type="primary" 
                      icon={<SaveOutlined />} 
                      onClick={handleSaveEdit}
                      loading={isLoading}
                    >
                      Сохранить
                    </Button>
                    <Button 
                      size="small" 
                      icon={<CloseOutlined />} 
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      Отмена
                    </Button>
                  </Space>
                </div>
              ) : (
                <Text>{item.description}</Text>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <Text type="secondary">Количество:</Text>
                <div>
                  {isEditing && editingItem?.field === 'quantity' ? (
                    <div className="space-y-2">
                      <InputNumber
                        value={editingItem.value as number}
                        onChange={handleEditInputChange}
                        onPressEnter={handleSaveEdit}
                        min={0}
                        step={0.01}
                        style={{ width: '100%' }}
                        autoFocus
                      />
                      <Space>
                        <Button 
                          size="small" 
                          type="primary" 
                          icon={<SaveOutlined />} 
                          onClick={handleSaveEdit}
                          loading={isLoading}
                        >
                          Сохранить
                        </Button>
                        <Button 
                          size="small" 
                          icon={<CloseOutlined />} 
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          Отмена
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <Text strong>{item.quantity} {item.unit}</Text>
                  )}
                </div>
              </div>

              <div>
                <Text type="secondary">Расценка:</Text>
                <div>
                  {isEditing && editingItem?.field === 'unit_rate' ? (
                    <div className="space-y-2">
                      <InputNumber
                        value={editingItem.value as number}
                        onChange={handleEditInputChange}
                        onPressEnter={handleSaveEdit}
                        min={0}
                        step={0.01}
                        style={{ width: '100%' }}
                        formatter={(value) => `${value} ₽`}
                        parser={(value) => parseFloat(value!.replace(' ₽', '').replace(',', '.')) || 0}
                        autoFocus
                      />
                      <Space>
                        <Button 
                          size="small" 
                          type="primary" 
                          icon={<SaveOutlined />} 
                          onClick={handleSaveEdit}
                          loading={isLoading}
                        >
                          Сохранить
                        </Button>
                        <Button 
                          size="small" 
                          icon={<CloseOutlined />} 
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          Отмена
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <Text strong>{item.unit_rate?.toFixed(2)} ₽</Text>
                  )}
                </div>
              </div>

              <div>
                <Text type="secondary">Сумма:</Text>
                <div>
                  <Text strong className="text-green-600">
                    {item.total_amount?.toFixed(2)} ₽
                  </Text>
                </div>
              </div>
            </div>

            {item.notes && (
              <div>
                <Text type="secondary" className="text-xs">Примечания:</Text>
                <div>
                  <Text className="text-xs text-gray-600">{item.notes}</Text>
                </div>
              </div>
            )}
          </div>
        </div>

        <Dropdown 
          menu={{ items: menuItems }} 
          trigger={['click']}
          disabled={isLoading}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            loading={isLoading}
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default SortableItem;