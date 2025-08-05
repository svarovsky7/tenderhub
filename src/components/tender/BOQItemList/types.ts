import type { BOQItemWithLibrary, BOQItemUpdate } from '../../../lib/supabase/types';

export interface BOQItemListProps {
  items: BOQItemWithLibrary[];
  clientPositionId: string;
  onUpdate: () => void;
  maxHeight?: number;
  searchable?: boolean;
  editable?: boolean;
}

export interface EditingItem {
  id: string;
  field: 'description' | 'quantity' | 'unit_rate';
  value: string | number;
}

export interface SortableItemProps {
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

export interface VirtualListProps {
  items: BOQItemWithLibrary[];
  height: number;
  editingItem: EditingItem | null;
  isLoading: boolean;
  editable: boolean;
  onStartEdit: (itemId: string, field: 'description' | 'quantity' | 'unit_rate', currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (item: BOQItemWithLibrary) => void;
  setEditingItem: React.Dispatch<React.SetStateAction<EditingItem | null>>;
}

export interface DraggableListProps {
  items: BOQItemWithLibrary[];
  clientPositionId: string;
  onReorder: (newOrder: BOQItemWithLibrary[]) => void;
  height: number;
  editingItem: EditingItem | null;
  isLoading: boolean;
  editable: boolean;
  onStartEdit: (itemId: string, field: 'description' | 'quantity' | 'unit_rate', currentValue: string | number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (item: BOQItemWithLibrary) => void;
  setEditingItem: React.Dispatch<React.SetStateAction<EditingItem | null>>;
}