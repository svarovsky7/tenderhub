import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  Tabs,
  message,
  Pagination,
  Space
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

// Optimized with pagination
const ITEMS_PER_PAGE = 50; // Load only 50 items at a time

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
  
  // Pagination state
  const [materialPage, setMaterialPage] = useState(1);
  const [materialTotal, setMaterialTotal] = useState(0);
  const [workPage, setWorkPage] = useState(1);
  const [workTotal, setWorkTotal] = useState(0);
  
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

  // Load materials with pagination
  const loadMaterials = useCallback(async (page: number = 1) => {
    console.log('📡 Loading materials page:', page, 'with filters:', materialFilters);
    setLoading(true);
    try {
      const result = await materialsApi.getAll(materialFilters, { 
        page, 
        limit: ITEMS_PER_PAGE 
      });
      console.log('📦 Materials API response:', { 
        data: result.data?.length, 
        pagination: result.pagination,
        error: result.error 
      });
      
      if (result.error) {
        console.error('❌ Materials API error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ Materials loaded successfully:', result.data?.length);
      setMaterials(result.data || []);
      setMaterialTotal(result.pagination?.total || 0);
      setMaterialPage(page);
    } catch (error) {
      console.error('💥 Load materials error:', error);
      message.error('Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  }, [materialFilters]);

  // Load works with pagination
  const loadWorks = useCallback(async (page: number = 1) => {
    console.log('📡 Loading works page:', page, 'with filters:', workFilters);
    setLoading(true);
    try {
      const result = await worksApi.getAll(workFilters, { 
        page, 
        limit: ITEMS_PER_PAGE 
      });
      console.log('📦 Works API response:', { 
        data: result.data?.length, 
        pagination: result.pagination,
        error: result.error 
      });
      
      if (result.error) {
        console.error('❌ Works API error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ Works loaded successfully:', result.data?.length);
      setWorks(result.data || []);
      setWorkTotal(result.pagination?.total || 0);
      setWorkPage(page);
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
      console.log('🔄 Modal opened, loading first page...');
      loadMaterials(1);
      loadWorks(1);
    }
  }, [visible]);

  // Reset page when filters change
  useEffect(() => {
    if (visible) {
      loadMaterials(1);
    }
  }, [materialFilters, visible]);

  useEffect(() => {
    if (visible) {
      loadWorks(1);
    }
  }, [workFilters, visible]);

  useEffect(() => {
    if (visible) {
      console.log('🧹 Modal opened, resetting state...');
      setCart([]);
      setSelectedMaterialKeys([]);
      setSelectedWorkKeys([]);
      setMaterialPage(1);
      setWorkPage(1);
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
      basePrice: 0,
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

  // Handle submit
  const handleSubmit = useCallback(async () => {
    console.log('💾 Submitting cart:', cart);
    
    if (cart.length === 0) {
      message.warning('Корзина пуста');
      return;
    }

    // Convert cart items to BOQ items
    const boqItems: Partial<BOQItemInsert>[] = cart.map(item => ({
      item_type: item.type,
      description: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.basePrice || 0,
      material_id: item.type === 'material' ? item.originalItem.id : undefined,
      work_id: item.type === 'work' ? item.originalItem.id : undefined
    }));

    console.log('📤 BOQ items to submit:', boqItems);
    await onSelect(boqItems);
    onClose();
  }, [cart, onSelect, onClose]);

  // Get unique categories
  const materialCategories = useMemo(() => {
    const categories = new Set<string>();
    materials.forEach(m => {
      if (m.category) categories.add(m.category);
    });
    return Array.from(categories);
  }, [materials]);

  const workCategories = useMemo(() => {
    const categories = new Set<string>();
    works.forEach(w => {
      if (w.category) categories.add(w.category);
    });
    return Array.from(categories);
  }, [works]);

  return (
    <Modal
      title="Выбор из библиотеки"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      width={1400}
      okText="Добавить выбранное"
      cancelText="Отмена"
      okButtonProps={{ disabled: cart.length === 0 }}
    >
      <div className="flex gap-4" style={{ height: '600px' }}>
        <div className="flex-1">
          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'materials' | 'works')}>
            <TabPane tab="Материалы" key="materials">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <MaterialSelector
                  materials={materials}
                  loading={loading}
                  selectedKeys={selectedMaterialKeys}
                  onSelectionChange={setSelectedMaterialKeys}
                  onAddToCart={(items) => addToCart(items, 'material')}
                  onFiltersChange={setMaterialFilters}
                  filters={materialFilters}
                  categories={materialCategories}
                />
                {materialTotal > ITEMS_PER_PAGE && (
                  <div className="flex justify-center mt-4">
                    <Pagination
                      current={materialPage}
                      total={materialTotal}
                      pageSize={ITEMS_PER_PAGE}
                      onChange={loadMaterials}
                      showSizeChanger={false}
                      showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
                    />
                  </div>
                )}
              </Space>
            </TabPane>
            <TabPane tab="Работы" key="works">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <WorkSelector
                  works={works}
                  loading={loading}
                  selectedKeys={selectedWorkKeys}
                  onSelectionChange={setSelectedWorkKeys}
                  onAddToCart={(items) => addToCart(items, 'work')}
                  onFiltersChange={setWorkFilters}
                  filters={workFilters}
                  categories={workCategories}
                />
                {workTotal > ITEMS_PER_PAGE && (
                  <div className="flex justify-center mt-4">
                    <Pagination
                      current={workPage}
                      total={workTotal}
                      pageSize={ITEMS_PER_PAGE}
                      onChange={loadWorks}
                      showSizeChanger={false}
                      showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
                    />
                  </div>
                )}
              </Space>
            </TabPane>
          </Tabs>
        </div>
        <div className="w-96">
          <Cart
            items={cart}
            onRemove={removeFromCart}
            onQuantityChange={updateCartItemQuantity}
          />
        </div>
      </div>
    </Modal>
  );
};

export default React.memo(LibrarySelector);