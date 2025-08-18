import React, { useState } from 'react';
import { Card, Space, Typography, Alert } from 'antd';
import { CostCascadeSelector } from '../../components/common';

const { Title, Text } = Typography;

const CostSelectorTest: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState<string>('');

  const handleChange = (value: string | null, display: string) => {
    console.log('🔧 Cost selector changed:', { value, display });
    setSelectedValue(value);
    setDisplayValue(display);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>Тест каскадного селектора категорий затрат</Title>
      
      <Space direction="vertical" size="large" className="w-full">
        <Alert
          message="Инструкция"
          description="Эта страница для тестирования каскадного селектора категорий затрат. Если селектор не загружается, проверьте консоль браузера на ошибки."
          type="info"
          showIcon
        />
        
        <Card title="Каскадный селектор">
          <Space direction="vertical" size="middle" className="w-full">
            <div>
              <Text strong>Выберите категорию затрат:</Text>
            </div>
            
            <CostCascadeSelector
              placeholder="Выберите категорию затрат"
              onChange={handleChange}
              style={{ width: '100%' }}
            />
            
            <div>
              <Text strong>Выбранное значение:</Text>
              <div>ID: {selectedValue || 'не выбрано'}</div>
              <div>Отображение: {displayValue || 'не задано'}</div>
            </div>
          </Space>
        </Card>
        
        <Alert
          message="Отладка"
          description="Откройте консоль браузера (F12) чтобы увидеть логи загрузки данных и ошибки."
          type="warning"
          showIcon
        />
      </Space>
    </div>
  );
};

export default CostSelectorTest;