import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  Tabs,
  message
} from 'antd';
import { materialsApi, worksApi } from '../../../lib/supabase/api';
import type { 
  Material, 
  WorkItem, 
  BOQItemInsert,
  MaterialFilters,
  WorkItemFilters
} from '../../../lib/supabase/types';
import type { LibrarySelectorProps, CartItem } from './types';
import MaterialSelector from './MaterialSelector';
import WorkSelector from './WorkSelector';
import Cart from './Cart';

const { TabPane } = Tabs;

const LibrarySelector: React.FC<LibrarySelectorProps> = ({
  visible,
  onClose,
  onSelect,
  multiple = true,
  preselectedType
}) => {
  console.log('🚀 LibrarySelector called with:', { visible, multiple, preselectedType });

  // State
  const [activeTab, setActiveTab] = useState<'materials' | 'works'>(
    preselectedType === 'work' ? 'works' : 'materials'
  );
  const [materials, setMaterials] = useState<Material[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Filters
  const [materialFilters, setMaterialFilters] = useState<MaterialFilters>({
    search: '',
    category: []
  });
  const [workFilters, setWorkFilters] = useState<WorkItemFilters>({
    search: '',
    category: []
  });

  // Selection
  const [selectedMaterialKeys, setSelectedMaterialKeys] = useState<string[]>([]);
  const [selectedWorkKeys, setSelectedWorkKeys] = useState<string[]>([]);

  // Load data
  const loadMaterials = useCallback(async () => {
    console.log('📡 Loading materials with filters:', materialFilters);
    setLoading(true);
    try {
      const result = await materialsApi.getAll(materialFilters, { limit: 1000 });
      console.log('📦 Materials API response:', { data: result.data?.length, error: result.error });
      
      if (result.error) {
        console.error('❌ Materials API error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ Materials loaded successfully:', result.data?.length);
      setMaterials(result.data || []);
    } catch (error) {
      console.error('💥 Load materials error:', error);
      message.error('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  }, [materialFilters]);

  const loadWorks = useCallback(async () => {
    console.log('📡 Loading works with filters:', workFilters);
    setLoading(true);
    try {
      const result = await worksApi.getAll(workFilters, { limit: 1000 });
      console.log('📦 Works API response:', { data: result.data?.length, error: result.error });
      
      if (result.error) {
        console.error('❌ Works API error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ Works loaded successfully:', result.data?.length);
      setWorks(result.data || []);
    } catch (error) {
      console.error('💥 Load works error:', error);
      message.error('Ошибка загрузки работ');
    } finally {
      setLoading(false);
    }
  }, [workFilters]);

  // Effects
  useEffect(() => {
    if (visible) {
      console.log('🔄 Modal opened, loading data...');
      loadMaterials();
      loadWorks();
    }
  }, [visible, loadMaterials, loadWorks]);

  useEffect(() => {
    if (visible) {
      console.log('🧹 Modal opened, resetting state...');
      setCart([]);
      setSelectedMaterialKeys([]);
      setSelectedWorkKeys([]);
    }
  }, [visible]);

  // Cart management
  const addToCart = useCallback((items: (Material | WorkItem)[], type: 'material' | 'work') => {
    console.log('🛒 Adding items to cart:', { itemsCount: items.length, type });
    
    const newCartItems: CartItem[] = items.map(item => ({
      id: `${type}-${item.id}`,
      type,
      name: item.name,
      unit: item.unit,
      basePrice: 0, // Base price not available in simplified schema
      quantity: 1,
      originalItem: item
    }));

    setCart(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const uniqueNewItems = newCartItems.filter(item => !existingIds.has(item.id));
      console.log('📊 Cart update:', { existing: prev.length, new: uniqueNewItems.length });
      return [...prev, ...uniqueNewItems];
    });

    message.success(`Добавлено ${newCartItems.length} элементов в корзину`);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    console.log('🗑️ Removing item from cart:', itemId);
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateCartItemQuantity = useCallback((itemId: string, quantity: number) => {
    console.log('🔢 Updating cart item quantity:', { itemId, quantity });
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  }, []);

  const updateCartItemNotes = useCallback((itemId: string, notes: string) => {
    console.log('📝 Updating cart item notes:', { itemId, notesLength: notes.length });
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    console.log('🧹 Clearing cart');
    setCart([]);
    setSelectedMaterialKeys([]);
    setSelectedWorkKeys([]);
  }, []);

  // Handlers
  const handleConfirmSelection = useCallback(() => {
    console.log('✅ Confirming selection with cart:', cart);
    
    if (cart.length === 0) {
      message.warning('Корзина пуста');
      return;
    }

    const boqItems: BOQItemInsert[] = cart.map(cartItem => ({
      tender_id: 'temp', // Will be set by parent
      item_type: cartItem.type,
      description: cartItem.name,
      unit: cartItem.unit,
      quantity: cartItem.quantity,
      unit_rate: cartItem.basePrice,
      material_id: cartItem.type === 'material' ? cartItem.originalItem.id : null,
      work_id: cartItem.type === 'work' ? cartItem.originalItem.id : null,
      library_material_id: cartItem.type === 'material' ? cartItem.originalItem.id : null,
      library_work_id: cartItem.type === 'work' ? cartItem.originalItem.id : null,
      notes: cartItem.notes,
      created_by: 'system' // This should be replaced with actual user ID
    }));

    console.log('📤 Sending BOQ items to parent:', boqItems);
    onSelect(boqItems);
  }, [cart, onSelect]);



  const handleTabChange = useCallback((key: string) => {
    console.log('🔄 Tab changed:', key);
    setActiveTab(key as 'materials' | 'works');
  }, []);

  return (
    <Modal
      title="Выбор из библиотеки"
      visible={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4">
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane 
            tab="Материалы" 
            key="materials"
          >
            <MaterialSelector
              materials={materials}
              loading={loading}
              selectedKeys={selectedMaterialKeys}
              onSelectionChange={setSelectedMaterialKeys}
              onAddToCart={(items) => addToCart(items, 'material')}
              onFiltersChange={setMaterialFilters}
              filters={materialFilters}
            />
          </TabPane>
          
          <TabPane 
            tab="Работы" 
            key="works"
          >
            <WorkSelector
              works={works}
              loading={loading}
              selectedKeys={selectedWorkKeys}
              onSelectionChange={setSelectedWorkKeys}
              onAddToCart={(items) => addToCart(items, 'work')}
              onFiltersChange={setWorkFilters}
              filters={workFilters}
            />
          </TabPane>
        </Tabs>

        <Cart
          items={cart}
          onUpdateQuantity={updateCartItemQuantity}
          onUpdateNotes={updateCartItemNotes}
          onRemoveItem={removeFromCart}
          onClear={clearCart}
          onConfirm={handleConfirmSelection}
        />
      </div>
    </Modal>
  );
};

export default LibrarySelector;