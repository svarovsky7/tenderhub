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
  Divider,
  InputNumber
} from 'antd';
import { 
  UploadOutlined, 
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { UploadFile } from 'antd/es/upload/interface';
import type { 
  CreateTenderConstructionCostInput,
  TenderCostGroup 
} from '../../lib/supabase/types/construction-costs';
import { constructionCostsApi } from '../../lib/supabase/api/construction-costs';

const { Text } = Typography;
const { Dragger } = Upload;

interface ImportTenderCostsModalProps {
  visible: boolean;
  tenderId: string;
  onClose: () => void;
  onImport: (costs: CreateTenderConstructionCostInput[]) => Promise<void>;
  groups: TenderCostGroup[];
}

interface ParsedTenderCost {
  code: string;
  name: string;
  quantity: number;
  unit_price: number;
  markup_percent?: number;
  group_name?: string;
  group_id?: string;
  cost_id?: string;
  is_valid: boolean;
  errors: string[];
}

export const ImportTenderCostsModal: React.FC<ImportTenderCostsModalProps> = ({
  visible,
  tenderId,
  onClose,
  onImport,
  groups
}) => {
  console.log('🚀 [ImportTenderCostsModal] Component mounted');

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedTenderCost[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [defaultMarkup, setDefaultMarkup] = useState<number>(0);
  const [importProgress, setImportProgress] = useState(0);
  const [availableCosts, setAvailableCosts] = useState<any[]>([]);

  // Load available costs when modal opens
  React.useEffect(() => {
    if (visible) {
      loadAvailableCosts();
    }
  }, [visible]);

  const loadAvailableCosts = async () => {
    try {
      const costs = await constructionCostsApi.getCosts({ is_active: true });
      setAvailableCosts(costs);
      console.log('📦 [loadAvailableCosts] Loaded costs:', costs.length);
    } catch (error) {
      console.error('❌ [loadAvailableCosts] Error:', error);
    }
  };

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
          const code = row['Код'] || row['code'];
          const name = row['Наименование'] || row['name'];
          
          if (!code && !name) {
            errors.push('Отсутствует код или наименование');
          }
          
          // Parse quantity
          const quantityStr = row['Количество'] || row['quantity'] || '1';
          const quantity = parseFloat(String(quantityStr).replace(/[^\d.-]/g, ''));
          if (isNaN(quantity) || quantity <= 0) errors.push('Некорректное количество');
          
          // Parse price
          const priceStr = row['Цена за единицу'] || row['unit_price'] || row['Цена'];
          const unitPrice = parseFloat(String(priceStr).replace(/[^\d.-]/g, ''));
          if (isNaN(unitPrice) || unitPrice < 0) errors.push('Некорректная цена');
          
          // Parse markup
          const markupStr = row['Наценка %'] || row['markup_percent'] || row['Наценка'];
          const markupPercent = markupStr ? 
            parseFloat(String(markupStr).replace(/[^\d.-]/g, '')) : 
            defaultMarkup;
          
          // Find cost by code or name
          let costId: string | undefined;
          if (code) {
            const cost = availableCosts.find(c => c.code === code);
            costId = cost?.id;
            if (!costId) errors.push(`Затраты с кодом "${code}" не найдены`);
          } else if (name) {
            const cost = availableCosts.find(c => c.name === name);
            costId = cost?.id;
            if (!costId) errors.push(`Затраты "${name}" не найдены`);
          }
          
          // Find group by name
          const groupName = row['Группа'] || row['group'];
          let groupId: string | undefined;
          
          if (groupName) {
            const group = groups.find(g => 
              g.name.toLowerCase() === String(groupName).toLowerCase()
            );
            groupId = group?.id;
          }
          
          return {
            code: code || '',
            name: name || '',
            quantity,
            unit_price: unitPrice,
            markup_percent: markupPercent,
            group_name: groupName,
            group_id: groupId || selectedGroup,
            cost_id: costId,
            is_valid: errors.length === 0 && !!costId,
            errors
          } as ParsedTenderCost;
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
      .filter(cost => cost.is_valid && cost.cost_id)
      .map(cost => ({
        tender_id: tenderId,
        cost_id: cost.cost_id!,
        quantity: cost.quantity,
        unit_price: cost.unit_price,
        markup_percent: cost.markup_percent,
        group_id: cost.group_id,
        is_included: true
      }));
    
    if (validCosts.length === 0) {
      message.error('Нет валидных данных для импорта');
      return;
    }
    
    setImporting(true);
    setImportProgress(0);
    
    try {
      // Import in batches of 20
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < validCosts.length; i += batchSize) {
        batches.push(validCosts.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        await onImport(batches[i]);
        setImportProgress(Math.round(((i + 1) / batches.length) * 100));
      }
      
      message.success(`Успешно импортировано ${validCosts.length} затрат в тендер`);
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
    setSelectedGroup(undefined);
    setDefaultMarkup(0);
    setImportProgress(0);
    onClose();
  };

  const columns = [
    {
      title: 'Статус',
      key: 'status',
      width: 80,
      render: (_: any, record: ParsedTenderCost) => (
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
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (val: number) => val.toLocaleString('ru-RU')
    },
    {
      title: 'Цена',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      render: (price: number) => `${price.toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Наценка %',
      dataIndex: 'markup_percent',
      key: 'markup_percent',
      width: 90,
      render: (val: number) => val ? `${val}%` : '-'
    },
    {
      title: 'Группа',
      key: 'group',
      width: 150,
      render: (_: any, record: ParsedTenderCost) => (
        record.group_id ? (
          <Tag color="blue">
            {groups.find(g => g.id === record.group_id)?.name || record.group_name}
          </Tag>
        ) : record.group_name ? (
          <Tag color="orange">{record.group_name} (не найдена)</Tag>
        ) : (
          <Tag>Без группы</Tag>
        )
      )
    },
    {
      title: 'Ошибки',
      key: 'errors',
      render: (_: any, record: ParsedTenderCost) => (
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
          <span>Импорт затрат в тендер из Excel</span>
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
                  <li><strong>Код</strong> - код затрат из справочника (обязательно)</li>
                  <li><strong>Количество</strong> - количество единиц (по умолчанию 1)</li>
                  <li><strong>Цена за единицу</strong> - цена за единицу (обязательно)</li>
                  <li><strong>Наценка %</strong> - процент наценки (опционально)</li>
                  <li><strong>Группа</strong> - название группы в тендере (опционально)</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Space direction="vertical" style={{ width: '100%' }}>
            <Space style={{ width: '100%' }}>
              <Select
                placeholder="Группа по умолчанию"
                allowClear
                style={{ width: 250 }}
                value={selectedGroup}
                onChange={setSelectedGroup}
              >
                {groups.map(group => (
                  <Select.Option key={group.id} value={group.id}>
                    {group.name}
                  </Select.Option>
                ))}
              </Select>
              
              <InputNumber
                placeholder="Наценка по умолчанию %"
                min={0}
                max={100}
                value={defaultMarkup}
                onChange={(val) => setDefaultMarkup(val || 0)}
                formatter={value => `${value}%`}
                style={{ width: 200 }}
              />
            </Space>

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