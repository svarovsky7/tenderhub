import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Space,
  Tag,
  Spin,
  Breadcrumb,
  Alert,
  Empty
} from 'antd';
import {
  EditOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import { tendersApi } from '../lib/supabase/api';
import { TenderBOQManager } from '../components/tender';
import type { Tender } from '../lib/supabase/types';

const { Title, Text, Paragraph } = Typography;

interface TenderDetailPageProps {
  // Support for both URL param and direct tender ID
  tenderId?: string;
}

const TenderDetailPage: React.FC<TenderDetailPageProps> = ({ tenderId: propTenderId }) => {
  const { tenderId: urlTenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const tenderId = propTenderId || urlTenderId!;

  // State Management
  const [tenderData, setTenderData] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data Loading
  const loadTenderData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await tendersApi.getById(tenderId);

      if (result.error) {
        throw new Error(result.error);
      }

      setTenderData(result.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tender data');
      console.error('Error loading tender data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenderId) {
      loadTenderData();
    }
  }, [tenderId]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" tip="Загрузка структуры тендера..." />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Ошибка загрузки"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadTenderData}>
              Повторить
            </Button>
          }
        />
      </div>
    );
  }

  // Empty State
  if (!tenderData) {
    return (
      <div className="p-6">
        <Empty description="Тендер не найден" />
      </div>
    );
  }


  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-none">
          <Breadcrumb className="mb-4">
            <Breadcrumb.Item>
              <Button 
                type="link" 
                onClick={() => navigate('/tenders')}
                className="p-0"
              >
                Тендеры
              </Button>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{tenderData.title}</Breadcrumb.Item>
          </Breadcrumb>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Title level={2} className="mb-2">
                <FileTextOutlined className="mr-2" />
                {tenderData.title}
              </Title>
              
              <div className="flex items-center gap-4 mb-4">
                <Tag color={tenderData.status === 'active' ? 'green' : 'default'}>
                  {tenderData.status}
                </Tag>
                <Text type="secondary">
                  <UserOutlined className="mr-1" />
                  {tenderData.client_name}
                </Text>
                <Text type="secondary">
                  №{tenderData.tender_number}
                </Text>
                {tenderData.submission_deadline && (
                  <Text type="secondary">
                    <CalendarOutlined className="mr-1" />
                    Подача до: {dayjs(tenderData.submission_deadline).format('DD.MM.YYYY')}
                  </Text>
                )}
              </div>

              {tenderData.description && (
                <Paragraph className="text-gray-600 max-w-3xl">
                  {tenderData.description}
                </Paragraph>
              )}
            </div>

            {/* Action Buttons */}
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadTenderData}>
                Обновить
              </Button>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/tenders/${tenderId}/edit`)}>
                Редактировать
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        <TenderBOQManager tenderId={tenderId} />
      </div>
    </div>
  );
};

export default TenderDetailPage;