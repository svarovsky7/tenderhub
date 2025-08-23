import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Select,
  Spin,
  message,
  Empty,
  Row,
  Col,
  Statistic,
  ConfigProvider,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  FileTextOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  BuildOutlined,
  ToolOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TenderBOQManagerSimplified from '../components/tender/TenderBOQManagerSimplified';
import { tendersApi } from '../lib/supabase/api';
import type { Tender } from '../lib/supabase/types';
import { formatQuantity } from '../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const BOQPageSimplified: React.FC = () => {
  console.log('🚀 BOQPageSimplified component rendered');
  
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
    positionsCount: 0
  });

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
      } else if (result.data && result.data.length > 0 && !selectedTenderId) {
        console.log('🎯 Auto-selecting first tender:', result.data[0].id);
        setSelectedTenderId(result.data[0].id);
      }
    } catch (error) {
      console.error('💥 Exception loading tenders:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setTendersLoading(false);
    }
  }, [selectedTenderId, searchParams]);

  useEffect(() => {
    loadTenders();
  }, []);

  const handleTenderChange = useCallback((tenderId: string) => {
    console.log('🔄 Tender selection changed:', tenderId);
    setSelectedTenderId(tenderId);
  }, []);

  // Get unique tender names/titles
  const uniqueTenderNames = React.useMemo(() => {
    const nameMap = new Map<string, { title: string; client_name: string }>();
    tenders.forEach(t => {
      const key = `${t.title}_${t.client_name}`;
      if (!nameMap.has(key)) {
        nameMap.set(key, { title: t.title, client_name: t.client_name });
      }
    });
    return Array.from(nameMap.values());
  }, [tenders]);

  // Get versions for currently selected tender name
  const availableVersions = React.useMemo(() => {
    if (!selectedTenderId) return [];
    
    const selectedTender = tenders.find(t => t.id === selectedTenderId);
    if (!selectedTender) return [];
    
    // Find all tenders with the same title and client
    const sameTenders = tenders.filter(t => 
      t.title === selectedTender.title && 
      t.client_name === selectedTender.client_name
    );
    
    // Get unique versions from these tenders
    const versions = new Set(sameTenders.map(t => t.version || 1));
    return Array.from(versions).sort((a, b) => b - a); // Sort descending
  }, [tenders, selectedTenderId]);


  const selectedTender = tenders.find(t => t.id === selectedTenderId);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing BOQ data...');
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      console.log('🚀 Navigating to tender details:', selectedTenderId);
      navigate(`/tender/${selectedTenderId}/boq`);
    }
  }, [selectedTenderId, navigate]);

  const handleUpdateStats = useCallback((stats: { works: number; materials: number; total: number; positions: number }) => {
    console.log('📊 Updating stats:', stats);
    setBOQStats({
      totalWorks: stats.works,
      totalMaterials: stats.materials,
      totalCost: stats.total,
      positionsCount: stats.positions
    });
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#1890ff'
        }
      }}
    >
      <div className="w-full min-h-full bg-gray-50">
        {/* Simplified Header */}
        <div className="bg-white border-b">
          <div className="px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <FileTextOutlined className="text-2xl text-blue-500" />
                  <Title level={2} className="!mb-0">
                    Управление сметой (BOQ)
                  </Title>
                </div>
                <Space>
                  <Button 
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate('/tenders')}
                  >
                    К тендерам
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleRefresh}
                    loading={loading}
                  >
                    Обновить
                  </Button>
                </Space>
              </div>

              {/* Tender Selection */}
              <div className="bg-blue-50 rounded-lg p-4">
                <Row gutter={16} align="middle">
                  <Col span={14}>
                    <div className="flex items-center gap-3">
                      <Text strong>Тендер:</Text>
                      <Select
                        value={selectedTenderId}
                        onChange={handleTenderChange}
                        className="flex-1"
                        placeholder="Выберите тендер"
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
                            {tender.title} - {tender.client_name}
                          </Option>
                        ))}
                      </Select>
                      <Select
                        value={selectedTender?.version || 1}
                        onChange={(value) => {
                          // Find tender with same name but different version
                          const currentTender = tenders.find(t => t.id === selectedTenderId);
                          if (currentTender) {
                            const targetTender = tenders.find(t => 
                              t.title === currentTender.title && 
                              t.client_name === currentTender.client_name &&
                              (t.version || 1) === value
                            );
                            if (targetTender) {
                              setSelectedTenderId(targetTender.id);
                            }
                          }
                        }}
                        className="w-32"
                        placeholder="Версия"
                        size="large"
                        disabled={!selectedTenderId || availableVersions.length <= 1}
                      >
                        {availableVersions.map(version => (
                          <Option key={version} value={version}>
                            Версия {version}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                  <Col span={10}>
                    {selectedTender && (
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-4 text-sm mb-2">
                          <span><strong>Клиент:</strong> {selectedTender.client_name}</span>
                          <Button 
                            type="link"
                            onClick={handleNavigateToTender}
                            icon={<DashboardOutlined />}
                            size="small"
                          >
                            Детали тендера
                          </Button>
                        </div>
                        <div className="flex items-center justify-end gap-4 text-sm">
                          <span>
                            <strong>Площадь по СП:</strong> {selectedTender.area_sp ? formatQuantity(selectedTender.area_sp, 2) + ' м²' : '—'}
                          </span>
                          <span>
                            <strong>Площадь от Заказчика:</strong> {selectedTender.area_client ? formatQuantity(selectedTender.area_client, 2) + ' м²' : '—'}
                          </span>
                          <span>
                            <strong>Дедлайн:</strong> {selectedTender.submission_deadline ? dayjs(selectedTender.submission_deadline).format('DD.MM.YYYY HH:mm') : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {selectedTenderId && (
          <div className="px-6 py-4 bg-white border-b">
            <div className="max-w-7xl mx-auto">
              <Row gutter={16}>
                <Col xs={24} sm={6}>
                  <Card bordered={false} className="bg-blue-50">
                    <Statistic
                      title="Позиций заказчика"
                      value={boqStats.positionsCount}
                      prefix={<FolderOpenOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={6}>
                  <Card bordered={false} className="bg-green-50">
                    <Statistic
                      title="Работ"
                      value={boqStats.totalWorks}
                      prefix={<BuildOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={6}>
                  <Card bordered={false} className="bg-purple-50">
                    <Statistic
                      title="Материалов"
                      value={boqStats.totalMaterials}
                      prefix={<ToolOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={6}>
                  <Card bordered={false} className="bg-orange-50">
                    <Statistic
                      title="Общая стоимость"
                      value={boqStats.totalCost}
                      precision={0}
                      suffix="₽"
                      formatter={(value) => {
                        const num = Math.round(Number(value));
                        return num.toLocaleString('ru-RU');
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        )}


        {/* Main Content */}
        <div className="p-4 lg:p-6">
          <div className="w-full">
            {selectedTenderId ? (
              <TenderBOQManagerSimplified 
                tenderId={selectedTenderId} 
                key={selectedTenderId}
                onStatsUpdate={handleUpdateStats}
              />
            ) : (
              <Card className="text-center max-w-2xl mx-auto">
                <Empty
                  description={
                    tendersLoading ? "Загрузка тендеров..." : "Выберите тендер для начала работы"
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  {!tendersLoading && (
                    <Button 
                      type="primary" 
                      onClick={() => navigate('/tenders')}
                    >
                      Перейти к тендерам
                    </Button>
                  )}
                </Empty>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default React.memo(BOQPageSimplified);