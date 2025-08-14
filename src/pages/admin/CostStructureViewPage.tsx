import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Space,
  Typography,
  Tag,
  Button,
  Tree,
  Row,
  Col,
  Statistic,
  Tabs,
  Badge,
  message,
  Divider,
  Modal,
  Form,
  Input,
  InputNumber,
  Select
} from 'antd';
import {
  FolderOutlined,
  PartitionOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  LinkOutlined,
  ReloadOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { costStructureApi } from '../../lib/supabase/api/cost-structure';
import type {
  CostCategory,
  DetailCostCategory,
  Location,
  CategoryLocationMapping
} from '../../lib/supabase/types/new-cost-structure';

const { Text } = Typography;
const { TabPane } = Tabs;

export const CostStructureViewPage: React.FC = () => {
  console.log('🚀 [CostStructureViewPage] Component mounted');
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [detailCategories, setDetailCategories] = useState<DetailCostCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [mappings, setMappings] = useState<CategoryLocationMapping[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'detail' | 'location' | 'mapping'>('category');
  const [form] = Form.useForm();

  // Load data
  const loadData = async () => {
    console.log('🔄 [loadData] Loading all data');
    setLoading(true);
    
    try {
      const [cats, details, locs, maps] = await Promise.all([
        costStructureApi.getCostCategories(true),
        costStructureApi.getDetailCostCategories(),
        costStructureApi.getAllLocations(true),
        costStructureApi.getCategoryLocationMappings()
      ]);
      
      setCategories(cats);
      setDetailCategories(details);
      setLocations(locs);
      setMappings(maps);
      
      console.log('✅ [loadData] Data loaded:', {
        categories: cats.length,
        details: details.length,
        locations: locs.length,
        mappings: maps.length
      });
      
      // Дополнительная отладка для mappings
      console.log('🔍 [loadData] Mappings details:', maps);
      console.log('🔍 [loadData] Sample mapping:', maps[0]);
      
      // Проверяем конкретную детальную категорию
      const targetDetailId = '105a059c-fac9-49ba-be64-db2cd68edd86';
      const targetMappings = maps.filter(m => m.detail_category_id === targetDetailId);
      console.log(`🔍 [loadData] Mappings for detail ${targetDetailId}:`, targetMappings);
    } catch (error) {
      console.error('❌ [loadData] Error:', error);
      message.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build tree data for categories
  const buildCategoryTree = () => {
    return categories.map(cat => {
      const catDetails = detailCategories.filter(d => d.category_id === cat.id);
      
      return {
        title: (
          <Space>
            <FolderOutlined />
            <Text strong>{cat.name}</Text>
            <Badge count={catDetails.length} />
          </Space>
        ),
        key: cat.id,
        children: catDetails.map(detail => ({
          title: (
            <Space>
              <PartitionOutlined />
              <Text>{detail.name}</Text>
              <Tag>{detail.unit}</Tag>
              <Text type="secondary">{detail.base_price} ₽</Text>
            </Space>
          ),
          key: detail.id,
          isLeaf: true
        }))
      };
    });
  };

  // Build tree data for locations
  const buildLocationTree = () => {
    const buildNode = (parentId: string | null): any[] => {
      return locations
        .filter(loc => loc.parent_id === parentId)
        .map(loc => {
          const children = buildNode(loc.id);
          const mappingCount = mappings.filter(m => m.location_id === loc.id).length;
          
          return {
            title: (
              <Space>
                <EnvironmentOutlined />
                <Text>{loc.name}</Text>
                {mappingCount > 0 && <Badge count={mappingCount} />}
              </Space>
            ),
            key: loc.id,
            children: children.length > 0 ? children : undefined
          };
        });
    };
    
    return buildNode(null);
  };

  // Table columns for mappings
  const mappingColumns = [
    {
      title: 'Категория',
      key: 'category',
      render: (_: any, record: CategoryLocationMapping) => {
        const detail = detailCategories.find(d => d.id === record.detail_category_id);
        const category = detail ? categories.find(c => c.id === detail.category_id) : null;
        
        return (
          <Space>
            <Tag color="blue">{category?.name}</Tag>
            <Text>{detail?.name}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Локация',
      key: 'location',
      render: (_: any, record: CategoryLocationMapping) => {
        const location = locations.find(l => l.id === record.location_id);
        return (
          <Space>
            <EnvironmentOutlined />
            <Text>{location?.name}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number) => val.toLocaleString('ru-RU')
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (val: number) => `${val.toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Сумма',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (val: number) => (
        <Text strong>{val.toLocaleString('ru-RU')} ₽</Text>
      )
    },
    {
      title: 'Скидка',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      render: (val: number) => val ? `${val}%` : '-'
    },
    {
      title: 'Итого',
      dataIndex: 'final_price',
      key: 'final_price',
      render: (val: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          {val.toLocaleString('ru-RU')} ₽
        </Text>
      )
    }
  ];

  // Filter mappings based on selection
  const getFilteredMappings = () => {
    let filtered = mappings;
    
    if (selectedCategory) {
      const categoryDetails = detailCategories
        .filter(d => d.category_id === selectedCategory)
        .map(d => d.id);
      filtered = filtered.filter(m => categoryDetails.includes(m.detail_category_id));
    }
    
    if (selectedLocation) {
      filtered = filtered.filter(m => m.location_id === selectedLocation);
    }
    
    return filtered;
  };

  // Statistics
  const stats = {
    totalMappings: mappings.length,
    totalValue: mappings.reduce((sum, m) => sum + (m.final_price || 0), 0),
    uniqueLocations: new Set(mappings.map(m => m.location_id)).size,
    uniqueDetails: new Set(mappings.map(m => m.detail_category_id)).size
  };

  const handleCreateNew = (type: typeof modalType) => {
    setModalType(type);
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('📝 [handleModalSubmit] Creating:', modalType, values);
      
      switch (modalType) {
        case 'category':
          await costStructureApi.createCostCategory(values);
          message.success('Категория создана');
          break;
        case 'detail':
          await costStructureApi.createDetailCostCategory(values);
          message.success('Детальная категория создана');
          break;
        case 'location':
          await costStructureApi.createLocation(values);
          message.success('Локация создана');
          break;
        case 'mapping':
          await costStructureApi.createCategoryLocationMapping(values);
          message.success('Связь создана');
          break;
      }
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('❌ [handleModalSubmit] Error:', error);
      message.error('Ошибка при создании');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <PartitionOutlined />
            <span>Структура затрат</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ImportOutlined />}
              onClick={() => navigate('/admin/cost-structure-import')}
            >
              Импорт
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              Обновить
            </Button>
          </Space>
        }
      >
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Категорий"
                value={categories.length}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Детальных категорий"
                value={detailCategories.length}
                prefix={<PartitionOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Локаций"
                value={locations.length}
                prefix={<EnvironmentOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Связей"
                value={mappings.length}
                prefix={<LinkOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="structure">
          <TabPane tab="Структура категорий" key="structure">
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  title="Категории затрат"
                  size="small"
                  extra={
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleCreateNew('category')}
                    >
                      Добавить
                    </Button>
                  }
                >
                  <Tree
                    treeData={buildCategoryTree()}
                    defaultExpandAll
                    onSelect={(keys) => setSelectedCategory(keys[0] as string)}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  title="Локации"
                  size="small"
                  extra={
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleCreateNew('location')}
                    >
                      Добавить
                    </Button>
                  }
                >
                  <Tree
                    treeData={buildLocationTree()}
                    defaultExpandAll
                    onSelect={(keys) => setSelectedLocation(keys[0] as string)}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={`Таблица затрат (${detailCategories.length})`} key="details">
            <Card>
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Text>Всего детальных категорий: {detailCategories.length}</Text>
                  <Divider type="vertical" />
                  <Text>Со связями: {detailCategories.filter(d => mappings.some(m => m.detail_category_id === d.id)).length}</Text>
                  <Divider type="vertical" />
                  <Text>Всего связей: {mappings.length}</Text>
                </Space>
              </div>
              <Table
                size="small"
                loading={loading}
                dataSource={(() => {
                  const tableData: any[] = [];
                  let rowNum = 0;
                  
                  categories.forEach(category => {
                    const categoryDetails = detailCategories.filter(d => d.category_id === category.id);
                    
                    if (categoryDetails.length > 0) {
                      // Добавляем строку категории
                      tableData.push({
                        key: `cat-${category.id}`,
                        rowNum: ++rowNum,
                        isCategory: true,
                        categoryCode: category.code,
                        categoryName: category.name,
                        categoryDescription: category.description,
                        detailsCount: categoryDetails.length
                      });
                      
                      // Добавляем детальные категории
                      categoryDetails.forEach(detail => {
                        const detailMappings = mappings.filter(m => m.detail_category_id === detail.id);
                        const locationNames = detailMappings.map(m => {
                          const loc = locations.find(l => l.id === m.location_id);
                          return loc?.name || 'Неизвестная локация';
                        }).join(', ');
                        
                        tableData.push({
                          key: detail.id,
                          rowNum: ++rowNum,
                          isDetail: true,
                          categoryCode: category.code,
                          categoryName: category.name,
                          detailCode: detail.code,
                          detailName: detail.name,
                          unit: detail.unit,
                          basePrice: detail.base_price,
                          locations: locationNames || '—',
                          mappingsCount: detailMappings.length
                        });
                      });
                    }
                  });
                  
                  return tableData;
                })()}
                columns={[
                  {
                    title: '№',
                    dataIndex: 'rowNum',
                    key: 'rowNum',
                    width: 60,
                    fixed: 'left',
                    align: 'center'
                  },
                  {
                    title: 'Название категории',
                    dataIndex: 'categoryName',
                    key: 'categoryName',
                    width: 200,
                    render: (name: string, record: any) => {
                      if (record.isCategory) {
                        return (
                          <Space>
                            <FolderOutlined style={{ color: '#1890ff' }} />
                            <Text strong>{name}</Text>
                            <Badge count={record.detailsCount} />
                          </Space>
                        );
                      }
                      return null;
                    }
                  },
                  {
                    title: 'Описание',
                    dataIndex: 'categoryDescription',
                    key: 'categoryDescription',
                    width: 200,
                    ellipsis: true,
                    render: (desc: string, record: any) => {
                      if (record.isCategory) {
                        return desc || <Text type="secondary">—</Text>;
                      }
                      return null;
                    }
                  },
                  {
                    title: 'Название детали',
                    dataIndex: 'detailName',
                    key: 'detailName',
                    width: 300,
                    render: (name: string, record: any) => {
                      if (record.isDetail) {
                        return (
                          <Space>
                            <PartitionOutlined style={{ color: '#52c41a' }} />
                            <Text>{name}</Text>
                          </Space>
                        );
                      }
                      return null;
                    }
                  },
                  {
                    title: 'Локации',
                    dataIndex: 'locations',
                    key: 'locations',
                    width: 250,
                    render: (locations: string, record: any) => {
                      if (record.isDetail) {
                        if (locations === '—') {
                          return <Text type="secondary">—</Text>;
                        }
                        const locArray = locations.split(', ');
                        return (
                          <Space wrap size={[4, 4]}>
                            {locArray.map((loc, idx) => (
                              <Tag key={idx} color="orange" icon={<EnvironmentOutlined />}>
                                {loc}
                              </Tag>
                            ))}
                          </Space>
                        );
                      }
                      return null;
                    }
                  },
                  {
                    title: 'Ед. изм.',
                    dataIndex: 'unit',
                    key: 'unit',
                    width: 100,
                    render: (unit: string, record: any) => {
                      if (record.isDetail) {
                        return <Tag>{unit}</Tag>;
                      }
                      return null;
                    }
                  },
                ]}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showTotal: (total) => `Всего строк: ${total}`
                }}
                scroll={{ x: 1500 }}
              />
            </Card>
          </TabPane>

          <TabPane tab={`Связи (${mappings.length})`} key="mappings">
            <Card
              size="small"
              extra={
                <Space>
                  <Text>Общая сумма:</Text>
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    {stats.totalValue.toLocaleString('ru-RU')} ₽
                  </Text>
                  <Divider type="vertical" />
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleCreateNew('mapping')}
                  >
                    Добавить связь
                  </Button>
                </Space>
              }
            >
              <Table
                columns={mappingColumns}
                dataSource={getFilteredMappings()}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showTotal: (total) => `Всего: ${total}`
                }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Create Modal */}
      <Modal
        title={
          modalType === 'category' ? 'Новая категория' :
          modalType === 'detail' ? 'Новая детальная категория' :
          modalType === 'location' ? 'Новая локация' : 'Новая связь'
        }
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          {modalType === 'category' && (
            <>
              <Form.Item
                name="code"
                label="Код"
                rules={[{ required: true, message: 'Введите код' }]}
              >
                <Input placeholder="MAT" />
              </Form.Item>
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Материалы" />
              </Form.Item>
              <Form.Item name="description" label="Описание">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}

          {modalType === 'detail' && (
            <>
              <Form.Item
                name="category_id"
                label="Категория"
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder="Выберите категорию">
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="code"
                label="Код"
                rules={[{ required: true, message: 'Введите код' }]}
              >
                <Input placeholder="MAT-001" />
              </Form.Item>
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Бетон М300" />
              </Form.Item>
              <Form.Item
                name="unit"
                label="Единица измерения"
                rules={[{ required: true, message: 'Введите единицу' }]}
              >
                <Input placeholder="м³" />
              </Form.Item>
              <Form.Item
                name="base_price"
                label="Базовая цена"
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>
            </>
          )}

          {modalType === 'location' && (
            <>
              <Form.Item
                name="code"
                label="Код"
                rules={[{ required: true, message: 'Введите код' }]}
              >
                <Input placeholder="LOC-001" />
              </Form.Item>
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Корпус А" />
              </Form.Item>
              <Form.Item name="parent_id" label="Родительская локация">
                <Select placeholder="Выберите родителя" allowClear>
                  {locations.map(loc => (
                    <Select.Option key={loc.id} value={loc.id}>
                      {loc.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          {modalType === 'mapping' && (
            <>
              <Form.Item
                name="detail_category_id"
                label="Детальная категория"
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder="Выберите категорию" showSearch>
                  {detailCategories.map(detail => (
                    <Select.Option key={detail.id} value={detail.id}>
                      {detail.code} - {detail.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="location_id"
                label="Локация"
                rules={[{ required: true, message: 'Выберите локацию' }]}
              >
                <Select placeholder="Выберите локацию" showSearch>
                  {locations.map(loc => (
                    <Select.Option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[{ required: true, message: 'Введите количество' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={3}
                />
              </Form.Item>
              <Form.Item
                name="unit_price"
                label="Цена за единицу"
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};