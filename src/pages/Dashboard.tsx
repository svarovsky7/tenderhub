import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Progress,
  Empty,
  Spin,
  Select,
  Input,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  DollarOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, useHasPermission } from '../contexts/AuthContext';
import type { TenderStatus } from '../lib/supabase/types';

const { Title, Text } = Typography;
const { Option } = Select;

// Mock data for demonstration
const mockTenders = [
  {
    id: '1',
    title: 'Строительство многоквартирного дома',
    client_name: 'ООО "СтройИнвест"',
    tender_number: 'T-2024-001',
    status: 'active' as TenderStatus,
    estimated_value: 15000000,
    submission_deadline: '2024-02-15',
    created_at: '2024-01-15',
    boq_total_value: 14500000,
    total_items: 145,
  },
  {
    id: '2',
    title: 'Реконструкция офисного здания',
    client_name: 'АО "БизнесЦентр"',
    tender_number: 'T-2024-002',
    status: 'draft' as TenderStatus,
    estimated_value: 8500000,
    submission_deadline: '2024-02-20',
    created_at: '2024-01-18',
    boq_total_value: null,
    total_items: 0,
  },
  {
    id: '3',
    title: 'Строительство торгового центра',
    client_name: 'ГК "Торговые площади"',
    tender_number: 'T-2024-003',
    status: 'submitted' as TenderStatus,
    estimated_value: 25000000,
    submission_deadline: '2024-01-30',
    created_at: '2024-01-05',
    boq_total_value: 24800000,
    total_items: 298,
  },
];

const mockStats = {
  totalTenders: 25,
  activeTenders: 8,
  submittedTenders: 12,
  wonTenders: 5,
  totalValue: 125000000,
  winRate: 41.7,
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tenders] = useState(mockTenders);
  const [stats] = useState(mockStats);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenderStatus | 'all'>('all');
  
  const { user } = useAuth();
  const permissions = useHasPermission();
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: TenderStatus): string => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'active':
        return 'processing';
      case 'submitted':
        return 'warning';
      case 'awarded':
        return 'success';
      case 'closed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: TenderStatus): string => {
    switch (status) {
      case 'draft':
        return 'Черновик';
      case 'active':
        return 'Активен';
      case 'submitted':
        return 'Подан';
      case 'awarded':
        return 'Выигран';
      case 'closed':
        return 'Закрыт';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         tender.client_name.toLowerCase().includes(searchText.toLowerCase()) ||
                         tender.tender_number.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      title: 'Номер тендера',
      dataIndex: 'tender_number',
      key: 'tender_number',
      width: 120,
      render: (text: string, record: any) => (
        <Button type="link" onClick={() => navigate(`/tenders/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Клиент',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TenderStatus) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Оценочная стоимость',
      dataIndex: 'estimated_value',
      key: 'estimated_value',
      width: 150,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'BOQ стоимость',
      dataIndex: 'boq_total_value',
      key: 'boq_total_value',
      width: 150,
      render: (value: number | null) => value ? formatCurrency(value) : '-',
    },
    {
      title: 'Крайний срок',
      dataIndex: 'submission_deadline',
      key: 'submission_deadline',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/tenders/${record.id}`)}
            title="Просмотр"
          />
          {permissions.canManageTenders && (
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => navigate(`/tenders/${record.id}/edit`)}
              title="Редактировать"
            />
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <Title level={2} className="mb-2">
          Добро пожаловать, {user?.full_name}!
        </Title>
        <Text type="secondary">
          Обзор ваших тендеров и основных показателей
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего тендеров"
              value={stats.totalTenders}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Активные тендеры"
              value={stats.activeTenders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Общая стоимость"
              value={stats.totalValue}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Процент побед"
              value={stats.winRate}
              prefix={<TrophyOutlined />}
              suffix="%"
              valueStyle={{ color: '#fa8c16' }}
            />
            <Progress 
              percent={stats.winRate} 
              showInfo={false} 
              strokeColor="#fa8c16"
              size="small"
              className="mt-2"
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Tenders */}
      <Card
        title="Последние тендеры"
        extra={
          <Space>
            {permissions.canManageTenders && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/tenders/new')}
              >
                Создать тендер
              </Button>
            )}
            <Button onClick={() => navigate('/tenders')}>
              Все тендеры
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <Input
            placeholder="Поиск по названию, клиенту или номеру..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Статус"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            suffixIcon={<FilterOutlined />}
          >
            <Option value="all">Все</Option>
            <Option value="draft">Черновик</Option>
            <Option value="active">Активен</Option>
            <Option value="submitted">Подан</Option>
            <Option value="awarded">Выигран</Option>
            <Option value="closed">Закрыт</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTenders}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} из ${total} тендеров`,
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                description="Тендеры не найдены"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;