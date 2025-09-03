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
  DashboardOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
// Removed auth imports - no authentication needed
// TenderStatus import removed - status field no longer exists in schema
import { supabase } from '../lib/supabase/client';

const { Title, Text } = Typography;
// Option removed since status Select was removed

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
  // Status filter removed - status field no longer exists in schema
  
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
          // Load BOQ totals and area_sp for each tender
          const tendersWithBOQ = await Promise.all(
            tendersResponse.data.map(async (tender) => {
              // Get total cost from client_positions
              const { data: positionsData } = await supabase
                .from('client_positions')
                .select('total_materials_cost, total_works_cost')
                .eq('tender_id', tender.id);

              const boqTotal = positionsData?.reduce((sum, pos) => 
                sum + (pos.total_materials_cost || 0) + (pos.total_works_cost || 0), 0
              ) || 0;

              return {
                ...tender,
                boq_total_value: boqTotal,
                area_sp: tender.area_sp || 0
              };
            })
          );

          setTenders(tendersWithBOQ);

          // Calculate stats including BOQ totals
          const totalTenders = tendersWithBOQ.length;
          const activeTenders = 0; // Status field removed from schema
          const submittedTenders = 0; // Status field removed from schema  
          const wonTenders = 0; // Status field removed from schema
          const totalValue = tendersWithBOQ.reduce((sum, t) => sum + (t.boq_total_value || 0), 0);
          const winRate = totalTenders > 0 ? (wonTenders / totalTenders) * 100 : 0;

          setStats({
            totalTenders,
            activeTenders,
            submittedTenders,
            wonTenders,
            totalValue,
            winRate,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Status helper functions removed - status field no longer exists in schema

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
    // Status filtering disabled since status field removed from schema
    return matchesSearch;
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
      title: 'Заказчик',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 200,
      ellipsis: true,
    },
    // Status column removed - status field no longer exists in schema
    {
      title: 'BOQ стоимость',
      dataIndex: 'boq_total_value',
      key: 'boq_total_value',
      width: 150,
      render: (value: number | null) => value ? formatCurrency(value) : '-',
    },
    {
      title: 'Стоимость за м²',
      key: 'cost_per_sqm',
      width: 140,
      render: (_, record: any) => {
        if (record.boq_total_value && record.area_sp && record.area_sp > 0) {
          const costPerSqm = record.boq_total_value / record.area_sp;
          return formatCurrency(costPerSqm);
        }
        return '-';
      },
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
    <>
      <style>
        {`
          .dashboard-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .dashboard-page-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 30s linear infinite;
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .dashboard-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .dashboard-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .dashboard-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .dashboard-stats-container {
            margin-top: 24px;
          }
          .dashboard-stats-container .ant-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          .dashboard-stats-container .ant-statistic-title {
            color: rgba(0, 0, 0, 0.65);
            font-weight: 500;
          }
          .dashboard-stats-container .ant-statistic-content {
            color: rgba(0, 0, 0, 0.85);
          }
        `}
      </style>
      <div className="w-full min-h-full bg-gray-50">
        <div className="p-6">
          {/* Beautiful Gradient Header */}
          <div className="dashboard-page-header">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <DashboardOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                    Дашборд TenderHub
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    Обзор ваших тендеров и основных показателей
                  </Text>
                </div>
              </div>
              <div className="dashboard-action-buttons">
                <Button
                  className="dashboard-action-btn"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1890ff',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    fontWeight: 600
                  }}
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/tenders/new')}
                >
                  Новый тендер
                </Button>
              </div>
            </div>

            {/* Statistics in Header */}
            <div className="dashboard-stats-container">
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
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-none px-6">
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
          {/* Status filter removed - status field no longer exists in schema */}
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
    </>
  );
};

export default Dashboard;