import React, { useState } from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { CostCascadeSelector } from '../../components/common';

const { Title, Text } = Typography;

const TestCostSearchAuto: React.FC = () => {
  const [selectedCost1, setSelectedCost1] = useState<{
    id: string | null;
    displayName: string;
  }>({ id: null, displayName: '' });
  
  const [selectedCost2, setSelectedCost2] = useState<{
    id: string | null;
    displayName: string;
  }>({ id: null, displayName: '' });
  
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={3}>Тестирование автоматического переключения режимов поиска</Title>
        
        <Divider />
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Автоматическое переключение режимов</Title>
            <Text type="secondary">
              Начните вводить текст для поиска или выберите из каскадного списка.
              При вводе текста автоматически включается поиск, при очистке - возвращается каскадный выбор.
            </Text>
            <div style={{ marginTop: '16px', maxWidth: '500px' }}>
              <CostCascadeSelector
                value={selectedCost1.id}
                onChange={(id, displayName) => {
                  console.log('Selected:', { id, displayName });
                  setSelectedCost1({ id, displayName });
                }}
                placeholder="Введите для поиска или выберите из списка"
              />
            </div>
            {selectedCost1.id && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <Text strong>Выбрано:</Text>
                <br />
                <Text code>ID: {selectedCost1.id}</Text>
                <br />
                <Text>{selectedCost1.displayName}</Text>
              </div>
            )}
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>Второй экземпляр для проверки независимости</Title>
            <Text type="secondary">
              Два компонента работают независимо друг от друга
            </Text>
            <div style={{ marginTop: '16px', maxWidth: '500px' }}>
              <CostCascadeSelector
                value={selectedCost2.id}
                onChange={(id, displayName) => {
                  console.log('Selected 2:', { id, displayName });
                  setSelectedCost2({ id, displayName });
                }}
                placeholder="Начните вводить или выберите"
              />
            </div>
            {selectedCost2.id && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
                <Text strong>Выбрано:</Text>
                <br />
                <Text code>ID: {selectedCost2.id}</Text>
                <br />
                <Text>{selectedCost2.displayName}</Text>
              </div>
            )}
          </div>
          
          <Divider />
          
          <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
            <Title level={5}>Как это работает:</Title>
            <ul>
              <li>Кликните на поле и начните вводить - автоматически включится поиск</li>
              <li>Минимум 1 символ для начала поиска</li>
              <li>Очистите поле (крестик или Backspace) - вернется каскадный выбор</li>
              <li>В каскадном режиме поле поиска остается видимым для быстрого переключения</li>
              <li>Можно переключаться между режимами без потери контекста</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default TestCostSearchAuto;