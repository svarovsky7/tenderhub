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

const { Content } = Layout;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

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
                    <Space size={4}>
                      <GlobalOutlined style={{ color: '#52c41a' }} />
                      <span style={{ fontSize: '12px', color: '#52c41a' }}>
                        {uniqueLocations.length} локализаци{uniqueLocations.length === 1 ? 'я' : uniqueLocations.length < 5 ? 'и' : 'й'}
                      </span>
                    </Space>
                  )}
                  {detailGroup[0].unit_cost && (
                    <Tag color="orange">{detailGroup[0].unit_cost} ₽</Tag>
                  )}
                </Space>
              ),
              children: uniqueLocations.map((loc, idx) => {
                // Формируем отображаемое название локализации
                const locationName = [loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'Не указано';
                
                return {
                  key: `detail-${detailGroup[0].id}-loc-${idx}`,
                  title: (
                    <Tag color="green" style={{ fontSize: '11px' }}>
                      <GlobalOutlined /> {locationName}
                    </Tag>
                  ),
                  isLeaf: true
                };
              }),
              data: detailGroup[0],
              type: 'detail' as const,
              isLeaf: uniqueLocations.length === 0
            });
          });
          
          return {
            key: `cat-${category.id}`,
            title: (
              <Space>
                <FolderOutlined />
                <span style={{ fontWeight: 'bold' }}>
                  {category.name}
                  {category.unit && (
                    <span style={{ fontWeight: 'normal', color: '#666' }}> ({category.unit})</span>
                  )}
                </span>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  ({detailNodes.length} вид{detailNodes.length === 1 ? '' : detailNodes.length < 5 ? 'а' : 'ов'} затрат)
                </span>
              </Space>
            ),
            children: detailNodes,
            data: category,
            type: 'category' as const
          };
        });
        
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
    <>
      <style>
        {`
          /* Стилизация заголовка */
          .page-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="50" cy="10" r="1" fill="%23ffffff" opacity="0.05"/><circle cx="10" cy="90" r="1" fill="%23ffffff" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
            pointer-events: none;
          }
          .page-header .ant-typography {
            color: white !important;
            position: relative;
            z-index: 1;
          }
          
          /* Улучшенные карточки */
          .modern-card {
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #f0f0f0;
            transition: all 0.3s ease;
          }
          .modern-card:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            transform: translateY(-2px);
          }
          
          /* Стилизация вкладок */
          .ant-tabs-nav {
            margin-bottom: 0 !important;
            padding: 0 24px;
            background: white;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          .ant-tabs-tab {
            font-weight: 500 !important;
            margin: 0 8px !important;
          }
          .ant-tabs-content-holder {
            background: white;
            border-radius: 0 0 12px 12px;
            border: 1px solid #f0f0f0;
            border-top: none;
          }
          
          /* Стилизация таблиц */
          .category-row {
            background: linear-gradient(90deg, #f8f9ff 0%, #f0f5ff 100%) !important;
            font-weight: 500;
            border-left: 4px solid #1890ff;
            transition: all 0.2s ease;
          }
          .category-row:hover td {
            background: linear-gradient(90deg, #e6f7ff 0%, #d9efff 100%) !important;
            transform: translateX(2px);
            box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
          }
          .detail-row {
            background: linear-gradient(90deg, #f9fff9 0%, #f0fff0 100%) !important;
            border-left: 4px solid #52c41a;
            transition: all 0.2s ease;
          }
          .detail-row:hover td {
            background: linear-gradient(90deg, #eaffcc 0%, #d9f7be 100%) !important;
            transform: translateX(2px);
            box-shadow: 0 2px 8px rgba(82, 196, 26, 0.15);
          }
          .location-row {
            background: linear-gradient(90deg, #fffaf0 0%, #fff2e6 100%) !important;
            border-left: 4px solid #faad14;
            transition: all 0.2s ease;
          }
          .location-row:hover td {
            background: linear-gradient(90deg, #ffe7ba 0%, #ffd591 100%) !important;
            transform: translateX(2px);
            box-shadow: 0 2px 8px rgba(250, 173, 20, 0.15);
          }
          
          /* Дерево категорий */
          .ant-tree .ant-tree-node-content-wrapper {
            border-radius: 8px;
            transition: all 0.2s ease;
          }
          .ant-tree .ant-tree-node-content-wrapper:hover {
            background: linear-gradient(90deg, #f0f5ff 0%, #e6f7ff 100%);
          }
          
          /* Статистические карточки */
          .stats-card {
            text-align: center;
            padding: 28px 24px;
            border-radius: 16px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #f0f0f0;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          .stats-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.12);
          }
          .stats-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #1890ff 0%, #722ed1 100%);
          }
          .stats-card:nth-child(2)::before {
            background: linear-gradient(90deg, #52c41a 0%, #389e0d 100%);
          }
          .stats-card:nth-child(3)::before {
            background: linear-gradient(90deg, #faad14 0%, #d46b08 100%);
          }
          .stats-card .ant-statistic-content {
            margin-bottom: 8px;
          }
          
          /* Кнопки действий */
          .action-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .action-btn {
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          }
          .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.2) !important;
          }
          .action-btn:active {
            transform: translateY(0);
          }
          
          /* Модальные окна */
          .ant-modal-content {
            border-radius: 16px;
            overflow: hidden;
          }
          .ant-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-bottom: none;
          }
          .ant-modal-title {
            color: white !important;
          }
        `}
      </style>
      <Layout style={{ minHeight: '100vh', background: '#fafbfc' }}>
        <Content style={{ padding: '24px' }}>
          {/* Современный заголовок */}
          <div className="page-header">
            <Row align="middle" justify="space-between">
              <Col>
                <Flex align="center" gap={16}>
                  <Avatar 
                    size={64} 
                    icon={<DatabaseOutlined />} 
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  />
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white' }}>
                      Управление затратами на строительство
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                      Импорт, редактирование и анализ строительных затрат
                    </Text>
                  </div>
                </Flex>
              </Col>
              <Col>
                <div className="action-buttons">
                  <Button
                    className="action-btn"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#52c41a',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 600
                    }}
                    icon={<ReloadOutlined />}
                    onClick={loadData}
                    loading={loading}
                    size="large"
                  >
                    Обновить
                  </Button>
                  <Button
                    className="action-btn"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#faad14',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      fontWeight: 600
                    }}
                    icon={<DownloadOutlined />}
                    onClick={handleExportExcel}
                    disabled={categories.length === 0}
                    size="large"
                  >
                    Экспорт
                  </Button>
                  <Button
                    className="action-btn"
                    style={{ 
                      background: '#ffd93d',
                      color: '#333',
                      borderColor: '#ffd93d',
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(255, 217, 61, 0.4)'
                    }}
                    icon={<UploadOutlined />}
                    onClick={() => setIsImportModalVisible(true)}
                    size="large"
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
                      className="action-btn"
                      style={{ 
                        background: 'rgba(255, 77, 79, 0.1)',
                        color: '#ff4d4f',
                        borderColor: 'rgba(255, 77, 79, 0.3)',
                        fontWeight: 600
                      }}
                      icon={<ClearOutlined />}
                      disabled={categories.length === 0}
                      size="large"
                    >
                      Очистить
                    </Button>
                  </Popconfirm>
                </div>
              </Col>
            </Row>
          </div>

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
          <Card className="modern-card" style={{ overflow: 'hidden', padding: 0 }}>
            <Tabs 
              defaultActiveKey="1"
              size="large"
              items={[
                {
                  key: '1',
                  label: (
                    <span>
                      <FolderOutlined />
                      <span style={{ marginLeft: 8 }}>Структура затрат</span>
                      <Badge count={categories.length} style={{ marginLeft: 8 }} />
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '24px' }}>
                      {treeData.length > 0 ? (
                        <>
                          <Alert
                            message="Структура категорий затрат"
                            description="Иерархическое представление категорий, видов затрат и их локализаций. Кликните на элементы для просмотра деталей."
                            type="info"
                            showIcon
                            style={{ marginBottom: 24, borderRadius: 8 }}
                          />
                          <Spin spinning={loading}>
                            <Tree
                              showLine
                              showIcon
                              blockNode
                              treeData={treeData}
                              expandedKeys={expandedKeys}
                              selectedKeys={selectedKeys}
                              onExpand={setExpandedKeys}
                              onSelect={onSelect}
                              style={{ 
                                minHeight: 500,
                                background: '#fafbfc',
                                padding: '20px',
                                borderRadius: '8px',
                                border: '1px solid #f0f0f0'
                              }}
                            />
                          </Spin>
                        </>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={
                            <span>
                              Нет данных для отображения<br/>
                              <Text type="secondary">Импортируйте Excel файл для начала работы</Text>
                            </span>
                          }
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
                    </div>
                  )
                },
                {
                  key: '3',
                  label: (
                    <span>
                      <BarChartOutlined />
                      <span style={{ marginLeft: 8 }}>Аналитика</span>
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '24px' }}>
                      <Row gutter={[24, 24]}>
                        <Col span={24}>
                          <Alert
                            message="Статистика и аналитика данных"
                            description="Детальная информация о структуре затрат, распределении по категориям и локализациям."
                            type="info"
                            showIcon
                            style={{ borderRadius: 8 }}
                          />
                        </Col>
                        
                        {/* Подробная статистика */}
                        <Col xs={24} lg={8}>
                          <Card className="modern-card" style={{ height: '200px' }}>
                            <Statistic
                              title="Общее количество категорий"
                              value={categories.length}
                              prefix={<FolderOutlined style={{ color: '#1890ff' }} />}
                              valueStyle={{ color: '#1890ff', fontSize: 32 }}
                            />
                            <Divider style={{ margin: '12px 0' }} />
                            <Text type="secondary">Основные группы затрат</Text>
                          </Card>
                        </Col>
                        
                        <Col xs={24} lg={8}>
                          <Card className="modern-card" style={{ height: '200px' }}>
                            <Statistic
                              title="Детальные виды затрат"
                              value={details.length}
                              prefix={<FileOutlined style={{ color: '#52c41a' }} />}
                              valueStyle={{ color: '#52c41a', fontSize: 32 }}
                            />
                            <Divider style={{ margin: '12px 0' }} />
                            <Text type="secondary">Конкретные статьи расходов</Text>
                          </Card>
                        </Col>
                        
                        <Col xs={24} lg={8}>
                          <Card className="modern-card" style={{ height: '200px' }}>
                            <Statistic
                              title="Географические локализации"
                              value={locations.length}
                              prefix={<GlobalOutlined style={{ color: '#faad14' }} />}
                              valueStyle={{ color: '#faad14', fontSize: 32 }}
                            />
                            <Divider style={{ margin: '12px 0' }} />
                            <Text type="secondary">Региональные привязки</Text>
                          </Card>
                        </Col>
                        
                        {/* Дополнительные метрики */}
                        <Col xs={24} lg={12}>
                          <Card className="modern-card" title="Структура данных" extra={<SettingOutlined />}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Средняя детализация:</span>
                                <Badge 
                                  count={categories.length > 0 ? Math.round(details.length / categories.length * 10) / 10 : 0} 
                                  style={{ backgroundColor: '#52c41a' }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Покрытие локализациями:</span>
                                <Badge 
                                  count={`${locations.length > 0 && details.length > 0 ? Math.round(locations.length / details.length * 100) : 0}%`}
                                  style={{ backgroundColor: '#faad14' }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Общая заполненность:</span>
                                <Progress 
                                  percent={categories.length > 0 ? 100 : 0}
                                  size="small"
                                  status={categories.length > 0 ? "success" : "exception"}
                                />
                              </div>
                            </Space>
                          </Card>
                        </Col>
                        
                        <Col xs={24} lg={12}>
                          <Card className="modern-card" title="Быстрые действия" extra={<ThunderboltOutlined />}>
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              <Button 
                                type="primary" 
                                block 
                                icon={<UploadOutlined />}
                                onClick={() => setIsImportModalVisible(true)}
                                size="large"
                              >
                                Импортировать новые данные
                              </Button>
                              <Button 
                                block 
                                icon={<DownloadOutlined />}
                                onClick={handleExportExcel}
                                disabled={categories.length === 0}
                                size="large"
                              >
                                Экспортировать все данные
                              </Button>
                              <Button 
                                block 
                                icon={<ReloadOutlined />}
                                onClick={loadData}
                                loading={loading}
                                size="large"
                              >
                                Обновить данные
                              </Button>
                            </Space>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  )
                }
              ]}
            />
          </Card>

        {/* Современное модальное окно импорта */}
        <ModernImportModal
          visible={isImportModalVisible}
          status={importStatus}
          progress={importProgress}
          logs={importLog}
          onCancel={() => {
            setIsImportModalVisible(false);
            setImportStatus('idle');
            setImportProgress(0);
            setImportLog([]);
          }}
          onUpload={handleImportExcel}
        />
      </Content>
    </Layout>
    </>
  );
};

export default ConstructionCostsPage;