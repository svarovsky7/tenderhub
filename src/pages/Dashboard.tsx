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
  message,
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
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DeadlineStatusBar from '../components/tender/DeadlineStatusBar';
import dayjs from 'dayjs';
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
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  // Status filter removed - status field no longer exists in schema

  // No authentication needed - all features are available
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load all tenders including versions
        const tendersResponse = await tendersApi.getAll({ includeVersions: true });

        if (tendersResponse.data) {
          // Load BOQ totals and area_sp for each tender
          const tendersWithBOQ = await Promise.all(
            tendersResponse.data.map(async (tender) => {
              // Get total cost from boq_items (same as in BOQ page)
              const { data: boqItems } = await supabase
                .from('boq_items')
                .select('total_amount')
                .eq('tender_id', tender.id);

              const boqTotal = boqItems?.reduce((sum, item) =>
                sum + (item.total_amount || 0), 0
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
          // Count active tenders as those with submission_deadline not yet expired
          const now = new Date();
          const activeTenders = tendersWithBOQ.filter(t =>
            t.submission_deadline && new Date(t.submission_deadline) > now
          ).length;
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
    if (!searchText.trim()) {
      return true; // Show all tenders when search is empty
    }

    const searchLower = searchText.toLowerCase();
    const matchesSearch =
      tender.title.toLowerCase().includes(searchLower) ||
      tender.client_name.toLowerCase().includes(searchLower) ||
      tender.tender_number.toLowerCase().includes(searchLower) ||
      (tender.description && tender.description.toLowerCase().includes(searchLower)) ||
      (tender.version && tender.version.toString().includes(searchText.trim()));

    return matchesSearch;
  });

  // Debug: Check if any tenders have active deadlines
  const activeTenders = filteredTenders.filter(t =>
    t.submission_deadline && dayjs(t.submission_deadline).isAfter(dayjs())
  );
  console.log('Active tenders with deadlines:', activeTenders.length, activeTenders);

  // Helper function for Russian day declension
  const getDayWord = (days: number): string => {
    const lastDigit = days % 10;
    const lastTwoDigits = days % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'дней';
    if (lastDigit === 1) return 'день';
    if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
    return 'дней';
  };

  const getHourWord = (hours: number): string => {
    const lastDigit = hours % 10;
    const lastTwoDigits = hours % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'часов';
    if (lastDigit === 1) return 'час';
    if (lastDigit >= 2 && lastDigit <= 4) return 'часа';
    return 'часов';
  };

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
      width: 300,
      render: (text: string, record: any) => (
        <span>
          {text} {record.client_name && <span style={{ color: '#888' }}>| {record.client_name}</span>}
        </span>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>Версия</div>,
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center' as const,
      render: (version: number | null) => version || '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Статус дедлайна</div>,
      key: 'deadline_status',
      width: 280,
      render: (_, record: any) => {
        if (!record.submission_deadline) return null;

        const deadline = dayjs(record.submission_deadline);
        const now = dayjs();
        const daysLeft = deadline.diff(now, 'day');
        const hoursLeft = deadline.diff(now, 'hour');
        const isExpired = deadline.isBefore(now);

        if (isExpired) {
          return (
            <div style={{
              padding: '4px 12px',
              borderRadius: '4px',
              background: 'rgba(52, 211, 153, 0.1)',
              color: '#059669',
              fontWeight: 500,
              textAlign: 'center'
            }}>
              ✅ Завершен
            </div>
          );
        }

        const totalDays = 30;
        const progress = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));

        let bgColor = 'rgba(52, 211, 153, 0.2)';
        let borderColor = '#34d399';
        let textColor = '#059669';
        let timeText = '';

        if (daysLeft <= 0) {
          bgColor = 'rgba(239, 68, 68, 0.2)';
          borderColor = '#ef4444';
          textColor = '#dc2626';
          timeText = hoursLeft > 0 ? `${hoursLeft} ${getHourWord(hoursLeft)}` : 'Сегодня';
        } else if (daysLeft <= 3) {
          bgColor = 'rgba(239, 68, 68, 0.2)';
          borderColor = '#ef4444';
          textColor = '#dc2626';
          timeText = `${daysLeft} ${getDayWord(daysLeft)}`;
        } else if (daysLeft <= 7) {
          bgColor = 'rgba(251, 191, 36, 0.2)';
          borderColor = '#fbbf24';
          textColor = '#d97706';
          timeText = `${daysLeft} ${getDayWord(daysLeft)}`;
        } else {
          timeText = `${daysLeft} ${getDayWord(daysLeft)}`;
        }

        return (
          <div style={{
            position: 'relative',
            height: '24px',
            background: 'rgba(0,0,0,0.02)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progress}%`,
              background: bgColor,
              borderLeft: `2px solid ${borderColor}`,
              transition: 'width 0.5s ease'
            }} />
            <div style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              lineHeight: '24px',
              fontWeight: 600,
              fontSize: '12px',
              color: textColor
            }}>
              ⏱️ Осталось {timeText}
            </div>
          </div>
        );
      },
    },
    // Status column removed - status field no longer exists in schema
    {
      title: <div style={{ textAlign: 'center' }}>Площадь СП</div>,
      dataIndex: 'area_sp',
      key: 'area_sp',
      width: 100,
      align: 'center' as const,
      render: (value: number | null) => value ? `${Math.round(value).toLocaleString('ru-RU')} м²` : '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>BOQ стоимость</div>,
      dataIndex: 'boq_total_value',
      key: 'boq_total_value',
      width: 150,
      align: 'center' as const,
      render: (value: number | null) => value ? formatCurrency(value) : '-',
    },
    {
      title: <div style={{ textAlign: 'center' }}>Стоимость за м²</div>,
      key: 'cost_per_sqm',
      width: 140,
      align: 'center' as const,
      render: (_, record: any) => {
        if (record.boq_total_value && record.area_sp && record.area_sp > 0) {
          const costPerSqm = record.boq_total_value / record.area_sp;
          return `${Math.round(costPerSqm).toLocaleString('ru-RU')} ₽/м²`;
        }
        return '-';
      },
    },
    {
      title: <div style={{ textAlign: 'center' }}>Крайний срок</div>,
      dataIndex: 'submission_deadline',
      key: 'submission_deadline',
      width: 120,
      align: 'center' as const,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: <div style={{ textAlign: 'center' }}>Обновить расчет</div>,
      key: 'refresh',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<ReloadOutlined style={{ color: '#52c41a' }} />}
          size="small"
          loading={refreshingId === record.id}
          onClick={(e) => {
            e.stopPropagation();
            refreshBOQCost(record.id);
          }}
          title="Обновить стоимость BOQ"
        />
      ),
    },
  ];

  // Function to refresh BOQ cost for a specific tender
  const refreshBOQCost = async (tenderId: string) => {
    setRefreshingId(tenderId);
    try {
      // Get updated total cost from boq_items (same as in BOQ page)
      const { data: boqItems } = await supabase
        .from('boq_items')
        .select('total_amount')
        .eq('tender_id', tenderId);

      const boqTotal = boqItems?.reduce((sum, item) =>
        sum + (item.total_amount || 0), 0
      ) || 0;

      // Update the tender in state
      setTenders(prev => prev.map(t =>
        t.id === tenderId ? { ...t, boq_total_value: boqTotal } : t
      ));

      // Also update total stats
      const updatedTenders = tenders.map(t =>
        t.id === tenderId ? { ...t, boq_total_value: boqTotal } : t
      );
      const totalValue = updatedTenders.reduce((sum, t) => sum + (t.boq_total_value || 0), 0);
      setStats(prev => ({ ...prev, totalValue }));

      message.success('BOQ стоимость обновлена');
    } catch (error) {
      console.error('Error refreshing BOQ cost:', error);
      message.error('Ошибка обновления стоимости');
    } finally {
      setRefreshingId(null);
    }
  };

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
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
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

          /* Expired tender - light green background */
          .tender-row-expired {
            background: rgba(52, 211, 153, 0.08) !important;
          }
          .tender-row-expired td {
            background: transparent !important;
            color: rgba(0, 0, 0, 0.65);
          }
          .tender-row-expired:hover {
            background: rgba(52, 211, 153, 0.12) !important;
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
            </div>

            {/* Statistics in Header */}
            <div className="dashboard-stats-container">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                  <Card>
                    <Statistic
                      title="Всего тендеров"
                      value={stats.totalTenders}
                      prefix={<FileTextOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Card>
                    <Statistic
                      title="Активные тендеры"
                      value={stats.activeTenders}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
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
              </Row>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-none px-6">
          {/* All Tenders */}
          <Card>
        {/* Filters */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Поиск по названию, номеру, заказчику, описанию или версии..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%', maxWidth: 600 }}
              size="large"
              allowClear
            />
            {searchText.trim() && (
              <Text type="secondary" className="whitespace-nowrap">
                Найдено: {filteredTenders.length} из {tenders.length}
              </Text>
            )}
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTenders}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => navigate(`/boq?tender=${record.id}`),
            style: {
              cursor: 'pointer',
              position: 'relative' as const
            },
            onMouseEnter: (e) => {
              if (!record.submission_deadline || dayjs(record.submission_deadline).isBefore(dayjs())) {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa';
              }
            },
            onMouseLeave: (e) => {
              if (!record.submission_deadline || dayjs(record.submission_deadline).isBefore(dayjs())) {
                (e.currentTarget as HTMLElement).style.backgroundColor = '';
              }
            },
          })}
          rowClassName={(record) => {
            if (record.submission_deadline && dayjs(record.submission_deadline).isBefore(dayjs())) {
              return 'tender-row-expired';
            }
            return '';
          }}
          pagination={false}
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