import React, { useState } from 'react';
import { 
  Modal, 
  Upload, 
  Button, 
  Table, 
  Space, 
  Alert, 
  Progress, 
  Typography,
  Select,
  Tag,
  message,
  Divider
} from 'antd';
import { 
  UploadOutlined, 
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { UploadFile } from 'antd/es/upload/interface';
import type { 
  CreateConstructionCostInput,
  ConstructionCostCategory 
} from '../../lib/supabase/types/construction-costs';

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface ImportConstructionCostsModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (costs: CreateConstructionCostInput[]) => Promise<void>;
  categories: ConstructionCostCategory[];
}

interface ParsedCost {
  code: string;
  name: string;
  unit: string;
  base_price: number;
  market_price?: number;
  supplier?: string;
  description?: string;
  tags?: string[];
  category_name?: string;
  category_id?: string;
  is_valid: boolean;
  errors: string[];
}

export const ImportConstructionCostsModal: React.FC<ImportConstructionCostsModalProps> = ({
  visible,
  onClose,
  onImport,
  categories
}) => {
  console.log('🚀 [ImportConstructionCostsModal] Component mounted');

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedCost[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [importProgress, setImportProgress] = useState(0);

  const handleFileUpload = (file: File) => {
    console.log('📁 [handleFileUpload] Processing file:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('📊 [handleFileUpload] Parsed rows:', jsonData.length);
        
        // Parse and validate data
        const parsed = jsonData.map((row: any) => {
          const errors: string[] = [];
          
          // Required fields validation
          if (!row['Код'] && !row['code']) errors.push('Отсутствует код');
          if (!row['Наименование'] && !row['name']) errors.push('Отсутствует наименование');
          if (!row['Единица'] && !row['unit']) errors.push('Отсутствует единица измерения');
          if (!row['Цена'] && !row['base_price'] && !row['Базовая цена']) errors.push('Отсутствует цена');
          
          // Parse price
          const priceStr = row['Цена'] || row['base_price'] || row['Базовая цена'] || '0';
          const basePrice = parseFloat(String(priceStr).replace(/[^\d.-]/g, ''));
          
          const marketPriceStr = row['Рыночная цена'] || row['market_price'];
          const marketPrice = marketPriceStr ? parseFloat(String(marketPriceStr).replace(/[^\d.-]/g, '')) : undefined;
          
          if (isNaN(basePrice)) errors.push('Некорректная цена');
          
          // Parse tags
          const tagsStr = row['Теги'] || row['tags'] || '';
          const tags = tagsStr ? String(tagsStr).split(',').map((t: string) => t.trim()).filter(Boolean) : [];
          
          // Find category by name
          const categoryName = row['Категория'] || row['category'];
          let categoryId: string | undefined;
          
          if (categoryName) {
            const category = categories.find(c => 
              c.name.toLowerCase() === String(categoryName).toLowerCase() ||
              c.code.toLowerCase() === String(categoryName).toLowerCase()
            );
            categoryId = category?.id;
          }
          
          return {
            code: String(row['Код'] || row['code'] || ''),
            name: String(row['Наименование'] || row['name'] || ''),
            unit: String(row['Единица'] || row['unit'] || ''),
            base_price: basePrice,
            market_price: marketPrice,
            supplier: row['Поставщик'] || row['supplier'] || undefined,
            description: row['Описание'] || row['description'] || undefined,
            tags,
            category_name: categoryName,
            category_id: categoryId || selectedCategory,
            is_valid: errors.length === 0,
            errors
          } as ParsedCost;
        });
        
        setParsedData(parsed);
        
        const validCount = parsed.filter(p => p.is_valid).length;
        const invalidCount = parsed.length - validCount;
        
        if (invalidCount > 0) {
          message.warning(`Найдено ${invalidCount} строк с ошибками`);
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
    
    const validCosts = parsedData
      .filter(cost => cost.is_valid)
      .map(cost => ({
        code: cost.code,
        name: cost.name,
        unit: cost.unit,
        base_price: cost.base_price,
        market_price: cost.market_price,
        supplier: cost.supplier,
        description: cost.description,
        tags: cost.tags,
        category_id: cost.category_id || selectedCategory,
        is_active: true
      }));
    
    if (validCosts.length === 0) {
      message.error('Нет валидных данных для импорта');
      return;
    }
    
    setImporting(true);
    setImportProgress(0);
    
    try {
      // Import in batches of 50
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < validCosts.length; i += batchSize) {
        batches.push(validCosts.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        await onImport(batches[i]);
        setImportProgress(Math.round(((i + 1) / batches.length) * 100));
      }
      
      message.success(`Успешно импортировано ${validCosts.length} затрат`);
      handleClose();
      
    } catch (error) {
      console.error('❌ [handleImport] Import error:', error);
      message.error('Ошибка при импорте данных');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const handleClose = () => {
    setFileList([]);
    setParsedData([]);
    setSelectedCategory(undefined);
    setImportProgress(0);
    onClose();
  };

  const columns = [
    {
      title: 'Статус',
      key: 'status',
      width: 80,
      render: (_: any, record: ParsedCost) => (
        record.is_valid ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
        )
      )
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 100
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'Единица',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: 'Цена',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 100,
      render: (price: number) => `${price.toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Категория',
      key: 'category',
      width: 150,
      render: (_: any, record: ParsedCost) => (
        record.category_id ? (
          <Tag color="blue">
            {categories.find(c => c.id === record.category_id)?.name || record.category_name}
          </Tag>
        ) : record.category_name ? (
          <Tag color="orange">{record.category_name} (не найдена)</Tag>
        ) : (
          <Tag>Не указана</Tag>
        )
      )
    },
    {
      title: 'Ошибки',
      key: 'errors',
      render: (_: any, record: ParsedCost) => (
        record.errors.length > 0 && (
          <Space direction="vertical" size={0}>
            {record.errors.map((error, idx) => (
              <Text key={idx} type="danger" style={{ fontSize: 12 }}>
                {error}
              </Text>
            ))}
          </Space>
        )
      )
    }
  ];

  const validCount = parsedData.filter(p => p.is_valid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined />
          <span>Импорт затрат из Excel</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Отмена
        </Button>,
        <Button
          key="import"
          type="primary"
          onClick={handleImport}
          disabled={validCount === 0}
          loading={importing}
        >
          Импортировать {validCount > 0 && `(${validCount})`}
        </Button>
      ]}
    >
      {parsedData.length === 0 ? (
        <>
          <Alert
            message="Формат файла Excel"
            description={
              <div>
                <p>Файл должен содержать следующие колонки:</p>
                <ul>
                  <li><strong>Код</strong> - уникальный код затрат (обязательно)</li>
                  <li><strong>Наименование</strong> - название затрат (обязательно)</li>
                  <li><strong>Единица</strong> - единица измерения (обязательно)</li>
                  <li><strong>Цена</strong> или <strong>Базовая цена</strong> - цена за единицу (обязательно)</li>
                  <li><strong>Рыночная цена</strong> - рыночная цена (опционально)</li>
                  <li><strong>Категория</strong> - название или код категории (опционально)</li>
                  <li><strong>Поставщик</strong> - поставщик (опционально)</li>
                  <li><strong>Описание</strong> - описание затрат (опционально)</li>
                  <li><strong>Теги</strong> - теги через запятую (опционально)</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              placeholder="Выберите категорию по умолчанию (опционально)"
              allowClear
              style={{ width: '100%' }}
              value={selectedCategory}
              onChange={setSelectedCategory}
            >
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>

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
          </Space>
        </>
      ) : (
        <>
          {importing && (
            <Progress 
              percent={importProgress} 
              status="active"
              style={{ marginBottom: 16 }}
            />
          )}

          <Space style={{ marginBottom: 16 }}>
            <Text>Всего строк: <strong>{parsedData.length}</strong></Text>
            <Divider type="vertical" />
            <Text style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> Валидных: <strong>{validCount}</strong>
            </Text>
            {invalidCount > 0 && (
              <>
                <Divider type="vertical" />
                <Text style={{ color: '#ff4d4f' }}>
                  <CloseCircleOutlined /> С ошибками: <strong>{invalidCount}</strong>
                </Text>
              </>
            )}
          </Space>

          {!selectedCategory && parsedData.some(p => !p.category_id) && (
            <Alert
              message="Категория не указана"
              description="Выберите категорию по умолчанию для строк без категории"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Select
                  placeholder="Выберите категорию"
                  style={{ width: 200 }}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                >
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Select.Option>
                  ))}
                </Select>
              }
            />
          )}

          <Table
            columns={columns}
            dataSource={parsedData}
            rowKey={(record, index) => `${record.code}-${index}`}
            pagination={{ pageSize: 50 }}
            scroll={{ y: 400 }}
            size="small"
          />
        </>
      )}
    </Modal>
  );
};