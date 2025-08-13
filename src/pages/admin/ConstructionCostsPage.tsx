import React, { useEffect, useState } from 'react';
import { Card, Typography, Form, Input, Button, Table, Select, InputNumber, message } from 'antd';
import type {
  CostCategory,
  Location,
  DetailCostWithRelations,
  CostCategoryInsert,
  LocationInsert,
  DetailCostCategoryInsert,
} from '../../lib/supabase/types';
import { costsApi } from '../../lib/supabase/api';
import CostExcelUpload from './components/CostExcelUpload';

const { Title } = Typography;

const ConstructionCostsPage: React.FC = () => {
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
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
    const cats = data?.map(d => d.cost_categories).filter(Boolean) as CostCategory[];
    const locs = data?.map(d => d.location).filter(Boolean) as Location[];
    setCategories(cats ?? []);
    setLocations(locs ?? []);
    console.log('✅ [ConstructionCostsPage.loadData] completed');
  };

  useEffect(() => {
    loadData();
  }, []);

  const onCreateCategory = async (values: CostCategoryInsert) => {
    console.log('🚀 [onCreateCategory] called with:', values);
    const { data, error } = await costsApi.createCategory(values);
    if (error) {
      console.error('❌ [onCreateCategory] failed:', error);
      return message.error(error);
    }
    setCategories(prev => [...prev, data!]);
    message.success('Категория создана');
    console.log('✅ [onCreateCategory] completed:', data);
  };

  const onCreateLocation = async (values: LocationInsert) => {
    console.log('🚀 [onCreateLocation] called with:', values);
    const { data, error } = await costsApi.createLocation(values);
    if (error) {
      console.error('❌ [onCreateLocation] failed:', error);
      return message.error(error);
    }
    setLocations(prev => [...prev, data!]);
    message.success('Локация создана');
    console.log('✅ [onCreateLocation] completed:', data);
  };

  const onCreateDetail = async (values: DetailCostCategoryInsert) => {
    console.log('🚀 [onCreateDetail] called with:', values);
    const { error } = await costsApi.createDetail(values);
    if (error) {
      console.error('❌ [onCreateDetail] failed:', error);
      return message.error(error);
    }
    await loadData();
    message.success('Детализация добавлена');
    console.log('✅ [onCreateDetail] completed');
  };

  return (
    <div className="w-full min-h-full bg-gray-50">
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
          <Title level={2}>Затраты на строительство</Title>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-none">
        <Card title="Импорт из Excel">
          <CostExcelUpload onUploaded={loadData} />
        </Card>

        <Card title="Добавить категорию">
          <Form layout="inline" onFinish={onCreateCategory}>
            <Form.Item name="name" rules={[{ required: true, message: 'Введите название' }]}> <Input placeholder="Название" /> </Form.Item>
            <Form.Item name="description"> <Input placeholder="Описание" /> </Form.Item>
            <Form.Item> <Button type="primary" htmlType="submit">Сохранить</Button> </Form.Item>
          </Form>
        </Card>

        <Card title="Добавить локацию">
          <Form layout="inline" onFinish={onCreateLocation}>
            <Form.Item name="country"> <Input placeholder="Страна" /> </Form.Item>
            <Form.Item name="region"> <Input placeholder="Регион" /> </Form.Item>
            <Form.Item name="city"> <Input placeholder="Город" /> </Form.Item>
            <Form.Item> <Button type="primary" htmlType="submit">Сохранить</Button> </Form.Item>
          </Form>
        </Card>

        <Card title="Добавить детализацию">
          <Form layout="inline" onFinish={onCreateDetail}>
            <Form.Item name="cost_category_id" rules={[{ required: true, message: 'Категория' }]}> <Select placeholder="Категория" style={{ width: 200 }}>{categories.map(c => (<Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>))}</Select> </Form.Item>
            <Form.Item name="location_id" rules={[{ required: true, message: 'Локация' }]}> <Select placeholder="Локация" style={{ width: 200 }}>{locations.map(l => (<Select.Option key={l.id} value={l.id}>{l.country} {l.city}</Select.Option>))}</Select> </Form.Item>
            <Form.Item name="name" rules={[{ required: true, message: 'Название' }]}> <Input placeholder="Название" /> </Form.Item>
            <Form.Item name="unit_cost"> <InputNumber placeholder="Стоимость" /> </Form.Item>
            <Form.Item> <Button type="primary" htmlType="submit">Сохранить</Button> </Form.Item>
          </Form>
        </Card>

        <Card title="Детализация затрат">
          <Table
            dataSource={details}
            rowKey="id"
            columns={[
              { title: 'Категория', dataIndex: ['cost_categories', 'name'] },
              { title: 'Деталь', dataIndex: 'name' },
              { title: 'Стоимость', dataIndex: 'unit_cost' },
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

