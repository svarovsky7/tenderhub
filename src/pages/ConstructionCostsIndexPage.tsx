import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { DollarOutlined, FileTextOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text } = Typography;

interface MenuCard {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const ConstructionCostsIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const menuCards: MenuCard[] = [
    {
      key: 'tender-costs',
      title: 'Затраты тендера',
      description: 'Просмотр и управление затратами по выбранному тендеру',
      icon: <FileTextOutlined style={{ fontSize: 48 }} />,
      path: '/construction-costs/tender',
      color: '#1890ff',
    },
    {
      key: 'cost-management',
      title: 'Структура затрат',
      description: 'Управление категориями и структурой затрат на строительство',
      icon: <ToolOutlined style={{ fontSize: 48 }} />,
      path: '/construction-costs/management',
      color: '#52c41a',
    },
  ];

  return (
    <>
      <style>
        {`
          .construction-costs-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .construction-costs-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .construction-costs-page-header::before {
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

          .construction-costs-menu-card {
            height: 100%;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 12px;
            overflow: hidden;
          }
          .construction-costs-menu-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          }
          .construction-costs-menu-card .ant-card-body {
            padding: 32px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
          }
          .construction-costs-menu-card-icon {
            width: 80px;
            height: 80px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }
          .construction-costs-menu-card:hover .construction-costs-menu-card-icon {
            transform: scale(1.1);
          }
        `}
      </style>
      <div className="w-full min-h-full bg-gray-50">
        <div className="p-6">
          {/* Beautiful Gradient Header */}
          <div className={`construction-costs-page-header ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <DollarOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                    Затраты на строительство
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    Управление затратами и структурой стоимости строительства
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Cards */}
          <div className="max-w-none">
            <Row gutter={[24, 24]} justify="start">
              {menuCards.map((card) => (
                <Col xs={24} sm={12} lg={8} key={card.key}>
                  <Card
                    className="construction-costs-menu-card"
                    onClick={() => navigate(card.path)}
                    hoverable
                    style={{
                      background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
                      borderColor: theme === 'dark' ? '#434343' : '#d9d9d9',
                    }}
                  >
                    <div
                      className="construction-costs-menu-card-icon"
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

export default ConstructionCostsIndexPage;
