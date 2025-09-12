import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Empty } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import SortableItem from './SortableItem';
import type { VirtualListProps } from './types';

const ITEM_HEIGHT = 180; // Approximate height per item in pixels

const VirtualList: React.FC<VirtualListProps> = ({
  items,
  height,
  editingItem,
  isLoading,
  editable,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
  onEditItem,
  setEditingItem
}) => {
  console.log('🚀 VirtualList rendered with:', { 
    itemsCount: items.length, 
    height, 
    editingItemId: editingItem?.id 
  });

  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    console.log('🎯 Rendering virtual item at index:', index, 'item:', item.id);
    
    return (
      <div style={style}>
        <div className="p-2">
          <SortableItem
            item={item}
            isLoading={isLoading}
            editingItem={editingItem}
            editable={editable}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onEditItem={onEditItem}
            setEditingItem={setEditingItem}
          />
        </div>
      </div>
    );
  }, [
    items,
    isLoading,
    editingItem,
    editable,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onDuplicate,
    onEditItem,
    setEditingItem
  ]);

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

  console.log('📊 Virtual list configuration:', {
    itemCount: items.length,
    itemSize: ITEM_HEIGHT,
    height,
    overscanCount: 5
  });

  return (
    <List
      height={height}
      width="100%"
      itemCount={items.length}
      itemSize={ITEM_HEIGHT}
      overscanCount={5}
      className="border border-gray-200 rounded-lg"
    >
      {renderItem}
    </List>
  );
};

export default React.memo(VirtualList, (prevProps, nextProps) => {
  // Re-render only if critical props changed
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.height === nextProps.height &&
    prevProps.editingItem?.id === nextProps.editingItem?.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.editable === nextProps.editable &&
    // Check if items themselves changed (shallow comparison of IDs)
    prevProps.items.every((item, index) => 
      item.id === nextProps.items[index]?.id && 
      item.updated_at === nextProps.items[index]?.updated_at
    )
  );
});