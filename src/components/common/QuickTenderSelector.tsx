import React, { useMemo } from 'react';
import { Card, Typography, Row, Col, Badge, Tooltip, Spin, Tag } from 'antd';
import {
  ProjectOutlined,
  HomeOutlined,
  ShopOutlined,
  BankOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ToolOutlined,
  MedicineBoxOutlined,
  DollarCircleOutlined,
  UserOutlined,
  AreaChartOutlined
} from '@ant-design/icons';
import type { Tender } from '../../lib/supabase/types';
import { formatQuantity } from '../../utils/formatters';
import { useTheme } from '../../contexts/ThemeContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface QuickTenderSelectorProps {
  tenders: Tender[];
  loading?: boolean;
  onTenderSelect: (tender: Tender) => void;
  selectedTenderId?: string | null;
  maxItems?: number;
}

// Icon mapping for different tender types
const getTenderIcon = (title: string, clientName: string) => {
  const lowerTitle = title.toLowerCase();
  const lowerClient = clientName.toLowerCase();
  
  if (lowerTitle.includes('жилой') || lowerTitle.includes('дом') || lowerTitle.includes('квартир')) {
    return HomeOutlined;
  }
  if (lowerTitle.includes('торгов') || lowerTitle.includes('магазин') || lowerTitle.includes('ритейл')) {
    return ShopOutlined;
  }
  if (lowerTitle.includes('офис') || lowerTitle.includes('банк') || lowerTitle.includes('админ')) {
    return BankOutlined;
  }
  if (lowerTitle.includes('склад') || lowerTitle.includes('логист') || lowerTitle.includes('производ')) {
    return ToolOutlined;
  }
  if (lowerClient.includes('город') || lowerClient.includes('администр') || lowerClient.includes('мэр')) {
    return EnvironmentOutlined;
  }
  if (lowerTitle.includes('детск') || lowerTitle.includes('школ') || lowerTitle.includes('образоват')) {
    return TeamOutlined;
  }
  if (lowerTitle.includes('больниц') || lowerTitle.includes('медиц') || lowerTitle.includes('клиник')) {
    return MedicineBoxOutlined;
  }
  
  return ProjectOutlined;
};

// Color mapping for different tender categories
const getTenderColor = (title: string) => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('жилой') || lowerTitle.includes('дом')) return '#52c41a';
  if (lowerTitle.includes('торгов') || lowerTitle.includes('магазин')) return '#1890ff';
  if (lowerTitle.includes('офис') || lowerTitle.includes('банк')) return '#722ed1';
  if (lowerTitle.includes('склад') || lowerTitle.includes('производ')) return '#fa8c16';
  if (lowerTitle.includes('детск') || lowerTitle.includes('образоват')) return '#13c2c2';
  if (lowerTitle.includes('больниц') || lowerTitle.includes('медиц')) return '#eb2f96';
  
  return '#1890ff';
};

