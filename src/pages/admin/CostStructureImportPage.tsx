import React, { useState } from 'react';
import {
  Card,
  Button,
  Upload,
  Table,
  Space,
  Alert,
  Progress,
  Typography,
  Tag,
  message,
  Steps,
  Row,
  Col,
  Statistic,
  Divider,
  Tooltip,
  Badge
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  ImportOutlined,
  FolderOutlined,
  PartitionOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { costStructureApi } from '../../lib/supabase/api/cost-structure';
import type { ImportCostRow, ImportResult } from '../../lib/supabase/types/new-cost-structure';

const { Text } = Typography;
const { Dragger } = Upload;
const { Step } = Steps;

interface ParsedRow {
  rowNumber: number;
  // Category columns (1-3)
  col1_categoryCode: string;
  col2_categoryName: string;
  col3_categoryDescription: string;
  // Detail columns (4-5)
  col4_detailCode: string;
  col5_detailName: string;
  // Location column (6)
  col6_locationCode: string;
  col7_locationName: string;
  // Additional data
  col8_quantity?: number;
  col9_unitPrice?: number;
  col10_unit?: string;
  // Validation
  isValid: boolean;
  errors: string[];
  // Visual grouping
  categoryGroup?: string;
  isNewCategory?: boolean;
  isNewDetail?: boolean;
  isNewLocation?: boolean;
}

export const CostStructureImportPage: React.FC = () => {
  console.log('🚀 [CostStructureImportPage] Component mounted');

  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressMessage, setImportProgressMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileUpload = (file: File) => {
    console.log('📁 [handleFileUpload] Processing file:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('📊 [handleFileUpload] Parsed rows:', jsonData.length);
        
        // Parse rows with validation
        let currentCategory = '';
        const parsed: ParsedRow[] = jsonData
          .slice(1) // Skip header row
          .map((row: any, index: number) => {
            const errors: string[] = [];
            
            // Extract columns
            // Столбцы 1-3: Категория (код, название, описание)
            const col1 = String(row[0] || '').trim(); // Код категории
            const col2 = String(row[1] || '').trim(); // Название категории
            const col3 = String(row[2] || '').trim(); // Описание категории
            // Столбцы 4-5: Детализация (код, название)
            const col4 = String(row[3] || '').trim(); // Код детализации
            const col5 = String(row[4] || '').trim(); // Название детализации
            // Столбец 6: Локация (название)
            const col6 = String(row[5] || '').trim(); // Название локации
            // Дополнительные столбцы (опционально)
            const col7 = String(row[6] || '').trim(); // Резерв (может быть код локации)
            const col8 = parseFloat(row[7]) || undefined; // Количество
            const col9 = parseFloat(row[8]) || undefined; // Цена
            const col10 = String(row[9] || '').trim() || undefined; // Единица измерения
            
            // Track current category for grouping
            if (col1 && col2) {
              currentCategory = col1;
            }
            
            // Validation
            if (!col1 && !col4 && !col6) {
              errors.push('Строка пустая');
            }
            
            if (col4 && !currentCategory) {
              errors.push('Детальная категория без основной категории');
            }
            
            if (col6 && !col4) {
              errors.push('Локация без детальной категории');
            }
            
            return {
              rowNumber: index + 2, // +2 because Excel rows start at 1 and we skipped header
              col1_categoryCode: col1,
              col2_categoryName: col2,
              col3_categoryDescription: col3,
              col4_detailCode: col4,
              col5_detailName: col5,
              col6_locationCode: col7 || '', // Столбец 7 - опциональный код локации
              col7_locationName: col6, // Столбец 6 - название локации (ОБЯЗАТЕЛЬНОЕ)
              col8_quantity: col8,
              col9_unitPrice: col9,
              col10_unit: col10,
              isValid: errors.length === 0,
              errors,
              categoryGroup: currentCategory,
              isNewCategory: !!col1,
              isNewDetail: !!col4,
              isNewLocation: !!col6
            };
          })
          .filter(row => row.col1_categoryCode || row.col4_detailCode || row.col6_locationCode);
        
        setParsedData(parsed);
        setCurrentStep(1);
        
        const validCount = parsed.filter(r => r.isValid).length;
        const invalidCount = parsed.length - validCount;
        
        if (invalidCount > 0) {
          message.warning(`Найдено ${invalidCount} строк с предупреждениями`);
        } else {
          message.success(`Успешно загружено ${validCount} строк`);
        }
        
      } catch (error) {
        console.error('❌ [handleFileUpload] Parse error:', error);
        message.error('Ошибка при чтении файла');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    console.log('🚀 [handleImport] Starting import');
    setImporting(true);
    setImportProgress(0);
    setImportProgressMessage('Подготовка данных...');
    
    try {
      // Convert parsed data to import format
      const importRows: ImportCostRow[] = parsedData.map(row => ({
        rowNumber: row.rowNumber,
        categoryCode: row.col1_categoryCode,
        categoryName: row.col2_categoryName,
        categoryDescription: row.col3_categoryDescription,
        detailCode: row.col4_detailCode,
        detailName: row.col5_detailName,
        detailUnit: row.col10_unit,
        detailPrice: row.col9_unitPrice,
        locationCode: row.col6_locationCode,
        locationName: row.col7_locationName,
        quantity: row.col8_quantity,
        unitPrice: row.col9_unitPrice
      }));
      
      // Import data with real progress
      const result = await costStructureApi.importCostStructure(
        importRows,
        (progress, message) => {
          setImportProgress(progress);
          setImportProgressMessage(message);
        }
      );
      setImportResult(result);
      setCurrentStep(2);
      
      if (result.success) {
        message.success('Импорт успешно завершен!');
      } else {
        message.error('Импорт завершен с ошибками');
      }
      
    } catch (error) {
      console.error('❌ [handleImport] Import error:', error);
      message.error('Ошибка при импорте данных');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    console.log('📥 [downloadTemplate] Downloading template');
    
    const templateData = [
      ['Код категории', 'Название категории', 'Описание категории', 'Код детали', 'Название детали', 'Локация', '', 'Количество', 'Цена за ед.', 'Ед. изм.'],
      // Организационные мероприятия - все на Улице
      ['001', 'Организационные мероприятия', 'Организация строительной площадки', '001.001', 'Бытовой городок', 'Улица', '', 1, 150000, 'мес'],
      ['', '', '', '001.002', 'Временные здания и сооружения', 'Улица', '', 100, 5000, 'м2'],
      ['', '', '', '001.003', 'Организация строительной площадки (аренда ДГУ)', 'Улица', '', 1, 200000, 'мес'],
      ['', '', '', '001.004', 'Охрана строительной площадки', 'Улица', '', 12, 180000, 'мес'],
      // Проектные работы - в Здании
      ['002', 'Проектные работы', 'Проектирование и авторский надзор', '002.001', 'Разработка РД (включая КМД на фасады)', 'Здание', '', 1, 5000000, 'компл'],
      ['', '', '', '002.002', 'Разработка АИ на МОПы и паркинг', 'Здание', '', 1, 2000000, 'компл'],
      ['', '', '', '002.003', 'Авторский надзор', 'Здание', '', 1, 1500000, 'компл'],
      // Отделочные работы - по локациям
      ['003', 'Отделочные работы', 'Внутренняя отделка', '003.001', 'Отделка квартир', 'Квартира', '', 100, 25000, 'м2'],
      ['', '', '', '003.002', 'Слаботочные системы в квартирах', 'Квартира', '', 100, 5000, 'м2'],
      ['', '', '', '003.003', 'Отделка МОП', 'МОП НЧ', '', 500, 3500, 'м2'],
      ['', '', '', '003.004', 'Отделка паркинга', 'Паркинг', '', 1000, 1500, 'м2'],
      // Благоустройство - на Улице
      ['004', 'Благоустройство', 'Благоустройство территории', '004.001', 'Озеленение', 'Улица', '', 1000, 2500, 'м2'],
      ['', '', '', '004.002', 'Дорожные покрытия', 'Улица', '', 2000, 3000, 'м2'],
      ['', '', '', '004.003', 'Малые архитектурные формы', 'Улица', '', 1, 500000, 'компл'],
      // Тестовый блок - множественные связи с повторяющимися локациями
      ['005', 'Тестовая категория', 'Тест множественных связей', '005.001', 'Монтаж временных ограждений', 'Улица', '', 100, 1000, 'м.п.'],
      ['', '', '', '005.002', 'Устройство временных дорог', 'Улица', '', 500, 2000, 'м2'],
      ['', '', '', '005.003', 'Установка бытовок', 'Улица', '', 10, 15000, 'шт'],
      ['', '', '', '005.004', 'Монолитные работы', 'Здание', '', 1000, 4000, 'м3'],
      ['', '', '', '005.005', 'Кирпичная кладка', 'Здание', '', 2000, 3000, 'м2'],
      ['', '', '', '005.006', 'Устройство кровли', 'Здание', '', 1500, 2500, 'м2'],
      ['', '', '', '005.007', 'Отделка квартир черновая', 'Квартира', '', 5000, 3500, 'м2'],
      ['', '', '', '005.008', 'Отделка квартир чистовая', 'Квартира', '', 5000, 5500, 'м2'],
      ['', '', '', '005.009', 'Электромонтаж в квартирах', 'Квартира', '', 100, 25000, 'шт'],
      ['', '', '', '005.010', 'Благоустройство территории', 'Улица', '', 2000, 1500, 'м2'],
      ['', '', '', '005.011', 'Озеленение', 'Улица', '', 1000, 2000, 'м2'],
      ['', '', '', '005.012', 'Установка МАФ', 'Улица', '', 15, 50000, 'шт']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Код категории
      { wch: 25 }, // Название категории
      { wch: 30 }, // Описание категории
      { wch: 15 }, // Код детали
      { wch: 35 }, // Название детали
      { wch: 20 }, // Локация
      { wch: 10 }, // Резерв
      { wch: 12 }, // Количество
      { wch: 15 }, // Цена
      { wch: 10 }  // Ед. изм.
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Импорт затрат');
    XLSX.writeFile(wb, 'Шаблон_импорт_структуры_затрат.xlsx');
    
    message.success('Шаблон загружен');
  };

  // Calculate statistics
  const stats = {
    categories: new Set(parsedData.filter(r => r.col1_categoryCode).map(r => r.col1_categoryCode)).size,
    details: new Set(parsedData.filter(r => r.col4_detailCode).map(r => r.col4_detailCode)).size,
    locations: new Set(parsedData.filter(r => r.col6_locationCode).map(r => r.col6_locationCode)).size,
    mappings: parsedData.filter(r => r.col4_detailCode && r.col6_locationCode).length
  };

  const columns = [
    {
      title: '№',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 60,
      fixed: 'left' as const
    },
    {
      title: 'Категория',
      key: 'category',
      width: 300,
      render: (_: any, record: ParsedRow) => (
        <Space direction="vertical" size={0}>
          {record.isNewCategory && (
            <Space>
              <Badge status="processing" />
              <Tag icon={<FolderOutlined />} color="blue">
                {record.col1_categoryCode}
              </Tag>
              <Text strong>{record.col2_categoryName}</Text>
            </Space>
          )}
          {record.col3_categoryDescription && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 20 }}>
              {record.col3_categoryDescription}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Детальная категория',
      key: 'detail',
      width: 250,
      render: (_: any, record: ParsedRow) => (
        record.isNewDetail && (
          <Space>
            <Tag icon={<PartitionOutlined />} color="green">
              {record.col4_detailCode}
            </Tag>
            <Text>{record.col5_detailName}</Text>
            {record.col10_unit && (
              <Tag>{record.col10_unit}</Tag>
            )}
          </Space>
        )
      )
    },
    {
      title: 'Локация',
      key: 'location',
      width: 250,
      render: (_: any, record: ParsedRow) => (
        record.isNewLocation && (
          <Space>
            <Tag icon={<EnvironmentOutlined />} color="orange">
              {record.col6_locationCode}
            </Tag>
            <Text>{record.col7_locationName}</Text>
          </Space>
        )
      )
    },
    {
      title: 'Кол-во',
      dataIndex: 'col8_quantity',
      key: 'quantity',
      width: 80,
      render: (val: number) => val?.toLocaleString('ru-RU')
    },
    {
      title: 'Цена',
      dataIndex: 'col9_unitPrice',
      key: 'price',
      width: 100,
      render: (val: number) => val ? `${val.toLocaleString('ru-RU')} ₽` : '-'
    },
    {
      title: 'Статус',
      key: 'status',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: ParsedRow) => (
        record.isValid ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
        ) : (
          <Tooltip title={record.errors.join(', ')}>
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          </Tooltip>
        )
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <ImportOutlined />
            <span>Импорт структуры затрат</span>
          </Space>
        }
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
          >
            Скачать шаблон
          </Button>
        }
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="Загрузка файла" icon={<UploadOutlined />} />
          <Step title="Проверка данных" icon={<CheckCircleOutlined />} />
          <Step title="Результат импорта" icon={<ImportOutlined />} />
        </Steps>

        {currentStep === 0 && (
          <>
            <Alert
              message="Формат импорта"
              description={
                <div>
                  <p>Excel файл должен содержать следующие колонки:</p>
                  <ol>
                    <li><strong>Столбцы 1-3:</strong> Код, Название и Описание основной категории</li>
                    <li><strong>Столбцы 4-5:</strong> Код и Название детальной категории</li>
                    <li><strong>Столбец 6:</strong> Название локации (например: Здание, Улица, Квартира)</li>
                    <li><strong>Столбец 7:</strong> Код локации (опционально, если не указан - создается автоматически из названия)</li>
                    <li><strong>Столбцы 8-10:</strong> Количество, Цена, Единица измерения (опционально)</li>
                  </ol>
                  <p><strong>Важно:</strong> Каждая строка с детализацией и локацией создает связь между ними.</p>
                  <p><strong>Пример:</strong> Строка с детализацией "Организация площадки" и локацией "Улица" создаст связь между ними.</p>
                  <p><strong>Примечание:</strong> Одна локация может быть связана с несколькими детализациями.</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Dragger
              fileList={fileList}
              beforeUpload={(file) => {
                handleFileUpload(file);
                setFileList([file]);
                return false;
              }}
              onRemove={() => {
                setFileList([]);
                setParsedData([]);
                setCurrentStep(0);
              }}
              accept=".xlsx,.xls"
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              </p>
              <p className="ant-upload-text">
                Нажмите или перетащите Excel файл для загрузки
              </p>
              <p className="ant-upload-hint">
                Поддерживаются файлы .xlsx и .xls
              </p>
            </Dragger>
          </>
        )}

        {currentStep === 1 && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Категорий"
                    value={stats.categories}
                    prefix={<FolderOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Детальных категорий"
                    value={stats.details}
                    prefix={<PartitionOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Локаций"
                    value={stats.locations}
                    prefix={<EnvironmentOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Связей"
                    value={stats.mappings}
                    valueStyle={{ color: '#a0d911' }}
                  />
                </Card>
              </Col>
            </Row>

            {importing && (
              <div style={{ marginBottom: 16 }}>
                <Progress
                  percent={importProgress}
                  status="active"
                />
                {importProgressMessage && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, textAlign: 'center' }}>
                    {importProgressMessage}
                  </Text>
                )}
              </div>
            )}

            <Table
              columns={columns}
              dataSource={parsedData}
              rowKey="rowNumber"
              pagination={{ pageSize: 50 }}
              scroll={{ x: 1200, y: 400 }}
              size="small"
              rowClassName={(record) => {
                if (record.isNewCategory) return 'category-row';
                if (!record.isValid) return 'error-row';
                return '';
              }}
            />

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCurrentStep(0)}>
                Назад
              </Button>
              <Button
                type="primary"
                icon={<ImportOutlined />}
                onClick={handleImport}
                loading={importing}
                disabled={parsedData.length === 0}
              >
                Импортировать
              </Button>
            </Space>
          </>
        )}

        {currentStep === 2 && importResult && (
          <>
            <Alert
              message={importResult.success ? 'Импорт завершен успешно!' : 'Импорт завершен с ошибками'}
              type={importResult.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Категорий создано"
                    value={importResult.categoriesCreated}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Детальных категорий создано"
                    value={importResult.detailCategoriesCreated}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Локаций создано"
                    value={importResult.locationsCreated}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card bordered={false}>
                  <Statistic
                    title="Связей создано"
                    value={importResult.mappingsCreated}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={() => window.open('/admin/cost-structure-view', '_blank')}
              >
                Перейти к просмотру структуры затрат
              </Button>
            </div>

            {importResult.errors.length > 0 && (
              <Alert
                message="Ошибки при импорте"
                description={
                  <ul>
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                }
                type="error"
                showIcon
              />
            )}

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                onClick={() => {
                  setCurrentStep(0);
                  setParsedData([]);
                  setFileList([]);
                  setImportResult(null);
                }}
              >
                Новый импорт
              </Button>
            </Space>
          </>
        )}
      </Card>

      <style>{`
        .category-row {
          background-color: #e6f7ff;
          font-weight: 500;
        }
        .error-row {
          background-color: #fff2e8;
        }
      `}</style>
    </div>
  );
};