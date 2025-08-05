import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  Tabs,
  Table,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Card,
  Row,
  Col,
  Empty,
  message,
  Badge,
  InputNumber
} from 'antd';
import {
  BgColorsOutlined,
  ToolOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  CheckOutlined,
  DeleteOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/lib/table/interface';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import type { 
  Material, 
  WorkItem, 
  BOQItemInsert,
  MaterialFilters,
  WorkItemFilters
} from '../../lib/supabase/types';

const { Text } = Typography;
const { TabPane } = Tabs;

interface LibrarySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (items: BOQItemInsert[]) => void;
  multiple?: boolean;
  preselectedType?: 'material' | 'work';
}

interface CartItem {
  id: string;
  type: 'material' | 'work';
  name: string;
  unit: string;
  basePrice: number;
  quantity: number;
  notes?: string;
  originalItem: Material | WorkItem;
}

const LibrarySelector: React.FC<LibrarySelectorProps> = ({
  visible,
  onClose,
  onSelect,
  multiple = true,
  preselectedType
}) => {
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
    category: [],
    is_active: true
  });
  const [workFilters, setWorkFilters] = useState<WorkItemFilters>({
    search: '',
    category: [],
    is_active: true
  });

  // Selection
  const [selectedMaterialKeys, setSelectedMaterialKeys] = useState<string[]>([]);
  const [selectedWorkKeys, setSelectedWorkKeys] = useState<string[]>([]);

  // Load data
  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const result = await materialsApi.getAll(materialFilters, { limit: 1000 });
      if (result.error) {
        throw new Error(result.error);
      }
      setMaterials(result.data || []);
    } catch (error) {
      message.error('Ошибка загрузки материалов');
      console.error('Load materials error:', error);
    } finally {
      setLoading(false);
    }
  }, [materialFilters]);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await worksApi.getAll(workFilters, { limit: 1000 });
      if (result.error) {
        throw new Error(result.error);
      }
      setWorks(result.data || []);
    } catch (error) {
      message.error('Ошибка загрузки работ');
      console.error('Load works error:', error);
    } finally {
      setLoading(false);
    }
  }, [workFilters]);

  // Effects
  useEffect(() => {
    if (visible) {
      loadMaterials();
      loadWorks();
    }
  }, [visible, loadMaterials, loadWorks]);

  useEffect(() => {
    if (visible) {
      setCart([]);
      setSelectedMaterialKeys([]);
      setSelectedWorkKeys([]);
    }
  }, [visible]);

  // Cart management
  const addToCart = useCallback((items: (Material | WorkItem)[], type: 'material' | 'work') => {
    const newCartItems: CartItem[] = items.map(item => ({
      id: `${type}-${item.id}`,
      type,
      name: item.name,
      unit: item.unit,
      basePrice: type === 'material' ? item.base_price : (item as WorkItem).base_rate,
      quantity: 1,
      originalItem: item
    }));

    setCart(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const uniqueNewItems = newCartItems.filter(item => !existingIds.has(item.id));
      return [...prev, ...uniqueNewItems];
    });

    message.success(`Добавлено ${newCartItems.length} элементов в корзину`);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateCartItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  }, []);

  const updateCartItemNotes = useCallback((itemId: string, notes: string) => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedMaterialKeys([]);
    setSelectedWorkKeys([]);
  }, []);

  // Handlers
  const handleAddSelected = useCallback(() => {
    const selectedMaterials = materials.filter(m => selectedMaterialKeys.includes(m.id));
    const selectedWorks = works.filter(w => selectedWorkKeys.includes(w.id));

    if (selectedMaterials.length > 0) {
      addToCart(selectedMaterials, 'material');
      setSelectedMaterialKeys([]);
    }

    if (selectedWorks.length > 0) {
      addToCart(selectedWorks, 'work');
      setSelectedWorkKeys([]);
    }
  }, [materials, works, selectedMaterialKeys, selectedWorkKeys, addToCart]);

  const handleConfirmSelection = useCallback(() => {
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

    onSelect(boqItems);
  }, [cart, onSelect]);

  // Get unique categories
  const materialCategories = useMemo(() => {
    const categories = materials.map(m => m.category).filter(Boolean) as string[];
    return [...new Set(categories)].sort();
  }, [materials]);

  const workCategories = useMemo(() => {
    const categories = works.map(w => w.category).filter(Boolean) as string[];
    return [...new Set(categories)].sort();
  }, [works]);

  // Table columns
  const materialColumns: ColumnsType<Material> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.code && (
            <div>
              <Text type="secondary" className="text-xs">Код: {record.code}</Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => category ? <Tag>{category}</Tag> : '-'
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: 'Цена',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 100,
      render: (price) => `${price?.toFixed(2)} ₽`,
      sorter: (a, b) => a.base_price - b.base_price
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 120,
      render: (supplier) => supplier || '-'
    },
    {
      title: 'Действие',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addToCart([record], 'material')}
          title="Добавить в корзину"
        />
      )
    }
  ];

  const workColumns: ColumnsType<WorkItem> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.code && (
            <div>
              <Text type="secondary" className="text-xs">Код: {record.code}</Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => category ? <Tag>{category}</Tag> : '-'
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: 'Расценка',
      dataIndex: 'base_rate',
      key: 'base_rate',
      width: 100,
      render: (rate) => `${rate?.toFixed(2)} ₽`,
      sorter: (a, b) => a.base_rate - b.base_rate
    },
    {
      title: 'Сложность',
      dataIndex: 'complexity',
      key: 'complexity',
      width: 100,
      render: (complexity) => {
        if (!complexity) return '-';
        const colors: Record<string, string> = { low: 'green', medium: 'orange', high: 'red' };
        const labels: Record<string, string> = { low: 'Низкая', medium: 'Средняя', high: 'Высокая' };
        return <Tag color={colors[complexity]}>{labels[complexity]}</Tag>;
      }
    },
    {
      title: 'Действие',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addToCart([record], 'work')}
          title="Добавить в корзину"
        />
      )
    }
  ];

  // Cart columns
  const cartColumns: ColumnsType<CartItem> = [
    {
      title: 'Элемент',
      key: 'item',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {record.type === 'material' ? (
            <BgColorsOutlined className="text-blue-500" />
          ) : (
            <ToolOutlined className="text-green-500" />
          )}
          <div>
            <Text strong>{record.name}</Text>
            <div>
              <Text type="secondary" className="text-xs">
                {record.type === 'material' ? 'Материал' : 'Работа'} • {record.unit}
              </Text>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Количество',
      key: 'quantity',
      width: 120,
      render: (_, record) => (
        <InputNumber
          value={record.quantity}
          min={0.01}
          step={0.01}
          size="small"
          onChange={(value) => updateCartItemQuantity(record.id, value || 1)}
          className="w-full"
        />
      )
    },
    {
      title: 'Цена',
      key: 'price',
      width: 100,
      render: (_, record) => `${record.basePrice.toFixed(2)} ₽`
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 100,
      render: (_, record) => (
        <Text strong>
          {(record.quantity * record.basePrice).toFixed(2)} ₽
        </Text>
      )
    },
    {
      title: 'Примечания',
      key: 'notes',
      width: 150,
      render: (_, record) => (
        <Input.TextArea
          value={record.notes}
          onChange={(e) => updateCartItemNotes(record.id, e.target.value)}
          placeholder="Примечания..."
          rows={1}
          size="small"
        />
      )
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeFromCart(record.id)}
          danger
        />
      )
    }
  ];

  // Row selection
  const materialRowSelection: TableRowSelection<Material> = {
    selectedRowKeys: selectedMaterialKeys,
    onChange: (keys) => setSelectedMaterialKeys(keys as string[]),
    getCheckboxProps: () => ({ disabled: !multiple })
  };

  const workRowSelection: TableRowSelection<WorkItem> = {
    selectedRowKeys: selectedWorkKeys,
    onChange: (keys) => setSelectedWorkKeys(keys as string[]),
    getCheckboxProps: () => ({ disabled: !multiple })
  };

  const totalCartValue = cart.reduce((sum, item) => sum + (item.quantity * item.basePrice), 0);

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCartOutlined />
            Выбор материалов и работ
          </div>
          <Badge count={cart.length} size="small">
            <Button
              type={cart.length > 0 ? 'primary' : 'default'}
              size="small"
              icon={<ShoppingCartOutlined />}
            >
              Корзина
            </Button>
          </Badge>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="90vw"
      style={{ maxWidth: 1400 }}
      footer={
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Text>Общая стоимость: </Text>
            <Text strong className="text-lg text-blue-600">
              {totalCartValue.toFixed(2)} ₽
            </Text>
          </div>
          <Space>
            <Button onClick={clearCart} disabled={cart.length === 0}>
              Очистить корзину
            </Button>
            <Button onClick={onClose}>Отмена</Button>
            <Button
              type="primary"
              onClick={handleConfirmSelection}
              disabled={cart.length === 0}
              icon={<CheckOutlined />}
            >
              Добавить выбранные ({cart.length})
            </Button>
          </Space>
        </div>
      }
    >
      <Row gutter={16} className="h-[70vh]">
        {/* Library */}
        <Col span={cart.length > 0 ? 16 : 24}>
          <Card className="h-full">
            <Tabs 
              activeKey={activeTab} 
              onChange={(key) => setActiveTab(key as 'materials' | 'works')}
              tabBarExtraContent={
                <Space>
                  {multiple && (
                    <Button
                      size="small"
                      onClick={handleAddSelected}
                      disabled={
                        (activeTab === 'materials' && selectedMaterialKeys.length === 0) ||
                        (activeTab === 'works' && selectedWorkKeys.length === 0)
                      }
                      icon={<PlusOutlined />}
                    >
                      Добавить выбранные
                    </Button>
                  )}
                </Space>
              }
            >
              <TabPane
                tab={
                  <span>
                    <BgColorsOutlined />
                    Материалы ({materials.length})
                  </span>
                }
                key="materials"
              >
                {/* Material Filters */}
                <Space className="mb-4" wrap>
                  <Input.Search
                    placeholder="Поиск материалов..."
                    value={materialFilters.search}
                    onChange={(e) => setMaterialFilters(prev => ({ ...prev, search: e.target.value }))}
                    style={{ width: 300 }}
                    allowClear
                  />
                  <Select
                    placeholder="Категория"
                    value={materialFilters.category}
                    onChange={(value) => setMaterialFilters(prev => ({ ...prev, category: value }))}
                    mode="multiple"
                    style={{ minWidth: 200 }}
                    allowClear
                  >
                    {materialCategories.map(cat => (
                      <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                    ))}
                  </Select>
                </Space>

                <Table
                  columns={materialColumns}
                  dataSource={materials.filter(m => {
                    const matchesSearch = !materialFilters.search || 
                      m.name.toLowerCase().includes(materialFilters.search.toLowerCase()) ||
                      m.code?.toLowerCase().includes(materialFilters.search.toLowerCase());
                    const matchesCategory = !materialFilters.category?.length ||
                      materialFilters.category.includes(m.category || '');
                    return matchesSearch && matchesCategory;
                  })}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  rowSelection={multiple ? materialRowSelection : undefined}
                  scroll={{ y: 400 }}
                />
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <ToolOutlined />
                    Работы ({works.length})
                  </span>
                }
                key="works"
              >
                {/* Work Filters */}
                <Space className="mb-4" wrap>
                  <Input.Search
                    placeholder="Поиск работ..."
                    value={workFilters.search}
                    onChange={(e) => setWorkFilters(prev => ({ ...prev, search: e.target.value }))}
                    style={{ width: 300 }}
                    allowClear
                  />
                  <Select
                    placeholder="Категория"
                    value={workFilters.category}
                    onChange={(value) => setWorkFilters(prev => ({ ...prev, category: value }))}
                    mode="multiple"
                    style={{ minWidth: 200 }}
                    allowClear
                  >
                    {workCategories.map(cat => (
                      <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                    ))}
                  </Select>
                </Space>

                <Table
                  columns={workColumns}
                  dataSource={works.filter(w => {
                    const matchesSearch = !workFilters.search || 
                      w.name.toLowerCase().includes(workFilters.search.toLowerCase()) ||
                      w.code?.toLowerCase().includes(workFilters.search.toLowerCase());
                    const matchesCategory = !workFilters.category?.length ||
                      workFilters.category.includes(w.category || '');
                    return matchesSearch && matchesCategory;
                  })}
                  rowKey="id"
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  rowSelection={multiple ? workRowSelection : undefined}
                  scroll={{ y: 400 }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>

        {/* Cart */}
        {cart.length > 0 && (
          <Col span={8}>
            <Card 
              title={
                <div className="flex items-center justify-between">
                  <span>Корзина ({cart.length})</span>
                  <Button
                    type="text"
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={clearCart}
                    title="Очистить корзину"
                  />
                </div>
              }
              className="h-full"
              bodyStyle={{ padding: 0 }}
            >
              {cart.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Корзина пуста"
                  className="py-8"
                />
              ) : (
                <Table
                  columns={cartColumns}
                  dataSource={cart}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ y: 300 }}
                />
              )}
            </Card>
          </Col>
        )}
      </Row>
    </Modal>
  );
};

export default LibrarySelector;