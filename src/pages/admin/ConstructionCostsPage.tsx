import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Table, message, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type {
  DetailCostWithRelations,
} from '../../lib/supabase/types';
import { costsApi } from '../../lib/supabase/api';

const { Title } = Typography;

const ConstructionCostsPage: React.FC = () => {
  const [details, setDetails] = useState<DetailCostWithRelations[]>([]);

  const loadData = async () => {
    console.log('🚀 [ConstructionCostsPage.loadData] called');
    const { data, error } = await costsApi.getAll();
    if (error) {
      console.error('❌ [ConstructionCostsPage.loadData] failed:', error);
      message.error(error);
      return;
    }
    setDetails(data || []);
    console.log('✅ [ConstructionCostsPage.loadData] completed');
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="w-full min-h-full bg-gray-50">
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
          <Title level={2}>Затраты на строительство</Title>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-none">
        <Card title="Импорт из Excel">
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={async file => {
              console.log('🚀 [ConstructionCostsPage.import] called with:', file.name);
              const { error } = await costsApi.importFromXlsx(file as File);
              if (error) {
                console.error('❌ [ConstructionCostsPage.import] failed:', error);
                message.error(error);
              } else {
                message.success('Импорт завершен');
                await loadData();
                console.log('✅ [ConstructionCostsPage.import] completed');
              }
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>Загрузить файл</Button>
          </Upload>
        </Card>
        <Card title="Детализация затрат">
          <Table
            dataSource={details}
            rowKey="id"
            columns={[
              { title: 'Категория', dataIndex: ['cost_categories', 'name'] },
              { title: 'Деталь', dataIndex: 'name' },
              {
                title: 'Стоимость',
                dataIndex: 'unit_cost',
                render: (value?: number | null) =>
                  value != null
                    ? value.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                      })
                    : '',
              },
              {
                title: 'Локация',
                render: (_: unknown, record: DetailCostWithRelations) => `${record.location?.country || ''} ${record.location?.city || ''}`,
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

export default ConstructionCostsPage;

