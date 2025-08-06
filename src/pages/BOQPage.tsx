import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Select,
  message,
  Empty,
  List
} from 'antd';
import {
  FileTextOutlined,
  ReloadOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TenderBOQManager from '../components/tender/TenderBOQManager';
import { tendersApi } from '../lib/supabase/api';
import type { Tender } from '../lib/supabase/types';
import type { TenderExcelItem } from './TendersPage/types';

const { Title, Text } = Typography;
const { Option } = Select;

const BOQPage: React.FC = () => {
  console.log('🚀 BOQPage component rendered');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [excelItems, setExcelItems] = useState<TenderExcelItem[]>([]);

  // Load all tenders for selection
  const loadTenders = useCallback(async () => {
    console.log('📡 Loading tenders list...');
    setTendersLoading(true);
    try {
      const result = await tendersApi.getAll();
      console.log('📦 Tenders API response:', result);
      
      if (result.error) {
        console.error('❌ Failed to load tenders:', result.error);
        message.error('Ошибка загрузки тендеров');
        return;
      }
      
      console.log('✅ Tenders loaded:', result.data?.length);
      setTenders(result.data || []);
      
      // Check for tender parameter in URL
      const tenderParam = searchParams.get('tender');
      if (tenderParam && result.data?.find(t => t.id === tenderParam)) {
        console.log('🎯 Auto-selecting tender from URL parameter:', tenderParam);
        setSelectedTenderId(tenderParam);
      } else if (result.data && result.data.length > 0 && !selectedTenderId) {
        console.log('🎯 Auto-selecting first tender:', result.data[0].id);
        setSelectedTenderId(result.data[0].id);
      }
    } catch (error) {
      console.error('💥 Exception loading tenders:', error);
      message.error('Ошибка загрузки тендеров');
    } finally {
      setTendersLoading(false);
    }
  }, [selectedTenderId, searchParams]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  useEffect(() => {
    console.log('📥 Loading Excel items from localStorage');
    try {
      const stored = localStorage.getItem('excelItems');
      if (stored) {
        const parsed = JSON.parse(stored) as TenderExcelItem[];
        console.log('✅ Excel items loaded:', parsed.length);
        setExcelItems(prev => {
          console.log('🔄 Excel items state updated:', {
            oldCount: prev.length,
            newCount: parsed.length
          });
          return parsed;
        });
      } else {
        console.log('ℹ️ No Excel items found in storage');
      }
    } catch (error) {
      console.error('💥 Error reading Excel items from storage:', error);
    }
  }, []);

  const handleTenderChange = useCallback((tenderId: string) => {
    console.log('🔄 Tender selection changed:', tenderId);
    setSelectedTenderId(tenderId);
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing BOQ data...');
    setLoading(true);
    // The TenderBOQManager will handle its own refresh
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleNavigateToTender = useCallback(() => {
    if (selectedTenderId) {
      console.log('🚀 Navigating to tender details:', selectedTenderId);
      navigate(`/tender/${selectedTenderId}/boq`);
    }
  }, [selectedTenderId, navigate]);

  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Title level={2} className="mb-2">
                <FileTextOutlined className="mr-2" />
                Управление позициями заказчика
              </Title>
              <Text type="secondary">
                Создавайте и управляйте позициями заказчика и элементами BOQ для всех тендеров
              </Text>
            </div>
            <Space>
              <Button 
                icon={<FolderOpenOutlined />}
                onClick={() => navigate('/tenders')}
                size="large"
              >
                К тендерам
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={loading}
                size="large"
              >
                Обновить
              </Button>
            </Space>
          </div>

          <div className="flex items-center gap-4">
            <Text strong>Выберите тендер:</Text>
            <Select
              value={selectedTenderId}
              onChange={handleTenderChange}
              style={{ width: 400 }}
              placeholder="Выберите тендер для управления BOQ"
              loading={tendersLoading}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
              size="large"
            >
              {tenders.map(tender => (
                <Option key={tender.id} value={tender.id}>
                  {tender.title} - {tender.client_name}
                </Option>
              ))}
            </Select>
            {selectedTenderId && (
              <Button 
                type="link"
                onClick={handleNavigateToTender}
              >
                Открыть страницу тендера →
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        {selectedTenderId ? (
          <TenderBOQManager
            tenderId={selectedTenderId}
            key={selectedTenderId} // Force remount when tender changes
          />
        ) : (
          <Card>
            <Empty
              image={<FileTextOutlined style={{ fontSize: 48, color: '#ccc' }} />}
              description={
                <div>
                  <Text type="secondary">
                    {tendersLoading ? 'Загрузка тендеров...' : 'Выберите тендер для управления позициями заказчика'}
                  </Text>
                </div>
              }
            />
          </Card>
        )}

        {excelItems.length > 0 && (
          <Card title="Импортированные наименования" className="mt-6">
            <List
              dataSource={excelItems}
              renderItem={(item) => (
                <List.Item>
                  <span
                    style={{ paddingLeft: `${(item.number.split('.').length - 1) * 16}px` }}
                  >
                    {item.number} {item.name}
                  </span>
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default BOQPage;