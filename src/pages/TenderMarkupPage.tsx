import React, { useState } from 'react';
import { Tabs, Card, Space, Typography, Button, Select, Spin, Alert } from 'antd';
import { CalculatorOutlined, FileTextOutlined, DashboardOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTenders } from '../lib/supabase/api/tenders';
import { getTenderBOQSummary } from '../lib/supabase/api/boq/analytics';
import { TenderMarkupManager } from '../components/tender/TenderMarkupManager';
import { MarkupTemplatesManager } from '../components/tender/MarkupTemplatesManager';

const { Title } = Typography;
const { TabPane } = Tabs;

export const TenderMarkupPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenderId: routeTenderId } = useParams<{ tenderId?: string }>();
  const [selectedTenderId, setSelectedTenderId] = useState<string | undefined>(routeTenderId);
  const [activeTab, setActiveTab] = useState('tender');

  // Query for tenders list
  const { data: tenders = [], isLoading: isLoadingTenders } = useQuery({
    queryKey: ['tenders'],
    queryFn: getTenders
  });

  // Query for selected tender details
  const { data: selectedTender } = useQuery({
    queryKey: ['tender', selectedTenderId],
    queryFn: () => tenders.find(t => t.id === selectedTenderId),
    enabled: !!selectedTenderId && tenders.length > 0
  });

  // Query for BOQ summary to get base costs
  const { data: boqSummary, isLoading: isLoadingBOQ } = useQuery({
    queryKey: ['boqSummary', selectedTenderId],
    queryFn: () => getTenderBOQSummary(selectedTenderId!),
    enabled: !!selectedTenderId
  });

  const baseCosts = boqSummary ? {
    materials: boqSummary.totalMaterialsCost || 0,
    works: boqSummary.totalWorksCost || 0,
    submaterials: boqSummary.totalSubmaterialsCost || 0,
    subworks: boqSummary.totalSubworksCost || 0
  } : {
    materials: 0,
    works: 0,
    submaterials: 0,
    subworks: 0
  };

  const handleTenderChange = (tenderId: string) => {
    setSelectedTenderId(tenderId);
    // Update URL if needed
    if (routeTenderId) {
      navigate(`/tender-markup/${tenderId}`);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <div className="mb-6">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div className="flex justify-between items-center">
              <Space>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/tenders')}
                >
                  К списку тендеров
                </Button>
                <Title level={3} className="mb-0">
                  <CalculatorOutlined className="mr-2" />
                  Управление накрутками и шаблонами
                </Title>
              </Space>
              
              {activeTab === 'tender' && (
                <Select
                  placeholder="Выберите тендер"
                  style={{ width: 400 }}
                  value={selectedTenderId}
                  onChange={handleTenderChange}
                  loading={isLoadingTenders}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={tenders.map(tender => ({
                    label: `${tender.name} (${tender.tender_number || 'Без номера'})`,
                    value: tender.id,
                    description: tender.description
                  }))}
                />
              )}
            </div>

            {selectedTender && activeTab === 'tender' && (
              <Alert
                message="Информация о тендере"
                description={
                  <Space direction="vertical" size="small">
                    <div>
                      <strong>Название:</strong> {selectedTender.name}
                    </div>
                    {selectedTender.tender_number && (
                      <div>
                        <strong>Номер:</strong> {selectedTender.tender_number}
                      </div>
                    )}
                    {selectedTender.description && (
                      <div>
                        <strong>Описание:</strong> {selectedTender.description}
                      </div>
                    )}
                    <div>
                      <strong>Базовые затраты:</strong>
                      <ul className="ml-4 mt-1">
                        <li>Материалы: {baseCosts.materials.toLocaleString('ru-RU')} ₽</li>
                        <li>Работы: {baseCosts.works.toLocaleString('ru-RU')} ₽</li>
                        <li>Субматериалы: {baseCosts.submaterials.toLocaleString('ru-RU')} ₽</li>
                        <li>Субработы: {baseCosts.subworks.toLocaleString('ru-RU')} ₽</li>
                      </ul>
                    </div>
                  </Space>
                }
                type="info"
                showIcon
              />
            )}
          </Space>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane
            tab={
              <span>
                <DashboardOutlined />
                Накрутки тендера
              </span>
            }
            key="tender"
          >
            {selectedTenderId ? (
              isLoadingBOQ ? (
                <div className="text-center py-12">
                  <Spin size="large" tip="Загрузка данных тендера..." />
                </div>
              ) : (
                <TenderMarkupManager
                  tenderId={selectedTenderId}
                  tenderName={selectedTender?.name}
                  baseCosts={baseCosts}
                />
              )
            ) : (
              <Alert
                message="Выберите тендер"
                description="Пожалуйста, выберите тендер из списка выше для управления его накрутками"
                type="warning"
                showIcon
                className="mt-4"
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Шаблоны накруток
              </span>
            }
            key="templates"
          >
            <MarkupTemplatesManager />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};