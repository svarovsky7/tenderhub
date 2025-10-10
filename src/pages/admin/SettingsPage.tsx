import React from 'react';
import { Card, Typography, Avatar, Flex } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';

const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="w-full min-h-full" style={{ background: theme === 'dark' ? '#141414' : '#f5f5f5' }}>
      <style>
        {`
          .settings-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .settings-page-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .settings-page-header::before {
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
        `}
      </style>

      <div className="p-6">
        {/* Gradient Header */}
        <div className={`settings-page-header ${theme === 'dark' ? 'dark' : ''}`}>
          <Flex align="center" gap={16}>
            <Avatar
              size={64}
              icon={<SettingOutlined />}
              style={{ background: 'rgba(255,255,255,0.2)' }}
            />
            <div>
              <Title level={2} style={{ margin: 0, color: 'white' }}>
                Настройки системы
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                Конфигурация и управление параметрами системы
              </Text>
            </div>
          </Flex>
        </div>

        {/* Main Content */}
        <Card style={{
          background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
          borderColor: theme === 'dark' ? '#424242' : '#f0f0f0'
        }}>
          <p style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' }}>
            Страница настроек системы будет реализована в следующих версиях.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;