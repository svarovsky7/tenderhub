import React, { useCallback } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Empty
} from 'antd';
import {
  BgColorsOutlined,
  PlusOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/lib/table/interface';
import type { Material } from '../../../lib/supabase/types';
import type { MaterialSelectorProps } from './types';

const { Text } = Typography;

const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materials,
  loading,
  selectedKeys,
  onSelectionChange,
  onAddToCart,
  onFiltersChange,
  filters,
  categories
}) => {
  console.log('🚀 MaterialSelector rendered with:', { 
    materialsCount: materials.length, 
    loading, 
    selectedKeysCount: selectedKeys.length 
  });

  const handleAddSelected = useCallback(() => {
    console.log('🖱️ Add selected materials clicked:', selectedKeys);
    const selectedMaterials = materials.filter(m => selectedKeys.includes(m.id));
    console.log('📋 Selected materials to add:', selectedMaterials);
    onAddToCart(selectedMaterials);
    onSelectionChange([]);
  }, [materials, selectedKeys, onAddToCart, onSelectionChange]);

  const handleAddSingle = useCallback((material: Material) => {
    console.log('🖱️ Add single material clicked:', material);
    onAddToCart([material]);
  }, [onAddToCart]);

  const handleSearchChange = useCallback((value: string) => {
    console.log('🔍 Material search changed:', value);
    onFiltersChange({ ...filters, search: value });
  }, [filters, onFiltersChange]);

  const handleCategoryChange = useCallback((value: string[]) => {
    console.log('🏷️ Material category filter changed:', value);
    onFiltersChange({ ...filters, category: value });
  }, [filters, onFiltersChange]);

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
          onClick={() => handleAddSingle(record)}
          title="Добавить в корзину"
        />
      )
    }
  ];

  const rowSelection: TableRowSelection<Material> = {
    selectedRowKeys: selectedKeys,
    onChange: (selectedRowKeys) => {
      console.log('🔄 Material selection changed:', selectedRowKeys);
      onSelectionChange(selectedRowKeys as string[]);
    }
  };

  return (
    <div className="space-y-4">
      <Row gutter={16}>
        <Col span={12}>
          <Input.Search
            placeholder="Поиск материалов..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={8}>
          <Select
            mode="multiple"
            placeholder="Фильтр по категориям"
            value={filters.category}
            onChange={handleCategoryChange}
            style={{ width: '100%' }}
            allowClear
          >
            {categories.map(category => (
              <Select.Option key={category} value={category}>
                {category}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={4}>
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleAddSelected}
              disabled={selectedKeys.length === 0}
            >
              Добавить ({selectedKeys.length})
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={materials}
        columns={materialColumns}
        loading={loading}
        size="small"
        pagination={{
          total: materials.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Всего ${total} материалов`
        }}
        rowSelection={rowSelection}
        locale={{
          emptyText: (
            <Empty
              image={<BgColorsOutlined style={{ fontSize: 48, color: '#ccc' }} />}
              description="Материалы не найдены"
            />
          )
        }}
        scroll={{ y: 400 }}
      />
    </div>
  );
};

export default MaterialSelector;