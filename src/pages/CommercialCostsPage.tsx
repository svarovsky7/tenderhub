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
  DollarOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  DashboardOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TenderCommercialManager from '../components/tender/TenderCommercialManager';
import DeadlineStatusBar from '../components/tender/DeadlineStatusBar';
import QuickTenderSelector from '../components/common/QuickTenderSelector';
import { tendersApi } from '../lib/supabase/api';
import type { Tender } from '../lib/supabase/types';
import { formatQuantity } from '../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const CommercialCostsPage: React.FC = () => {
  console.log('🚀 CommercialCostsPage component rendered');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [commercialStats, setCommercialStats] = useState({
    totalBaseCost: 0,
    totalCommercialCost: 0,
    totalMarkup: 0,
    positions: 0,
    markupPercentage: 0
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
      if (tenderParam) {
        const foundTender = result.data?.find(t => t.id === tenderParam);
        if (foundTender) {
          console.log('🎯 Auto-selecting tender from URL parameter:', tenderParam);
          setSelectedTenderId(tenderParam);
          const tenderNameKey = `${foundTender.title}___${foundTender.client_name}`;
          setSelectedTenderName(tenderNameKey);
          console.log('📝 Setting tender name:', tenderNameKey);
          setTimeout(() => setIsContentVisible(true), 100);
        }
      }
    } catch (error) {
      console.error('💥 Exception loading tenders:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setTendersLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadTenders();
  }, []);

  // Handle tender name selection (first step)
  const handleTenderNameChange = useCallback((value: string) => {
    console.log('🔄 Tender name selection changed:', value);
    setSelectedTenderName(value);
    setSelectedTenderId(null);
    setIsContentVisible(false);
  }, []);

  // Handle version selection (second step)
  const handleVersionChange = useCallback((version: number) => {
    console.log('🔄 Version selection changed:', version);
    if (!selectedTenderName) return;
    
    const [title, clientName] = selectedTenderName.split('___');
    const targetTender = tenders.find(t => 
      t.title === title && 
      t.client_name === clientName &&
      (t.version || 1) === version
    );
    
    if (targetTender) {
      setSelectedTenderId(targetTender.id);
      setTimeout(() => setIsContentVisible(true), 100);
    }
  }, [selectedTenderName, tenders]);

  // Get unique tender names/titles
  const uniqueTenderNames = React.useMemo(() => {
    const nameMap = new Map<string, string>();
    tenders.forEach(t => {
      const key = `${t.title}___${t.client_name}`;
      const displayName = `${t.title} - ${t.client_name}`;
      if (!nameMap.has(key)) {
        nameMap.set(key, displayName);
      }
    });
    return Array.from(nameMap.entries());
  }, [tenders]);

  // Get versions for currently selected tender name
  const availableVersions = React.useMemo(() => {
    if (!selectedTenderName) return [];
    
    const [title, clientName] = selectedTenderName.split('___');
    const sameTenders = tenders.filter(t => 
      t.title === title && 
      t.client_name === clientName
    );
    
    const versions = new Set(sameTenders.map(t => t.version || 1));
    return Array.from(versions).sort((a, b) => b - a);
  }, [tenders, selectedTenderName]);

  const selectedTender = tenders.find(t => t.id === selectedTenderId);
  
  const handleRefresh = useCallback(() => {
    if (!selectedTenderId) {
      console.log('❌ No tender selected for refresh');
      message.info('Выберите тендер для обновления');
      return;
    }
    
    console.log('🔄 Starting refresh for tender:', selectedTenderId);
    setLoading(true);
    message.loading('Обновление данных...', 0.5);
    
    setIsContentVisible(false);
    
    setTimeout(() => {
      const currentId = selectedTenderId;
      setSelectedTenderId(null);
      
      setTimeout(() => {
        setSelectedTenderId(currentId);
        setIsContentVisible(true);
        setLoading(false);
        message.success('Данные обновлены');
      }, 100);
    }, 300);
  }, [selectedTenderId]);

  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      console.log('🚀 Navigating to tender details:', selectedTenderId);
      navigate(`/tender/${selectedTenderId}/boq`);
    }
  }, [selectedTenderId, navigate]);

  const handleUpdateStats = useCallback((stats: { 
    totalBaseCost: number; 
    totalCommercialCost: number; 
    totalMarkup: number; 
    positions: number 
  }) => {
    console.log('📊 Updating commercial stats:', stats);
    const markupPercentage = stats.totalBaseCost > 0 
      ? ((stats.totalCommercialCost - stats.totalBaseCost) / stats.totalBaseCost) * 100 
      : 0;
      
    setCommercialStats({
      ...stats,
      markupPercentage
    });
  }, []);

  // Handle quick tender selection
  const handleQuickTenderSelect = useCallback((tender: Tender) => {
    console.log('🚀 Quick tender selected:', tender.id, tender.title);
    
    // Auto-fill the tender selection fields
    const tenderNameKey = `${tender.title}___${tender.client_name}`;
    setSelectedTenderName(tenderNameKey);
    setSelectedTenderId(tender.id);
    
    console.log('✅ Auto-filled tender selection:', {
      tenderNameKey,
      tenderId: tender.id,
      version: tender.version
    });
    
    // Show content after brief delay for smooth transition
    setTimeout(() => setIsContentVisible(true), 150);
    
    // Scroll to content section
    setTimeout(() => {
      const contentSection = document.getElementById('tender-content-section');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }, []);

  return (
    <>
      <style>
        {`
          .commercial-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px 16px 0 0;
            margin-bottom: 0;
            padding: 32px;
            padding-bottom: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .commercial-page-header::before {
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
          .commercial-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .commercial-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .commercial-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
        `}
      </style>
      <ConfigProvider
        theme={{
          token: {
            borderRadius: 8,
            colorPrimary: '#1890ff'
          }
        }}
      >
        <div className="w-full min-h-full bg-gray-50">
          <div className="p-6">
            {/* Header */}
            <div className="commercial-page-header" style={{ borderRadius: '16px' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <DollarOutlined style={{ fontSize: 32, color: 'white' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                      {selectedTender ? selectedTender.title : 'Коммерческие стоимости'}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                      {selectedTender ? `Заказчик: ${selectedTender.client_name}` : 'Анализ базовых и коммерческих стоимостей позиций'}
                    </Text>
                  </div>
                </div>
                <div className="commercial-action-buttons">
                  <Button
                    className="commercial-action-btn"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 500
                    }}
                    size="large"
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate('/tenders')}
                  >
                    К тендерам
                  </Button>
                  <Button
                    className="commercial-action-btn"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#1890ff',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 600
                    }}
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={loading}
                  >
                    Обновить
                  </Button>
                </div>
              </div>

              {/* Tender Selection and Commercial Stats */}
              <div className={`flex items-center gap-4 transition-all duration-700 mt-6 ${!selectedTenderId ? 'justify-center' : 'justify-start'}`}>
                {/* Tender Selection */}
                <div className={`rounded-lg p-4 transition-all duration-700 transform ${selectedTenderId ? 'flex-1 shadow-lg scale-100' : 'w-auto max-w-2xl scale-105'}`} style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} lg={selectedTenderId ? 14 : 24}>
                      <div className="flex flex-col gap-2">
                        <div className={`flex flex-wrap items-center gap-2 transition-all duration-700 ${!selectedTenderId ? 'justify-center' : 'justify-start'}`}>
                          <Text strong className="whitespace-nowrap" style={{ color: '#262626', cursor: 'default' }}>Тендер:</Text>
                          <Select
                            value={selectedTenderName}
                            onChange={handleTenderNameChange}
                            style={{ minWidth: '280px', maxWidth: '400px' }}
                            placeholder="Выберите тендер"
                            loading={tendersLoading}
                            showSearch
                            size="large"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.children as string).toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {uniqueTenderNames.map(([key, displayName]) => (
                              <Option key={key} value={key}>
                                {displayName}
                              </Option>
                            ))}
                          </Select>
                          <Select
                            value={selectedTender?.version || undefined}
                            onChange={handleVersionChange}
                            style={{ width: '160px' }}
                            placeholder="Выберите версию"
                            size="large"
                            disabled={!selectedTenderName || availableVersions.length === 0}
                          >
                            {availableVersions.map(version => (
                              <Option key={version} value={version}>
                                Версия {version}
                              </Option>
                            ))}
                          </Select>
                        </div>
                        {selectedTender && (
                          <div className={`transition-all duration-700 ${!isContentVisible ? 'opacity-0' : 'opacity-100'}`}>
                            <Button 
                              type="link"
                              onClick={handleNavigateToTender}
                              icon={<DashboardOutlined />}
                              size="small"
                              className="whitespace-nowrap"
                            >
                              Детали тендера
                            </Button>
                          </div>
                        )}
                      </div>
                    </Col>
                    {selectedTender && (
                      <Col xs={24} lg={10} className={`transition-all duration-700 ${isContentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                        <div className="flex flex-col justify-center gap-2">
                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <span className="text-sm whitespace-nowrap text-gray-800" style={{ cursor: 'default' }}>
                              <strong>Название:</strong> {selectedTender.title}
                            </span>
                            <span className="text-gray-400" style={{ cursor: 'default' }}>|</span>
                            <span className="text-sm whitespace-nowrap text-gray-800" style={{ cursor: 'default' }}>
                              <strong>Заказчик:</strong> {selectedTender.client_name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <span className="text-sm whitespace-nowrap text-gray-800" style={{ cursor: 'default' }}>
                              <strong>Площадь по СП:</strong> {selectedTender.area_sp ? formatQuantity(selectedTender.area_sp, 0) + ' м²' : '—'}
                            </span>
                            <span className="text-sm whitespace-nowrap text-gray-800" style={{ cursor: 'default' }}>
                              <strong>Площадь Заказчика:</strong> {selectedTender.area_client ? formatQuantity(selectedTender.area_client, 0) + ' м²' : '—'}
                            </span>
                          </div>
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
                
                {/* Commercial Summary */}
                {selectedTenderId && (
                  <div className={`flex justify-center px-6 rounded-lg transition-all duration-700 self-stretch ${isContentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(24,144,255,0.2)' }}>
                    <Row gutter={[16, 8]} justify="center" align="middle">
                      <Col>
                        <div className="text-center">
                          <Text className="text-xs text-gray-600 block" style={{ cursor: 'default' }}>Базовая стоимость</Text>
                          <div className="text-lg font-bold text-blue-600" style={{ cursor: 'default' }}>
                            {Math.round(commercialStats.totalBaseCost).toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      </Col>
                      <Col>
                        <div className="text-center">
                          <Text className="text-xs text-gray-600 block" style={{ cursor: 'default' }}>Коммерческая</Text>
                          <div className="text-lg font-bold text-green-600" style={{ cursor: 'default' }}>
                            {Math.round(commercialStats.totalCommercialCost).toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      </Col>
                      <Col>
                        <div className="text-center">
                          <Text className="text-xs text-gray-600 block" style={{ cursor: 'default' }}>Наценка</Text>
                          <div className="text-lg font-bold text-orange-600" style={{ cursor: 'default' }}>
                            +{Math.round(commercialStats.totalMarkup).toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="text-xs text-gray-500" style={{ cursor: 'default' }}>
                            +{commercialStats.markupPercentage.toFixed(1)}%
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
              
              {/* Quick Tender Selection - moved to header */}
              {!selectedTenderId && (
                <div className="mt-6">
                  <QuickTenderSelector 
                    tenders={tenders}
                    loading={tendersLoading}
                    onTenderSelect={handleQuickTenderSelect}
                    selectedTenderId={selectedTenderId}
                    maxItems={6}
                  />
                </div>
              )}
              
              {/* Deadline Status Bar */}
              {selectedTenderId && selectedTender && (
                <div className={`mt-4 -mx-8 -mb-8 transition-all duration-700 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <DeadlineStatusBar 
                    deadline={selectedTender.submission_deadline} 
                    className=""
                  />
                </div>
              )}
            </div>
          </div>

        {/* Main Content */}
        {!selectedTenderId && (
          <div className="p-4 lg:p-6">
            {/* Empty State */}
            <Card className="text-center max-w-2xl mx-auto shadow-lg">
              <Empty
                description={
                  <div className="space-y-3">
                    <div>
                      <Text className="text-xl font-semibold text-gray-800 block">
                        {tendersLoading ? "Загрузка тендеров..." : "Выберите тендер для анализа коммерческих стоимостей"}
                      </Text>
                    </div>
                    {!tendersLoading && (
                      <div>
                        <Text className="text-base text-gray-500 block">
                          Выберите тендер из списка выше или используйте селектор
                        </Text>
                      </div>
                    )}
                  </div>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                {!tendersLoading && tenders.length === 0 && (
                  <Button 
                    type="primary" 
                    onClick={() => navigate('/tenders')}
                    size="large"
                  >
                    Перейти к тендерам
                  </Button>
                )}
              </Empty>
            </Card>
          </div>
        )}
        
        {selectedTenderId && (
          <div 
            id="tender-content-section"
            className={`p-4 lg:p-6 transition-all duration-1000 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className={`w-full transition-all duration-1000 transform ${isContentVisible ? 'translate-y-0' : 'translate-y-10'}`}>
              <TenderCommercialManager 
                tenderId={selectedTenderId} 
                key={selectedTenderId}
                onStatsUpdate={handleUpdateStats}
              />
            </div>
          </div>
        )}
        </div>
      </ConfigProvider>
    </>
  );
};

export default React.memo(CommercialCostsPage);