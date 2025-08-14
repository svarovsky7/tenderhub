import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Modal,
  Collapse,
  Empty,
  Divider,
  Typography,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  FolderOutlined,
  DollarOutlined,
  GroupOutlined,
  ExportOutlined,
  ImportOutlined,
  CalculatorOutlined,
  ArrowLeftOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenderConstructionCostsApi } from '../../lib/supabase/api/tender-construction-costs';
import { constructionCostsApi } from '../../lib/supabase/api/construction-costs';
import { tendersApi } from '../../lib/supabase/api/tenders';
import type { 
  TenderConstructionCostWithDetails,
  CreateTenderConstructionCostInput,
  UpdateTenderConstructionCostInput
} from '../../lib/supabase/types/construction-costs';
import { ImportTenderCostsModal } from '../../components/admin/ImportTenderCostsModal';
import * as XLSX from 'xlsx';

const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;

export const TenderConstructionCostsPage: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  console.log('🚀 [TenderConstructionCostsPage] Component mounted with tenderId:', tenderId);

  const [searchTerm, setSearchTerm] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCost, setSelectedCost] = useState<TenderConstructionCostWithDetails | null>(null);
  const [addCostModalVisible, setAddCostModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [addCostForm] = Form.useForm();

  if (!tenderId) {
    navigate('/');
    return null;
  }

  // Queries
  const { data: tender } = useQuery({
    queryKey: ['tender', tenderId],
    queryFn: () => tendersApi.getById(tenderId)
  });

  const { data: groupsWithCosts = [] } = useQuery({
    queryKey: ['tender-construction-costs-groups', tenderId],
    queryFn: () => tenderConstructionCostsApi.getTenderGroupsWithCosts(tenderId)
  });

  const { data: summary } = useQuery({
    queryKey: ['tender-construction-costs-summary', tenderId],
    queryFn: () => tenderConstructionCostsApi.getTenderCostSummary(tenderId)
  });

  const { data: availableCosts = [] } = useQuery({
    queryKey: ['available-construction-costs'],
    queryFn: () => constructionCostsApi.getCosts({ is_active: true }),
    enabled: addCostModalVisible
  });

  // Mutations
  const addCostMutation = useMutation({
    mutationFn: (input: CreateTenderConstructionCostInput) => 
      tenderConstructionCostsApi.addCostToTender(input),
    onSuccess: () => {
      message.success('Затраты добавлены в тендер');
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-groups', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-summary', tenderId] });
      setAddCostModalVisible(false);
      addCostForm.resetFields();
    },
    onError: (error) => {
      console.error('❌ Error adding cost to tender:', error);
      message.error('Ошибка при добавлении затрат');
    }
  });

  const updateCostMutation = useMutation({
    mutationFn: (input: UpdateTenderConstructionCostInput) => 
      tenderConstructionCostsApi.updateTenderCost(input),
    onSuccess: () => {
      message.success('Затраты обновлены');
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-groups', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-summary', tenderId] });
      setDrawerVisible(false);
      form.resetFields();
      setSelectedCost(null);
    },
    onError: (error) => {
      console.error('❌ Error updating tender cost:', error);
      message.error('Ошибка при обновлении затрат');
    }
  });

  const removeCostMutation = useMutation({
    mutationFn: (id: string) => tenderConstructionCostsApi.removeCostFromTender(id),
    onSuccess: () => {
      message.success('Затраты удалены из тендера');
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-groups', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-summary', tenderId] });
    },
    onError: (error) => {
      console.error('❌ Error removing cost:', error);
      message.error('Ошибка при удалении затрат');
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: (input: any) => 
      tenderConstructionCostsApi.createGroup({
        tender_id: tenderId,
        ...input
      }),
    onSuccess: () => {
      message.success('Группа создана');
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-groups', tenderId] });
      setGroupModalVisible(false);
      groupForm.resetFields();
    },
    onError: (error) => {
      console.error('❌ Error creating group:', error);
      message.error('Ошибка при создании группы');
    }
  });

  const bulkAddCostsMutation = useMutation({
    mutationFn: (costs: CreateTenderConstructionCostInput[]) => 
      tenderConstructionCostsApi.bulkAddCostsToTender(costs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-groups', tenderId] });
      queryClient.invalidateQueries({ queryKey: ['tender-construction-costs-summary', tenderId] });
    },
    onError: (error) => {
      console.error('❌ Error bulk adding costs:', error);
      throw error;
    }
  });

  // Filter costs by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupsWithCosts;
    
    return groupsWithCosts.map(group => ({
      ...group,
      costs: group.costs.filter(cost => 
        cost.cost?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cost.cost?.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.costs.length > 0 || group.id === 'ungrouped');
  }, [groupsWithCosts, searchTerm]);

  // Table columns
  const columns = [
    {
      title: 'Код',
      dataIndex: ['cost', 'code'],
      key: 'code',
      width: 100
    },
    {
      title: 'Наименование',
      dataIndex: ['cost', 'name'],
      key: 'name',
      render: (text: string, record: TenderConstructionCostWithDetails) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.cost?.description && (
            <span style={{ fontSize: 12, color: '#888' }}>{record.cost.description}</span>
          )}
        </Space>
      )
    },
    {
      title: 'Категория',
      dataIndex: ['cost', 'category', 'name'],
      key: 'category',
      width: 150,
      render: (text: string) => text ? (
        <Tag icon={<FolderOutlined />} color="blue">{text}</Tag>
      ) : '-'
    },
    {
      title: 'Ед. изм.',
      dataIndex: ['cost', 'unit'],
      key: 'unit',
      width: 80
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value: number) => value.toLocaleString('ru-RU')
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (price: number) => `${price.toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 120,
      render: (price: number) => (
        <span style={{ fontWeight: 500 }}>
          {price.toLocaleString('ru-RU')} ₽
        </span>
      )
    },
    {
      title: 'Наценка',
      dataIndex: 'markup_percent',
      key: 'markup_percent',
      width: 100,
      render: (value: number) => value ? (
        <Tag icon={<PercentageOutlined />} color="orange">{value}%</Tag>
      ) : '-'
    },
    {
      title: 'Итого',
      dataIndex: 'final_price',
      key: 'final_price',
      width: 130,
      render: (price: number) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          {price.toLocaleString('ru-RU')} ₽
        </span>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: TenderConstructionCostWithDetails) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить затраты из тендера?"
            onConfirm={() => removeCostMutation.mutate(record.id)}
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

  const handleEdit = (cost: TenderConstructionCostWithDetails) => {
    console.log('🔍 [handleEdit] Editing tender cost:', cost);
    setSelectedCost(cost);
    form.setFieldsValue({
      quantity: cost.quantity,
      unit_price: cost.unit_price,
      markup_percent: cost.markup_percent || 0,
      notes: cost.notes,
      is_included: cost.is_included,
      group_id: cost.group_id
    });
    setDrawerVisible(true);
  };

  const handleSubmit = async (values: any) => {
    console.log('🚀 [handleSubmit] Form values:', values);
    
    if (selectedCost) {
      updateCostMutation.mutate({
        id: selectedCost.id,
        ...values
      });
    }
  };

  const handleAddCost = async (values: any) => {
    console.log('🚀 [handleAddCost] Adding costs:', values);
    
    const { cost_ids, ...commonValues } = values;
    
    // Add multiple costs at once
    const promises = cost_ids.map((cost_id: string) => 
      addCostMutation.mutateAsync({
        tender_id: tenderId,
        cost_id,
        ...commonValues
      })
    );
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('❌ Error adding multiple costs:', error);
    }
  };

  const handleExport = () => {
    console.log('🚀 [handleExport] Exporting to Excel');
    
    const exportData = filteredGroups.flatMap(group => 
      group.costs.map(cost => ({
        'Группа': group.name,
        'Код': cost.cost?.code || '',
        'Наименование': cost.cost?.name || '',
        'Категория': cost.cost?.category?.name || '',
        'Ед. изм.': cost.cost?.unit || '',
        'Количество': cost.quantity,
        'Цена за ед.': cost.unit_price,
        'Сумма': cost.total_price,
        'Наценка %': cost.markup_percent || 0,
        'Итого': cost.final_price,
        'Примечания': cost.notes || ''
      }))
    );
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Затраты');
    XLSX.writeFile(wb, `tender_${tenderId}_costs.xlsx`);
    
    message.success('Данные экспортированы');
  };

  const handleImport = async (costs: CreateTenderConstructionCostInput[]) => {
    console.log('📤 [handleImport] Importing costs:', costs.length);
    await bulkAddCostsMutation.mutateAsync(costs);
  };

  return (
    <div style={{ padding: 24 }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/tenders')}
        style={{ marginBottom: 16 }}
      >
        Назад к тендерам
      </Button>

      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>Затраты на строительство - {tender?.title || 'Тендер'}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
              Импорт из Excel
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              Экспорт в Excel
            </Button>
            <Button icon={<GroupOutlined />} onClick={() => setGroupModalVisible(true)}>
              Создать группу
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setAddCostModalVisible(true)}
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
                title="Позиций"
                value={summary?.items_count || 0}
                prefix={<CalculatorOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Категорий"
                value={summary?.categories_count || 0}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Базовая сумма"
                value={summary?.total_base || 0}
                precision={0}
                suffix="₽"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Итого с наценкой"
                value={summary?.total_with_markup || 0}
                precision={0}
                suffix="₽"
                valueStyle={{ color: '#1890ff', fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search */}
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="Поиск по названию или коду"
            allowClear
            style={{ width: 400 }}
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Space>

        {/* Groups with costs */}
        {filteredGroups.length === 0 ? (
          <Empty description="Нет затрат в этом тендере" />
        ) : (
          <Collapse defaultActiveKey={['ungrouped']} ghost>
            {filteredGroups
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(group => (
                <Panel
                  key={group.id}
                  header={
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <GroupOutlined />
                        <Title level={5} style={{ margin: 0 }}>{group.name}</Title>
                        <Badge count={group.costs.length} showZero />
                      </Space>
                      <Space>
                        <Text type="secondary">Сумма:</Text>
                        <Text strong>{group.total_base.toLocaleString('ru-RU')} ₽</Text>
                        <Divider type="vertical" />
                        <Text type="secondary">С наценкой:</Text>
                        <Text strong style={{ color: '#1890ff' }}>
                          {group.total_with_markup.toLocaleString('ru-RU')} ₽
                        </Text>
                      </Space>
                    </Space>
                  }
                >
                  {group.costs.length > 0 ? (
                    <Table
                      columns={columns}
                      dataSource={group.costs}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 1300 }}
                      size="small"
                    />
                  ) : (
                    <Empty description="Нет затрат в этой группе" />
                  )}
                </Panel>
              ))}
          </Collapse>
        )}
      </Card>

      {/* Edit Cost Drawer */}
      <Drawer
        title="Редактировать затраты"
        width={500}
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
              loading={updateCostMutation.isPending}
            >
              Сохранить
            </Button>
          </Space>
        }
      >
        {selectedCost && (
          <div style={{ marginBottom: 16 }}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>{selectedCost.cost?.name}</Text>
                <Text type="secondary">Код: {selectedCost.cost?.code}</Text>
                <Text type="secondary">Единица: {selectedCost.cost?.unit}</Text>
                <Text type="secondary">Базовая цена: {selectedCost.cost?.base_price.toLocaleString('ru-RU')} ₽</Text>
              </Space>
            </Card>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[{ required: true, message: 'Введите количество' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={3}
                  placeholder="0.000"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_price"
                label="Цена за единицу"
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

          <Form.Item
            name="markup_percent"
            label="Наценка (%)"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              placeholder="0.00"
              formatter={value => `${value}%`}
            />
          </Form.Item>

          <Form.Item
            name="group_id"
            label="Группа"
          >
            <Select placeholder="Выберите группу" allowClear>
              {groupsWithCosts
                .filter(g => g.id !== 'ungrouped')
                .map(group => (
                  <Option key={group.id} value={group.id}>{group.name}</Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примечания"
          >
            <Input.TextArea rows={3} placeholder="Примечания" />
          </Form.Item>

          <Form.Item
            name="is_included"
            label="Включено в расчет"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>Включено</Option>
              <Option value={false}>Исключено</Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Add Cost Modal */}
      <Modal
        title="Добавить затраты в тендер"
        open={addCostModalVisible}
        onCancel={() => {
          setAddCostModalVisible(false);
          addCostForm.resetFields();
        }}
        onOk={() => addCostForm.submit()}
        width={700}
        confirmLoading={addCostMutation.isPending}
      >
        <Form
          form={addCostForm}
          layout="vertical"
          onFinish={handleAddCost}
        >
          <Form.Item
            name="cost_ids"
            label="Выберите затраты"
            rules={[{ required: true, message: 'Выберите хотя бы одну позицию' }]}
          >
            <Select
              mode="multiple"
              placeholder="Начните вводить название или код"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={availableCosts.map(cost => ({
                value: cost.id,
                label: `${cost.code} - ${cost.name} (${cost.unit})`
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Количество"
                initialValue={1}
                rules={[{ required: true, message: 'Введите количество' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={3}
                  placeholder="0.000"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_price"
                label="Цена за единицу"
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
            <Col span={8}>
              <Form.Item
                name="markup_percent"
                label="Наценка (%)"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  precision={2}
                  placeholder="0.00"
                  formatter={value => `${value}%`}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="group_id"
            label="Группа"
          >
            <Select placeholder="Выберите группу" allowClear>
              {groupsWithCosts
                .filter(g => g.id !== 'ungrouped')
                .map(group => (
                  <Option key={group.id} value={group.id}>{group.name}</Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        title="Создать группу затрат"
        open={groupModalVisible}
        onCancel={() => {
          setGroupModalVisible(false);
          groupForm.resetFields();
        }}
        onOk={() => groupForm.submit()}
        confirmLoading={createGroupMutation.isPending}
      >
        <Form
          form={groupForm}
          layout="vertical"
          onFinish={(values) => createGroupMutation.mutate(values)}
        >
          <Form.Item
            name="name"
            label="Название группы"
            rules={[{ required: true, message: 'Введите название группы' }]}
          >
            <Input placeholder="Например: Материалы" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Описание группы" />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="Порядок сортировки"
            initialValue={0}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <ImportTenderCostsModal
        visible={importModalVisible}
        tenderId={tenderId}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImport}
        groups={groupsWithCosts.filter(g => g.id !== 'ungrouped')}
      />
    </div>
  );
};