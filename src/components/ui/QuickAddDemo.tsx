import React, { useState } from 'react';
import { Card, Typography, Space, Button, Row, Col, Divider } from 'antd';
import { 
  EyeOutlined, 
  CodeOutlined, 
  ToolOutlined,
  BuildOutlined,
  RocketOutlined
} from '@ant-design/icons';
import EnhancedQuickAddCard from '../tender/EnhancedQuickAddCard';
import SuccessNotification from './SuccessNotification';

const { Title, Text, Paragraph } = Typography;

const QuickAddDemo: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<{type: string, name: string} | null>(null);

  const handleMockAdd = async (data: any) => {
    console.log('🎯 Demo: Adding item', data);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLastAddedItem({
      type: data.type === 'work' ? 'работа' : 'материал',
      name: data.description
    });
    setShowSuccess(true);
    
    // Mock success
    return Promise.resolve();
  };

  const features = [
    {
      icon: <RocketOutlined className="text-blue-500" />,
      title: 'Современный дизайн',
      description: 'Glass morphism эффекты, градиенты и плавные анимации'
    },
    {
      icon: <EyeOutlined className="text-purple-500" />,
      title: 'Умное автодополнение',
      description: 'Поиск с превью, популярность и категоризация'
    },
    {
      icon: <CodeOutlined className="text-green-500" />,
      title: 'Визуальная обратная связь',
      description: 'Прогресс-бары, анимации состояний и микроинтеракции'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Title level={1} className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Улучшенные карточки QuickAdd
          </Title>
          <Paragraph className="text-lg text-gray-600 mt-4">
            Современный интерфейс для быстрого добавления работ и материалов с улучшенным UX
          </Paragraph>
        </div>

        {/* Features */}
        <Row gutter={[24, 24]} className="mb-12">
          {features.map((feature, index) => (
            <Col xs={24} md={8} key={index}>
              <Card 
                className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                bodyStyle={{ padding: '32px' }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Text className="text-gray-600">{feature.description}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Divider>
          <span className="text-gray-600 font-semibold text-lg">
            Демонстрация компонентов
          </span>
        </Divider>

        {/* Demo Cards */}
        <Row gutter={[32, 32]} className="mb-12">
          <Col xs={24} xl={12}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <BuildOutlined className="text-2xl text-blue-600" />
                <Title level={3} className="!mb-0">Карточка добавления работ</Title>
              </div>
              <EnhancedQuickAddCard 
                type="work"
                onAdd={handleMockAdd}
              />
            </div>
          </Col>
          
          <Col xs={24} xl={12}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <ToolOutlined className="text-2xl text-green-600" />
                <Title level={3} className="!mb-0">Карточка добавления материалов</Title>
              </div>
              <EnhancedQuickAddCard 
                type="material"
                onAdd={handleMockAdd}
              />
            </div>
          </Col>
        </Row>

        {/* Key Improvements */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-purple-50">
          <Title level={2} className="text-center mb-8">Ключевые улучшения</Title>
          
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <div className="space-y-4">
                <Title level={4} className="text-blue-600">🎨 Дизайн</Title>
                <ul className="space-y-2">
                  <li>• Glass morphism эффекты с backdrop-filter</li>
                  <li>• Плавные переходы и микроанимации</li>
                  <li>• Адаптивный дизайн для всех устройств</li>
                  <li>• Поддержка accessibility и reduced motion</li>
                </ul>
                
                <Title level={4} className="text-purple-600">🚀 Производительность</Title>
                <ul className="space-y-2">
                  <li>• React.memo для предотвращения лишних рендеров</li>
                  <li>• useCallback для оптимизации обработчиков</li>
                  <li>• Debounced поиск (300ms)</li>
                  <li>• Lazy loading для автодополнения</li>
                </ul>
              </div>
            </Col>
            
            <Col xs={24} md={12}>
              <div className="space-y-4">
                <Title level={4} className="text-green-600">⚡ UX</Title>
                <ul className="space-y-2">
                  <li>• Умное автодополнение с превью</li>
                  <li>• Реальное время подсчета стоимости</li>
                  <li>• Прогресс-индикаторы при отправке</li>
                  <li>• Анимированные состояния успеха/ошибки</li>
                </ul>
                
                <Title level={4} className="text-orange-600">🛠 Функциональность</Title>
                <ul className="space-y-2">
                  <li>• Интеграция с существующими API</li>
                  <li>• Валидация форм с красивыми ошибками</li>
                  <li>• Tooltips с дополнительной информацией</li>
                  <li>• Поддержка коэффициентов для материалов</li>
                </ul>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Demo Controls */}
        <div className="text-center mt-12">
          <Space size="large">
            <Button 
              type="primary" 
              size="large"
              onClick={() => {
                setLastAddedItem({ type: 'тест', name: 'Демо элемент' });
                setShowSuccess(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 border-0"
            >
              Показать уведомление об успехе
            </Button>
            <Button 
              size="large"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Наверх
            </Button>
          </Space>
        </div>
      </div>

      {/* Success Notification */}
      <SuccessNotification
        visible={showSuccess}
        title={lastAddedItem ? `${lastAddedItem.type} добавлен${lastAddedItem.type === 'работа' ? 'а' : ''}!` : 'Успешно!'}
        description={lastAddedItem ? `"${lastAddedItem.name}" был${lastAddedItem.type === 'работа' ? 'а' : ''} успешно добавлен${lastAddedItem.type === 'работа' ? 'а' : ''} в BOQ` : undefined}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default QuickAddDemo;