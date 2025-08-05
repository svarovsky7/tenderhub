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
// Removed auth imports - no authentication needed
import type { TenderStatus } from '../lib/supabase/types';

const { Title, Text } = Typography;
const { Option } = Select;

// Import API functions
import { tendersApi } from '../lib/supabase/api';
import type { TenderWithSummary } from '../lib/supabase/types';

interface DashboardStats {
  totalTenders: number;
  activeTenders: number;
  submittedTenders: number;
  wonTenders: number;
  totalValue: number;
  winRate: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tenders, setTenders] = useState<TenderWithSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTenders: 0,
    activeTenders: 0,
    submittedTenders: 0,
    wonTenders: 0,
    totalValue: 0,
    winRate: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenderStatus | 'all'>('all');
  
  // No authentication needed - all features are available
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load recent tenders
        const tendersResponse = await tendersApi.getAll({}, {
          limit: 10
        });

        if (tendersResponse.data) {
          setTenders(tendersResponse.data);
        }

        // For now, calculate basic stats from loaded tenders
        // TODO: Implement getTenderStats API function
        const totalTenders = tendersResponse.data?.length || 0;
        const activeTenders = tendersResponse.data?.filter(t => t.status === 'active').length || 0;
        const submittedTenders = tendersResponse.data?.filter(t => t.status === 'submitted').length || 0;
        const wonTenders = tendersResponse.data?.filter(t => t.status === 'awarded').length || 0;
        const totalValue = tendersResponse.data?.reduce((sum, t) => sum + (t.estimated_value || 0), 0) || 0;
        const winRate = totalTenders > 0 ? (wonTenders / totalTenders) * 100 : 0;

        setStats({
          totalTenders,
          activeTenders,
          submittedTenders,
          wonTenders,
          totalValue,
          winRate,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
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
          {(
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
    <div className="w-full min-h-full bg-gray-50">
      {/* Welcome Section */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
        <Title level={2} className="mb-2">
          Добро пожаловать в TenderHub!
        </Title>
        <Text type="secondary">
          Обзор ваших тендеров и основных показателей
        </Text>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-6">
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
            {(
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
    </div>
  );
};

export default Dashboard;