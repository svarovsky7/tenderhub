import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  ConfigProvider,
  Alert,
  Radio
} from 'antd';
import {
  SwapOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  DashboardOutlined,
  TableOutlined,
  SettingOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CostRedistributionWizard from '../components/financial/CostRedistributionWizard';
import RedistributionResultsTable from '../components/financial/RedistributionResultsTable';
import DeadlineStatusBar from '../components/tender/DeadlineStatusBar';
import QuickTenderSelector from '../components/common/QuickTenderSelector';
import { tendersApi } from '../lib/supabase/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Tender } from '../lib/supabase/types';
import { formatQuantity } from '../utils/formatters';

const { Title, Text } = Typography;
const { Option } = Select;

type ViewMode = 'wizard' | 'results';

const CostRedistributionPage: React.FC = () => {
  console.log('🚀 CostRedistributionPage rendered');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [previousTenderId, setPreviousTenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isFirstSelection, setIsFirstSelection] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('wizard');

  // Refs to preserve scroll position when changing tenders
  const scrollPositionRef = useRef<number>(0);
  const shouldPreserveScroll = useRef<boolean>(false);

  // Load tenders
  const loadTenders = useCallback(async () => {
    console.log('📡 Loading tenders for redistribution...');
    setTendersLoading(true);
    try {
      const result = await tendersApi.getAll({ includeVersions: true });
      if (result.error) {
        console.error('❌ Failed to load tenders:', result.error);
        message.error('Ошибка загрузки тендеров');
        return;
      }
      console.log('✅ Tenders loaded:', result.data?.length);
      setTenders(result.data || []);

      // Check URL parameter
      const tenderParam = searchParams.get('tender');
      if (tenderParam) {
        const foundTender = result.data?.find(t => t.id === tenderParam);
        if (foundTender) {
          console.log('🎯 Auto-selecting tender from URL:', tenderParam);
          setSelectedTenderId(tenderParam);
          const tenderNameKey = `${foundTender.title}___${foundTender.client_name}`;
          setSelectedTenderName(tenderNameKey);
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

  // Handle tender name selection
  const handleTenderNameChange = useCallback((value: string) => {
    console.log('🔄 Tender name selection changed:', value);
    const currentScroll = window.scrollY;

    // Preserve scroll position when changing tenders (if we're not at the top)
    if (selectedTenderId && currentScroll > 100) {
      scrollPositionRef.current = currentScroll;
      shouldPreserveScroll.current = true;
      console.log('✅📍 PRESERVED scroll position:', scrollPositionRef.current);
    }

    // Store previous tender ID before clearing
    if (selectedTenderId) {
      setPreviousTenderId(selectedTenderId);
    }

    setSelectedTenderName(value);
    setSelectedTenderId(null);
    // Don't hide content - keep current view while user selects version
  }, [selectedTenderId]);

  // Handle version selection
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
      setPreviousTenderId(null);

      if (!isContentVisible) {
        setIsContentVisible(true);
        // Mark first selection as complete AFTER animation finishes
        setTimeout(() => {
          setIsFirstSelection(false);
        }, 650);
      } else {
        setIsFirstSelection(false);
      }

      // Restore scroll position if needed
      setTimeout(() => {
        if (shouldPreserveScroll.current && scrollPositionRef.current > 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({
                top: scrollPositionRef.current,
                behavior: 'auto'
              });
              console.log('🔄 Restored scroll position:', scrollPositionRef.current);
              shouldPreserveScroll.current = false;
              scrollPositionRef.current = 0;
            });
          });
        }
      }, 100);
    }
  }, [selectedTenderName, tenders, isContentVisible]);

  // Get unique tender names
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

  // Get versions for selected tender name
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

  const selectedTender = tenders.find(t => t.id === (selectedTenderId || previousTenderId));

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

  // Reset tender selection
  const handleResetSelection = useCallback(() => {
    setSelectedTenderId(null);
    setSelectedTenderName(null);
    setPreviousTenderId(null);
    setIsContentVisible(false);
    setIsFirstSelection(true);
    setViewMode('wizard');
    message.info('Выбор тендера сброшен');
  }, []);

  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      console.log('🚀 Navigating to tender details:', selectedTenderId);
      navigate(`/tender/${selectedTenderId}/boq`);
    }
  }, [selectedTenderId, navigate]);

  // Handle quick tender selection
  const handleQuickTenderSelect = useCallback((tender: Tender) => {
    console.log('🚀 Quick tender selected:', tender.id, tender.title);

    const tenderNameKey = `${tender.title}___${tender.client_name}`;
    setSelectedTenderName(tenderNameKey);
    setSelectedTenderId(tender.id);
    setPreviousTenderId(null);

    setTimeout(() => {
      setIsContentVisible(true);
      // Mark first selection as complete AFTER animation finishes
      setTimeout(() => {
        setIsFirstSelection(false);
      }, 650);
    }, 150);

    setTimeout(() => {
      const contentSection = document.getElementById('redistribution-content-section');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }, []);

  const handleRedistributionComplete = useCallback(() => {
    message.success('Перераспределение успешно создано!');
    // Переключаемся на просмотр результатов
    setViewMode('results');
  }, []);

  const handleRedistributionCancel = useCallback(() => {
    setSelectedTenderId(null);
    setSelectedTenderName(null);
    setIsContentVisible(false);
  }, []);

  return (
    <>
      <style>
        {`
          .redistribution-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            padding-bottom: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .redistribution-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .redistribution-page-header::before {
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
          .redistribution-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .redistribution-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .redistribution-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .materials-works-action-btn-transparent {
            background: transparent !important;
            color: rgba(255, 255, 255, 0.95) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
          }
          .materials-works-action-btn-transparent:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: white !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
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
            <div className={`redistribution-page-header ${theme === 'dark' ? 'dark' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <SwapOutlined style={{ fontSize: 32, color: 'white' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                      {selectedTender ? selectedTender.title : 'Перераспределение сумм'}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                      {selectedTender ? `Заказчик: ${selectedTender.client_name}` : 'Перераспределение коммерческих стоимостей между категориями'}
                    </Text>
                  </div>
                </div>
                <div className="redistribution-action-buttons">
                  {(selectedTenderId || previousTenderId) && (
                    <Button
                      className="redistribution-action-btn materials-works-action-btn-transparent"
                      style={{
                        fontWeight: 600
                      }}
                      size="large"
                      icon={<ArrowLeftOutlined />}
                      onClick={handleResetSelection}
                    >
                      Назад к выбору
                    </Button>
                  )}
                  <Button
                    className="redistribution-action-btn materials-works-action-btn-transparent"
                    style={{
                      fontWeight: 500
                    }}
                    size="large"
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate('/tenders')}
                  >
                    К тендерам
                  </Button>
                  <Button
                    className="redistribution-action-btn"
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

              {/* Tender Selection */}
              <div
                className={`flex items-center gap-4 mt-6 ${!(selectedTenderId || previousTenderId) ? 'justify-center' : 'justify-start'}`}
                style={{
                  opacity: (selectedTenderId || previousTenderId) && isContentVisible ? 1 : ((selectedTenderId || previousTenderId) ? 0 : 1),
                  transform: (selectedTenderId || previousTenderId) && isContentVisible ? 'translateY(0)' : ((selectedTenderId || previousTenderId) ? 'translateY(-10px)' : 'translateY(0)'),
                  transition: isFirstSelection && (selectedTenderId || previousTenderId) && isContentVisible
                    ? 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
                    : 'none'
                }}
              >
                <div className={`rounded-lg p-4 ${(selectedTenderId || previousTenderId) ? 'flex-1 shadow-lg' : 'w-auto max-w-2xl'}`} style={{ background: theme === 'dark' ? 'rgba(31,31,31,0.95)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} lg={(selectedTenderId || previousTenderId) ? 14 : 24}>
                      <div className="flex flex-col gap-2">
                        <div className={`flex flex-wrap items-center gap-2 ${!(selectedTenderId || previousTenderId) ? 'justify-center' : 'justify-start'}`}>
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
                            value={selectedTenderId ? (selectedTender?.version || undefined) : undefined}
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
                      </div>
                    </Col>
                    {selectedTender && (
                      <Col xs={24} lg={10}>
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
                            <span className="text-sm whitespace-nowrap" style={{ cursor: 'default' }}>
                              <strong style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626' }}>Площадь по СП:</strong> <span style={{ color: '#1890ff', fontWeight: 600, fontSize: '15px' }}>{selectedTender.area_sp ? formatQuantity(selectedTender.area_sp, 0) + ' м²' : '—'}</span>
                            </span>
                            <span className="text-sm whitespace-nowrap" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : '#262626', cursor: 'default' }}>
                              <strong>Площадь Заказчика:</strong> {selectedTender.area_client ? formatQuantity(selectedTender.area_client, 0) + ' м²' : '—'}
                            </span>
                          </div>
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
              </div>

              {/* Quick Tender Selector */}
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

              {/* Deadline Status Bar */}
              {(selectedTenderId || previousTenderId) && selectedTender && (
                <div className="mt-4 -mx-8 -mb-8">
                  <DeadlineStatusBar
                    deadline={selectedTender.submission_deadline}
                    className=""
                  />
                </div>
              )}
            </div>
          </div>

          {/* View Mode Selector */}
          {selectedTenderId && (
            <div className="px-6 pb-4">
              <div className="flex justify-center">
                <Radio.Group
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  size="large"
                  buttonStyle="solid"
                >
                  <Radio.Button value="wizard">
                    <Space>
                      <SettingOutlined />
                      Настройка перераспределения
                    </Space>
                  </Radio.Button>
                  <Radio.Button value="results">
                    <Space>
                      <TableOutlined />
                      Результаты перераспределения
                    </Space>
                  </Radio.Button>
                </Radio.Group>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!selectedTenderId && !selectedTenderName && (
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
                          {tendersLoading ? "Загрузка тендеров..." : "Выберите тендер для перераспределения стоимостей"}
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
          {/* Only show this if no previous tender was selected (first time selection) */}
          {!selectedTenderId && selectedTenderName && !previousTenderId && (
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

          {/* Show content if tender is selected OR if we're switching tenders (previousTenderId exists) */}
          {(selectedTenderId || previousTenderId) && (
            <div
              id="redistribution-content-section"
              className="p-4 lg:p-6"
              style={{
                opacity: isContentVisible ? 1 : 0,
                transform: isContentVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: isFirstSelection && isContentVisible
                  ? 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  : 'none'
              }}
            >
              <div className="w-full">
                {viewMode === 'wizard' ? (
                  <CostRedistributionWizard
                    tenderId={selectedTenderId || previousTenderId!}
                    tenderTitle={selectedTender?.title || ''}
                    onComplete={handleRedistributionComplete}
                    onCancel={handleRedistributionCancel}
                  />
                ) : (
                  <Card>
                    <RedistributionResultsTable
                      tenderId={selectedTenderId || previousTenderId!}
                      tenderTitle={selectedTender?.title || ''}
                    />
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </ConfigProvider>
    </>
  );
};

export default React.memo(CostRedistributionPage);
