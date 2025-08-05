import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Typography,
  Button,
  Tag,
  Input,
  InputNumber,
  Dropdown,
  Modal,
  message,
  Empty
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
import { FixedSizeList as VirtualList } from 'react-window';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { boqApi } from '../../lib/supabase/api';
import type { 
  BOQItemWithLibrary, 
  BOQItemUpdate
} from '../../lib/supabase/types';
import type { MenuProps } from 'antd';

const { Text } = Typography;

interface BOQItemListProps {
  items: BOQItemWithLibrary[];
  clientPositionId: string;
  onUpdate: () => void;
  maxHeight?: number;
  searchable?: boolean;
  editable?: boolean;
}

interface EditingItem {
  id: string;
  field: 'description' | 'quantity' | 'unit_rate';
  value: string | number;
}

interface SortableItemProps {
  item: BOQItemWithLibrary;
  isLoading: boolean;
  editingItem: EditingItem | null;
  editable: boolean;
  onStartEdit: (itemId: string, field: 'description' | 'quantity' | 'unit_rate', currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (item: BOQItemWithLibrary) => void;
  setEditingItem: React.Dispatch<React.SetStateAction<EditingItem | null>>;
}

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

  const total = (item.quantity || 0) * (item.unit_rate || 0);
  const isEditing = editingItem?.id === item.id;

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      disabled: !editable
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Дублировать',
      onClick: () => onDuplicate(item),
      disabled: !editable
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Удалить элемент?',
          content: `Вы уверены, что хотите удалить "${item.description}"?`,
          okText: 'Удалить',
          cancelText: 'Отмена',
          okButtonProps: { danger: true },
          onOk: () => onDelete(item.id)
        });
      },
      disabled: !editable
    }
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 ${isDragging ? 'z-50' : ''}`}
    >
      <div className={`
        bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow duration-200
        ${isLoading ? 'opacity-60' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}>
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          {editable && (
            <div
              {...attributes}
              {...listeners}
              className="mt-1 p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
            >
              <DragOutlined className="text-gray-400 text-sm" />
            </div>
          )}

          {/* Item Type Icon */}
          <div className="mt-1">
            {item.item_type === 'material' ? (
              <BgColorsOutlined className="text-blue-500" />
            ) : (
              <ToolOutlined className="text-green-500" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                {/* Description */}
                {isEditing && editingItem.field === 'description' ? (
                  <div className="mb-2">
                    <Input.TextArea
                      value={editingItem.value as string}
                      onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                      onPressEnter={onSaveEdit}
                      onBlur={onSaveEdit}
                      autoFocus
                      rows={2}
                      className="mb-1"
                    />
                    <div className="flex gap-1">
                      <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSaveEdit}>
                        Сохранить
                      </Button>
                      <Button size="small" icon={<CloseOutlined />} onClick={onCancelEdit}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Text
                    className="block font-medium cursor-pointer hover:text-blue-600 transition-colors duration-200"
                    onClick={() => editable && onStartEdit(item.id, 'description', item.description)}
                    title={editable ? 'Нажмите для редактирования' : undefined}
                  >
                    {item.description}
                  </Text>
                )}

                {/* Item Number & Category */}
                <div className="flex items-center gap-2 mt-1">
                  {item.item_number && (
                    <Text type="secondary" className="text-sm">
                      №{item.item_number}
                    </Text>
                  )}
                  <Tag
                    color={item.item_type === 'material' ? 'blue' : 'green'}
                  >
                    {item.item_type === 'material' ? 'Материал' : 'Работа'}
                  </Tag>
                  {item.category && (
                    <Tag>{item.category}</Tag>
                  )}
                </div>

                {/* Source info */}
                {(item.material || item.work_item) && (
                  <Text type="secondary" className="text-xs block mt-1">
                    Из справочника: {item.material?.name || item.work_item?.name}
                  </Text>
                )}
              </div>

              {/* Actions */}
              {editable && (
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
              )}
            </div>

            {/* Quantity, Unit, Rate, Total */}
            <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
              {/* Quantity */}
              <div>
                <Text type="secondary" className="text-xs block">Количество</Text>
                {isEditing && editingItem.field === 'quantity' ? (
                  <InputNumber
                    value={editingItem.value as number}
                    onChange={(value) => setEditingItem({ ...editingItem, value: value || 0 })}
                    onPressEnter={onSaveEdit}
                    onBlur={onSaveEdit}
                    autoFocus
                    size="small"
                    className="w-full"
                    min={0}
                    step={0.01}
                  />
                ) : (
                  <Text
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => editable && onStartEdit(item.id, 'quantity', item.quantity)}
                    title={editable ? 'Нажмите для редактирования' : undefined}
                  >
                    {item.quantity?.toFixed(2)}
                  </Text>
                )}
              </div>

              {/* Unit */}
              <div>
                <Text type="secondary" className="text-xs block">Ед. изм.</Text>
                <Text>{item.unit}</Text>
              </div>

              {/* Unit Rate */}
              <div>
                <Text type="secondary" className="text-xs block">Цена за ед.</Text>
                {isEditing && editingItem.field === 'unit_rate' ? (
                  <InputNumber
                    value={editingItem.value as number}
                    onChange={(value) => setEditingItem({ ...editingItem, value: value || 0 })}
                    onPressEnter={onSaveEdit}
                    onBlur={onSaveEdit}
                    autoFocus
                    size="small"
                    className="w-full"
                    min={0}
                    step={0.01}
                    formatter={(value) => `${value} ₽`}
                    parser={(value) => parseFloat(value!.replace(' ₽', ''))}
                  />
                ) : (
                  <Text
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => editable && onStartEdit(item.id, 'unit_rate', item.unit_rate)}
                    title={editable ? 'Нажмите для редактирования' : undefined}
                  >
                    {item.unit_rate?.toFixed(2)} ₽
                  </Text>
                )}
              </div>

              {/* Total */}
              <div>
                <Text type="secondary" className="text-xs block">Сумма</Text>
                <Text strong className="text-blue-600">
                  {total.toFixed(2)} ₽
                </Text>
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <Text type="secondary" className="text-xs">
                  {item.notes}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BOQItemList: React.FC<BOQItemListProps> = ({
  items = [],
  clientPositionId,
  onUpdate,
  maxHeight = 300,
  searchable = true,
  editable = true
}) => {
  const [searchText, setSearchText] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [loading, setLoading] = useState<Set<string>>(new Set());
  // const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const listRef = useRef<VirtualList>(null);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchText) return items;
    
    const searchLower = searchText.toLowerCase();
    return items.filter(item => 
      item.description.toLowerCase().includes(searchLower) ||
      item.item_number?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower)
    );
  }, [items, searchText]);

  // Handlers
  const handleStartEdit = useCallback((itemId: string, field: 'description' | 'quantity' | 'unit_rate', currentValue: string | number) => {
    setEditingItem({ id: itemId, field, value: currentValue });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem || !editable) return;

    const itemId = editingItem.id;
    setLoading(prev => new Set(prev).add(itemId));

    try {
      const updates: BOQItemUpdate = {
        [editingItem.field]: editingItem.value
      };

      const result = await boqApi.update(itemId, updates);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Элемент обновлен');
      setEditingItem(null);
      onUpdate();
    } catch (error) {
      message.error('Ошибка обновления элемента');
      console.error('Update error:', error);
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [editingItem, onUpdate, editable]);

  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleDelete = useCallback(async (itemId: string) => {
    if (!editable) return;

    setLoading(prev => new Set(prev).add(itemId));

    try {
      const result = await boqApi.delete(itemId);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Элемент удален');
      onUpdate();
    } catch (error) {
      message.error('Ошибка удаления элемента');
      console.error('Delete error:', error);
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [onUpdate, editable]);

  const handleDuplicate = useCallback(async (item: BOQItemWithLibrary) => {
    if (!editable) return;

    setLoading(prev => new Set(prev).add(item.id));

    try {
      const duplicateData = {
        tender_id: item.tender_id,
        client_position_id: clientPositionId,
        item_type: item.item_type,
        description: `${item.description} (копия)`,
        unit: item.unit,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        material_id: item.material_id,
        work_id: item.work_id,
        category: item.category,
        notes: item.notes,
        markup_percentage: item.markup_percentage
      };

      const result = await boqApi.create(duplicateData);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Элемент дублирован');
      onUpdate();
    } catch (error) {
      message.error('Ошибка дублирования элемента');
      console.error('Duplicate error:', error);
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  }, [clientPositionId, onUpdate, editable]);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag & Drop
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !editable) return;

    const oldIndex = filteredItems.findIndex(item => item.id === active.id);
    const newIndex = filteredItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder items optimistically
    const newItems = arrayMove(filteredItems, oldIndex, newIndex);

    try {
      const itemIds = newItems.map(item => item.id);
      const result = await boqApi.reorderInPosition(clientPositionId, itemIds);
      
      if (result.error) {
        throw new Error(result.error);
      }

      onUpdate();
    } catch (error) {
      message.error('Ошибка перестановки элементов');
      console.error('Reorder error:', error);
    }
  }, [filteredItems, clientPositionId, onUpdate, editable]);

  // Render item for virtual list (without drag and drop)
  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = filteredItems[index];
    if (!item) return null;

    return (
      <div style={style}>
        <SortableItem
          item={item}
          isLoading={loading.has(item.id)}
          editingItem={editingItem}
          editable={editable}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          setEditingItem={setEditingItem}
        />
      </div>
    );
  }, [
    filteredItems,
    loading,
    editingItem,
    editable,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    handleDuplicate,
    setEditingItem
  ]);

  // Empty state
  if (items.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Нет элементов"
        className="py-8"
      >
        {editable && (
          <Text type="secondary" className="text-sm">
            Добавьте материалы или работы из справочника
          </Text>
        )}
      </Empty>
    );
  }

  return (
    <div className="boq-item-list">
      {/* Search */}
      {searchable && items.length > 10 && (
        <div className="mb-4">
          <Input.Search
            placeholder="Поиск по наименованию, номеру или категории..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
            allowClear
            className="max-w-md"
          />
        </div>
      )}

      {/* Items Count */}
      <div className="mb-3 flex items-center justify-between">
        <Text type="secondary" className="text-sm">
          {filteredItems.length} из {items.length} элементов
        </Text>
        {searchText && (
          <Button
            type="link"
            size="small"
            onClick={() => setSearchText('')}
            className="p-0"
          >
            Сбросить фильтр
          </Button>
        )}
      </div>

      {/* List */}
      {filteredItems.length > 0 ? (
        filteredItems.length > 50 ? (
          // Use virtual list for large datasets
          <VirtualList
            ref={listRef}
            height={Math.min(maxHeight, filteredItems.length * 140)}
            width="100%"
            itemCount={filteredItems.length}
            itemSize={140}
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {renderItem}
          </VirtualList>
        ) : (
          // Use drag and drop for smaller datasets
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div 
                style={{ maxHeight: maxHeight }}
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {filteredItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    isLoading={loading.has(item.id)}
                    editingItem={editingItem}
                    editable={editable}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    setEditingItem={setEditingItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Ничего не найдено"
          className="py-8"
        >
          <Button
            type="link"
            onClick={() => setSearchText('')}
            className="p-0"
          >
            Сбросить поиск
          </Button>
        </Empty>
      )}
    </div>
  );
};

export default BOQItemList;