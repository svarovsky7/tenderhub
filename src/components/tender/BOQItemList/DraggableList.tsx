import React, { useCallback } from 'react';
import { Empty } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { message } from 'antd';
import { boqApi } from '../../../lib/supabase/api';
import SortableItem from './SortableItem';
import type { DraggableListProps } from './types';

const DraggableList: React.FC<DraggableListProps> = ({
  items,
  clientPositionId,
  onReorder,
  height,
  editingItem,
  isLoading,
  editable,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  setEditingItem
}) => {
  console.log('🚀 DraggableList rendered with:', { 
    itemsCount: items.length, 
    clientPositionId, 
    height 
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🎯 Drag end event:', { activeId: active.id, overId: over?.id });

    if (!over) {
      console.log('⚠️ No drop target found');
      return;
    }

    if (active.id !== over.id) {
      console.log('🔄 Reordering items...');
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      console.log('📊 Reorder details:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
      
      if (oldIndex === -1 || newIndex === -1) {
        console.error('❌ Invalid item indices:', { oldIndex, newIndex });
        return;
      }

      const newOrder = arrayMove(items, oldIndex, newIndex);
      console.log('📋 New order calculated:', newOrder.map(item => ({ id: item.id, item_number: item.item_number })));
      
      // Optimistically update UI
      onReorder(newOrder);

      try {
        // Update sort order in database
        const itemIds = newOrder.map(item => item.id);
        console.log('📡 Updating sort order in database:', itemIds);
        
        const result = await boqApi.reorderInPosition(clientPositionId, itemIds);
        console.log('📦 Reorder API response:', result);
        
        if (result.error) {
          console.error('❌ Failed to reorder items:', result.error);
          message.error('Ошибка изменения порядка элементов');
          // Revert optimistic update on error
          onReorder(items);
        } else {
          console.log('✅ Items reordered successfully');
          message.success('Порядок элементов изменен');
        }
      } catch (error) {
        console.error('💥 Exception during reorder:', error);
        message.error('Ошибка изменения порядка элементов');
        // Revert optimistic update on error
        onReorder(items);
      }
    }
  }, [items, clientPositionId, onReorder]);

  if (items.length === 0) {
    return (
      <div 
        style={{ height }} 
        className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50"
      >
        <Empty
          image={<FileTextOutlined style={{ fontSize: 48, color: '#ccc' }} />}
          description="Нет элементов BOQ"
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <div 
          className="space-y-2 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50"
          style={{ height }}
        >
          {items.map((item) => {
            console.log('🎯 Rendering draggable item:', item.id);
            return (
              <SortableItem
                key={item.id}
                item={item}
                isLoading={isLoading}
                editingItem={editingItem}
                editable={editable}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                setEditingItem={setEditingItem}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableList;