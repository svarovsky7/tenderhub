import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin } from 'antd';
import {
  HomeOutlined,
  DashboardOutlined,
  TableOutlined,
  ShopOutlined,
  BookOutlined,
  DollarOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { tendersApi } from '../lib/supabase/api/tenders';

const { Title, Text } = Typography;

interface MenuCard {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [exchangeRates, setExchangeRates] = useState<{ usd?: number; eur?: number; cny?: number } | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Load exchange rates from the latest tender
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        setRatesLoading(true);
        const tenders = await tendersApi.getAll();

        // Find the most recent tender with exchange rates
        if (tenders && tenders.length > 0) {
          const latestTender = tenders.find(t => t.usd_rate || t.eur_rate || t.cny_rate) || tenders[0];

          setExchangeRates({
            usd: latestTender.usd_rate ? Number(latestTender.usd_rate) : undefined,
            eur: latestTender.eur_rate ? Number(latestTender.eur_rate) : undefined,
            cny: latestTender.cny_rate ? Number(latestTender.cny_rate) : undefined,
          });
        }
      } catch (error) {
        console.error('❌ [HomePage] Failed to load exchange rates:', error);
      } finally {
        setRatesLoading(false);
      }
    };

    loadExchangeRates();
  }, []);

  const menuCards: MenuCard[] = [
    {
      key: 'dashboard',
      title: 'Дашборд',
      description: 'Обзор тендеров и основных показателей',
      icon: <DashboardOutlined style={{ fontSize: 48 }} />,
      path: '/dashboard',
      color: '#1890ff',
    },
    {
      key: 'boq',
      title: 'Позиции заказчика',
      description: 'Управление позициями и BOQ',
      icon: <TableOutlined style={{ fontSize: 48 }} />,
      path: '/boq',
      color: '#52c41a',
    },
    {
      key: 'commerce',
      title: 'Коммерция',
      description: 'Коммерческие расчеты и финансовые показатели',
      icon: <ShopOutlined style={{ fontSize: 48 }} />,
      path: '/commerce',
      color: '#722ed1',
    },
    {
      key: 'libraries',
      title: 'Библиотеки',
      description: 'Справочники материалов, работ и шаблонов',
      icon: <BookOutlined style={{ fontSize: 48 }} />,
      path: '/libraries',
      color: '#13c2c2',
    },
    {
      key: 'construction-costs',
      title: 'Затраты на строительство',
      description: 'Управление затратами и структурой стоимости',
      icon: <DollarOutlined style={{ fontSize: 48 }} />,
      path: '/construction-costs',
      color: '#fa8c16',
    },
    {
      key: 'admin',
      title: 'Администрирование',
      description: 'Системные настройки и справочники',
      icon: <SettingOutlined style={{ fontSize: 48 }} />,
      path: '/admin',
      color: '#eb2f96',
    },
    {
      key: 'users',
      title: 'Пользователи',
      description: 'Управление пользователями системы',
      icon: <UserOutlined style={{ fontSize: 48 }} />,
      path: '/admin/users',
      color: '#faad14',
    },
    {
      key: 'settings',
      title: 'Настройки',
      description: 'Настройки системы и профиля',
      icon: <SettingOutlined style={{ fontSize: 48 }} />,
      path: '/admin/settings',
      color: '#2f54eb',
    },
  ];

  return (
    <>
      <style>
        {`
          .home-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 48px 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .home-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .home-page-header::before {
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

          .home-menu-card {
            height: 100%;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 12px;
            overflow: hidden;
          }
          .home-menu-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          }
          .home-menu-card .ant-card-body {
            padding: 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
          }
          .home-menu-card-icon {
            width: 80px;
            height: 80px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }
          .home-menu-card:hover .home-menu-card-icon {
            transform: scale(1.1);
          }
        `}
      </style>
      <div className="w-full min-h-full bg-gray-50">
        <div className="p-6">
          {/* Beautiful Gradient Header */}
          <div className={`home-page-header ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="relative z-10 text-center">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <HomeOutlined style={{ fontSize: 40, color: 'white' }} />
                </div>
                <div>
                  <Title level={1} style={{ margin: 0, color: 'white', fontSize: 36 }}>
                    Добро пожаловать в TenderHub
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, marginTop: 8, display: 'block' }}>
                    Система управления тендерами и строительными расчетами
                  </Text>

                  {/* Exchange Rates */}
                  {ratesLoading ? (
                    <div className="mt-4">
                      <Spin size="small" />
                    </div>
                  ) : exchangeRates && (
                    <div className="mt-4 flex items-center justify-center gap-6 flex-wrap">
                      {exchangeRates.usd && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>USD:</span>
                          <span style={{ color: '#4ade80', fontSize: 18, fontWeight: 600 }}>
                            {exchangeRates.usd.toFixed(2)} ₽
                          </span>
                        </div>
                      )}
                      {exchangeRates.eur && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>EUR:</span>
                          <span style={{ color: '#60a5fa', fontSize: 18, fontWeight: 600 }}>
                            {exchangeRates.eur.toFixed(2)} ₽
                          </span>
                        </div>
                      )}
                      {exchangeRates.cny && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>CNY:</span>
                          <span style={{ color: '#fb923c', fontSize: 18, fontWeight: 600 }}>
                            {exchangeRates.cny.toFixed(2)} ₽
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Cards */}
          <div className="max-w-none">
            <Row gutter={[24, 24]}>
              {menuCards.map((card) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={card.key}>
                  <Card
                    className="home-menu-card"
                    onClick={() => navigate(card.path)}
                    hoverable
                    style={{
                      background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
                      borderColor: theme === 'dark' ? '#434343' : '#d9d9d9',
                    }}
                  >
                    <div
                      className="home-menu-card-icon"
                      style={{
                        background: `linear-gradient(135deg, ${card.color}15, ${card.color}25)`,
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <Title
                        level={4}
                        style={{
                          margin: '0 0 8px 0',
                          color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                        }}
                      >
                        {card.title}
                      </Title>
                      <Text
                        style={{
                          color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
                        }}
                      >
                        {card.description}
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
