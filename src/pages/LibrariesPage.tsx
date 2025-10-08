import React, { useState } from 'react';
import { Typography, ConfigProvider, Tabs } from 'antd';
import { BookOutlined, InboxOutlined, ToolOutlined } from '@ant-design/icons';
import MaterialsPage from './MaterialsPage';
import WorksPage from './WorksPage';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text } = Typography;

const LibrariesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('materials');
  const { theme } = useTheme();

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
        <style>
          {`
            .libraries-header {
              background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
              border-radius: 16px;
              margin-bottom: 12px;
              padding: 32px;
              color: white;
              position: relative;
              overflow: hidden;
            }
            .libraries-header.dark {
              background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
            }
            .libraries-header::before {
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

            .libraries-tabs .ant-tabs-tab {
              font-size: 16px !important;
              font-weight: 500 !important;
              padding: 12px 24px !important;
              margin: 0 8px !important;
            }

            .libraries-tabs .ant-tabs-tab-active {
              background: linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%) !important;
              border-radius: 8px 8px 0 0 !important;
            }

            .libraries-tabs .ant-tabs-tab:hover {
              background: rgba(30, 58, 138, 0.05) !important;
              border-radius: 8px 8px 0 0 !important;
            }

            .libraries-tabs .ant-tabs-ink-bar {
              background: linear-gradient(90deg, #1e3a8a 0%, #059669 50%, #0d9488 100%) !important;
              height: 3px !important;
            }
          `}
        </style>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className={`libraries-header ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <BookOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                    Справочник
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    Управление материалами и работами
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="p-6 pt-0 max-w-none">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            className="libraries-tabs"
            items={[
              {
                key: 'materials',
                label: (
                  <span>
                    <InboxOutlined style={{ marginRight: 8 }} />
                    Материалы
                  </span>
                ),
                children: (
                  <div>
                    <MaterialsPage />
                  </div>
                ),
              },
              {
                key: 'works',
                label: (
                  <span>
                    <ToolOutlined style={{ marginRight: 8 }} />
                    Работы
                  </span>
                ),
                children: (
                  <div>
                    <WorksPage />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default LibrariesPage;
