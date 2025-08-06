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
  ToolOutlined,
  PlusOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/lib/table/interface';
import type { WorkItem } from '../../../lib/supabase/types';
import type { WorkSelectorProps } from './types';

const { Text } = Typography;

const WorkSelector: React.FC<WorkSelectorProps> = ({
  works,
  loading,
  selectedKeys,
  onSelectionChange,
  onAddToCart,
  onFiltersChange,
  filters
}) => {
  console.log('🚀 WorkSelector rendered with:', { 
    worksCount: works.length, 
    loading, 
    selectedKeysCount: selectedKeys.length 
  });

  const handleAddSelected = useCallback(() => {
    console.log('🖱️ Add selected works clicked:', selectedKeys);
    const selectedWorks = works.filter(w => selectedKeys.includes(w.id));
    console.log('📋 Selected works to add:', selectedWorks);
    onAddToCart(selectedWorks);
    onSelectionChange([]);
  }, [works, selectedKeys, onAddToCart, onSelectionChange]);

  const handleAddSingle = useCallback((work: WorkItem) => {
    console.log('🖱️ Add single work clicked:', work);
    onAddToCart([work]);
  }, [onAddToCart]);

  const handleSearchChange = useCallback((value: string) => {
    console.log('🔍 Work search changed:', value);
    onFiltersChange({ ...filters, search: value });
  }, [filters, onFiltersChange]);


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
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: 'Расценка',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 100,
      render: (rate) => `${rate?.toFixed(2)} ₽`,
      sorter: (a, b) => a.base_price - b.base_price
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

  const rowSelection: TableRowSelection<WorkItem> = {
    selectedRowKeys: selectedKeys,
    onChange: (selectedRowKeys) => {
      console.log('🔄 Work selection changed:', selectedRowKeys);
      onSelectionChange(selectedRowKeys as string[]);
    }
  };

  return (
    <div className="space-y-4">
      <Row gutter={16}>
        <Col span={12}>
          <Input.Search
            placeholder="Поиск работ..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={12}>
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
        dataSource={works}
        columns={workColumns}
        loading={loading}
        size="small"
        pagination={{
          total: works.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Всего ${total} работ`
        }}
        rowSelection={rowSelection}
        locale={{
          emptyText: (
            <Empty
              image={<ToolOutlined style={{ fontSize: 48, color: '#ccc' }} />}
              description="Работы не найдены"
            />
          )
        }}
        scroll={{ y: 400 }}
      />
    </div>
  );
};

export default WorkSelector;