import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  Row,
  Col,
  Statistic,
  Select,
  Empty,
  Spin,
  Tabs
} from 'antd';
import {
  ToolOutlined,
  AppstoreOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boqApi, tendersApi } from '../lib/supabase/api';
import type { BOQItem, Tender } from '../lib/supabase/types';
import { formatCurrency, formatQuantity } from '../utils/formatters';
import QuickTenderSelector from '../components/common/QuickTenderSelector';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

interface GroupedItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  item_type: 'material' | 'work' | 'sub_material' | 'sub_work';
  positions_count: number;
  positions: string[];
}

const TenderMaterialsWorksPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [selectedTenderName, setSelectedTenderName] = useState<string | null>(null);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'materials' | 'works'>('all');

  // Загрузка тендеров
  useEffect(() => {
    loadTenders();
  }, []);

  // Загрузка элементов BOQ при выборе тендера
  useEffect(() => {
    if (selectedTenderId) {
      loadBoqItems();
    }
  }, [selectedTenderId]);

  const loadTenders = async () => {
    try {
      const { data, error } = await tendersApi.getAll();
      if (error) throw error;
      setTenders(data || []);
    } catch (error) {
      console.error('❌ Error loading tenders:', error);
    }
  };

  const loadBoqItems = async () => {
    if (!selectedTenderId) return;

    setLoading(true);
    try {
      console.log('🚀 Loading BOQ items for tender:', selectedTenderId);
      const { data, error } = await boqApi.getByTenderId(selectedTenderId, {}, { limit: 10000 });

      if (error) throw error;

      console.log('✅ Loaded BOQ items:', data?.length || 0);
      setBoqItems(data || []);
    } catch (error) {
      console.error('❌ Error loading BOQ items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Группировка элементов по описанию и типу
  const groupedItems = useMemo(() => {
    const grouped = new Map<string, GroupedItem>();

    boqItems.forEach(item => {
      const key = `${item.description}_${item.unit}_${item.item_type}`;

      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.quantity += item.quantity || 0;
        existing.total_amount += item.total_amount || 0;
        existing.positions_count += 1;
        existing.positions.push(item.item_number || '');
      } else {
        grouped.set(key, {
          id: item.id,
          description: item.description || '',
          unit: item.unit || '',
          quantity: item.quantity || 0,
          unit_rate: item.unit_rate || 0,
          total_amount: item.total_amount || 0,
          item_type: item.item_type,
          positions_count: 1,
          positions: [item.item_number || '']
        });
      }
    });

    return Array.from(grouped.values());
  }, [boqItems]);

  // Фильтрация по поиску и типу
  const filteredItems = useMemo(() => {
    let items = groupedItems;

    // Фильтр по типу
    if (activeTab === 'materials') {
      items = items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material');
    } else if (activeTab === 'works') {
      items = items.filter(item => item.item_type === 'work' || item.item_type === 'sub_work');
    }

    // Фильтр по поиску
    if (searchText) {
      const search = searchText.toLowerCase();
      items = items.filter(item =>
        item.description.toLowerCase().includes(search) ||
        item.unit.toLowerCase().includes(search)
      );
    }

    return items;
  }, [groupedItems, searchText, activeTab]);

  // Подсчет статистики
  const stats = useMemo(() => {
    const materials = groupedItems.filter(i => i.item_type === 'material' || i.item_type === 'sub_material');
    const works = groupedItems.filter(i => i.item_type === 'work' || i.item_type === 'sub_work');

    const materialsTotal = materials.reduce((sum, item) => sum + item.total_amount, 0);
    const worksTotal = works.reduce((sum, item) => sum + item.total_amount, 0);

    return {
      materialsCount: materials.length,
      worksCount: works.length,
      materialsTotal,
      worksTotal,
      total: materialsTotal + worksTotal
    };
  }, [groupedItems]);

  // Колонки таблицы
  const columns: ColumnsType<GroupedItem> = [
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 120,
      render: (type: string) => {
        const isMaterial = type === 'material' || type === 'sub_material';
        const isSub = type === 'sub_material' || type === 'sub_work';
        return (
          <Tag
            icon={isMaterial ? <AppstoreOutlined /> : <ToolOutlined />}
            color={isMaterial ? 'blue' : 'green'}
          >
            {isSub && 'Субподряд: '}
            {isMaterial ? 'Материал' : 'Работа'}
          </Tag>
        );
      },
      filters: [
        { text: 'Материалы', value: 'material' },
        { text: 'Работы', value: 'work' },
        { text: 'Субподряд: Материалы', value: 'sub_material' },
        { text: 'Субподряд: Работы', value: 'sub_work' },
      ],
      onFilter: (value, record) => record.item_type === value,
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 140,
      render: (quantity: number) => formatQuantity(quantity),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 140,
      render: (rate: number) => formatCurrency(rate),
      sorter: (a, b) => a.unit_rate - b.unit_rate,
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 160,
      render: (amount: number) => (
        <Text strong>{formatCurrency(amount)}</Text>
      ),
      sorter: (a, b) => a.total_amount - b.total_amount,
    },
    {
      title: 'Позиций',
      dataIndex: 'positions_count',
      key: 'positions_count',
      width: 100,
      render: (count: number, record: GroupedItem) => (
        <span title={`Позиции: ${record.positions.join(', ')}`}>
          {count}
        </span>
      ),
      sorter: (a, b) => a.positions_count - b.positions_count,
    },
  ];

  return (
    <div className="tender-materials-works-page">
      <Card className="mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Title level={3} className="mb-2">
              <FileTextOutlined className="mr-2" />
              Материалы и работы тендера
            </Title>
            <Text type="secondary">
              Просмотр всех используемых материалов и работ в выбранном тендере
            </Text>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong className="mb-2 block">Выберите тендер:</Text>
            <QuickTenderSelector
              value={selectedTenderId}
              onSelect={(tenderId, tenderName) => {
                console.log('🔍 Selected tender:', tenderId, tenderName);
                setSelectedTenderId(tenderId);
                setSelectedTenderName(tenderName);
              }}
              style={{ width: '100%' }}
            />
          </div>

          {selectedTenderId && (
            <>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Материалов"
                    value={stats.materialsCount}
                    prefix={<AppstoreOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Работ"
                    value={stats.worksCount}
                    prefix={<ToolOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Стоимость материалов"
                    value={stats.materialsTotal}
                    prefix={<CalculatorOutlined />}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Стоимость работ"
                    value={stats.worksTotal}
                    prefix={<CalculatorOutlined />}
                    formatter={(value) => formatCurrency(value as number)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
                    <Statistic
                      title="Общая стоимость"
                      value={stats.total}
                      prefix={<BarChartOutlined />}
                      formatter={(value) => formatCurrency(value as number)}
                      valueStyle={{ color: '#722ed1', fontSize: '24px' }}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Space>
      </Card>

      {selectedTenderId && (
        <Card>
          <div className="mb-4">
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Search
                placeholder="Поиск по наименованию или единице измерения"
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 400 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={loadBoqItems}
                loading={loading}
              >
                Обновить
              </Button>
            </Space>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as typeof activeTab)}
            items={[
              {
                key: 'all',
                label: `Все (${groupedItems.length})`,
              },
              {
                key: 'materials',
                label: `Материалы (${stats.materialsCount})`,
              },
              {
                key: 'works',
                label: `Работы (${stats.worksCount})`,
              },
            ]}
          />

          <Table
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
              defaultPageSize: 50,
              pageSizeOptions: ['20', '50', '100', '200'],
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: selectedTenderId ? (
                <Empty description="Нет данных для отображения" />
              ) : (
                <Empty description="Выберите тендер для просмотра материалов и работ" />
              ),
            }}
          />
        </Card>
      )}

      {!selectedTenderId && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Выберите тендер для просмотра материалов и работ"
          />
        </Card>
      )}
    </div>
  );
};

export default TenderMaterialsWorksPage;
