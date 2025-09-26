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
import * as XLSX from 'xlsx-js-style';

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
      width: 100,
      render: (text: string) => (
        <span style={{ 
          fontFamily: 'monospace',
          fontSize: '12px',
          color: 'var(--color-neutral-600)',
          background: 'var(--color-neutral-100)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)'
        }}>
          {text}
        </span>
      )
    },
    {
      title: 'Наименование',
      dataIndex: ['cost', 'name'],
      key: 'name',
      render: (text: string, record: TenderConstructionCostWithDetails) => (
        <Space direction="vertical" size={0}>
          <span style={{ 
            fontWeight: 500,
            color: 'var(--color-neutral-800)',
            lineHeight: '1.4'
          }}>
            {text}
          </span>
          {record.cost?.description && (
            <span style={{ 
              fontSize: 12, 
              color: 'var(--color-neutral-500)',
              lineHeight: '1.3'
            }}>
              {record.cost.description}
            </span>
          )}
        </Space>
      )
    },
    {
      title: 'Категория',
      dataIndex: ['cost', 'category', 'name'],
      key: 'category',
      width: 150,
      render: (text: string, record: TenderConstructionCostWithDetails) => {
        if (!text) return <span style={{ color: 'var(--color-neutral-400)' }}>-</span>;
        
        // Определяем цвет категории на основе типа затрат
        let categoryColor = 'var(--color-primary-500)';
        let categoryBg = 'var(--color-primary-50)';
        
        if (text.toLowerCase().includes('материал')) {
          categoryColor = 'var(--color-materials-600)';
          categoryBg = 'var(--color-materials-50)';
        } else if (text.toLowerCase().includes('работ')) {
          categoryColor = 'var(--color-works-600)';
          categoryBg = 'var(--color-works-50)';
        }
        
        return (
          <span 
            className="category-tag"
            style={{
              background: categoryBg,
              color: categoryColor,
              border: `1px solid ${categoryColor}20`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FolderOutlined style={{ fontSize: 10 }} />
            {text}
          </span>
        );
      }
    },
    {
      title: 'Ед. изм.',
      dataIndex: ['cost', 'unit'],
      key: 'unit',
      width: 80,
      render: (text: string) => (
        <span style={{ 
          fontSize: '12px',
          color: 'var(--color-neutral-600)' 
        }}>
          {text}
        </span>
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      render: (value: number) => (
        <span className="money-value" style={{ 
          color: 'var(--color-neutral-700)',
          fontWeight: 500
        }}>
          {value.toLocaleString('ru-RU')}
        </span>
      )
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 130,
      render: (price: number) => (
        <span className="money-value" style={{ 
          color: 'var(--color-neutral-700)',
          fontWeight: 500
        }}>
          {price.toLocaleString('ru-RU')} ₽
        </span>
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 130,
      render: (price: number) => (
        <span className="money-value" style={{ 
          fontWeight: 600,
          color: 'var(--color-neutral-800)'
        }}>
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
        <span 
          style={{
            background: 'var(--color-warning-100)',
            color: 'var(--color-warning-700)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <PercentageOutlined style={{ fontSize: 10 }} />
          {value}%
        </span>
      ) : (
        <span style={{ color: 'var(--color-neutral-400)' }}>-</span>
      )
    },
    {
      title: 'Итого',
      dataIndex: 'final_price',
      key: 'final_price',
      width: 140,
      render: (price: number) => (
        <span className="money-value money-positive" style={{ 
          fontWeight: 700,
          color: 'var(--color-success-600)',
          fontSize: '14px'
        }}>
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
              className="action-button"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-primary-600)'
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить затраты из тендера?"
            description="Это действие нельзя будет отменить"
            onConfirm={() => removeCostMutation.mutate(record.id)}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ 
              danger: true,
              style: { borderRadius: 'var(--radius-md)' }
            }}
            cancelButtonProps={{ 
              style: { borderRadius: 'var(--radius-md)' }
            }}
          >
            <Tooltip title="Удалить">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error-500)'
                }}
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
    <div style={{ 
      padding: '24px 32px',
      backgroundColor: 'var(--bg-page)',
      minHeight: '100vh'
    }}>
      {/* Навигация назад */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/tenders')}
          className="action-button"
          style={{ 
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Назад к тендерам
        </Button>
      </div>

      {/* Основная карточка */}
      <Card
        style={{
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-card)',
          background: 'var(--bg-card)'
        }}
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            padding: '8px 0'
          }}>
            <DollarOutlined style={{ 
              fontSize: 20, 
              color: 'var(--color-primary-500)' 
            }} />
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: 'var(--color-neutral-800)' 
            }}>
              Затраты на строительство - {tender?.title || 'Тендер'}
            </span>
          </div>
        }
        extra={
          <Space wrap className="action-buttons">
            <Button 
              icon={<ImportOutlined />} 
              onClick={() => setImportModalVisible(true)}
              className="action-button"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Импорт из Excel
            </Button>
            <Button 
              icon={<ExportOutlined />} 
              onClick={handleExport}
              className="action-button"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Экспорт в Excel
            </Button>
            <Button 
              icon={<GroupOutlined />} 
              onClick={() => setGroupModalVisible(true)}
              className="action-button"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Создать группу
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setAddCostModalVisible(true)}
              className="action-button-primary"
              style={{ 
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-500)',
                borderColor: 'var(--color-primary-500)'
              }}
            >
              Добавить затраты
            </Button>
          </Space>
        }
      >
        {/* Статистические карточки */}
        <div 
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: 32
          }}
        >
          <Card 
            className="stats-card animate-fade-in"
            bordered={false}
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CalculatorOutlined style={{ 
                  fontSize: 20, 
                  color: 'var(--color-primary-600)' 
                }} />
              </div>
              <div>
                <div className="stats-card-title">Позиций</div>
                <div className="stats-card-value">
                  {summary?.items_count || 0}
                </div>
              </div>
            </div>
          </Card>

          <Card 
            className="stats-card animate-fade-in"
            bordered={false}
            style={{ 
              borderRadius: 'var(--radius-lg)',
              animationDelay: '0.1s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-materials-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FolderOutlined style={{ 
                  fontSize: 20, 
                  color: 'var(--color-materials-600)' 
                }} />
              </div>
              <div>
                <div className="stats-card-title">Категорий</div>
                <div className="stats-card-value">
                  {summary?.categories_count || 0}
                </div>
              </div>
            </div>
          </Card>

          <Card 
            className="stats-card animate-fade-in"
            bordered={false}
            style={{ 
              borderRadius: 'var(--radius-lg)',
              animationDelay: '0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-neutral-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <DollarOutlined style={{ 
                  fontSize: 20, 
                  color: 'var(--color-neutral-600)' 
                }} />
              </div>
              <div>
                <div className="stats-card-title">Базовая сумма</div>
                <div className="stats-card-value money-value">
                  {(summary?.total_base || 0).toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          </Card>

          <Card 
            className="stats-card animate-fade-in"
            bordered={false}
            style={{ 
              borderRadius: 'var(--radius-lg)',
              animationDelay: '0.3s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-success-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PercentageOutlined style={{ 
                  fontSize: 20, 
                  color: 'var(--color-success-600)' 
                }} />
              </div>
              <div>
                <div className="stats-card-title">Итого с наценкой</div>
                <div 
                  className="stats-card-value money-value money-positive"
                  style={{ color: 'var(--color-success-600)' }}
                >
                  {(summary?.total_with_markup || 0).toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Поиск и фильтры */}
        <div style={{ 
          marginBottom: 24,
          padding: '16px 20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <Search
            placeholder="Поиск по названию или коду затрат..."
            allowClear
            size="large"
            style={{ 
              width: '100%',
              maxWidth: 500
            }}
            className="input-field"
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Группы затрат */}
        {filteredGroups.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)'
          }}>
            <Empty 
              description={
                <span style={{ color: 'var(--color-neutral-500)' }}>
                  Нет затрат в этом тендере
                </span>
              }
            />
          </div>
        ) : (
          <Collapse 
            defaultActiveKey={['ungrouped']} 
            ghost
            style={{ background: 'transparent' }}
          >
            {filteredGroups
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(group => (
                <Panel
                  key={group.id}
                  header={
                    <div className="cost-group-header" style={{ 
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 20px',
                      margin: '-12px -20px',
                      borderRadius: 'var(--radius-lg)'
                    }}>
                      <Space>
                        <GroupOutlined style={{ 
                          fontSize: 16,
                          color: 'var(--color-primary-500)' 
                        }} />
                        <Title 
                          level={5} 
                          style={{ 
                            margin: 0,
                            color: 'var(--color-neutral-800)',
                            fontWeight: 600
                          }}
                        >
                          {group.name}
                        </Title>
                        <Badge 
                          count={group.costs.length} 
                          showZero 
                          style={{ 
                            backgroundColor: 'var(--color-primary-500)',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        />
                      </Space>
                      <Space size="large">
                        <Space size="small">
                          <Text type="secondary" style={{ fontSize: 12 }}>Сумма:</Text>
                          <Text 
                            strong 
                            className="money-value"
                            style={{ color: 'var(--color-neutral-700)' }}
                          >
                            {group.total_base.toLocaleString('ru-RU')} ₽
                          </Text>
                        </Space>
                        <Divider type="vertical" />
                        <Space size="small">
                          <Text type="secondary" style={{ fontSize: 12 }}>С наценкой:</Text>
                          <Text 
                            strong 
                            className="money-value money-positive"
                            style={{ color: 'var(--color-success-600)' }}
                          >
                            {group.total_with_markup.toLocaleString('ru-RU')} ₽
                          </Text>
                        </Space>
                      </Space>
                    </div>
                  }
                  style={{ 
                    marginBottom: 16,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden'
                  }}
                >
                  {group.costs.length > 0 ? (
                    <Table
                      columns={columns}
                      dataSource={group.costs}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 1300 }}
                      size="small"
                      className="tender-costs-table"
                      style={{
                        marginTop: 16,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden'
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: 'var(--color-neutral-50)',
                      borderRadius: 'var(--radius-md)',
                      margin: '16px 0'
                    }}>
                      <Empty 
                        description={
                          <span style={{ color: 'var(--color-neutral-500)' }}>
                            Нет затрат в этой группе
                          </span>
                        }
                      />
                    </div>
                  )}
                </Panel>
              ))}
          </Collapse>
        )}
      </Card>

      {/* Edit Cost Drawer */}
      <Drawer
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0'
          }}>
            <EditOutlined style={{ 
              fontSize: 18, 
              color: 'var(--color-primary-500)' 
            }} />
            <span style={{ 
              fontSize: '16px', 
              fontWeight: 600,
              color: 'var(--color-neutral-800)' 
            }}>
              Редактировать затраты
            </span>
          </div>
        }
        width={550}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedCost(null);
          form.resetFields();
        }}
        styles={{
          body: { 
            background: 'var(--bg-page)',
            padding: '24px 24px 80px'
          },
          header: {
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-light)'
          }
        }}
        footer={
          <div style={{ 
            padding: '16px 24px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <Button 
              onClick={() => setDrawerVisible(false)}
              style={{
                borderRadius: 'var(--radius-md)',
                height: '40px',
                padding: '0 20px'
              }}
            >
              Отмена
            </Button>
            <Button 
              type="primary" 
              onClick={() => form.submit()}
              loading={updateCostMutation.isPending}
              style={{
                borderRadius: 'var(--radius-md)',
                height: '40px',
                padding: '0 20px',
                background: 'var(--color-primary-500)',
                borderColor: 'var(--color-primary-500)'
              }}
            >
              Сохранить
            </Button>
          </div>
        }
      >
        {selectedCost && (
          <Card 
            style={{
              marginBottom: 24,
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <DollarOutlined style={{ 
                  fontSize: 20, 
                  color: 'var(--color-primary-600)' 
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Title 
                  level={5} 
                  style={{ 
                    margin: '0 0 8px 0',
                    color: 'var(--color-neutral-800)',
                    lineHeight: '1.3'
                  }}
                >
                  {selectedCost.cost?.name}
                </Title>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '8px 16px',
                  fontSize: '13px',
                  color: 'var(--color-neutral-600)'
                }}>
                  <div>
                    <strong>Код:</strong> {selectedCost.cost?.code}
                  </div>
                  <div>
                    <strong>Единица:</strong> {selectedCost.cost?.unit}
                  </div>
                  <div>
                    <strong>Базовая цена:</strong>{' '}
                    <span className="money-value" style={{ color: 'var(--color-neutral-700)' }}>
                      {selectedCost.cost?.base_price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  <div>
                    <strong>Категория:</strong> {selectedCost.cost?.category?.name || 'Не указана'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Количество</span>}
                rules={[{ required: true, message: 'Введите количество' }]}
              >
                <InputNumber
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-md)'
                  }}
                  className="input-field"
                  min={0}
                  precision={3}
                  placeholder="0.000"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_price"
                label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Цена за единицу</span>}
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-md)'
                  }}
                  className="input-field"
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
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Наценка (%)</span>}
          >
            <InputNumber
              style={{ 
                width: '100%',
                height: '40px',
                borderRadius: 'var(--radius-md)'
              }}
              className="input-field"
              min={0}
              max={100}
              precision={2}
              placeholder="0.00"
              formatter={value => `${value}%`}
            />
          </Form.Item>

          <Form.Item
            name="group_id"
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Группа</span>}
          >
            <Select 
              placeholder="Выберите группу" 
              allowClear
              style={{ 
                borderRadius: 'var(--radius-md)',
              }}
              className="input-field"
            >
              {groupsWithCosts
                .filter(g => g.id !== 'ungrouped')
                .map(group => (
                  <Option key={group.id} value={group.id}>{group.name}</Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Примечания</span>}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Примечания к позиции..."
              style={{ 
                borderRadius: 'var(--radius-md)',
                resize: 'none'
              }}
              className="input-field"
            />
          </Form.Item>

          <Form.Item
            name="is_included"
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Включено в расчет</span>}
            valuePropName="checked"
          >
            <Select
              style={{ 
                borderRadius: 'var(--radius-md)',
              }}
              className="input-field"
            >
              <Option value={true}>
                <Space>
                  <span style={{ 
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--color-success-500)'
                  }}></span>
                  Включено
                </Space>
              </Option>
              <Option value={false}>
                <Space>
                  <span style={{ 
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--color-error-500)'
                  }}></span>
                  Исключено
                </Space>
              </Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Add Cost Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0'
          }}>
            <PlusOutlined style={{ 
              fontSize: 18, 
              color: 'var(--color-success-500)' 
            }} />
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600,
              color: 'var(--color-neutral-800)' 
            }}>
              Добавить затраты в тендер
            </span>
          </div>
        }
        open={addCostModalVisible}
        onCancel={() => {
          setAddCostModalVisible(false);
          addCostForm.resetFields();
        }}
        onOk={() => addCostForm.submit()}
        width={750}
        confirmLoading={addCostMutation.isPending}
        className="modal-content"
        okButtonProps={{
          style: {
            borderRadius: 'var(--radius-md)',
            height: '40px',
            background: 'var(--color-success-500)',
            borderColor: 'var(--color-success-500)'
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: 'var(--radius-md)',
            height: '40px'
          }
        }}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form
          form={addCostForm}
          layout="vertical"
          onFinish={handleAddCost}
          style={{ padding: '8px 0' }}
        >
          <Form.Item
            name="cost_ids"
            label={
              <div style={{ 
                color: 'var(--color-neutral-700)', 
                fontWeight: 500,
                marginBottom: 8
              }}>
                Выберите затраты
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                  (можно выбрать несколько позиций)
                </Text>
              </div>
            }
            rules={[{ required: true, message: 'Выберите хотя бы одну позицию' }]}
          >
            <Select
              mode="multiple"
              placeholder="Начните вводить название или код затраты..."
              showSearch
              style={{ 
                minHeight: '40px',
                borderRadius: 'var(--radius-md)'
              }}
              className="input-field"
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={availableCosts.map(cost => ({
                value: cost.id,
                label: `${cost.code} - ${cost.name} (${cost.unit})`,
                title: `${cost.name} - ${cost.description || 'Без описания'}`
              }))}
              tagRender={(props) => {
                const { label, onClose } = props;
                return (
                  <span style={{
                    background: 'var(--color-primary-100)',
                    color: 'var(--color-primary-700)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    margin: '2px'
                  }}>
                    {typeof label === 'string' ? label.split(' - ')[0] : label}
                    <span
                      onClick={onClose}
                      style={{
                        cursor: 'pointer',
                        fontSize: '10px',
                        opacity: 0.7
                      }}
                    >
                      ×
                    </span>
                  </span>
                );
              }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Количество</span>}
                initialValue={1}
                rules={[{ required: true, message: 'Введите количество' }]}
              >
                <InputNumber
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-md)'
                  }}
                  className="input-field"
                  min={0}
                  precision={3}
                  placeholder="0.000"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_price"
                label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Цена за единицу</span>}
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-md)'
                  }}
                  className="input-field"
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
                label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Наценка (%)</span>}
                initialValue={0}
              >
                <InputNumber
                  style={{ 
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-md)'
                  }}
                  className="input-field"
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
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Группа</span>}
          >
            <Select 
              placeholder="Выберите группу (необязательно)" 
              allowClear
              style={{ 
                height: '40px',
                borderRadius: 'var(--radius-md)'
              }}
              className="input-field"
            >
              {groupsWithCosts
                .filter(g => g.id !== 'ungrouped')
                .map(group => (
                  <Option key={group.id} value={group.id}>
                    <Space>
                      <GroupOutlined style={{ color: 'var(--color-primary-500)' }} />
                      {group.name}
                    </Space>
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 0'
          }}>
            <GroupOutlined style={{ 
              fontSize: 18, 
              color: 'var(--color-primary-500)' 
            }} />
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600,
              color: 'var(--color-neutral-800)' 
            }}>
              Создать группу затрат
            </span>
          </div>
        }
        open={groupModalVisible}
        onCancel={() => {
          setGroupModalVisible(false);
          groupForm.resetFields();
        }}
        onOk={() => groupForm.submit()}
        confirmLoading={createGroupMutation.isPending}
        className="modal-content"
        width={500}
        okButtonProps={{
          style: {
            borderRadius: 'var(--radius-md)',
            height: '40px',
            background: 'var(--color-primary-500)',
            borderColor: 'var(--color-primary-500)'
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: 'var(--radius-md)',
            height: '40px'
          }
        }}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form
          form={groupForm}
          layout="vertical"
          onFinish={(values) => createGroupMutation.mutate(values)}
          style={{ padding: '8px 0' }}
        >
          <Form.Item
            name="name"
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Название группы</span>}
            rules={[{ required: true, message: 'Введите название группы' }]}
          >
            <Input 
              placeholder="Например: Материалы, Работы, Оборудование..."
              style={{ 
                height: '40px',
                borderRadius: 'var(--radius-md)'
              }}
              className="input-field"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Описание</span>}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Краткое описание группы затрат..."
              style={{ 
                borderRadius: 'var(--radius-md)',
                resize: 'none'
              }}
              className="input-field"
            />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label={<span style={{ color: 'var(--color-neutral-700)', fontWeight: 500 }}>Порядок сортировки</span>}
            initialValue={0}
          >
            <InputNumber 
              style={{ 
                width: '100%',
                height: '40px',
                borderRadius: 'var(--radius-md)'
              }}
              className="input-field"
              min={0}
              placeholder="0"
            />
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