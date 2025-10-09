import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  message,
  Alert,
  Spin
} from 'antd';
import { SwapOutlined, InfoCircleOutlined } from '@ant-design/icons';
import QuickTenderSelector from '../components/common/QuickTenderSelector';
import CostRedistributionWizard from '../components/financial/CostRedistributionWizard';
import { tendersApi } from '../lib/supabase/api';
import type { Tender } from '../lib/supabase/types';

const { Title, Text } = Typography;

/**
 * Страница "Перекидка" - перераспределение коммерческих стоимостей работ
 * между категориями затрат
 */
const CostRedistributionPage: React.FC = () => {
  console.log('🚀 CostRedistributionPage rendered');

  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  // Load tenders on mount
  useEffect(() => {
    const loadTenders = async () => {
      console.log('📡 Loading tenders for redistribution...');
      setTendersLoading(true);
      try {
        const result = await tendersApi.getAll({ includeVersions: true });
        if (result.error) {
          console.error('❌ Failed to load tenders:', result.error);
          message.error('Ошибка загрузки тендеров');
          return;
        }
        console.log('✅ Tenders loaded:', result.data?.length);
        setTenders(result.data || []);
      } catch (error) {
        console.error('💥 Exception loading tenders:', error);
        message.error('Ошибка загрузки тендеров');
      } finally {
        setTendersLoading(false);
      }
    };

    loadTenders();
  }, []);

  const handleTenderSelect = useCallback((tender: Tender) => {
    console.log('📋 Tender selected for redistribution:', tender.id, tender.title);
    setSelectedTender(tender);
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SwapOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            <Title level={2} style={{ margin: 0 }}>
              Перекидка коммерческих стоимостей
            </Title>
          </div>

          <Alert
            icon={<InfoCircleOutlined />}
            message="Функция перераспределения работ"
            description={
              <Space direction="vertical" size="small">
                <Text>
                  Перераспределение позволяет вычесть процент от коммерческой стоимости работ
                  из выбранных категорий затрат и пропорционально распределить эту сумму
                  на другие категории.
                </Text>
                <Text type="secondary">
                  • Выберите тендер для начала работы
                </Text>
                <Text type="secondary">
                  • Укажите исходные категории и проценты вычитания
                </Text>
                <Text type="secondary">
                  • Выберите целевые категории для распределения
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* Tender Selection */}
      <Card
        title="1. Выбор тендера"
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Text>Выберите тендер для перераспределения коммерческих стоимостей:</Text>

          {tendersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" tip="Загрузка тендеров..." />
            </div>
          ) : (
            <QuickTenderSelector
              tenders={tenders}
              loading={tendersLoading}
              onTenderSelect={handleTenderSelect}
              selectedTenderId={selectedTender?.id || null}
            />
          )}

          {selectedTender && (
            <Alert
              message={`Выбран тендер: ${selectedTender.title}`}
              description={
                <Space direction="vertical">
                  <Text type="secondary">Заказчик: {selectedTender.client_name}</Text>
                  <Text type="secondary">Версия: {selectedTender.version || 1}</Text>
                </Space>
              }
              type="success"
              showIcon
              closable
              onClose={() => setSelectedTender(null)}
            />
          )}
        </Space>
      </Card>

      {/* Wizard */}
      {selectedTender && (
        <div>
          <Title level={4} style={{ marginBottom: 16 }}>
            2. Перераспределение стоимостей
          </Title>

          <CostRedistributionWizard
            tenderId={selectedTender.id}
            tenderTitle={selectedTender.title}
            onComplete={() => {
              message.success('Перераспределение успешно создано!');
              setSelectedTender(null);
            }}
            onCancel={() => {
              setSelectedTender(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CostRedistributionPage;
