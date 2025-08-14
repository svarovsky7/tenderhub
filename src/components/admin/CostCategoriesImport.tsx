import React, { useState } from 'react';
import { Upload, Button, Table, message, Card, Space, Typography, Alert, Progress } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import * as XLSX from 'xlsx';
import { 
  importCostCategoriesWithOverwrite as importCostCategories, 
  type CostCategoryImportData 
} from '../../lib/supabase/api/cost-categories-import';

const { Title, Text } = Typography;

export const CostCategoriesImport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<CostCategoryImportData[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload: UploadProps['customRequest'] = async (options) => {
    console.log('🚀 [CostCategoriesImport] File upload started');
    const { file } = options;
    
    try {
      setLoading(true);
      setImportResults(null);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          console.log('📦 [CostCategoriesImport] Excel data parsed:', jsonData.length, 'rows');
          
          // Пропускаем заголовок и преобразуем данные
          // Первый столбец теперь содержит нумерацию
          const importData: CostCategoryImportData[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length >= 5) {
              importData.push({
                sortOrder: parseInt(String(row[0] || i), 10) || i, // Нумерация из первого столбца
                categoryName: String(row[1] || '').trim(),
                categoryUnit: row[2] ? String(row[2]).trim() : undefined,
                detailCategoryName: String(row[3] || '').trim(),
                detailCategoryUnit: String(row[4] || '').trim(),
                locationName: String(row[5] || '').trim()
              });
            }
          }
          
          console.log('✅ [CostCategoriesImport] Data prepared:', importData.length, 'valid rows');
          setPreviewData(importData);
          options.onSuccess?.(null);
        } catch (error) {
          console.error('❌ [CostCategoriesImport] Failed to parse Excel:', error);
          message.error('Ошибка при чтении файла Excel');
          options.onError?.(error as Error);
        }
      };
      
      reader.readAsBinaryString(file as File);
    } catch (error) {
      console.error('❌ [CostCategoriesImport] Upload error:', error);
      message.error('Ошибка при загрузке файла');
      options.onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    console.log('🚀 [CostCategoriesImport] Import started');
    
    if (previewData.length === 0) {
      message.warning('Нет данных для импорта');
      return;
    }
    
    setLoading(true);
    setImportProgress(0);
    
    try {
      // Импортируем данные пакетами для отображения прогресса
      const batchSize = 10;
      const totalBatches = Math.ceil(previewData.length / batchSize);
      let allResults = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = previewData.slice(i * batchSize, (i + 1) * batchSize);
        const batchResults = await importCostCategories(batch);
        
        allResults.success += batchResults.success;
        allResults.failed += batchResults.failed;
        allResults.errors.push(...batchResults.errors);
        
        setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
      }
      
      setImportResults(allResults);
      
      if (allResults.failed === 0) {
        message.success(`Успешно импортировано ${allResults.success} записей`);
      } else {
        message.warning(`Импортировано ${allResults.success} записей, ошибок: ${allResults.failed}`);
      }
      
      console.log('✅ [CostCategoriesImport] Import completed:', allResults);
    } catch (error) {
      console.error('❌ [CostCategoriesImport] Import failed:', error);
      message.error('Ошибка при импорте данных');
    } finally {
      setLoading(false);
      setImportProgress(0);
    }
  };

  const handleClear = () => {
    console.log('🔄 [CostCategoriesImport] Clearing data');
    setPreviewData([]);
    setImportResults(null);
    setImportProgress(0);
  };

  const downloadTemplate = () => {
    console.log('📥 [CostCategoriesImport] Downloading template');
    
    const templateData = [
      ['№', 'Категория затрат', 'Ед. изм. категории', 'Детальная категория', 'Ед. изм. детальной категории', 'Локация'],
      ['1', 'Материалы', 'шт', 'Бетон М300', 'м³', 'Объект №1'],
      ['2', 'Материалы', 'шт', 'Арматура А500С', 'тн', 'Объект №1'],
      ['3', 'Работы', 'услуга', 'Монтаж опалубки', 'м²', 'Объект №2'],
      ['4', 'Работы', 'услуга', 'Укладка бетона', 'м³', 'Объект №2'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Категории затрат');
    
    // Устанавливаем ширину колонок
    ws['!cols'] = [
      { wch: 5 },  // №
      { wch: 20 }, // Категория затрат
      { wch: 20 }, // Ед. изм. категории
      { wch: 30 }, // Детальная категория
      { wch: 25 }, // Ед. изм. детальной категории
      { wch: 20 }, // Локация
    ];
    
    XLSX.writeFile(wb, 'cost_categories_template.xlsx');
    message.success('Шаблон успешно загружен');
  };

  const columns = [
    {
      title: '№',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: '5%',
    },
    {
      title: 'Категория затрат',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: '20%',
    },
    {
      title: 'Ед. изм. категории',
      dataIndex: 'categoryUnit',
      key: 'categoryUnit',
      width: '15%',
      render: (text: string) => text || '-',
    },
    {
      title: 'Детальная категория',
      dataIndex: 'detailCategoryName',
      key: 'detailCategoryName',
      width: '22%',
    },
    {
      title: 'Ед. изм. детальной',
      dataIndex: 'detailCategoryUnit',
      key: 'detailCategoryUnit',
      width: '18%',
    },
    {
      title: 'Локация',
      dataIndex: 'locationName',
      key: 'locationName',
      width: '20%',
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <Title level={3}>Импорт категорий затрат</Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="Инструкция по импорту"
            description={
              <div>
                <p>1. Скачайте шаблон Excel файла с примером заполнения</p>
                <p>2. Заполните файл данными в следующем формате:</p>
                <ul>
                  <li><strong>Столбец 1:</strong> № - Порядковый номер (определяет порядок отображения)</li>
                  <li><strong>Столбец 2:</strong> Категория затрат (например: Материалы, Работы)</li>
                  <li><strong>Столбец 3:</strong> Единица измерения категории (опционально)</li>
                  <li><strong>Столбец 4:</strong> Детальная категория (например: Бетон М300)</li>
                  <li><strong>Столбец 5:</strong> Единица измерения детальной категории (например: м³)</li>
                  <li><strong>Столбец 6:</strong> Локация (например: Объект №1)</li>
                </ul>
                <p>3. Загрузите заполненный файл и нажмите "Импортировать"</p>
                <p><strong>Важно:</strong> При повторном импорте существующие данные будут обновлены, а порядок изменится согласно номерам в первом столбце.</p>
              </div>
            }
            type="info"
            showIcon
          />
          
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadTemplate}
            >
              Скачать шаблон
            </Button>
            
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              customRequest={handleFileUpload}
              disabled={loading}
            >
              <Button
                icon={<UploadOutlined />}
                loading={loading}
              >
                Загрузить Excel файл
              </Button>
            </Upload>
            
            {previewData.length > 0 && (
              <>
                <Button
                  type="primary"
                  onClick={handleImport}
                  loading={loading}
                  disabled={importProgress > 0}
                >
                  Импортировать ({previewData.length} записей)
                </Button>
                
                <Button
                  icon={<DeleteOutlined />}
                  onClick={handleClear}
                  disabled={loading}
                  danger
                >
                  Очистить
                </Button>
              </>
            )}
          </Space>
          
          {importProgress > 0 && (
            <Progress
              percent={importProgress}
              status={importProgress === 100 ? 'success' : 'active'}
            />
          )}
          
          {importResults && (
            <Alert
              message="Результаты импорта"
              description={
                <div>
                  <Text strong>Успешно импортировано: </Text>
                  <Text type="success">{importResults.success}</Text>
                  <br />
                  <Text strong>Ошибок: </Text>
                  <Text type="danger">{importResults.failed}</Text>
                  {importResults.errors.length > 0 && (
                    <div className="mt-2">
                      <Text strong>Детали ошибок:</Text>
                      <ul>
                        {importResults.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>
                            <Text type="danger" className="text-sm">{error}</Text>
                          </li>
                        ))}
                        {importResults.errors.length > 5 && (
                          <li>
                            <Text type="secondary" className="text-sm">
                              и еще {importResults.errors.length - 5} ошибок...
                            </Text>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              }
              type={importResults.failed === 0 ? 'success' : 'warning'}
              showIcon
              closable
            />
          )}
          
          {previewData.length > 0 && (
            <div>
              <Title level={5}>Предпросмотр данных для импорта</Title>
              <Table
                dataSource={previewData.slice(0, 10)}
                columns={columns}
                rowKey={(_, index) => index?.toString() || '0'}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
                footer={() => 
                  previewData.length > 10 ? (
                    <Text type="secondary">
                      Показаны первые 10 записей из {previewData.length}
                    </Text>
                  ) : null
                }
              />
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};