const QuickTenderSelector: React.FC<QuickTenderSelectorProps> = ({
  tenders,
  loading = false,
  onTenderSelect,
  selectedTenderId,
  maxItems = 6
}) => {
  const { theme } = useTheme();
  console.log('🚀 QuickTenderSelector rendered with tenders:', tenders.length);

  // Get the most recent and active tenders, prioritizing by:
  // 1. Recent creation date
  // 2. Has submission deadline in the future
  // 3. Has area data (more complete)
  const prioritizedTenders = useMemo(() => {
    const now = dayjs();
    
    const scored = tenders.map(tender => {
      let score = 0;
      
      // Recent tenders get higher score
      const daysSinceCreated = now.diff(dayjs(tender.created_at), 'days');
      if (daysSinceCreated <= 7) score += 10;
      else if (daysSinceCreated <= 30) score += 5;
      else if (daysSinceCreated <= 90) score += 2;
      
      // Future deadlines get higher score
      if (tender.submission_deadline) {
        const daysToDeadline = dayjs(tender.submission_deadline).diff(now, 'days');
        if (daysToDeadline > 0) score += 8;
        if (daysToDeadline > 7) score += 3;
      }
      
      // Tenders with area data get bonus
      if (tender.area_sp && tender.area_sp > 0) score += 3;
      if (tender.area_client && tender.area_client > 0) score += 2;
      
      // More complete data gets bonus
      if (tender.client_name && tender.client_name.length > 0) score += 1;
      if (tender.description && tender.description.length > 0) score += 1;
      
      return { tender, score };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map(item => item.tender);
  }, [tenders, maxItems]);

  const handleTenderClick = (tender: Tender) => {
    console.log('🎯 Quick tender selected:', tender.id, tender.title);
    onTenderSelect(tender);
  };

  if (loading) {
    return (
      <div className="mb-6 text-center py-8">
        <div className="inline-block p-6 rounded-2xl"
             style={{
               background: theme === 'dark' ? 'rgba(31, 31, 31, 0.8)' : 'rgba(255, 255, 255, 0.15)',
               backdropFilter: 'blur(12px)',
               WebkitBackdropFilter: 'blur(12px)',
               border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
             }}>
          <Spin size="large" />
          <div className="mt-4">
            <Text style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
              Загрузка актуальных тендеров...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  if (prioritizedTenders.length === 0) {
    return null;
  }

  return (
    <>
      <style>
        {`
          .modern-tender-card {
            background: ${theme === 'dark' ? 'rgba(31, 31, 31, 0.9)' : 'rgba(255, 255, 255, 0.12)'};
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'};
            border-radius: 12px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: visible;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
            min-height: 170px;
            height: 170px;
            display: flex;
            flex-direction: column;
            padding: 12px;
          }

          .modern-tender-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(145deg, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)'} 0%, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.04)'} 100%);
            opacity: 0;
            transition: all 0.25s ease;
            border-radius: 12px;
          }

          .modern-tender-card:hover::before {
            opacity: 1;
          }

          .modern-tender-card:hover {
            transform: translateY(-3px) scale(1.01);
            border-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.35)'};
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18), 0 0 0 1px ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'};
            background: ${theme === 'dark' ? 'rgba(38, 38, 38, 0.95)' : 'rgba(255, 255, 255, 0.18)'};
          }

          .modern-tender-card.selected {
            transform: scale(1.02);
            background: ${theme === 'dark' ? 'rgba(21, 57, 91, 0.6)' : 'rgba(255, 255, 255, 0.22)'};
            border-color: rgba(24, 144, 255, 0.6);
            box-shadow: 0 12px 30px rgba(24, 144, 255, 0.2), 0 0 0 2px rgba(24, 144, 255, 0.4);
          }

          .modern-tender-card.selected::before {
            opacity: 1;
            background: linear-gradient(145deg, rgba(24, 144, 255, 0.12) 0%, rgba(24, 144, 255, 0.06) 100%);
          }

          .tender-title-text {
            color: #ffffff;
            font-weight: 700;
            font-size: 18px;
            line-height: 1.3;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            max-height: 48px;
            margin-bottom: 8px;
            text-align: center;
          }

          .tender-client-text {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            font-size: 15px;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: center;
            margin-bottom: 12px;
            padding: 0 8px;
          }

          .title-client-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 4px 0;
            min-height: 65px;
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            height: 36px;
          }

          .card-footer {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 32px;
            padding: 0;
            margin-top: auto;
          }

          .tender-area-badge {
            background: linear-gradient(135deg, rgba(82, 196, 26, 0.85) 0%, rgba(82, 196, 26, 0.65) 100%);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.35);
            color: #ffffff;
            font-weight: 700;
            font-size: 13px;
            padding: 6px 12px;
            border-radius: 12px;
            box-shadow: 0 3px 10px rgba(82, 196, 26, 0.3);
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          .tender-version-badge {
            background: linear-gradient(135deg, rgba(24, 144, 255, 0.9) 0%, rgba(24, 144, 255, 0.7) 100%);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            color: #ffffff;
            font-weight: 700;
            font-size: 12px;
            padding: 6px 10px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(24, 144, 255, 0.3);
            transition: all 0.25s ease;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          .modern-tender-card:hover .tender-area-badge {
            transform: scale(1.03);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .modern-tender-card:hover .tender-version-badge {
            transform: scale(1.03);
            box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
          }

          .tender-icon-wrapper {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'} 0%, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)'} 100%);
            border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)'};
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          }

          .modern-tender-card:hover .tender-icon-wrapper {
            background: linear-gradient(135deg, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.35)'} 0%, ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.22)'} 100%);
            border-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.5)'};
            transform: scale(1.08) rotate(3deg);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
          }

          .priority-badge {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${theme === 'dark' ? 'rgba(38, 38, 38, 0.8)' : 'rgba(255, 255, 255, 0.15)'};
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            z-index: 10;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .deadline-badge {
            position: absolute;
            top: 4px;
            left: 4px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: rgba(255, 165, 0, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            z-index: 10;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .no-area-tag {
            background: ${theme === 'dark' ? 'rgba(31, 31, 31, 0.8)' : 'rgba(255, 255, 255, 0.1)'};
            border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'};
            color: rgba(255, 255, 255, 0.7);
            border-radius: 10px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          @media (max-width: 768px) {
            .tender-title-text {
              font-size: 15px;
              max-height: 40px;
            }

            .tender-client-text {
              font-size: 13px;
            }

            .modern-tender-card {
              height: 120px;
            }

            .tender-icon-wrapper {
              width: 36px;
              height: 36px;
            }

            .tender-area-badge {
              font-size: 11px;
              padding: 5px 10px;
            }

            .tender-version-badge {
              font-size: 10px;
              padding: 5px 8px;
            }
          }

          @media (max-width: 576px) {
            .tender-title-text {
              font-size: 14px;
              max-height: 38px;
              -webkit-line-clamp: 2;
            }

            .tender-client-text {
              font-size: 12px;
            }

            .modern-tender-card {
              height: 120px;
            }

            .tender-icon-wrapper {
              width: 32px;
              height: 32px;
            }

            .tender-area-badge {
              font-size: 10px;
              padding: 4px 8px;
            }

            .tender-version-badge {
              font-size: 9px;
              padding: 4px 6px;
            }

            .no-area-tag {
              font-size: 10px;
              padding: 4px 8px;
            }
          }
        `}
      </style>

      {/* Compact Cards Grid */}
      <div className="mb-6">
        <Row gutter={[12, 12]}>
          {prioritizedTenders.map((tender, index) => {
            const Icon = getTenderIcon(tender.title, tender.client_name || '');
            const color = getTenderColor(tender.title);
            const isSelected = tender.id === selectedTenderId;
            const daysSinceCreated = dayjs().diff(dayjs(tender.created_at), 'days');
            const hasDeadline = tender.submission_deadline;
            const daysToDeadline = hasDeadline ? dayjs(tender.submission_deadline).diff(dayjs(), 'days') : null;

            return (
              <Col xs={12} sm={8} md={6} lg={4} xl={4} key={tender.id}>
                <Tooltip
                  title={
                    <div className="p-2">
                      <div className="font-semibold mb-2 text-sm">{tender.title}</div>
                      <div className="text-xs mb-2 text-gray-200">
                        <UserOutlined className="mr-1" />
                        {tender.client_name || 'Не указан'}
                      </div>
                      {tender.area_sp && (
                        <div className="text-xs mb-1 text-gray-200">
                          <AreaChartOutlined className="mr-1" />
                          СП: {formatQuantity(tender.area_sp, 0)} м²
                        </div>
                      )}
                      {tender.area_client && (
                        <div className="text-xs mb-1 text-gray-200">
                          <AreaChartOutlined className="mr-1" />
                          Заказчик: {formatQuantity(tender.area_client, 0)} м²
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                        {dayjs(tender.created_at).format('DD.MM.YY')}
                        {hasDeadline && daysToDeadline !== null && (
                          <span className="ml-2">
                            {daysToDeadline > 0 ? `${daysToDeadline}д` : 'Просрочен'}
                          </span>
                        )}
                      </div>
                    </div>
                  }
                  placement="top"
                  overlayStyle={{ maxWidth: '250px' }}
                >
                  <div
                    className={`modern-tender-card ${isSelected ? 'selected' : ''} relative`}
                    onClick={() => handleTenderClick(tender)}
                  >

                    {/* Compact Deadline Warning */}
                    {hasDeadline && daysToDeadline !== null && daysToDeadline <= 7 && daysToDeadline > 0 && (
                      <div className="deadline-badge" title={`${daysToDeadline} дн.`}>
                        ⚡
                      </div>
                    )}

                    <div className="relative z-5 flex flex-col" style={{ height: '100%' }}>
                      {/* Header with Icon and Version */}
                      <div className="card-header">
                        <div className="tender-icon-wrapper">
                          <Icon style={{ fontSize: 20, color: '#ffffff' }} />
                        </div>
                        <div className="tender-version-badge">
                          v{tender.version || 1}
                        </div>
                      </div>

                      {/* Main Content - Title and Client */}
                      <div className="title-client-section">
                        <div className="tender-title-text" title={tender.title}>
                          {tender.title}
                        </div>
                        <div className="tender-client-text" title={tender.client_name || 'Не указан'}>
                          {tender.client_name || 'Не указан'}
                        </div>
                      </div>

                      {/* Footer with Area Information */}
                      <div className="card-footer">
                        {tender.area_sp ? (
                          <div className="tender-area-badge">
                            <AreaChartOutlined style={{ fontSize: 12 }} />
                            {formatQuantity(tender.area_sp, 0)}м²
                          </div>
                        ) : (
                          <div className="no-area-tag">
                            Нет данных
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Col>
            );
          })}
        </Row>

        {/* Counter with improved styling */}
        <div className="text-center mt-6">
          <Text
            style={{
              color: theme === 'dark' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.85)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Показано {prioritizedTenders.length} из {tenders.length} актуальных тендеров
          </Text>
        </div>
      </div>
    </>
  );
};

export default QuickTenderSelector;