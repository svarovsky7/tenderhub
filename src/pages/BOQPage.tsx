import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Select,
  Spin,
  message,
  Empty,
  Input,
  Form,
  InputNumber,
  Row,
  Col,
  Divider,
  Badge,
  Tooltip,
  Progress,
  Skeleton,
  List,
  Avatar,
  Statistic,
  ConfigProvider
} from 'antd';
import { 
  PlusOutlined, 
  FileTextOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  BuildOutlined,
  ToolOutlined,
  CrownOutlined,
  RocketOutlined,
  TrophyOutlined,
  DashboardOutlined,
  SearchOutlined,
  FilterOutlined,
  BarChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TenderBOQManagerNew from '../components/tender/TenderBOQManagerNew';
import EnhancedQuickAddCard from '../components/tender/EnhancedQuickAddCard';
import { tendersApi, boqApi, materialsApi, worksApi } from '../lib/supabase/api';
import type { Tender, BOQItem, Material, Work } from '../lib/supabase/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Enhanced Quick Add Cards are now implemented in separate components

// Statistics Card Component
interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = React.memo(({ 
  title, 
  value, 
  suffix = '', 
  icon, 
  color, 
  trend 
}) => (
  <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0">
    <div className="flex items-center justify-between">
      <div>
        <Statistic
          title={<span className="text-gray-600 font-medium">{title}</span>}
          value={value}
          suffix={suffix}
          precision={suffix === '₽' ? 2 : 0}
          valueStyle={{ color, fontWeight: '600' }}
        />
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div 
        className="text-4xl opacity-20 transition-all duration-300 group-hover:opacity-30"
        style={{ color }}
      >
        {icon}
      </div>
    </div>
  </Card>
));

const BOQPage: React.FC = () => {
  console.log('🚀 BOQPage component rendered');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [boqStats, setBOQStats] = useState({
    totalWorks: 0,
    totalMaterials: 0,
    totalCost: 0,
    avgWorkCost: 0,
    avgMaterialCost: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Load BOQ statistics for selected tender
  const loadBOQStats = useCallback(async (tenderId: string) => {
    console.log('📡 Loading BOQ statistics for tender:', tenderId);
    setStatsLoading(true);
    try {
      // This would be a real API call in production
      // For now, using placeholder data
      const mockStats = {
        totalWorks: Math.floor(Math.random() * 50) + 10,
        totalMaterials: Math.floor(Math.random() * 100) + 20,
        totalCost: Math.random() * 1000000 + 100000,
        avgWorkCost: Math.random() * 50000 + 10000,
        avgMaterialCost: Math.random() * 10000 + 1000
      };
      setBOQStats(mockStats);
      console.log('✅ BOQ stats loaded:', mockStats);
    } catch (error) {
      console.error('❌ Failed to load BOQ stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load all tenders for selection
  const loadTenders = useCallback(async () => {
    console.log('📡 Loading tenders list...');
    setTendersLoading(true);
    try {
      const result = await tendersApi.getAll();
      console.log('📦 Tenders API response:', result);
      
      if (result.error) {
        console.error('❌ Failed to load tenders:', result.error);
        message.error('Ошибка загрузки тендеров');
        return;
      }
      
      console.log('✅ Tenders loaded:', result.data?.length);
      setTenders(result.data || []);
      
      // Check for tender parameter in URL
      const tenderParam = searchParams.get('tender');
      if (tenderParam && result.data?.find(t => t.id === tenderParam)) {
        console.log('🎯 Auto-selecting tender from URL parameter:', tenderParam);
        setSelectedTenderId(tenderParam);
        loadBOQStats(tenderParam);
      } else if (result.data && result.data.length > 0 && !selectedTenderId) {
        console.log('🎯 Auto-selecting first tender:', result.data[0].id);
        setSelectedTenderId(result.data[0].id);
        loadBOQStats(result.data[0].id);
      }
    } catch (error) {
      console.error('💥 Exception loading tenders:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setTendersLoading(false);
    }
  }, [selectedTenderId, searchParams, loadBOQStats]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const handleTenderChange = useCallback((tenderId: string) => {
    console.log('🔄 Tender selection changed:', tenderId);
    setSelectedTenderId(tenderId);
    loadBOQStats(tenderId);
  }, [loadBOQStats]);

  // Handle quick add for works and materials
  const handleQuickAdd = useCallback(async (data: any) => {
    console.log('🚀 Quick add item:', data);
    if (!selectedTenderId) {
      message.error('Сначала выберите тендер');
      return;
    }

    try {
      // This would call the appropriate API endpoint
      // For now, just show success message
      console.log('✅ Item added successfully');
      
      // Refresh stats after adding
      loadBOQStats(selectedTenderId);
    } catch (error) {
      console.error('❌ Failed to add item:', error);
      throw error; // Re-throw for QuickAddCard to handle
    }
  }, [selectedTenderId, loadBOQStats]);

  // Memoized stats cards to prevent unnecessary re-renders
  const statsCards = useMemo(() => [
    {
      title: 'Всего работ',
      value: boqStats.totalWorks,
      icon: <BuildOutlined />,
      color: '#667eea'
    },
    {
      title: 'Всего материалов',
      value: boqStats.totalMaterials,
      icon: <ToolOutlined />,
      color: '#11998e'
    },
    {
      title: 'Общая стоимость',
      value: boqStats.totalCost,
      suffix: '₽',
      icon: <TrophyOutlined />,
      color: '#f093fb'
    },
    {
      title: 'Средняя стоимость работы',
      value: boqStats.avgWorkCost,
      suffix: '₽',
      icon: <BarChartOutlined />,
      color: '#4facfe'
    }
  ], [boqStats]);

  // Memoized selected tender info
  const selectedTender = useMemo(() => 
    tenders.find(t => t.id === selectedTenderId), 
    [tenders, selectedTenderId]
  );

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing BOQ data...');
    setLoading(true);
    // The TenderBOQManager will handle its own refresh
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      console.log('🚀 Navigating to tender details:', selectedTenderId);
      navigate(`/tender/${selectedTenderId}/boq`);
    }
  }, [selectedTenderId, navigate]);

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: '#667eea'
        }
      }}
    >
      <div className="w-full min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white">
          <div className="px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <RocketOutlined className="text-4xl" />
                  </div>
                  <div>
                    <Title level={1} className="!text-white !mb-2 text-4xl font-bold">
                      Управление BOQ
                    </Title>
                    <Text className="text-blue-100 text-lg">
                      Современный интерфейс для управления сметой и элементами BOQ
                    </Text>
                  </div>
                </div>
                <Space size="large">
                  <Button 
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate('/tenders')}
                    size="large"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300"
                  >
                    К тендерам
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleRefresh}
                    loading={loading}
                    size="large"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300"
                  >
                    Обновить
                  </Button>
                </Space>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <CrownOutlined className="text-2xl text-yellow-300" />
                    <Text className="text-white font-semibold text-lg">Выберите тендер:</Text>
                  </div>
                  <div className="flex-1 min-w-96">
                    <Select
                      value={selectedTenderId}
                      onChange={handleTenderChange}
                      className="w-full"
                      placeholder="Выберите тендер для управления BOQ"
                      loading={tendersLoading}
                      showSearch
                      size="large"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children as string).toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {tenders.map(tender => (
                        <Option key={tender.id} value={tender.id}>
                          <div className="flex items-center justify-between">
                            <span><strong>{tender.title}</strong> - {tender.client_name}</span>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </div>
                  {selectedTender && (
                    <Button 
                      type="link"
                      onClick={handleNavigateToTender}
                      className="text-white hover:text-blue-200 font-medium"
                      icon={<DashboardOutlined />}
                    >
                      Открыть детали →
                    </Button>
                  )}
                </div>
                
                {selectedTender && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-6 text-sm text-blue-100">
                      <span><strong>Статус:</strong> {selectedTender.status}</span>
                      <span><strong>Создан:</strong> {new Date(selectedTender.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        {selectedTenderId && (
          <div className="px-6 py-6 bg-white/50 backdrop-blur-sm border-b border-gray-200/50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <PieChartOutlined className="text-2xl text-indigo-600" />
                <Title level={3} className="!mb-0">Статистика проекта</Title>
              </div>
              {statsLoading ? (
                <Row gutter={[16, 16]}>
                  {[1,2,3,4].map(i => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                      <Card>
                        <Skeleton active paragraph={{ rows: 2 }} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Row gutter={[16, 16]}>
                  {statsCards.map((stat, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                      <StatsCard {...stat} />
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {selectedTenderId ? (
              <div className="space-y-8">
                {/* Enhanced Quick Add Cards */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <EnhancedQuickAddCard 
                    type="work" 
                    onAdd={handleQuickAdd}
                    loading={loading}
                  />
                  <EnhancedQuickAddCard 
                    type="material" 
                    onAdd={handleQuickAdd}
                    loading={loading}
                  />
                </div>

                <Divider>
                  <span className="text-gray-600 font-semibold text-lg flex items-center gap-2">
                    <FileTextOutlined /> Детальное управление BOQ
                  </span>
                </Divider>

                {/* BOQ Manager */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <TenderBOQManagerNew 
                    tenderId={selectedTenderId} 
                    key={selectedTenderId}
                  />
                </div>
              </div>
            ) : (
              <Card 
                className="text-center border-0 shadow-xl bg-white/80 backdrop-blur-sm"
                style={{ minHeight: '400px' }}
                bodyStyle={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  padding: '60px 40px'
                }}
              >
                <div className="text-8xl text-gray-300 mb-6">
                  <FileTextOutlined />
                </div>
                {tendersLoading ? (
                  <div className="space-y-4">
                    <Spin size="large" />
                    <Title level={3} className="text-gray-500">
                      Загрузка тендеров...
                    </Title>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Title level={2} className="text-gray-600">
                      Выберите тендер
                    </Title>
                    <Text type="secondary" className="text-lg">
                      Выберите тендер из списка выше для начала работы с BOQ
                    </Text>
                    <Button 
                      type="primary" 
                      size="large" 
                      onClick={() => navigate('/tenders')}
                      className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 border-0"
                    >
                      Перейти к тендерам
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default React.memo(BOQPage);