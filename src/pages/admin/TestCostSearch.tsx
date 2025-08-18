import React, { useState } from 'react';
import { Card, Typography, Space, Button, Divider, message } from 'antd';
import { CostCascadeSelector } from '../../components/common';
import { searchCostNodes } from '../../lib/supabase/api/cost-nodes';

const { Title, Text } = Typography;

const TestCostSearch: React.FC = () => {
  const [selectedCost, setSelectedCost] = useState<{
    id: string | null;
    displayName: string;
  }>({ id: null, displayName: '' });
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const handleTestSearch = async () => {
    console.log('🚀 Testing direct search API');
    const testTerms = ['бетон', 'арматур', 'штукатур', 'москва'];
    
    for (const term of testTerms) {
      console.log(`🔍 Searching for: ${term}`);
      const { data, error } = await searchCostNodes(term);
      
      if (error) {
        console.error('❌ Search error:', error);
        message.error(`Ошибка поиска для "${term}"`);
      } else {
        console.log(`✅ Found ${data?.length || 0} results for "${term}"`);
        if (data && data.length > 0) {
          console.log('First result:', data[0]);
        }
      }
    }
    
    // Show results for last term
    const { data } = await searchCostNodes('москва');
    setSearchResults(data || []);
  };
  
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={3}>Тестирование поиска категорий затрат</Title>
        
        <Divider />
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>1. Компонент с режимом поиска (allowSearch=true)</Title>
            <Text type="secondary">
              Используйте переключатель в выпадающем меню для смены режима между каскадным выбором и поиском
            </Text>
            <div style={{ marginTop: '16px', maxWidth: '500px' }}>
              <CostCascadeSelector
                value={selectedCost.id}
                onChange={(id, displayName) => {
                  console.log('Selected:', { id, displayName });
                  setSelectedCost({ id, displayName });
                  message.success(`Выбрано: ${displayName}`);
                }}
                placeholder="Выберите или найдите категорию затрат"
                allowSearch={true}
              />
            </div>
            {selectedCost.id && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Выбрано:</Text>
                <br />
                <Text code>ID: {selectedCost.id}</Text>
                <br />
                <Text>{selectedCost.displayName}</Text>
              </div>
            )}
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>2. Прямой тест API поиска</Title>
            <Button type="primary" onClick={handleTestSearch}>
              Протестировать поиск
            </Button>
            
            {searchResults.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Результаты поиска для "москва":</Text>
                <ul>
                  {searchResults.slice(0, 10).map((result, idx) => (
                    <li key={idx}>
                      <Text code>{result.detail_name}</Text> - {result.display_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <Divider />
          
          <div>
            <Title level={5}>3. Компонент без поиска (allowSearch=false)</Title>
            <Text type="secondary">
              Только каскадный выбор, без возможности поиска
            </Text>
            <div style={{ marginTop: '16px', maxWidth: '500px' }}>
              <CostCascadeSelector
                placeholder="Только каскадный выбор"
                allowSearch={false}
              />
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default TestCostSearch;