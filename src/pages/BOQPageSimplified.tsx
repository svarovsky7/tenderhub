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
  DashboardOutlined,
  FolderOutlined,
  LinkOutlined,
  FormOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TenderBOQManagerLazy from '../components/tender/TenderBOQManagerLazy';
import DeadlineStatusBar from '../components/tender/DeadlineStatusBar';
import QuickTenderSelector from '../components/common/QuickTenderSelector';
import { tendersApi } from '../lib/supabase/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Tender } from '../lib/supabase/types';
import { formatQuantity } from '../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const BOQPageSimplified: React.FC = () => {
  console.log('🚀 BOQPageSimplified component rendered');

  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
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
      const result = await tendersApi.getAll({ includeVersions: true });
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
          // Set both ID and name for proper display
          setSelectedTenderId(tenderParam);
          const tenderNameKey = `${foundTender.title}___${foundTender.client_name}`;
          setSelectedTenderName(tenderNameKey);
          console.log('📝 Setting tender name:', tenderNameKey);
          setTimeout(() => setIsContentVisible(true), 100);
        }
      }
      // Removed auto-selection of first tender - user must explicitly choose
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
    setSelectedTenderId(null); // Reset tender ID when name changes
    // Don't hide content - keep current view while user selects version
  }, []);

  // Handle version selection (second step)
  const handleVersionChange = useCallback((version: number) => {
    console.log('🔄 Version selection changed:', version);
    if (!selectedTenderName) return;
    
    // Find the tender with the selected name and version
    const [title, clientName] = selectedTenderName.split('___');
    const targetTender = tenders.find(t => 
      t.title === title && 
      t.client_name === clientName &&
      (t.version || 1) === version
    );
    
    if (targetTender) {
      setSelectedTenderId(targetTender.id);
      // Trigger animation after version is selected
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
    
    // Find all tenders with the same title and client
    const sameTenders = tenders.filter(t => 
      t.title === title && 
      t.client_name === clientName
    );
    
    // Get unique versions from these tenders
    const versions = new Set(sameTenders.map(t => t.version || 1));
    return Array.from(versions).sort((a, b) => b - a); // Sort descending
  }, [tenders, selectedTenderName]);


  const selectedTender = tenders.find(t => t.id === selectedTenderId);
  
  // Log for debugging
  React.useEffect(() => {
    if (selectedTenderId) {
      console.log('🔍 BOQ Page - Debug info:', {
        selectedTenderId,
        tendersCount: tenders.length,
        selectedTender: selectedTender || 'NOT FOUND',
        allTenderIds: tenders.map(t => t.id)
      });
    }
  }, [selectedTenderId, tenders, selectedTender]);

  const handleRefresh = useCallback(() => {
    if (!selectedTenderId) {
      console.log('❌ No tender selected for refresh');
      message.info('Выберите тендер для обновления');
      return;
    }

    console.log('🔄 Starting refresh for tender:', selectedTenderId);
    setLoading(true);
    const loadingMsg = message.loading('Обновление данных...', 0);

    // Hide content with animation
    console.log('🎬 Hiding content...');
    setIsContentVisible(false);

    // Force reload component by changing its key
    setTimeout(() => {
      const currentId = selectedTenderId;
      console.log('🔧 Unmounting component by clearing tenderId');
      setSelectedTenderId(null);

      setTimeout(() => {
        console.log('🔄 Remounting component with tenderId:', currentId);
        setSelectedTenderId(currentId);
        setIsContentVisible(true);
        setLoading(false);
        loadingMsg();
        message.success('Данные обновлены');
        console.log('✅ Refresh completed');
      }, 200);
    }, 300);
  }, [selectedTenderId]);

  // Reset tender selection
  const handleResetSelection = useCallback(() => {
    setSelectedTenderId(null);
    setSelectedTenderName(null);
    setIsContentVisible(false);
    setBOQStats({
      totalWorks: 0,
      totalMaterials: 0,
      totalCost: 0,
      positionsCount: 0
    });
    message.info('Выбор тендера сброшен');
  }, []);

  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      console.log('🚀 Navigating to tender materials and works:', selectedTenderId);
      navigate(`/libraries/tender-materials-works?tender=${selectedTenderId}`);
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

  // Handle quick tender selection
  const handleQuickTenderSelect = useCallback((tender: Tender) => {
    console.log('🚀 Quick tender selected for BOQ:', tender.id, tender.title);
    
    // Auto-fill the tender selection fields
    const tenderNameKey = `${tender.title}___${tender.client_name}`;
    setSelectedTenderName(tenderNameKey);
    setSelectedTenderId(tender.id);
    
    console.log('✅ Auto-filled tender selection for BOQ:', {
      tenderNameKey,
      tenderId: tender.id,
      version: tender.version
    });
    
    // Show content after brief delay for smooth transition
    setTimeout(() => setIsContentVisible(true), 150);
    
    // Scroll to content section
    setTimeout(() => {
      const contentSection = document.getElementById('boq-content-section');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }, []);

  return (
    <>
      <style>
        {`
          .boq-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px 16px 0 0;
            margin-bottom: 0;
            padding: 32px;
            padding-bottom: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .boq-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .boq-page-header::before {
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
          .boq-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .boq-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .boq-action-btn:hover {
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
            {/* Beautiful Gradient Header */}
            <div className={`boq-page-header ${theme === 'dark' ? 'dark' : ''}`} style={{ borderRadius: '16px' }}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <FileTextOutlined style={{ fontSize: 32, color: 'white' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                      {selectedTender ? selectedTender.title : 'Управление сметой (BOQ)'}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                      {selectedTender ? `Заказчик: ${selectedTender.client_name}` : 'Позиции заказчика и детализация сметы'}
                    </Text>
                  </div>
                </div>
                <div className="boq-action-buttons">
                  {selectedTenderId && (
                    <Button
                      className="boq-action-btn boq-action-btn-transparent"
                      size="large"
                      icon={<ArrowLeftOutlined />}
                      onClick={handleResetSelection}
                    >
                      Назад к выбору
                    </Button>
                  )}
                  <Button
                    className="boq-action-btn boq-action-btn-transparent"
                    size="large"
                    icon={<DashboardOutlined />}
                    onClick={() => navigate('/dashboard')}
                  >
                    К дашборду
                  </Button>
                  <Button
                    className="boq-action-btn"
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

              {/* Tender Selection and Total Cost */}
              <div className={`flex items-center gap-4 transition-all duration-700 mt-6 ${!selectedTenderId ? 'justify-center' : 'justify-start'}`}>
                {/* Tender Selection - Left Side */}
                <div className={`rounded-lg p-4 transition-all duration-700 transform ${selectedTenderId ? 'flex-1 shadow-lg scale-100' : 'w-auto max-w-2xl scale-105'}`} style={{ background: theme === 'dark' ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} lg={selectedTenderId ? 14 : 24}>
                      <div className="flex flex-col gap-2">
                        <div className={`flex flex-wrap items-center gap-2 transition-all duration-700 ${!selectedTenderId ? 'justify-center' : 'justify-start'}`}>
                          <Text strong className="whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.95)' : '#262626', cursor: 'default' }}>Тендер:</Text>
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
                            <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                              <strong>Название:</strong> {selectedTender.title}
                            </span>
                            <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', cursor: 'default' }}>|</span>
                            <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                              <strong>Заказчик:</strong> {selectedTender.client_name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                              <strong>Площадь по СП:</strong> {selectedTender.area_sp ? formatQuantity(selectedTender.area_sp, 0) + ' м²' : '—'}
                            </span>
                            <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                              <strong>Площадь Заказчика:</strong> {selectedTender.area_client ? formatQuantity(selectedTender.area_client, 0) + ' м²' : '—'}
                            </span>
                          </div>
                          {/* Курсы валют на отдельной строке */}
                          <div className="flex flex-wrap items-center justify-end gap-3 mt-1" style={{ position: 'relative', zIndex: 10 }}>
                            <span className="text-sm whitespace-nowrap text-green-500" style={{ cursor: 'default', fontWeight: 600 }}>
                              <strong>Курс USD:</strong> {selectedTender.usd_rate ? `${Number(selectedTender.usd_rate).toFixed(2)} ₽/$` : '—'}
                            </span>
                            <span className="text-sm whitespace-nowrap text-blue-500" style={{ cursor: 'default', fontWeight: 600 }}>
                              <strong>Курс EUR:</strong> {selectedTender.eur_rate ? `${Number(selectedTender.eur_rate).toFixed(2)} ₽/€` : '—'}
                            </span>
                            <span className="text-sm whitespace-nowrap text-orange-500" style={{ cursor: 'default', fontWeight: 600 }}>
                              <strong>Курс CNY:</strong> {selectedTender.cny_rate ? `${Number(selectedTender.cny_rate).toFixed(2)} ₽/¥` : '—'}
                            </span>
                          </div>
                          {/* Ссылки на дополнительные ресурсы */}
                          {(selectedTender.upload_folder || selectedTender.bsm_link || selectedTender.tz_clarification_link || selectedTender.qa_form_link) && (
                            <div className="flex flex-wrap items-center justify-end gap-2 mt-2" style={{ position: 'relative', zIndex: 10 }}>
                              {selectedTender.upload_folder && (
                                <Button
                                  size="small"
                                  icon={<FolderOutlined />}
                                  onClick={() => window.open(selectedTender.upload_folder, '_blank')}
                                  title="Папка для загрузки КП"
                                >
                                  Папка КП
                                </Button>
                              )}
                              {selectedTender.bsm_link && (
                                <Button
                                  size="small"
                                  icon={<LinkOutlined />}
                                  onClick={() => window.open(selectedTender.bsm_link, '_blank')}
                                  title="Ссылка на БСМ"
                                >
                                  БСМ
                                </Button>
                              )}
                              {selectedTender.tz_clarification_link && (
                                <Button
                                  size="small"
                                  icon={<FileTextOutlined />}
                                  onClick={() => window.open(selectedTender.tz_clarification_link, '_blank')}
                                  title="Ссылка на уточнение по ТЗ"
                                >
                                  Уточнение ТЗ
                                </Button>
                              )}
                              {selectedTender.qa_form_link && (
                                <Button
                                  size="small"
                                  icon={<FormOutlined />}
                                  onClick={() => window.open(selectedTender.qa_form_link, '_blank')}
                                  title="Ссылка на форму вопрос-ответ"
                                >
                                  Вопросы
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
                
                {/* Total Cost - Right Side */}
                {selectedTenderId && (
                  <div className={`flex flex-col justify-center px-6 rounded-lg transition-all duration-700 self-stretch ${isContentVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ background: theme === 'dark' ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(24,144,255,0.2)' }}>
                    <div>
                      <Text className="text-sm block mb-1" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', cursor: 'default' }}>Общая стоимость</Text>
                      <div className="text-3xl font-bold" style={{ cursor: 'default', color: theme === 'dark' ? '#52c41a' : 'rgba(0,0,0,0.85)' }}>
                        {Math.round(boqStats.totalCost).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Tender Selection - moved to header */}
              {!selectedTenderId && !selectedTenderName && (
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
              
              {/* Deadline Status Bar - integrated into header */}
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
        {!selectedTenderId && !selectedTenderName && (
          <div className="p-4 lg:p-6">
            {/* Empty State */}
            <Card className="text-center max-w-2xl mx-auto shadow-lg">
              <Empty
                description={
                  <div className="space-y-3">
                    <div>
                      <Text
                        className="text-xl font-semibold block"
                        style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#1f2937' }}
                      >
                        {tendersLoading ? "Загрузка тендеров..." : "Выберите тендер для начала работы"}
                      </Text>
                    </div>
                    {!tendersLoading && (
                      <div>
                        <Text
                          className="text-base block"
                          style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#6b7280' }}
                        >
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

        {/* Intermediate state: tender name selected, waiting for version */}
        {!selectedTenderId && selectedTenderName && (
          <div className="p-4 lg:p-6">
            <Card className="text-center max-w-2xl mx-auto shadow-lg">
              <Empty
                description={
                  <div className="space-y-3">
                    <div>
                      <Text
                        className="text-xl font-semibold block"
                        style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#1f2937' }}
                      >
                        Выберите версию тендера
                      </Text>
                    </div>
                    <div>
                      <Text
                        className="text-base"
                        style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : '#6b7280' }}
                      >
                        Используйте селектор "Версия" в шапке страницы
                      </Text>
                    </div>
                  </div>
                }
              />
            </Card>
          </div>
        )}

        {selectedTenderId && (
          <div 
            id="boq-content-section"
            className={`p-4 lg:p-6 transition-all duration-1000 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className={`w-full transition-all duration-1000 transform ${isContentVisible ? 'translate-y-0' : 'translate-y-10'}`}>
              <TenderBOQManagerLazy
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

export default React.memo(BOQPageSimplified);