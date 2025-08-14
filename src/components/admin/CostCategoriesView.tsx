import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Space, Typography, Tag, Button, Input, Empty, Row, Col, Select, Badge, Collapse } from 'antd';
import { 
  ReloadOutlined, 
  SearchOutlined,
  FolderOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  FilterOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { 
  getCostCategories,
  getDetailCostCategories,
  getLocations
} from '../../lib/supabase/api/cost-categories-v2';
import { getLocationsForDetailCategory } from '../../lib/supabase/api/cost-categories-import';
import { supabase } from '../../lib/supabase/client';
import { costStructureApi } from '../../lib/supabase/api/cost-structure';
import type { Database } from '../../lib/supabase/types/database';
import type { CategoryLocationMapping } from '../../lib/supabase/types/new-cost-structure';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;

type CostCategory = Database['public']['Tables']['cost_categories']['Row'];
type DetailCostCategory = Database['public']['Tables']['detail_cost_categories']['Row'] & {
  cost_categories?: {
    id: string;
    name: string;
    code: string;
  };
};
type Location = Database['public']['Tables']['location']['Row'];

interface CategoryWithDetails extends CostCategory {
  detailCategories: DetailCostCategory[];
  locations: Location[];
  expanded?: boolean;
  index?: number;
}

export const CostCategoriesView: React.FC = () => {
  console.log('🚀 [CostCategoriesView] rendered');
  
  const [loading, setLoading] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  
  // Данные
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [detailCategories, setDetailCategories] = useState<DetailCostCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [mappings, setMappings] = useState<CategoryLocationMapping[]>([]);
  
  // Фильтры и поиск
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'index' | 'name'>('index');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterByDetails, setFilterByDetails] = useState<boolean | null>(null);
  
  // Загрузка данных
  const loadAllData = async () => {
    console.log('🚀 [loadAllData] called');
    try {
      setLoading(true);
      const [categoriesData, detailsData, locationsData, mappingsData] = await Promise.all([
        getCostCategories(),
        getDetailCostCategories(),
        getLocations(),
        costStructureApi.getCategoryLocationMappings()
      ]);
      
      setCategories(categoriesData || []);
      setDetailCategories(detailsData || []);
      setLocations(locationsData || []);
      setMappings(mappingsData || []);
      
      console.log('✅ All data loaded');
      console.log('📊 Categories with sort_order:', categoriesData?.map(c => ({ name: c.name, sort_order: c.sort_order })));
      console.log('🔍 Mappings loaded:', mappingsData?.length);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при монтировании
  useEffect(() => {
    loadAllData();
  }, []);

  // Подготовка данных для таблицы
  const tableData = useMemo(() => {
    // Сортируем категории по sort_order из базы данных
    const sortedCategories = [...categories].sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );
    
    let data: CategoryWithDetails[] = sortedCategories.map((cat) => ({
      ...cat,
      index: cat.sort_order || 0, // Используем sort_order из БД (который содержит нумерацию из импорта)
      detailCategories: detailCategories
        .filter(d => d.category_id === cat.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), // Сортируем детальные категории
      locations: []
    }));

    // Фильтрация по поиску
    if (searchText) {
      data = data.filter(cat => {
        const matchCategory = cat.name.toLowerCase().includes(searchText.toLowerCase());
        const matchDetails = cat.detailCategories.some(d => 
          d.name.toLowerCase().includes(searchText.toLowerCase())
        );
        return matchCategory || matchDetails;
      });
    }

    // Фильтрация по наличию детальных категорий
    if (filterByDetails !== null) {
      data = data.filter(cat => 
        filterByDetails ? cat.detailCategories.length > 0 : cat.detailCategories.length === 0
      );
    }

    // Сортировка
    data.sort((a, b) => {
      if (sortBy === 'index') {
        const aOrder = a.index || 0;
        const bOrder = b.index || 0;
        return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      } else {
        const compare = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? compare : -compare;
      }
    });

    return data;
  }, [categories, detailCategories, searchText, sortBy, sortOrder, filterByDetails]);

  // Развернуть/свернуть все
  const handleExpandAll = () => {
    if (expandedRowKeys.length === tableData.length) {
      setExpandedRowKeys([]);
    } else {
      setExpandedRowKeys(tableData.map(cat => cat.id));
    }
  };

  // Рендер детальных категорий с локациями
  const renderDetailCategories = (category: CategoryWithDetails) => {
    if (category.detailCategories.length === 0) {
      return (
        <div className="p-4">
          <Empty 
            description="Нет детальных категорий" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50">
        <Table
          size="small"
          pagination={false}
          dataSource={category.detailCategories.map((detail, index) => ({
            ...detail,
            key: detail.id,
            index: index + 1,
            categoryName: category.name,
            categoryCode: category.code
          }))}
          columns={[
            {
              title: '№',
              dataIndex: 'index',
              key: 'index',
              width: 50,
              align: 'center'
            },
            {
              title: 'Название',
              dataIndex: 'name',
              key: 'name',
              render: (name: string) => (
                <Space>
                  <AppstoreOutlined style={{ color: '#8c8c8c' }} />
                  <Text>{name}</Text>
                </Space>
              )
            },
            {
              title: 'Ед. изм.',
              dataIndex: 'unit',
              key: 'unit',
              width: 100,
              render: (unit: string) => <Tag color="blue">{unit}</Tag>
            },
            {
              title: 'Локации',
              key: 'locations',
              width: 400,
              render: (_: any, record: DetailCostCategory) => {
                const detailMappings = mappings.filter(m => m.detail_category_id === record.id);
                
                if (detailMappings.length === 0) {
                  return <Text type="secondary">—</Text>;
                }
                
                return (
                  <Space wrap size={[4, 4]}>
                    {detailMappings.map(mapping => {
                      const location = locations.find(l => l.id === mapping.location_id);
                      return (
                        <Tag 
                          key={mapping.id} 
                          color="green"
                          icon={<EnvironmentOutlined />}
                        >
                          {location?.name || 'Неизвестная локация'}
                        </Tag>
                      );
                    })}
                  </Space>
                );
              }
            }
          ]}
        />
      </div>
    );
  };

  // Компонент для отображения локаций детальной категории
  const DetailCategoryLocations: React.FC<{ detailCategoryId: string }> = ({ detailCategoryId }) => {
    const [detailLocations, setDetailLocations] = useState<Location[]>([]);
    const [loadingLocs, setLoadingLocs] = useState(true);

    useEffect(() => {
      const loadLocations = async () => {
        try {
          setLoadingLocs(true);
          console.log('🔍 Loading locations for detail category:', detailCategoryId);
          
          // Сначала пробуем через импортированную функцию
          let locs = await getLocationsForDetailCategory(detailCategoryId);
          console.log('📊 Loaded locations via import function:', locs);
          
          // Если не получили результат, пробуем прямой запрос
          if (!locs || locs.length === 0) {
            console.log('🔄 Trying direct query...');
            const { data, error } = await supabase
              .from('category_location_mapping')
              .select(`
                location_id,
                location!inner (
                  id,
                  name,
                  code,
                  description,
                  sort_order
                )
              `)
              .eq('detail_category_id', detailCategoryId)
              .eq('is_active', true);

            if (error) {
              console.error('❌ Direct query failed:', error);
            } else {
              console.log('📊 Direct query result:', data);
              locs = data?.map(item => item.location).filter(Boolean) || [];
              // Сортируем по sort_order
              locs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            }
          }
          
          console.log('📊 Final locations to display:', locs);
          setDetailLocations(locs || []);
        } catch (error) {
          console.error('❌ Failed to load locations:', error);
        } finally {
          setLoadingLocs(false);
        }
      };
      loadLocations();
    }, [detailCategoryId]);

    if (loadingLocs) {
      return <div className="pl-8 py-2">Загрузка локаций...</div>;
    }

    return (
      <div className="pl-8">
        <Text strong className="mb-2 block">
          <EnvironmentOutlined className="mr-2" style={{ color: '#52c41a' }} />
          Связанные локации:
        </Text>
        {detailLocations.length > 0 ? (
          <Space direction="vertical" className="w-full">
            {detailLocations.map((loc, locIndex) => (
              <div key={loc.id} className="pl-4">
                <Space>
                  <Text type="secondary">{locIndex + 1}.</Text>
                  <Tag color="green">{loc.name}</Tag>
                  {loc.description && (
                    <Text type="secondary" className="text-sm">
                      {loc.description}
                    </Text>
                  )}
                </Space>
              </div>
            ))}
          </Space>
        ) : (
          <div>
            <Empty 
              description={
                <div>
                  <Text type="secondary">Нет связанных локаций</Text>
                  <br />
                  <Text type="secondary" className="text-xs">
                    Detail Category ID: {detailCategoryId}
                  </Text>
                </div>
              } 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '20px 0' }}
            />
          </div>
        )}
      </div>
    );
  };

  // Колонки основной таблицы
  const columns: ColumnsType<CategoryWithDetails> = [
    {
      title: '№',
      key: 'index',
      width: 60,
      fixed: 'left',
      render: (_, record) => (
        <Text strong>{record.index}</Text>
      ),
      sorter: true,
      sortOrder: sortBy === 'index' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'Категория',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Button
          type="link"
          className="p-0 text-left"
          onClick={() => {
            if (expandedRowKeys.includes(record.id)) {
              setExpandedRowKeys(expandedRowKeys.filter(key => key !== record.id));
            } else {
              setExpandedRowKeys([...expandedRowKeys, record.id]);
            }
          }}
        >
          <Space>
            {expandedRowKeys.includes(record.id) ? 
              <DownOutlined style={{ fontSize: 10 }} /> : 
              <RightOutlined style={{ fontSize: 10 }} />
            }
            <FolderOutlined style={{ color: '#1890ff' }} />
            <Text strong>{name}</Text>
            {record.detailCategories.length > 0 && (
              <Badge 
                count={record.detailCategories.length} 
                style={{ backgroundColor: '#52c41a' }}
              />
            )}
          </Space>
        </Button>
      ),
      sorter: true,
      sortOrder: sortBy === 'name' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => {
        if (desc && desc.startsWith('Единица измерения:')) {
          return <Text type="secondary">—</Text>;
        }
        return desc || <Text type="secondary">—</Text>;
      }
    }
  ];

  // Обработка сортировки
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (sorter.columnKey === 'index') {
      setSortBy('index');
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    } else if (sorter.columnKey === 'name') {
      setSortBy('name');
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="p-6">
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Заголовок и действия */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Затраты на строительство
              </Title>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={loadAllData}
                  loading={loading}
                >
                  Обновить
                </Button>
                <Button 
                  onClick={async () => {
                    console.log('🔍 Checking DB mappings...');
                    const { data, error } = await supabase
                      .from('category_location_mapping')
                      .select(`
                        detail_category_id,
                        location_id,
                        detail_cost_categories!inner (
                          name,
                          cost_categories!inner (
                            name
                          )
                        ),
                        location!inner (
                          name
                        )
                      `)
                      .eq('is_active', true);
                    
                    if (error) {
                      console.error('❌ DB check failed:', error);
                    } else {
                      console.log('📊 Current mappings in DB:', data);
                      console.table(data?.map(d => ({
                        category: d.detail_cost_categories.cost_categories.name,
                        detail: d.detail_cost_categories.name,
                        location: d.location.name
                      })));
                    }
                  }}
                >
                  🔍 Проверить БД
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Панель фильтров */}
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Search
                placeholder="Поиск по категориям и детальным категориям..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={setSearchText}
                onChange={(e) => !e.target.value && setSearchText('')}
              />
            </Col>
            <Col>
              <Select
                placeholder="Фильтр"
                style={{ width: 200 }}
                allowClear
                onChange={(value) => setFilterByDetails(value)}
                suffixIcon={<FilterOutlined />}
              >
                <Option value={true}>С детальными категориями</Option>
                <Option value={false}>Без детальных категорий</Option>
              </Select>
            </Col>
            <Col>
              <Button
                type={expandedRowKeys.length === tableData.length ? 'primary' : 'default'}
                onClick={handleExpandAll}
              >
                {expandedRowKeys.length === tableData.length ? 'Свернуть все' : 'Развернуть все'}
              </Button>
            </Col>
          </Row>

          {/* Статистика */}
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <Space>
                  <FolderOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <div>
                    <Text type="secondary">Категорий</Text>
                    <Title level={4} style={{ margin: 0 }}>{tableData.length}</Title>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Space>
                  <AppstoreOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <div>
                    <Text type="secondary">Детальных категорий</Text>
                    <Title level={4} style={{ margin: 0 }}>{detailCategories.length}</Title>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Space>
                  <EnvironmentOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                  <div>
                    <Text type="secondary">Локаций</Text>
                    <Title level={4} style={{ margin: 0 }}>{locations.length}</Title>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Таблица */}
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
            expandable={{
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
              expandedRowRender: renderDetailCategories,
              showExpandColumn: false,
              expandRowByClick: false
            }}
            pagination={false}
            locale={{
              emptyText: <Empty description="Нет данных" />
            }}
          />
        </Space>
      </Card>
    </div>
  );
};