import React, { useState, useEffect } from 'react';
import {
  Layout,
  Tree,
  Button,
  Space,
  Card,
  Modal,
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
  Tabs,
  Typography,
  Divider,
  Badge,
  Statistic,
  Alert,
  Avatar,
  Flex
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
  ClearOutlined,
  SaveOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import * as XLSX from 'xlsx-js-style';
import { importConstructionCosts, type ImportRow } from '../../lib/supabase/api/import-costs';
import { 
  getCategoriesWithDetails, 
  getLocations,
  deleteLocation,
  clearAllData
} from '../../lib/supabase/api/construction-costs';
import { supabase } from '../../lib/supabase/client';
import ModernImportModal from '../../components/admin/ModernImportModal';
import { useTheme } from '../../contexts/ThemeContext';

const { Content } = Layout;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface TreeNode extends DataNode {
  data: any;
  type: 'category' | 'detail';
}

const ConstructionCostsPage: React.FC = () => {
  const { theme } = useTheme();
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
        
        // Группируем детали по названию (так как одна деталь может иметь много локализаций)
        const detailsByName = new Map<string, any[]>();
        allDetails.forEach(detail => {
          const key = detail.name;
          if (!detailsByName.has(key)) {
            detailsByName.set(key, []);
          }
          detailsByName.get(key)!.push(detail);
        });
        
        // Преобразуем в дерево
        const tree = categoriesData.map((category: any) => {
          // Группируем детали категории по названию
          const categoryDetailsByName = new Map<string, any[]>();
          category.details?.forEach((detail: any) => {
            const key = detail.name;
            if (!categoryDetailsByName.has(key)) {
              categoryDetailsByName.set(key, []);
            }
            categoryDetailsByName.get(key)!.push(detail);
          });
          
          // Создаем узлы для уникальных деталей
          const detailNodes: any[] = [];
          categoryDetailsByName.forEach((detailGroup, detailName) => {
            const locations = detailGroup.map(d => d.location).filter(Boolean);
            const uniqueLocations = locations.filter((loc, index, self) => 
              index === self.findIndex(l => 
                l?.id === loc?.id
              )
            );
            
            detailNodes.push({
              key: `detail-${detailGroup[0].id}-group`,
              title: (
                <Space>
                  <FileOutlined />
                  <span>
                    {detailName}
                    {detailGroup[0].unit && (
                      <span style={{ color: '#666' }}> ({detailGroup[0].unit})</span>
                    )}
                  </span>
                  {uniqueLocations.length > 0 && (
                    <Tag color="blue">{uniqueLocations.length} локализ.</Tag>
                  )}
                </Space>
              ),
              data: detailGroup[0],
              type: 'detail',
              children: uniqueLocations.map(loc => ({
                key: `location-${loc.id}`,
                title: (
                  <Space>
                    <GlobalOutlined />
                    <span>
                      {[loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'Локализация'}
                    </span>
                  </Space>
                ),
                data: loc,
                isLeaf: true
              }))
            });
          });
          
          return {
            key: `category-${category.id}`,
            title: (
              <Space>
                <FolderOutlined />
                <span style={{ fontWeight: 500 }}>
                  {category.name}
                  {category.unit && (
                    <span style={{ color: '#666' }}> ({category.unit})</span>
                  )}
                </span>
                <Tag color="green">{category.details?.length || 0} видов</Tag>
              </Space>
            ),
            data: category,
            type: 'category',
            children: detailNodes
          };
        });
        
        setTreeData(tree);
        
        // Раскрываем все узлы по умолчанию
        const allKeys: string[] = [];
        const extractKeys = (nodes: any[]) => {
          nodes.forEach(node => {
            allKeys.push(node.key);
            if (node.children) {
              extractKeys(node.children);
            }
          });
        };
        extractKeys(tree);
        setExpandedKeys(allKeys);
      }
      
      if (locationsData) {
        setLocations(locationsData);
      }
    } catch (error) {
      console.error('❌ [loadData] Error:', error);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Обработка раскрытия/свертывания узлов
  const onExpand: TreeProps['onExpand'] = (expandedKeysValue) => {
    console.log('🚀 [ConstructionCostsPage] Expanded keys:', expandedKeysValue);
    setExpandedKeys(expandedKeysValue as string[]);
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
    let rowNumber = 1;
    
    categories.forEach(category => {
      // Группируем детали по названию
      const detailsByName = new Map<string, any[]>();
      category.details?.forEach((detail: any) => {
        const key = detail.name;
        if (!detailsByName.has(key)) {
          detailsByName.set(key, []);
        }
        detailsByName.get(key)!.push(detail);
      });
      
      // Для каждой уникальной детали добавляем строку с категорией
      let isFirstDetail = true;
      detailsByName.forEach((detailGroup, detailName) => {
        detailGroup.forEach((detail, index) => {
          const detailNameClean = detailName.replace(/ \([^)]*\)$/, ''); // Убираем единицу измерения из названия
          const detailUnit = detailName.match(/\(([^)]*)\)$/)?.[1] || ''; // Извлекаем единицу измерения
          
          exportData.push({
            '№': index === 0 ? rowNumber++ : '',
            'Категория': isFirstDetail ? category.name : '',
            'Ед.изм. категории': isFirstDetail ? (category.description?.replace('Единица измерения: ', '') || '') : '',
            'Вид затрат': index === 0 ? detailNameClean : '',
            'Ед.изм. детали': index === 0 ? detailUnit : '',
            'Локализация': detail.location ? 
              [detail.location.city, detail.location.region, detail.location.country]
                .filter(Boolean).join(', ') : ''
          });
          
          if (isFirstDetail) {
            isFirstDetail = false;
          }
        });
      });
      
      // Если у категории нет деталей, добавляем пустую строку с категорией
      if (!category.details || category.details.length === 0) {
        exportData.push({
          '№': rowNumber++,
          'Категория': category.name,
          'Ед.изм. категории': category.description?.replace('Единица измерения: ', '') || '',
          'Вид затрат': '',
          'Ед.изм. детали': '',
          'Локализация': ''
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

  return (
    <>
      <style>
        {`
          /* Современная карточка */
          .modern-card {
            background: ${theme === 'dark' ? '#1f1f1f' : 'white'};
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
            border: ${theme === 'dark' ? '1px solid #424242' : 'none'};
            transition: all 0.3s ease;
          }

          .modern-card:hover {
            box-shadow: 0 10px 20px rgba(0, 0, 0, ${theme === 'dark' ? '0.3' : '0.1'});
          }

          /* Стилизация дерева */
          .ant-tree {
            background: transparent;
            font-size: 15px;
          }

          .ant-tree-node-content-wrapper {
            transition: all 0.2s;
            padding: 6px 12px;
            border-radius: 6px;
          }

          .ant-tree-node-content-wrapper:hover {
            background: ${theme === 'dark' ? '#262626' : '#f0f2f5'};
          }

          .ant-tree-node-selected .ant-tree-node-content-wrapper {
            background: ${theme === 'dark' ? '#003a70' : '#e6f7ff'};
          }

          /* Быстрая статистика */
          .stats-card {
            background: ${theme === 'dark' ? '#1f1f1f' : 'white'};
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            border: ${theme === 'dark' ? '1px solid #424242' : 'none'};
            transition: all 0.3s ease;
            height: 100%;
          }

          .stats-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, ${theme === 'dark' ? '0.3' : '0.15'});
          }
        `}
      </style>

      <Content style={{ background: theme === 'dark' ? '#141414' : '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
          {/* Быстрая статистика */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card className="stats-card">
                <Statistic
                  title="Категории затрат"
                  value={categories.length}
                  prefix={<FolderOutlined style={{ color: '#1890ff', fontSize: 24 }} />}
                  valueStyle={{ color: '#1890ff', fontSize: 36, fontWeight: 'bold', lineHeight: 1.2 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stats-card">
                <Statistic
                  title="Виды затрат"
                  value={details.length}
                  prefix={<FileOutlined style={{ color: '#52c41a', fontSize: 24 }} />}
                  valueStyle={{ color: '#52c41a', fontSize: 36, fontWeight: 'bold', lineHeight: 1.2 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stats-card">
                <Statistic
                  title="Локализации"
                  value={locations.length}
                  prefix={<GlobalOutlined style={{ color: '#faad14', fontSize: 24 }} />}
                  valueStyle={{ color: '#faad14', fontSize: 36, fontWeight: 'bold', lineHeight: 1.2 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Основной контент */}
          <Card className="modern-card">
            {treeData.length > 0 ? (
              <>
                <Alert
                  message="Структура категорий затрат"
                  description="Иерархическое представление категорий, видов затрат и их локализаций. Кликните на элементы для просмотра деталей."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
                
                <Tree
                  showLine={{ showLeafIcon: false }}
                  showIcon
                  defaultExpandAll
                  expandedKeys={expandedKeys}
                  selectedKeys={selectedKeys}
                  onExpand={onExpand}
                  onSelect={onSelect}
                  treeData={treeData}
                  style={{ padding: '8px 0' }}
                />
              </>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Нет данных для отображения"
                style={{ padding: '80px 0' }}
              >
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />}
                  onClick={() => setIsImportModalVisible(true)}
                  size="large"
                >
                  Импортировать данные
                </Button>
              </Empty>
            )}
          </Card>

          {/* Модальное окно импорта */}
          <ModernImportModal
            visible={isImportModalVisible}
            onCancel={() => {
              setIsImportModalVisible(false);
              setImportStatus('idle');
              setImportProgress(0);
              setImportLog([]);
            }}
            onImport={handleImportExcel}
            importProgress={importProgress}
            importStatus={importStatus}
            importLog={importLog}
          />
        </div>
      </Content>
    </>
  );
};

export default ConstructionCostsPage;