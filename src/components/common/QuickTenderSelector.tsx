import React, { useMemo } from 'react';
import { Card, Typography, Row, Col, Badge, Tooltip, Spin } from 'antd';
import { 
  ProjectOutlined, 
  HomeOutlined, 
  ShopOutlined, 
  BankOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ToolOutlined,
  MedicineBoxOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';
import type { Tender } from '../../lib/supabase/types';
import { formatQuantity } from '../../utils/formatters';
import dayjs from 'dayjs';

const { Text } = Typography;

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
               background: 'rgba(255, 255, 255, 0.15)',
               backdropFilter: 'blur(12px)',
               WebkitBackdropFilter: 'blur(12px)',
               border: '1px solid rgba(255, 255, 255, 0.2)',
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
             }}>
          <Spin size="large" />
          <div className="mt-4">
            <Text className="text-white quick-tender-text-secondary" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
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
          .quick-tender-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          
          .quick-tender-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
            opacity: 0;
            transition: all 0.4s ease;
            border-radius: 16px;
          }
          
          .quick-tender-card:hover::before {
            opacity: 1;
          }
          
          .quick-tender-card:hover {
            transform: translateY(-8px) scale(1.03);
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.25);
          }
          
          .quick-tender-card.selected {
            transform: scale(1.05);
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(59, 130, 246, 0.6);
            box-shadow: 0 16px 40px rgba(59, 130, 246, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.4);
          }
          
          .quick-tender-icon-wrapper {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          
          .quick-tender-card:hover .quick-tender-icon-wrapper {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.15) rotate(5deg);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }
          
          .quick-tender-stats-badge {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }
          
          .quick-tender-card:hover .quick-tender-stats-badge {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
            transform: scale(1.05);
          }
          
          .quick-tender-text {
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }
          
          .quick-tender-text-secondary {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }
          
          @keyframes gentle-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
          }
          
          .quick-tender-card:nth-child(odd) {
            animation: gentle-float 6s ease-in-out infinite;
          }
          
          .quick-tender-card:nth-child(even) {
            animation: gentle-float 6s ease-in-out infinite reverse;
          }
        `}
      </style>
      
      {/* Cards grid without wrapper card */}
      <div className="mb-6">
        <Row gutter={[16, 16]}>
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
                  <div>
                    <div className="font-semibold mb-2">{tender.title}</div>
                    <div className="text-xs mb-1 text-gray-300">Заказчик: {tender.client_name || 'Не указан'}</div>
                    {tender.area_sp && (
                      <div className="text-xs mb-1 text-gray-300">Площадь СП: {formatQuantity(tender.area_sp, 0)} м²</div>
                    )}
                    {tender.area_client && (
                      <div className="text-xs mb-1 text-gray-300">Площадь заказчика: {formatQuantity(tender.area_client, 0)} м²</div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Создан: {dayjs(tender.created_at).format('DD.MM.YYYY')}
                    </div>
                    {hasDeadline && (
                      <div className="text-xs text-gray-400">
                        {daysToDeadline && daysToDeadline > 0 
                          ? `До срока: ${daysToDeadline} дн.` 
                          : 'Срок истек'}
                      </div>
                    )}
                  </div>
                }
                placement="top"
              >
                <div
                  className={`quick-tender-card ${isSelected ? 'selected' : ''} relative z-10`}
                  onClick={() => handleTenderClick(tender)}
                >
                  {/* Priority Badge */}
                  {index < 3 && (
                    <Badge 
                      count={index === 0 ? "🔥" : index === 1 ? "⭐" : "📈"} 
                      style={{ 
                        position: 'absolute', 
                        top: -2, 
                        right: -2, 
                        zIndex: 2 
                      }} 
                    />
                  )}
                  
                  {/* Deadline Warning */}
                  {hasDeadline && daysToDeadline !== null && daysToDeadline <= 7 && daysToDeadline > 0 && (
                    <Badge 
                      count="⚡" 
                      style={{ 
                        position: 'absolute', 
                        top: -2, 
                        left: -2, 
                        zIndex: 2 
                      }} 
                      title={`Осталось ${daysToDeadline} дней до срока`}
                    />
                  )}
                  
                  <div className="p-4 text-center relative z-10">
                    {/* Icon */}
                    <div className="quick-tender-icon-wrapper w-16 h-16 mb-4">
                      <Icon style={{ fontSize: 26, color: '#ffffff' }} />
                    </div>
                    
                    {/* Title */}
                    <div className="mb-3">
                      <Text 
                        className="quick-tender-text text-sm font-bold leading-tight block text-white" 
                        style={{ 
                          height: '34px', 
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        }}
                      >
                        {tender.title}
                      </Text>
                    </div>
                    
                    {/* Client */}
                    <div className="mb-3">
                      <Text 
                        className="quick-tender-text-secondary text-xs text-white opacity-80 leading-tight block" 
                        style={{ 
                          height: '16px', 
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {tender.client_name || 'Заказчик не указан'}
                      </Text>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        {tender.area_sp ? (
                          <Text className="quick-tender-text-secondary text-xs text-white opacity-70">
                            {formatQuantity(tender.area_sp, 0)} м²
                          </Text>
                        ) : (
                          <Text className="quick-tender-text-secondary text-xs text-white opacity-50">—</Text>
                        )}
                      </div>
                      <div 
                        className="quick-tender-stats-badge px-3 py-1 rounded-full text-white font-bold text-xs"
                      >
                        v{tender.version || 1}
                      </div>
                    </div>
                  </div>
                </div>
              </Tooltip>
            </Col>
          );
        })}
        </Row>
        
        {/* Optional counter text */}
        <div className="text-center mt-4">
          <Text className="text-xs text-white opacity-60 quick-tender-text-secondary">
            {prioritizedTenders.length} из {tenders.length} актуальных тендеров
          </Text>
        </div>
      </div>
    </>
  );
};

export default QuickTenderSelector;