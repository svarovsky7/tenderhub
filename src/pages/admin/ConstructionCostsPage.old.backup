import React, { useState, useEffect } from 'react';
import {
  Layout,
  Tree,
  Button,
  Space,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Upload,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Spin,
  Empty,
  Breadcrumb,
  Progress,
  Table,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  FolderOutlined,
  FileOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DragOutlined,
  FolderAddOutlined,
  GlobalOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import * as XLSX from 'xlsx';
import { importConstructionCosts, type ImportRow } from '../../lib/supabase/api/import-costs';
import { 
  getCategoriesWithDetails, 
  getLocations,
  deleteCategory,
  deleteDetail,
  deleteLocation,
  clearAllData
} from '../../lib/supabase/api/construction-costs';
import { supabase } from '../../lib/supabase/client';

const { Content } = Layout;
const { TabPane } = Tabs;

interface TreeNode extends DataNode {
  data: any;
  type: 'category' | 'detail';
}

const ConstructionCostsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  
  // Модальные окна
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [importLog, setImportLog] = useState<string[]>([]);
  
  const [form] = Form.useForm();

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, []);

  // Загрузка дерева категорий и деталей
  const loadData = async () => {
    console.log('🚀 [ConstructionCostsPage] Loading data');
    setLoading(true);
    
    try {
      // Загружаем категории с деталями
      const { data: categoriesData, error: catError } = await getCategoriesWithDetails();
      const { data: locationsData, error: locError } = await getLocations();
      
      if (catError) {
        message.error('Ошибка загрузки категорий: ' + catError.message);
        return;
      }
      
      if (locError) {
        message.error('Ошибка загрузки локализаций: ' + locError.message);
        return;
      }

      if (categoriesData) {
        setCategories(categoriesData);
        
        // Собираем все детали
        const allDetails: any[] = [];
        categoriesData.forEach((cat: any) => {
          if (cat.details) {
            allDetails.push(...cat.details);
          }
        });
        setDetails(allDetails);
        
        // Преобразуем в дерево
        const tree = categoriesData.map((category: any) => ({
          key: `cat-${category.id}`,
          title: (
            <Space>
              <FolderOutlined />
              <span>{category.name}</span>
              {category.description && (
                <Tag color="blue" style={{ fontSize: '10px' }}>{category.description}</Tag>
              )}
            </Space>
          ),
          children: category.details?.map((detail: any) => ({
            key: `detail-${detail.id}`,
            title: (
              <Space>
                <FileOutlined />
                <span>{detail.name}</span>
                {detail.location && (
                  <Tag color="green" style={{ fontSize: '10px' }}>
                    <GlobalOutlined /> {[detail.location.city, detail.location.country].filter(Boolean).join(', ')}
                  </Tag>
                )}
                {detail.unit_cost && (
                  <Tag color="orange">{detail.unit_cost} ₽</Tag>
                )}
              </Space>
            ),
            data: detail,
            type: 'detail' as const,
            isLeaf: true
          })) || [],
          data: category,
          type: 'category' as const
        }));
        
        setTreeData(tree);
        
        // Раскрываем все категории
        const categoryKeys = categoriesData.map((cat: any) => `cat-${cat.id}`);
        setExpandedKeys(categoryKeys);
      }
      
      if (locationsData) {
        setLocations(locationsData);
      }
      
      console.log('✅ [ConstructionCostsPage] Data loaded');
    } catch (err: any) {
      console.error('❌ [ConstructionCostsPage] Error:', err);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Обработка выбора узла
  const onSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    console.log('🚀 [ConstructionCostsPage] Node selected:', selectedKeys);
    setSelectedKeys(selectedKeys as string[]);
  };

  // Обработчик импорта Excel
  const handleImportExcel = async (file: File) => {
    console.log('🚀 [ConstructionCostsPage] Import starting:', file.name);
    
    // Сброс состояния
    setImportProgress(0);
    setImportStatus('processing');
    setImportLog([`Начало импорта файла: ${file.name}`]);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        setImportLog(prev => [...prev, 'Чтение файла...']);
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        console.log('📦 Parsed Excel data:', jsonData);
        
        // Выводим первые 10 строк для отладки
        console.log('📊 First 10 rows for analysis:');
        jsonData.slice(0, 10).forEach((row, index) => {
          console.log(`Row ${index + 1}:`, {
            col1: row[0], // №
            col2: row[1], // Категория
            col3: row[2], // Ед.изм. категории
            col4: row[3], // Вид затрат
            col5: row[4], // Ед.изм. детали
            col6: row[5]  // Локализация
          });
        });
        
        setImportLog(prev => [...prev, `Найдено строк: ${jsonData.length}`]);
        
        // Преобразуем данные в формат для импорта
        const importRows: ImportRow[] = jsonData.map((row, index) => ({
          orderNum: row[0] ? Number(row[0]) : null,
          categoryName: row[1] ? String(row[1]).trim() : null,
          categoryUnit: row[2] ? String(row[2]).trim() : null,
          detailName: row[3] ? String(row[3]).trim() : null,
          detailUnit: row[4] ? String(row[4]).trim() : null,
          locationName: row[5] ? String(row[5]).trim() : null
        }));

        setImportLog(prev => [...prev, 'Начинаем импорт...']);
        setImportLog(prev => [...prev, '📍 Категории → cost_categories']);
        setImportLog(prev => [...prev, '📍 Виды затрат → detail_cost_categories']);
        setImportLog(prev => [...prev, '📍 Локализации → location']);
        
        console.log('🚀 Calling importConstructionCosts with rows:', importRows.length);
        console.log('Sample import rows:', importRows.slice(0, 3));
        
        // Используем функцию импорта
        const result = await importConstructionCosts(importRows);
        
        console.log('✅ Import function returned:', result);
        
        setImportProgress(100);
        setImportLog(prev => [...prev, 
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `📊 Итоги импорта:`,
          `✅ Успешно обработано: ${result.success} записей`,
          `📂 Создано категорий: ${result.categoriesCreated}`,
          `📋 Создано видов затрат: ${result.detailsCreated}`,
          `📍 Создано локализаций: ${result.locationsCreated}`,
          `❌ Ошибок: ${result.failed}`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        ]);
        
        if (result.errors.length > 0) {
          result.errors.forEach(err => {
            setImportLog(prev => [...prev, `⚠️ ${err}`]);
          });
        }
        
        setImportStatus('completed');
        message.success(`Импорт завершен! Обработано ${result.success} записей`);
        
        // Обновляем данные на странице
        await loadData();
        
      } catch (err: any) {
        console.error('❌ Import error:', err);
        setImportLog(prev => [...prev, `❌ Критическая ошибка: ${err.message}`]);
        setImportStatus('error');
        message.error('Ошибка импорта: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload
  };

  // Экспорт в Excel
  const handleExportExcel = () => {
    console.log('🚀 [ConstructionCostsPage] Exporting to Excel');
    
    const exportData: any[] = [];
    
    categories.forEach(category => {
      // Добавляем категорию
      exportData.push({
        '№': '',
        'Категория': category.name,
        'Ед.изм. категории': category.description?.replace('Единица измерения: ', '') || '',
        'Вид затрат': '',
        'Ед.изм. детали': '',
        'Локализация': ''
      });
      
      // Добавляем детали категории
      if (category.details) {
        category.details.forEach((detail: any) => {
          const detailName = detail.name.replace(/ \([^)]*\)$/, ''); // Убираем единицу измерения из названия
          const detailUnit = detail.name.match(/\(([^)]*)\)$/)?.[1] || ''; // Извлекаем единицу измерения
          
          exportData.push({
            '№': '',
            'Категория': '',
            'Ед.изм. категории': '',
            'Вид затрат': detailName,
            'Ед.изм. детали': detailUnit,
            'Локализация': detail.location ? 
              [detail.location.city, detail.location.region, detail.location.country]
                .filter(Boolean).join(', ') : ''
          });
        });
      }
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Затраты на строительство');
    XLSX.writeFile(wb, 'construction_costs.xlsx');
    
    message.success('Данные экспортированы');
    console.log('✅ [ConstructionCostsPage] Export complete');
  };

  // Очистка всех данных
  const handleClearAll = async () => {
    console.log('🚀 [ConstructionCostsPage] Clearing all data');
    setLoading(true);
    
    const { error } = await clearAllData();
    
    if (error) {
      message.error('Ошибка очистки данных: ' + error.message);
    } else {
      message.success('Все данные успешно удалены');
      await loadData();
    }
    
    setLoading(false);
  };

  // Таблица локализаций
  const locationColumns = [
    {
      title: 'Страна',
      dataIndex: 'country',
      key: 'country',
      render: (text: string) => text || '-'
    },
    {
      title: 'Регион',
      dataIndex: 'region',
      key: 'region',
      render: (text: string) => text || '-'
    },
    {
      title: 'Город',
      dataIndex: 'city',
      key: 'city',
      render: (text: string) => text || '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Popconfirm
          title="Удалить локализацию?"
          onConfirm={async () => {
            await deleteLocation(record.id);
            message.success('Локализация удалена');
            loadData();
          }}
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>Управление затратами на строительство</h2>
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={loadData}
                      loading={loading}
                    >
                      Обновить
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportExcel}
                      disabled={categories.length === 0}
                    >
                      Экспорт
                    </Button>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => setIsImportModalVisible(true)}
                    >
                      Импорт
                    </Button>
                    <Popconfirm
                      title="Удалить все данные?"
                      description="Это действие необратимо. Все категории, детали и локализации будут удалены."
                      onConfirm={handleClearAll}
                      okText="Да, удалить"
                      cancelText="Отмена"
                    >
                      <Button
                        danger
                        icon={<ClearOutlined />}
                        disabled={categories.length === 0}
                      >
                        Очистить всё
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>

                <Tabs defaultActiveKey="1">
                  <TabPane tab={`Категории и детали (${details.length})`} key="1">
                    <Card>
                      <Spin spinning={loading}>
                        {treeData.length > 0 ? (
                          <Tree
                            showLine
                            showIcon
                            blockNode
                            treeData={treeData}
                            expandedKeys={expandedKeys}
                            selectedKeys={selectedKeys}
                            onExpand={setExpandedKeys}
                            onSelect={onSelect}
                            style={{ minHeight: 400 }}
                          />
                        ) : (
                          <Empty description="Нет данных. Импортируйте Excel файл для начала работы." />
                        )}
                      </Spin>
                    </Card>
                  </TabPane>
                  
                  <TabPane tab={`Локализации (${locations.length})`} key="2">
                    <Card>
                      <Table
                        dataSource={locations}
                        columns={locationColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        locale={{ emptyText: 'Нет локализаций' }}
                      />
                    </Card>
                  </TabPane>
                  
                  <TabPane tab="Статистика" key="3">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                              {categories.length}
                            </div>
                            <div style={{ color: '#666', marginTop: '8px' }}>Категорий</div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                              {details.length}
                            </div>
                            <div style={{ color: '#666', marginTop: '8px' }}>Видов затрат</div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#faad14' }}>
                              {locations.length}
                            </div>
                            <div style={{ color: '#666', marginTop: '8px' }}>Локализаций</div>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </TabPane>
                </Tabs>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Модальное окно импорта */}
        <Modal
          title="Импорт данных из Excel"
          open={isImportModalVisible}
          onCancel={() => {
            setIsImportModalVisible(false);
            setImportStatus('idle');
            setImportProgress(0);
            setImportLog([]);
          }}
          footer={
            importStatus === 'completed' || importStatus === 'error' ? [
              <Button 
                key="close" 
                type="primary"
                onClick={() => {
                  setIsImportModalVisible(false);
                  setImportStatus('idle');
                  setImportProgress(0);
                  setImportLog([]);
                }}
              >
                Закрыть
              </Button>
            ] : null
          }
          width={700}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {importStatus === 'idle' && (
              <>
                <p>
                  <strong>Формат Excel файла (6 колонок):</strong>
                </p>
                <table style={{ width: '100%', fontSize: '12px', border: '1px solid #d9d9d9' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa' }}>
                      <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>A: №</th>
                      <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>B: Категория</th>
                      <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>C: Ед.изм. категории</th>
                      <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>D: Вид затрат</th>
                      <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>E: Ед.изм. детали</th>
                      <th style={{ padding: '8px', border: '1px solid #d9d9d9' }}>F: Локализация</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>1</td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>Материалы</td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>т</td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}></td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>Цемент М500</td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>кг</td>
                      <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>Россия</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ backgroundColor: '#e6f7ff', padding: '12px', borderRadius: '4px' }}>
                  <strong>📍 Данные импортируются в таблицы:</strong><br/>
                  • <strong>Категория</strong> (столбец B) → таблица <code>cost_categories</code><br/>
                  • <strong>Вид затрат</strong> (столбец D) → таблица <code>detail_cost_categories</code><br/>
                  • <strong>Локализация</strong> (столбец F) → таблица <code>location</code>
                </div>

                <Upload.Dragger
                  accept=".xlsx,.xls"
                  beforeUpload={handleImportExcel}
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 48 }} />
                  </p>
                  <p className="ant-upload-text">
                    Нажмите или перетащите файл для загрузки
                  </p>
                  <p className="ant-upload-hint">
                    Поддерживаются только файлы Excel (.xlsx, .xls)
                  </p>
                </Upload.Dragger>
              </>
            )}

            {(importStatus === 'processing' || importStatus === 'completed' || importStatus === 'error') && (
              <>
                <div style={{ padding: '20px 0' }}>
                  <Progress
                    percent={importProgress}
                    status={
                      importStatus === 'error' ? 'exception' : 
                      importStatus === 'completed' ? 'success' : 
                      'active'
                    }
                    strokeColor={
                      importStatus === 'error' ? '#ff4d4f' :
                      importStatus === 'completed' ? '#52c41a' :
                      undefined
                    }
                  />
                </div>

                <div style={{ 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '8px', 
                  padding: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#1890ff' }}>
                    📋 Журнал импорта:
                  </div>
                  {importLog.map((log, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        marginBottom: '4px',
                        color: log.includes('❌') ? '#ff4d4f' : 
                               log.includes('✅') ? '#52c41a' : 
                               log.includes('📍') ? '#1890ff' :
                               '#595959'
                      }}
                    >
                      {log}
                    </div>
                  ))}
                  {importStatus === 'processing' && (
                    <div style={{ color: '#1890ff', marginTop: '8px' }}>
                      <Spin size="small" /> Обработка данных...
                    </div>
                  )}
                </div>

                {importStatus === 'completed' && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    backgroundColor: '#f6ffed', 
                    borderRadius: '8px',
                    border: '1px solid #b7eb8f'
                  }}>
                    <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      ✅ Импорт успешно завершен!
                    </div>
                  </div>
                )}

                {importStatus === 'error' && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    backgroundColor: '#fff2f0', 
                    borderRadius: '8px',
                    border: '1px solid #ffccc7'
                  }}>
                    <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                      ❌ Импорт завершен с ошибками
                    </div>
                  </div>
                )}
              </>
            )}
          </Space>
        </Modal>
      </Content>
    </Layout>
  );
};

export default ConstructionCostsPage;