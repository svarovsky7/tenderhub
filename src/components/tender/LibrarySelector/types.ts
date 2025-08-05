import type { Material, WorkItem, BOQItemInsert } from '../../../lib/supabase/types';

export interface LibrarySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (items: BOQItemInsert[]) => void;
  multiple?: boolean;
  preselectedType?: 'material' | 'work';
}

export interface CartItem {
  id: string;
  type: 'material' | 'work';
  name: string;
  unit: string;
  basePrice: number;
  quantity: number;
  notes?: string;
  originalItem: Material | WorkItem;
}

export interface MaterialSelectorProps {
  materials: Material[];
  loading: boolean;
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  onAddToCart: (items: Material[]) => void;
  onFiltersChange: (filters: any) => void;
  filters: any;
  categories: string[];
}

export interface WorkSelectorProps {
  works: WorkItem[];
  loading: boolean;
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  onAddToCart: (items: WorkItem[]) => void;
  onFiltersChange: (filters: any) => void;
  filters: any;
  categories: string[];
}

export interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onRemoveItem: (itemId: string) => void;
  onClear: () => void;
  onConfirm: () => void;
}