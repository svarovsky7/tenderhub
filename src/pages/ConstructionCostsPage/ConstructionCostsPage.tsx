import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Card, 
  Input, 
  Select, 
  Tag, 
  Drawer, 
  Form, 
  InputNumber, 
  message, 
  Popconfirm,
  Tabs,
  TreeSelect,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  DatePicker
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  FolderOutlined,
  TagsOutlined,
  DollarOutlined,
  HistoryOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { constructionCostsApi } from '../../lib/supabase/api/construction-costs';
import type { 
  ConstructionCostWithCategory,
  CreateConstructionCostInput,
  UpdateConstructionCostInput,
  ConstructionCostFilters,
  CategoryWithChildren
} from '../../lib/supabase/types/construction-costs';
import { ImportConstructionCostsModal } from '../../components/admin/ImportConstructionCostsModal';
import { generateConstructionCostsTemplate, exportConstructionCostsToExcel } from '../../utils/excel-templates';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

export const ConstructionCostsPage: React.FC = () => {
  console.log('🚀 [ConstructionCostsPage] Component mounted');

  const [filters, setFilters] = useState<ConstructionCostFilters>({
    is_active: true
  });
  const [selectedCost, setSelectedCost] = useState<ConstructionCostWithCategory | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Queries
  const { data: costs = [], isLoading: costsLoading, refetch: refetchCosts } = useQuery({
    queryKey: ['construction-costs', filters],
    queryFn: () => constructionCostsApi.getCosts(filters)
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['construction-cost-categories-tree'],
    queryFn: () => constructionCostsApi.getCategoryTree(false)
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['construction-cost-suppliers'],
    queryFn: () => constructionCostsApi.getSuppliers()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: CreateConstructionCostInput) => constructionCostsApi.createCost(input),
    onSuccess: () => {
      message.success('Затраты успешно добавлены');
      queryClient.invalidateQueries({ queryKey: ['construction-costs'] });
      setDrawerVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      console.error('❌ Error creating cost:', error);
      message.error('Ошибка при добавлении затрат');
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (costs: CreateConstructionCostInput[]) => constructionCostsApi.bulkCreateCosts(costs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-costs'] });
      queryClient.invalidateQueries({ queryKey: ['construction-cost-suppliers'] });
    },
    onError: (error) => {
      console.error('❌ Error bulk creating costs:', error);
      message.error('Ошибка при импорте затрат');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateConstructionCostInput) => constructionCostsApi.updateCost(input),
    onSuccess: () => {
      message.success('Затраты успешно обновлены');
      queryClient.invalidateQueries({ queryKey: ['construction-costs'] });
      setDrawerVisible(false);
      form.resetFields();
      setSelectedCost(null);
    },
    onError: (error) => {
      console.error('❌ Error updating cost:', error);
      message.error('Ошибка при обновлении затрат');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => constructionCostsApi.deleteCost(id),
    onSuccess: () => {
      message.success('Затраты успешно удалены');
      queryClient.invalidateQueries({ queryKey: ['construction-costs'] });
    },
    onError: (error) => {
      console.error('❌ Error deleting cost:', error);
      message.error('Ошибка при удалении затрат');
    }
  });

  // Convert categories tree to TreeSelect data
  const convertToTreeData = (items: CategoryWithChildren[]): any[] => {
    return items.map(item => ({
      title: item.name,
      value: item.id,
      key: item.id,
      children: item.children ? convertToTreeData(item.children) : []
    }));
  };

  const treeData = convertToTreeData(categories);

  // Table columns
  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: any, b: any) => a.code.localeCompare(b.code)
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ConstructionCostWithCategory) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.description && (
            <span style={{ fontSize: 12, color: '#888' }}>{record.description}</span>
          )}
        </Space>
      )
    },
    {
      title: 'Категория',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 180,
      render: (text: string) => text ? (
        <Tag icon={<FolderOutlined />} color="blue">{text}</Tag>
      ) : '-'
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100
    },
    {
      title: 'Базовая цена',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 120,
      render: (price: number) => (
        <span style={{ fontWeight: 500 }}>
          {price.toLocaleString('ru-RU')} ₽
        </span>
      ),
      sorter: (a: any, b: any) => a.base_price - b.base_price
    },
    {
      title: 'Рыночная цена',
      dataIndex: 'market_price',
      key: 'market_price',
      width: 120,
      render: (price: number | null) => price ? (
        <span>{price.toLocaleString('ru-RU')} ₽</span>
      ) : '-'
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      render: (supplier: string | null) => supplier || '-'
    },
    {
      title: 'Теги',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => tags.length > 0 ? (
        <Space size={4} wrap>
          {tags.map(tag => (
            <Tag key={tag} color="default">{tag}</Tag>
          ))}
        </Space>
      ) : '-'
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Badge status={isActive ? 'success' : 'default'} text={isActive ? 'Активно' : 'Неактивно'} />
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ConstructionCostWithCategory) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="История цен">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleViewHistory(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить затраты?"
            description="Это действие нельзя отменить"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Tooltip title="Удалить">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const handleEdit = (cost: ConstructionCostWithCategory) => {
    console.log('🔍 [handleEdit] Editing cost:', cost);
    setSelectedCost(cost);
    form.setFieldsValue({
      ...cost,
      price_date: cost.price_date ? dayjs(cost.price_date) : undefined,
      tags: cost.tags || []
    });
    setDrawerVisible(true);
  };

  const handleViewHistory = (cost: ConstructionCostWithCategory) => {
    console.log('🔍 [handleViewHistory] Viewing history for:', cost);
    // TODO: Implement price history modal
    message.info('История цен будет доступна в следующей версии');
  };

  const handleSubmit = async (values: any) => {
    console.log('🚀 [handleSubmit] Form values:', values);
    
    const input = {
      ...values,
      price_date: values.price_date ? values.price_date.format('YYYY-MM-DD') : undefined,
      specifications: values.specifications || {},
      tags: values.tags || []
    };

    if (selectedCost) {
      updateMutation.mutate({ id: selectedCost.id, ...input });
    } else {
      createMutation.mutate(input);
    }
  };

  const handleSearch = (value: string) => {
    console.log('🔍 [handleSearch] Searching for:', value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleCategoryFilter = (categoryId: string | undefined) => {
    console.log('🔍 [handleCategoryFilter] Filtering by category:', categoryId);
    setFilters(prev => ({ ...prev, category_id: categoryId }));
  };

  const handleSupplierFilter = (supplier: string | undefined) => {
    console.log('🔍 [handleSupplierFilter] Filtering by supplier:', supplier);
    setFilters(prev => ({ ...prev, supplier }));
  };

  const handleExport = () => {
    console.log('📥 [handleExport] Exporting costs to Excel');
    const fileName = `Затраты_на_строительство_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
    exportConstructionCostsToExcel(costs, fileName);
    message.success('Данные экспортированы');
  };

  const handleDownloadTemplate = () => {
    console.log('📥 [handleDownloadTemplate] Downloading template');
    generateConstructionCostsTemplate();
    message.success('Шаблон загружен');
  };

  const handleImport = async (costs: CreateConstructionCostInput[]) => {
    console.log('📤 [handleImport] Importing costs:', costs.length);
    await bulkCreateMutation.mutateAsync(costs);
  };

  // Calculate statistics
  const statistics = {
    total: costs.length,
    active: costs.filter(c => c.is_active).length,
    totalValue: costs.reduce((sum, c) => sum + c.base_price, 0),
    categories: new Set(costs.map(c => c.category_id).filter(Boolean)).size
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>Затраты на строительство</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              Шаблон
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              Импорт
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={costs.length === 0}
            >
              Экспорт
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetchCosts()}
            >
              Обновить
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedCost(null);
                form.resetFields();
                setDrawerVisible(true);
              }}
            >
              Добавить затраты
            </Button>
          </Space>
        }
      >
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Всего позиций"
                value={statistics.total}
                prefix={<TagsOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Активных"
                value={statistics.active}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Категорий"
                value={statistics.categories}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Общая стоимость"
                value={statistics.totalValue}
                precision={0}
                suffix="₽"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Search
            placeholder="Поиск по названию или коду"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
          />
          <TreeSelect
            placeholder="Выберите категорию"
            allowClear
            treeData={treeData}
            style={{ width: 250 }}
            onChange={handleCategoryFilter}
            treeDefaultExpandAll
          />
          <Select
            placeholder="Поставщик"
            allowClear
            style={{ width: 200 }}
            onChange={handleSupplierFilter}
          >
            {suppliers.map(supplier => (
              <Option key={supplier} value={supplier}>{supplier}</Option>
            ))}
          </Select>
          <Select
            value={filters.is_active}
            style={{ width: 150 }}
            onChange={(value) => setFilters(prev => ({ ...prev, is_active: value }))}
          >
            <Option value={true}>Активные</Option>
            <Option value={false}>Неактивные</Option>
            <Option value={undefined}>Все</Option>
          </Select>
        </Space>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={costs}
          rowKey="id"
          loading={costsLoading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total} записей`
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={selectedCost ? 'Редактировать затраты' : 'Добавить затраты'}
        width={600}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedCost(null);
          form.resetFields();
        }}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setDrawerVisible(false)}>Отмена</Button>
            <Button 
              type="primary" 
              onClick={() => form.submit()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {selectedCost ? 'Сохранить' : 'Добавить'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код"
            rules={[{ required: true, message: 'Введите код' }]}
          >
            <Input placeholder="Например: MAT-001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование' }]}
          >
            <Input placeholder="Название затрат" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Категория"
          >
            <TreeSelect
              placeholder="Выберите категорию"
              allowClear
              treeData={treeData}
              treeDefaultExpandAll
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Описание затрат" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Единица измерения"
                rules={[{ required: true, message: 'Введите единицу измерения' }]}
              >
                <Input placeholder="шт, м², м³, кг" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="base_price"
                label="Базовая цена"
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="market_price"
                label="Рыночная цена"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price_date"
                label="Дата цены"
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="supplier"
            label="Поставщик"
          >
            <Select
              placeholder="Выберите или введите поставщика"
              allowClear
              showSearch
              mode="tags"
              maxCount={1}
            >
              {suppliers.map(supplier => (
                <Option key={supplier} value={supplier}>{supplier}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="Теги"
          >
            <Select
              mode="tags"
              placeholder="Добавьте теги"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Статус"
            valuePropName="checked"
            initialValue={true}
          >
            <Select>
              <Option value={true}>Активно</Option>
              <Option value={false}>Неактивно</Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Import Modal */}
      <ImportConstructionCostsModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImport}
        categories={categories.flatMap(cat => {
          const result: any[] = [cat];
          if (cat.children) {
            cat.children.forEach(child => result.push(child));
          }
          return result;
        })}
      />
    </div>
  );
};