import React, { useState, useEffect, Key } from 'react';
import {
  Card,
  Button,
  Form,
  message,
  Row,
  Col,
  Alert,
  Space,
  Typography,
  Flex,
  Badge,
  Avatar,
  Popconfirm,
  Divider
} from 'antd';
import * as XLSX from 'xlsx-js-style';
import {
  PlusOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  getCategoriesWithDetails,
  deleteCategory,
  deleteDetail,
  deleteLocation,
  createLocation,
  clearAllData
} from '../lib/supabase/api/construction-costs';
import { importConstructionCosts, type ImportRow } from '../lib/supabase/api/import-costs';
import { supabase } from '../lib/supabase/client';
import EditableTable from '../components/admin/EditableTable';
import ModernImportModal from '../components/admin/ModernImportModal';

const { Title, Text } = Typography;

const ConstructionCostsEditPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [editingKey, setEditingKey] = useState<string>('');
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [form] = Form.useForm();
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [importLog, setImportLog] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      const data = getCombinedData();
      setCombinedData(data);
      
      const defaultExpandedKeys: Key[] = data
        .filter(record => record.type === 'category')
        .map(record => record.key);
      
      setExpandedRowKeys(defaultExpandedKeys);
    }
  }, [categories]);

  const loadData = async () => {
    console.log('🚀 [ConstructionCostsEditPage] Loading data');
    setLoading(true);
    
    try {
      const { data: categoriesData, error: catError } = await getCategoriesWithDetails();
      
      if (catError) {
        message.error('Ошибка загрузки категорий: ' + catError.message);
        return;
      }

      if (categoriesData) {
        setCategories(categoriesData);
        
        const allDetails: any[] = [];
        categoriesData.forEach((cat: any) => {
          if (cat.details) {
            allDetails.push(...cat.details);
          }
        });
        setDetails(allDetails);
      }
    } catch (error) {
      console.error('❌ [loadData] Error:', error);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const getCombinedData = () => {
    const result: any[] = [];
    
    categories.forEach(category => {
      const categoryDetails = category.details || [];
      
      const categoryNode = {
        key: `cat-${category.id}`,
        id: category.id,
        type: 'category',
        level: 1,
        name: category.name,
        description: category.description || '',
        unit: category.unit || '-',
        location: '-',
        categoryName: '-',
        detailName: '-',
        children: [] as any[]
      };
      
      const detailGroups = new Map<string, any[]>();
      categoryDetails.forEach((detail: any) => {
        const groupKey = `${detail.name}_${detail.unit || ''}`;
        if (!detailGroups.has(groupKey)) {
          detailGroups.set(groupKey, []);
        }
        detailGroups.get(groupKey)!.push(detail);
      });
      
      detailGroups.forEach((detailGroup) => {
        const firstDetail = detailGroup[0];
        const detailNode = {
          key: `detail-group-${firstDetail.id}`,
          id: firstDetail.id,
          type: 'detail',
          level: 2,
          name: firstDetail.name,
          description: '',
          unit: firstDetail.unit || '-',
          location: '-',
          categoryName: category.name,
          detailName: '-',
          children: [] as any[]
        };
        
        detailGroup.forEach((detail: any) => {
          if (detail.location) {
            const locationNode = {
              key: `location-${detail.id}-${detail.location.id}`,
              id: detail.location.id,
              detailRecordId: detail.id,
              type: 'location',
              level: 3,
              name: [detail.location.country, detail.location.region, detail.location.city]
                .filter(Boolean).join(', '),
              description: '',
              unit: '-',
              location: [detail.location.country, detail.location.region, detail.location.city]
                .filter(Boolean).join(', '),
              categoryName: category.name,
              detailName: firstDetail.name,
              country: detail.location.country,
              region: detail.location.region,
              city: detail.location.city
            };
            
            detailNode.children.push(locationNode);
          }
        });
        
        if (detailNode.children.length === 0) {
          detailNode.children.push({
            key: `no-location-${firstDetail.id}`,
            id: `no-location-${firstDetail.id}`,
            type: 'no-location',
            level: 3,
            name: 'Без локализации',
            description: '',
            unit: '-',
            location: '-',
            categoryName: category.name,
            detailName: firstDetail.name
          });
        }
        
        categoryNode.children.push(detailNode);
      });
      
      if (categoryNode.children.length === 0) {
        categoryNode.children.push({
          key: `no-details-${category.id}`,
          id: `no-details-${category.id}`,
          type: 'no-details',
          level: 2,
          name: 'Нет видов затрат',
          description: '',
          unit: '-',
          location: '-',
          categoryName: category.name,
          detailName: '-'
        });
      }
      
      result.push(categoryNode);
    });
    
    return result;
  };

  const edit = (record: any) => {
    if (record.type === 'no-details' || record.type === 'no-location') {
      return;
    }
    
    form.setFieldsValue({
      name: record.type === 'location' ? record.name : record.name,
      description: record.description,
      unit: record.unit
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const save = async (record: any) => {
    try {
      const row = await form.validateFields();
      console.log('🚀 [save] Saving:', { record, row });

      if (record.type === 'category') {
        const { error } = await supabase
          .from('cost_categories')
          .update({ 
            name: row.name, 
            description: row.description,
            unit: row.unit !== '-' ? row.unit : null
          })
          .eq('id', record.id);
        
        if (error) throw error;
        message.success('Категория обновлена');
      } else if (record.type === 'detail') {
        const { error } = await supabase
          .from('detail_cost_categories')
          .update({ 
            name: row.name,
            unit: row.unit !== '-' ? row.unit : null
          })
          .eq('id', record.id);
        
        if (error) throw error;
        message.success('Детальная категория обновлена');
      } else if (record.type === 'location') {
        const parts = row.name.split(',').map((s: string) => s.trim());
        const locationData: any = {};
        
        if (parts[0]) locationData.country = parts[0];
        if (parts[1]) locationData.region = parts[1];
        if (parts[2]) locationData.city = parts[2];
        
        const locationString = [locationData.country, locationData.region, locationData.city]
          .filter(Boolean).join(', ');
        
        const currentLocationString = [record.country, record.region, record.city]
          .filter(Boolean).join(', ');
        
        if (locationString !== currentLocationString) {
          const { data: existingLocation, error: searchError } = await supabase
            .from('location')
            .select('id')
            .eq('country', locationData.country || null)
            .eq('region', locationData.region || null) 
            .eq('city', locationData.city || null)
            .maybeSingle();
          
          if (searchError && searchError.code !== 'PGRST116') {
            throw searchError;
          }
          
          let locationId = record.id;
          
          if (existingLocation) {
            locationId = existingLocation.id;
            console.log('✅ [save] Using existing location:', locationId);
          } else {
            const { data: newLocation, error: createError } = await createLocation(
              locationData.country, 
              locationData.region, 
              locationData.city
            );
            
            if (createError || !newLocation) {
              throw createError || new Error('Failed to create location');
            }
            
            locationId = newLocation.id;
            console.log('✅ [save] Created new location:', locationId);
            message.success('Создана новая локализация');
          }
          
          if (locationId !== record.id) {
            const { error: updateError } = await supabase
              .from('detail_cost_categories')
              .update({ location_id: locationId })
              .eq('id', record.detailRecordId);
              
            if (updateError) throw updateError;
            
            const { data: usageCheck, error: usageError } = await supabase
              .from('detail_cost_categories')
              .select('id')
              .eq('location_id', record.id)
              .limit(1);
              
            if (usageError) throw usageError;
            
            if (!usageCheck || usageCheck.length === 0) {
              const { error: deleteError } = await deleteLocation(record.id);
              if (deleteError) {
                console.warn('⚠️ Failed to delete unused location:', deleteError);
              }
            }
          }
        } else {
          const { error } = await supabase
            .from('location')
            .update(locationData)
            .eq('id', record.id);
          
          if (error) throw error;
        }
        
        message.success('Локализация обновлена');
      }

      setEditingKey('');
      await loadData();
    } catch (errInfo) {
      console.error('❌ [save] Error:', errInfo);
      message.error('Ошибка сохранения');
    }
  };

  const handleDelete = async (record: any) => {
    try {
      console.log('🚀 [handleDelete] Deleting:', record);
      
      if (record.type === 'category') {
        const { error } = await deleteCategory(record.id);
        if (error) throw error;
        message.success('Категория удалена');
      } else if (record.type === 'detail') {
        const { error } = await deleteDetail(record.id);
        if (error) throw error;
        message.success('Детальная категория удалена');
      } else if (record.type === 'location') {
        const { error } = await deleteLocation(record.id);
        if (error) throw error;
        message.success('Локализация удалена');
      }
      
      await loadData();
    } catch (error) {
      console.error('❌ [handleDelete] Error:', error);
      message.error('Ошибка удаления');
    }
  };

  // Экспорт в Excel
  const handleExportExcel = () => {
    console.log('🚀 [ConstructionCostsEditPage] Exporting to Excel');
    
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
    console.log('✅ [ConstructionCostsEditPage] Export complete');
  };

  // Очистка всех данных
  const handleClearAll = async () => {
    console.log('🚀 [ConstructionCostsEditPage] Clearing all data');
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

  // Обработчик импорта Excel
  const handleImportExcel = async (file: File) => {
    console.log('🚀 [ConstructionCostsEditPage] Import starting:', file.name);
    
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

  return (
    <>
      <style>
        {`
          .edit-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .edit-page-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 30s linear infinite;
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
        `}
      </style>

      <div className="edit-page-header">
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
              <Button
                className="action-btn"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1890ff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 600
                }}
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/construction-costs/management')}
                size="large"
              >
                К структуре
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      <Card className="modern-card" style={{ overflow: 'hidden' }}>
        <Row gutter={[0, 24]}>
          <Col span={24}>
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>Интерактивное редактирование затрат</span>
                  <Space style={{ marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>Видов затрат:</Text>
                      <Badge 
                        count={details.length} 
                        style={{ backgroundColor: '#52c41a' }}
                        showZero
                      />
                    </div>
                    <Divider type="vertical" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14 }}>Категорий:</Text>
                      <Badge 
                        count={categories.length} 
                        style={{ backgroundColor: '#1890ff' }}
                        showZero
                      />
                    </div>
                  </Space>
                </div>
              }
              description="Редактируйте названия, единицы измерения и описания прямо в таблице. Изменения сохраняются автоматически."
              type="success"
              showIcon
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col span={24}>
            <EditableTable
              dataSource={combinedData}
              loading={loading}
              editingKey={editingKey}
              form={form}
              onEdit={edit}
              onSave={save}
              onCancel={cancel}
              onDelete={handleDelete}
              expandedRowKeys={expandedRowKeys}
              onExpandedRowsChange={setExpandedRowKeys}
            />
          </Col>
        </Row>
      </Card>

      {/* Модальное окно импорта */}
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
        onImport={handleImportExcel}
      />
    </>
  );
};

export default ConstructionCostsEditPage;