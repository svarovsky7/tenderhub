import React, { useState, useCallback } from 'react';
import { Button, Typography, ConfigProvider, message, Input } from 'antd';
import {
  PlusOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  FileTextOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TemplateList from '../components/template/TemplateList';
import InlineAddTemplateToBOQ from '../components/template/InlineAddTemplateToBOQ';
import EnhancedInlineTemplateForm from '../components/template/EnhancedInlineTemplateForm';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text } = Typography;

const WorkMaterialsPage: React.FC = () => {
  console.log('🚀 WorkMaterialsPage загружена (с inline формой вместо модального окна)');

  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [showTemplatesContent, setShowTemplatesContent] = useState(false);
  const [selectedTemplateForBOQ, setSelectedTemplateForBOQ] = useState<{ name: string; note?: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddToTemplate = (templateName: string, templateNote?: string) => {
    console.log('🚀 Adding template to BOQ:', templateName, 'Note:', templateNote);
    setSelectedTemplateForBOQ({ name: templateName, note: templateNote });
  };

  const handleTemplateCreated = () => {
    console.log('✅ Template created successfully');
    setShowCreateTemplateForm(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing templates list');
    setLoading(true);
    message.loading('Обновление данных...', 0.5);

    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setLoading(false);
      message.success('Данные обновлены');
      console.log('✅ Refresh completed');
    }, 500);
  }, []);

  return (
    <>
      <style>
        {`
          .work-materials-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .work-materials-header.dark {
            background: linear-gradient(135deg, #1e293b 0%, #064e3b 50%, #134e4a 100%);
          }
          .work-materials-header::before {
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
          .wm-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .wm-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .wm-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .wm-search-input,
          .wm-search-input .ant-input-affix-wrapper,
          .wm-search-input .ant-input {
            background: ${theme === 'dark' ? '#141414' : 'transparent'} !important;
          }
          .wm-search-input input {
            background: transparent !important;
            color: white !important;
          }
          .wm-search-input input::placeholder {
            color: rgba(255, 255, 255, 0.6) !important;
          }
          .wm-search-input .ant-input-prefix {
            color: rgba(255, 255, 255, 0.8) !important;
          }
          .wm-search-input .ant-input-clear-icon {
            color: rgba(255, 255, 255, 0.8) !important;
          }
          .wm-search-input:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
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
            <div className={`work-materials-header ${theme === 'dark' ? 'dark' : ''}`}>
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <AppstoreOutlined style={{ fontSize: 32, color: 'white' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                      Управление работами и материалами
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                      Создавайте и управляйте шаблонами связей работ с материалами для быстрого добавления в BOQ
                    </Text>
                  </div>
                </div>
                <div className="wm-action-buttons">
                  <Input
                    placeholder="Поиск по наименованию"
                    prefix={<SearchOutlined />}
                    allowClear
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="wm-search-input"
                    style={{
                      width: 280,
                      height: 42,
                      borderRadius: 8,
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontSize: 15
                    }}
                  />
                  <Button
                    className="wm-action-btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 500
                    }}
                    size="large"
                    icon={<FileTextOutlined />}
                    onClick={() => navigate('/boq')}
                  >
                    К смете
                  </Button>
                  <Button
                    className="wm-action-btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 500
                    }}
                    size="large"
                    icon={showTemplatesContent ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => {
                      console.log('🔄 Toggling templates content visibility');
                      setShowTemplatesContent(!showTemplatesContent);
                    }}
                  >
                    {showTemplatesContent ? 'Свернуть шаблоны' : 'Развернуть шаблоны'}
                  </Button>
                  <Button
                    className="wm-action-btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 500
                    }}
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={loading}
                  >
                    Обновить
                  </Button>
                  <Button
                    className="wm-action-btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#1890ff',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 600
                    }}
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      console.log('🚀 Create template button clicked');
                      setShowCreateTemplateForm(!showCreateTemplateForm);
                    }}
                  >
                    {showCreateTemplateForm ? 'Скрыть форму' : 'Создать шаблон'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Enhanced inline форма создания шаблона */}
            {showCreateTemplateForm && (
              <EnhancedInlineTemplateForm
                onCancel={() => setShowCreateTemplateForm(false)}
                onSuccess={handleTemplateCreated}
              />
            )}

            {/* Inline форма добавления шаблона в BOQ */}
            {selectedTemplateForBOQ && (
              <InlineAddTemplateToBOQ
                templateName={selectedTemplateForBOQ.name}
                templateNote={selectedTemplateForBOQ.note}
                onSuccess={() => {
                  setSelectedTemplateForBOQ(null);
                  message.success('Шаблон успешно добавлен в BOQ');
                }}
                onCancel={() => setSelectedTemplateForBOQ(null)}
              />
            )}

            {/* Список шаблонов */}
            <TemplateList
              key={refreshKey}
              onAddToTemplate={handleAddToTemplate}
              showContent={showTemplatesContent}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </ConfigProvider>
    </>
  );
};

export default WorkMaterialsPage;