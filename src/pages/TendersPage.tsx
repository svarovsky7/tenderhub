import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  Row,
  Col,
  Statistic,
  Avatar,
  Dropdown,
  message,
  Empty,
  Badge,
  Progress,
  Upload
} from 'antd';
import {
  PlusOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  DollarOutlined,
  MoreOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { UploadProps } from 'antd';
import type { UploadRequestOption as RcUploadRequestOption } from 'rc-upload/lib/interface';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { tendersApi, clientWorksApi } from '../lib/supabase/api';
import type { 
  TenderWithSummary, 
  TenderInsert, 
  TenderUpdate, 
  TenderFilters,
  TenderStatus 
} from '../lib/supabase/types';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface TendersPageState {
  tenders: TenderWithSummary[];
  loading: boolean;
  pagination: TablePaginationConfig;
  filters: TenderFilters;
  selectedRowKeys: string[];
  createModalVisible: boolean;
  editModalVisible: boolean;
  editingTender: TenderWithSummary | null;
}

const statusColors = {
  draft: 'default',
  active: 'processing',
  submitted: 'warning',
  awarded: 'success',
  closed: 'default'
} as const;

const statusLabels = {
  draft: 'Черновик',
  active: 'Активный',
  submitted: 'Подан',
  awarded: 'Выигран',
  closed: 'Закрыт'
} as const;

const TendersPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [state, setState] = useState<TendersPageState>({
    tenders: [],
    loading: false,
    pagination: {
      current: 1,
      pageSize: 20,
      total: 0,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} тендеров`
    },
    filters: {
      search: '',
      status: [],
      client_name: '',
      date_from: '',
      date_to: ''
    },
    selectedRowKeys: [],
    createModalVisible: false,
    editModalVisible: false,
    editingTender: null
  });

  // Add delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [tenderToDelete, setTenderToDelete] = useState<TenderWithSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load tenders
  const loadTenders = useCallback(async () => {
    console.log('🔄 loadTenders called');
    console.log('📋 Current filters:', state.filters);
    console.log('📄 Current pagination:', {
      current: state.pagination.current,
      pageSize: state.pagination.pageSize
    });
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('📡 Calling tendersApi.getAll...');
      const result = await tendersApi.getAll(state.filters, {
        page: state.pagination.current,
        limit: state.pagination.pageSize
      });

      console.log('📦 tendersApi.getAll result:', result);

      if (result.error) {
        console.error('❌ API returned error:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Setting new tenders data:', {
        tendersCount: result.data?.length || 0,
        totalFromPagination: result.pagination?.total || 0
      });

      setState(prev => ({
        ...prev,
        tenders: result.data || [],
        pagination: {
          ...prev.pagination,
          total: result.pagination?.total || 0
        }
      }));

      console.log('✅ Tenders state updated successfully');
    } catch (error) {
      console.error('💥 Load tenders error:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
      console.log('🏁 loadTenders finished');
    }
  }, [state.filters, state.pagination.current, state.pagination.pageSize]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  // Handlers
  const handleTableChange = useCallback((pagination: TablePaginationConfig) => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        current: pagination.current || 1,
        pageSize: pagination.pageSize || 20
      }
    }));
  }, []);

  const handleSearch = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, search: value },
      pagination: { ...prev.pagination, current: 1 }
    }));
  }, []);

  const handleStatusFilter = useCallback((status: TenderStatus[]) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, status },
      pagination: { ...prev.pagination, current: 1 }
    }));
  }, []);

    const handleDateFilter = useCallback((dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
      setState(prev => ({
        ...prev,
        filters: {
          ...prev.filters,
        date_from: dates?.[0]?.format('YYYY-MM-DD') || '',
        date_to: dates?.[1]?.format('YYYY-MM-DD') || ''
      },
      pagination: { ...prev.pagination, current: 1 }
    }));
  }, []);

  const handleCreateTender = useCallback(async (values: TenderInsert) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const tenderData: TenderInsert = {
        title: values.title,
        description: values.description,
        client_name: values.client_name,
        tender_number: values.tender_number,
        submission_deadline: values.submission_deadline ? dayjs(values.submission_deadline).format('YYYY-MM-DD HH:mm:ss') : undefined,
        estimated_value: values.estimated_value,
        status: values.status || 'draft'
      };

      const result = await tendersApi.create(tenderData);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Тендер создан успешно');
      setState(prev => ({ ...prev, createModalVisible: false }));
      form.resetFields();
      loadTenders();
    } catch (error) {
      message.error('Ошибка создания тендера');
      console.error('Create tender error:', error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [form, loadTenders]);

  const handleEditTender = useCallback(async (values: TenderUpdate) => {
    if (!state.editingTender) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const updates: TenderUpdate = {
        title: values.title,
        description: values.description,
        client_name: values.client_name,
        tender_number: values.tender_number,
        submission_deadline: values.submission_deadline ? dayjs(values.submission_deadline).format('YYYY-MM-DD HH:mm:ss') : undefined,
        estimated_value: values.estimated_value,
        status: values.status
      };

      const result = await tendersApi.update(state.editingTender.id!, updates);
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Тендер обновлен');
      setState(prev => ({ 
        ...prev, 
        editModalVisible: false,
        editingTender: null 
      }));
      form.resetFields();
      loadTenders();
    } catch (error) {
      message.error('Ошибка обновления тендера');
      console.error('Update tender error:', error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.editingTender, form, loadTenders]);

  const handleDeleteTender = useCallback((tenderId: string) => {
    console.log('🗑️ handleDeleteTender called with tenderId:', tenderId);
    console.log('📊 Current tenders count:', state.tenders.length);
    
    if (!tenderId) {
      console.error('❌ No tenderId provided to handleDeleteTender');
      message.error('Ошибка: ID тендера не найден');
      return;
    }

    const tender = state.tenders.find(t => t.id === tenderId);
    console.log('🎯 Tender to delete:', tender);

    if (!tender) {
      console.error('❌ Tender not found in state:', tenderId);
      message.error('Тендер не найден');
      return;
    }

    console.log('📋 Setting delete modal state...');
    setTenderToDelete(tender);
    setDeleteModalVisible(true);
    console.log('✅ Delete modal should be visible now');
  }, [state.tenders]);

  const confirmDeleteTender = useCallback(async () => {
    if (!tenderToDelete) {
      console.error('❌ No tender to delete');
      return;
    }

    console.log('✅ User confirmed deletion for tender:', tenderToDelete.id);
    setDeleteLoading(true);
    
    try {
      console.log('📡 Calling tendersApi.delete...');
      const result = await tendersApi.delete(tenderToDelete.id!);
      
      console.log('📦 Delete API result:', result);
      
      if (result.error) {
        console.error('❌ API returned error:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Delete successful, showing success message');
      message.success(`Тендер "${tenderToDelete.title}" удален`);
      
      console.log('🔄 Reloading tenders...');
      await loadTenders();
      console.log('✅ Tenders reloaded successfully');
      
      // Close modal
      setDeleteModalVisible(false);
      setTenderToDelete(null);
      
    } catch (error) {
      console.error('💥 Delete tender error:', error);
      console.error('💥 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        tenderId: tenderToDelete.id,
        tenderTitle: tenderToDelete.title
      });
      
      message.error(`Ошибка удаления тендера: ${error instanceof Error ? error.message : 'Неожиданная ошибка'}`);
    } finally {
      setDeleteLoading(false);
    }
  }, [tenderToDelete, loadTenders]);

  const cancelDeleteTender = useCallback(() => {
    console.log('❌ User cancelled deletion for tender:', tenderToDelete?.id);
    setDeleteModalVisible(false);
    setTenderToDelete(null);
  }, [tenderToDelete]);

  const handleViewTender = useCallback((tender: TenderWithSummary) => {
    navigate(`/tender/${tender.id}/boq`);
  }, [navigate]);

  const handleEditClick = useCallback((tender: TenderWithSummary) => {
    setState(prev => ({ 
      ...prev, 
      editingTender: tender,
      editModalVisible: true 
    }));
    
    form.setFieldsValue({
      ...tender,
      submission_deadline: tender.submission_deadline ? dayjs(tender.submission_deadline) : null
    });
  }, [form]);

  // Calculate statistics
  const stats = {
    total: state.tenders.length,
    active: state.tenders.filter(t => t.status === 'active').length,
    submitted: state.tenders.filter(t => t.status === 'submitted').length,
    won: state.tenders.filter(t => t.status === 'awarded').length,
    totalValue: state.tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0)
  };

  // Table columns
  const columns: ColumnsType<TenderWithSummary> = [
    {
      title: 'Тендер',
      key: 'tender',
      render: (_, record) => (
        <div className="flex items-start gap-3">
          <Avatar 
            size="large" 
            icon={<FolderOpenOutlined />}
            className="bg-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Text 
                strong 
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleViewTender(record)}
              >
                {record.title}
              </Text>
              <Tag color={statusColors[record.status]}>
                {statusLabels[record.status]}
              </Tag>
            </div>
            <Text type="secondary" className="text-sm block">
              №{record.tender_number} • {record.client_name}
            </Text>
          </div>
        </div>
      ),
      width: 300
    },
    {
      title: 'Дедлайн',
      dataIndex: 'submission_deadline',
      key: 'deadline',
      width: 120,
      render: (deadline) => {
        if (!deadline) return '-';
        
        const date = dayjs(deadline);
        const isOverdue = date.isBefore(dayjs());
        const isNear = date.diff(dayjs(), 'days') <= 3;
        
        return (
          <div className={`text-center ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}>
            <CalendarOutlined className="mb-1 block" />
            <Text className={`text-xs block ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}>
              {date.format('DD.MM.YYYY')}
            </Text>
          </div>
        );
      },
      sorter: (a, b) => dayjs(a.submission_deadline || 0).unix() - dayjs(b.submission_deadline || 0).unix()
    },
    {
      title: 'Стоимость',
      key: 'value',
      width: 120,
      render: (_, record) => (
        <div className="text-center">
          <DollarOutlined className="mb-1 block text-green-500" />
          <Text strong className="text-sm block">
            {record.estimated_value ? `${(record.estimated_value / 1000000).toFixed(1)}М ₽` : '-'}
          </Text>
          {record.boq_total_value && (
            <Text type="secondary" className="text-xs block">
              ВОР: {(record.boq_total_value / 1000000).toFixed(1)}М ₽
            </Text>
          )}
        </div>
      ),
      sorter: (a, b) => (a.estimated_value || 0) - (b.estimated_value || 0)
    },
    {
      title: 'Прогресс',
      key: 'progress',
      width: 120,
      render: (_, record) => {
        const progress = 75; // Temporarily hardcoded until backend supports this field
        const itemsCount = record.total_items || 0;
        
        return (
          <div className="text-center">
            <Progress 
              type="circle" 
              size={40} 
              percent={progress} 
              strokeColor="#52c41a"
              format={() => `${progress}%`}
            />
            <Text type="secondary" className="text-xs block mt-1">
              {itemsCount} позиций
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created',
      width: 100,
      render: (created) => (
        <div className="text-center">
          <ClockCircleOutlined className="mb-1 block text-gray-400" />
          <Text type="secondary" className="text-xs">
            {dayjs(created).format('DD.MM.YYYY')}
          </Text>
        </div>
      ),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Открыть',
            onClick: () => handleViewTender(record)
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Редактировать',
            onClick: () => handleEditClick(record)
          },
          {
            key: 'export',
            icon: <ExportOutlined />,
            label: 'Экспорт'
          },
          {
            type: 'divider' as const
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Удалить',
            danger: true,
            onClick: () => {
              console.log('🖱️ Delete menu item clicked for record:', record);
              console.log('🔑 Record ID:', record.id);
              console.log('📝 Record title:', record.title);
              handleDeleteTender(record.id!);
            }
          }
        ];

        const uploadProps: UploadProps = {
          showUploadList: false,
          accept: '.xlsx,.xls',
          customRequest: async (options: RcUploadRequestOption) => {
            const { file, onSuccess, onError } = options;
            
            console.log('📤 Excel upload started for tender:', record.id);
            console.log('📁 File info:', { 
              name: (file as File).name, 
              size: (file as File).size,
              type: (file as File).type 
            });
            
            try {
              console.log('📡 Calling clientWorksApi.uploadFromXlsx...');
              const result = await clientWorksApi.uploadFromXlsx(record.id!, file as File);
              
              console.log('📦 Upload result:', result);
              
              if (result.error) {
                console.error('❌ Upload failed:', result.error);
                message.error(`Ошибка загрузки: ${result.error}`);
                onError?.(new Error(result.error));
              } else {
                console.log('✅ Upload successful:', result.data);
                
                // Show detailed success message
                const { itemsCount, positionsCount } = result.data || { itemsCount: 0, positionsCount: 0 };
                
                onSuccess?.(result, new XMLHttpRequest());
                
                // Show success modal
                Modal.success({
                  title: '✅ Файл успешно загружен!',
                  content: (
                    <div>
                      <p><strong>Файл:</strong> {(file as File).name}</p>
                      <p><strong>Импортировано:</strong></p>
                      <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                        <li>{positionsCount} позиций</li>
                        <li>{itemsCount} работ</li>
                      </ul>
                      <p style={{ marginTop: '12px', color: '#666' }}>
                        Сейчас вы будете перенаправлены на страницу ВОР для просмотра импортированных данных.
                      </p>
                    </div>
                  ),
                  okText: 'Перейти к ВОР',
                  onOk: () => {
                    console.log('🔄 User clicked OK, navigating to BOQ page...');
                    navigate(`/tender/${record.id}/boq`);
                  },
                  centered: true,
                  width: 400
                });
                
                // Also show brief message
                message.success(`Импортировано: ${positionsCount} позиций, ${itemsCount} работ`);
              }
            } catch (error) {
              console.error('💥 Upload exception:', error);
              message.error('Произошла ошибка при загрузке файла');
              onError?.(error as Error);
            }
          }
        };

        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewTender(record)}
            >
              Открыть
            </Button>
            <Upload {...uploadProps}>
              <Button size="small" icon={<UploadOutlined />}>Загрузить</Button>
            </Upload>
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title level={2} className="mb-2">
              <FolderOpenOutlined className="mr-2" />
              Управление тендерами
            </Title>
            <Text type="secondary">
              Создавайте, управляйте и отслеживайте тендерные проекты
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setState(prev => ({ ...prev, createModalVisible: true }))}
          >
            Новый тендер
          </Button>
        </div>

        {/* Statistics */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Всего тендеров"
                value={stats.total}
                prefix={<FolderOpenOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Активных"
                value={stats.active}
                prefix={<Badge status="processing" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Выиграно"
                value={stats.won}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Общая стоимость"
                value={stats.totalValue / 1000000}
                precision={1}
                suffix="М ₽"
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        {/* Filters */}
        <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Input.Search
              placeholder="Поиск по названию, номеру или клиенту..."
              value={state.filters.search}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                filters: { ...prev.filters, search: e.target.value }
              }))}
              onSearch={handleSearch}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Статус тендера"
              value={state.filters.status}
              onChange={handleStatusFilter}
              mode="multiple"
              allowClear
              className="w-full"
            >
              <Select.Option value="draft">Черновик</Select.Option>
              <Select.Option value="active">Активный</Select.Option>
              <Select.Option value="submitted">Подан</Select.Option>
              <Select.Option value="awarded">Выигран</Select.Option>
              <Select.Option value="closed">Закрыт</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['Дата от', 'Дата до']}
              onChange={handleDateFilter}
              className="w-full"
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button icon={<FilterOutlined />}>
                Фильтры
              </Button>
              <Button icon={<ExportOutlined />}>
                Экспорт
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={state.tenders}
          rowKey="id"
          loading={state.loading}
          pagination={state.pagination}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Тендеры не найдены"
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setState(prev => ({ ...prev, createModalVisible: true }))}
                >
                  Создать первый тендер
                </Button>
              </Empty>
            )
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="Создать новый тендер"
        open={state.createModalVisible}
        onCancel={() => {
          setState(prev => ({ ...prev, createModalVisible: false }));
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTender}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Название тендера"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Название тендерного проекта" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tender_number"
                label="Номер тендера"
                rules={[{ required: true, message: 'Введите номер' }]}
              >
                <Input placeholder="T-2024-001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Подробное описание проекта" />
          </Form.Item>

          <Form.Item
            name="client_name"
            label="Заказчик"
            rules={[{ required: true, message: 'Введите название заказчика' }]}
          >
            <Input placeholder="Название организации-заказчика" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="submission_deadline"
                label="Срок подачи заявки"
              >
                <DatePicker 
                  showTime 
                  className="w-full"
                  placeholder="Выберите дату и время"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="estimated_value"
                label="Ориентировочная стоимость"
              >
                <Input 
                  type="number" 
                  placeholder="0"
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="Статус"
                initialValue="draft"
              >
                <Select>
                  <Select.Option value="draft">Черновик</Select.Option>
                  <Select.Option value="active">Активный</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={() => {
                setState(prev => ({ ...prev, createModalVisible: false }));
                form.resetFields();
              }}
            >
              Отмена
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={state.loading}
            >
              Создать тендер
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Редактировать тендер"
        open={state.editModalVisible}
        onCancel={() => {
          setState(prev => ({ 
            ...prev, 
            editModalVisible: false,
            editingTender: null 
          }));
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditTender}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Название тендера"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Название тендерного проекта" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tender_number"
                label="Номер тендера"
                rules={[{ required: true, message: 'Введите номер' }]}
              >
                <Input placeholder="T-2024-001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Подробное описание проекта" />
          </Form.Item>

          <Form.Item
            name="client_name"
            label="Заказчик"
            rules={[{ required: true, message: 'Введите название заказчика' }]}
          >
            <Input placeholder="Название организации-заказчика" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="submission_deadline"
                label="Срок подачи заявки"
              >
                <DatePicker 
                  showTime 
                  className="w-full"
                  placeholder="Выберите дату и время"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="estimated_value"
                label="Ориентировочная стоимость"
              >
                <Input 
                  type="number" 
                  placeholder="0"
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="Статус"
              >
                <Select>
                  <Select.Option value="draft">Черновик</Select.Option>
                  <Select.Option value="active">Активный</Select.Option>
                  <Select.Option value="submitted">Подан</Select.Option>
                  <Select.Option value="awarded">Выигран</Select.Option>
                  <Select.Option value="closed">Закрыт</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={() => {
                setState(prev => ({ 
                  ...prev, 
                  editModalVisible: false,
                  editingTender: null 
                }));
                form.resetFields();
              }}
            >
              Отмена
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={state.loading}
            >
              Сохранить
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Удалить тендер?"
        open={deleteModalVisible}
        onCancel={cancelDeleteTender}
        centered
        maskClosable={false}
        footer={[
          <Button key="cancel" onClick={cancelDeleteTender}>
            Отмена
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            danger 
            onClick={confirmDeleteTender}
            loading={deleteLoading}
          >
            Удалить
          </Button>
        ]}
      >
        <p>
          Это действие нельзя отменить. Все данные тендера{' '}
          <strong>"{tenderToDelete?.title || 'без названия'}"</strong>{' '}
          будут удалены.
        </p>
        {tenderToDelete && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p><strong>Клиент:</strong> {tenderToDelete.client_name}</p>
            <p><strong>Номер:</strong> {tenderToDelete.tender_number}</p>
            <p><strong>Статус:</strong> {statusLabels[tenderToDelete.status]}</p>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
};

export default TendersPage;