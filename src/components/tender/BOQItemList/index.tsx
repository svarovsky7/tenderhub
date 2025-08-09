import React, { useState, useCallback, useMemo } from 'react';
import {
  Input,
  Modal,
  message
} from 'antd';
import { boqApi } from '../../../lib/supabase/api';
import type { 
  BOQItemWithLibrary, 
  BOQItemUpdate
} from '../../../lib/supabase/types';
import type { BOQItemListProps, EditingItem } from './types';
import DraggableList from './DraggableList';
import VirtualList from './VirtualList';

const BOQItemList: React.FC<BOQItemListProps> = ({
  items,
  clientPositionId,
  onUpdate,
  maxHeight = 600,
  searchable = true,
  editable = true,
  onEditItem
}) => {
  console.log('🚀 BOQItemList called with:', {
    itemsCount: items.length,
    clientPositionId,
    maxHeight,
    searchable,
    editable
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  // Update local items when props change
  React.useEffect(() => {
    console.log('🔄 Items prop changed, updating local items');
    setLocalItems(items);
  }, [items]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return localItems;
    }
    
    const filtered = localItems.filter(item => 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    console.log('🔍 Filtered items:', { searchTerm, originalCount: localItems.length, filteredCount: filtered.length });
    return filtered;
  }, [localItems, searchTerm]);

  const handleSearchChange = useCallback((value: string) => {
    console.log('🔍 Search term changed:', value);
    setSearchTerm(value);
  }, []);

  const handleReorder = useCallback((newOrder: BOQItemWithLibrary[]) => {
    console.log('🔄 Reordering items locally');
    setLocalItems(newOrder);
  }, []);

  const handleStartEdit = useCallback((itemId: string, field: 'description' | 'quantity' | 'unit_rate', currentValue: string | number) => {
    console.log('✏️ Starting edit:', { itemId, field, currentValue });
    setEditingItem({ id: itemId, field, value: currentValue });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) {
      console.warn('⚠️ No editing item to save');
      return;
    }

    console.log('💾 Saving edit:', editingItem);
    setIsLoading(true);

    try {
      const updates: BOQItemUpdate = {
        [editingItem.field]: editingItem.value
      };

      console.log('📡 Calling BOQ update API:', { id: editingItem.id, updates });
      const result = await boqApi.update(editingItem.id, updates);
      console.log('📦 Update API response:', result);

      if (result.error) {
        console.error('❌ Update failed:', result.error);
        message.error('Ошибка обновления элемента');
        return;
      }

      console.log('✅ Update successful');
      message.success('Элемент обновлен');
      setEditingItem(null);
      onUpdate();
    } catch (error) {
      console.error('💥 Exception during update:', error);
      message.error('Ошибка обновления элемента');
    } finally {
      setIsLoading(false);
    }
  }, [editingItem, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    console.log('❌ Canceling edit:', editingItem?.id);
    setEditingItem(null);
  }, [editingItem]);

  const handleDelete = useCallback(async (itemId: string) => {
    console.log('🗑️ Delete requested for item:', itemId);
    
    const item = localItems.find(i => i.id === itemId);
    if (!item) {
      console.error('❌ Item not found for deletion:', itemId);
      return;
    }

    Modal.confirm({
      title: 'Подтверждение удаления',
      content: `Вы уверены, что хотите удалить элемент "${item.description}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        console.log('✅ Delete confirmed for item:', itemId);
        setIsLoading(true);

        try {
          console.log('📡 Calling BOQ delete API:', itemId);
          const result = await boqApi.delete(itemId);
          console.log('📦 Delete API response:', result);

          if (result.error) {
            console.error('❌ Delete failed:', result.error);
            message.error('Ошибка удаления элемента');
            return;
          }

          console.log('✅ Delete successful');
          message.success('Элемент удален');
          onUpdate();
        } catch (error) {
          console.error('💥 Exception during delete:', error);
          message.error('Ошибка удаления элемента');
        } finally {
          setIsLoading(false);
        }
      }
    });
  }, [localItems, onUpdate]);

  const handleDuplicate = useCallback(async (item: BOQItemWithLibrary) => {
    console.log('📋 Duplicate requested for item:', item.id);
    setIsLoading(true);

    try {
      const duplicateData = {
        tender_id: item.tender_id,
        client_position_id: item.client_position_id,
        item_type: item.item_type,
        description: `${item.description} (копия)`,
        unit: item.unit,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        material_id: item.material_id,
        work_id: item.work_id,
        library_material_id: item.library_material_id,
        library_work_id: item.library_work_id,
        category: item.category,
        subcategory: item.subcategory,
        notes: item.notes,
        markup_percentage: item.markup_percentage
      };

      console.log('📡 Calling BOQ create API for duplicate:', duplicateData);
      const result = await boqApi.create(duplicateData);
      console.log('📦 Duplicate API response:', result);

      if (result.error) {
        console.error('❌ Duplicate failed:', result.error);
        message.error('Ошибка дублирования элемента');
        return;
      }

      console.log('✅ Duplicate successful');
      message.success('Элемент продублирован');
      onUpdate();
    } catch (error) {
      console.error('💥 Exception during duplicate:', error);
      message.error('Ошибка дублирования элемента');
    } finally {
      setIsLoading(false);
    }
  }, [onUpdate]);

  // Determine whether to use virtual list or draggable list
  const useVirtualList = filteredItems.length > 100;
  const listHeight = Math.min(maxHeight, filteredItems.length * 180);

  console.log('📊 List rendering decision:', {
    itemsCount: filteredItems.length,
    useVirtualList,
    listHeight,
    maxHeight
  });

  return (
    <div className="space-y-4">
      {searchable && (
        <Input.Search
          placeholder="Поиск элементов BOQ..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          allowClear
        />
      )}

      {useVirtualList ? (
        <VirtualList
          items={filteredItems}
          height={listHeight}
          editingItem={editingItem}
          isLoading={isLoading}
          editable={editable}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onEditItem={onEditItem}
          setEditingItem={setEditingItem}
        />
      ) : (
        <DraggableList
          items={filteredItems}
          clientPositionId={clientPositionId}
          onReorder={handleReorder}
          height={listHeight}
          editingItem={editingItem}
          isLoading={isLoading}
          editable={editable}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onEditItem={onEditItem}
          setEditingItem={setEditingItem}
        />
      )}
    </div>
  );
};

export default BOQItemList;