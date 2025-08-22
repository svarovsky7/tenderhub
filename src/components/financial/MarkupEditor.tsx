import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Form, InputNumber, Input, Button, message, Space, Typography, Row, Col, Progress, Statistic, Table } from 'antd';
import { SaveOutlined, ReloadOutlined, InfoCircleOutlined, SettingOutlined, CalculatorOutlined } from '@ant-design/icons';
import { 
  getActiveTenderMarkup, 
  updateTenderMarkup, 
  calculateMarkupFinancials 
} from '../../lib/supabase/api/tender-markup';
import type { TenderMarkupPercentages, UpdateTenderMarkupPercentages } from '../../lib/supabase/types/tender-markup';

const { Title, Text } = Typography;

interface MarkupEditorProps {
  tenderId: string;
  baseCosts: {
    materials: number;
    works: number;
    submaterials: number;
    subworks: number;
  };
  onMarkupChange?: (calculatedFinancials: any) => void;
}

// Конфигурация полей для табличного представления
const markupFields = [
  {
    key: 'works_16_markup',
    name: 'works_16_markup',
    label: 'Работы 1,6',
    tooltip: 'Процент накрутки на работы',
    max: 1000,
    suffix: '%',
    required: true,
    baseType: 'works',
    calculationType: 'percentage'
  },
  {
    key: 'works_cost_growth',
    name: 'works_cost_growth',
    label: 'Рост стоимости работ',
    tooltip: 'Процент роста стоимости работ (применяется к результату "Работы 1,6")',
    max: 100,
    suffix: '%',
    baseType: 'worksAfter16',
    calculationType: 'percentage'
  },
  {
    key: 'materials_cost_growth',
    name: 'materials_cost_growth',
    label: 'Рост стоимости материалов',
    tooltip: 'Процент роста стоимости материалов',
    max: 100,
    suffix: '%',
    baseType: 'materials',
    calculationType: 'percentage'
  },
  {
    key: 'subcontract_works_cost_growth',
    name: 'subcontract_works_cost_growth',
    label: 'Рост работ субподряда',
    tooltip: 'Процент роста стоимости субподрядных работ',
    max: 100,
    suffix: '%',
    baseType: 'subworks',
    calculationType: 'percentage'
  },
  {
    key: 'subcontract_materials_cost_growth',
    name: 'subcontract_materials_cost_growth',
    label: 'Рост материалов субподряда',
    tooltip: 'Процент роста стоимости субподрядных материалов',
    max: 100,
    suffix: '%',
    baseType: 'submaterials',
    calculationType: 'percentage'
  },
  {
    key: 'contingency_costs',
    name: 'contingency_costs',
    label: 'Непредвиденные затраты',
    tooltip: 'Резерв на непредвиденные ситуации (от суммы Работ РОСТ + Материалов РОСТ)',
    max: 20,
    suffix: '%',
    baseType: 'contingencyBase',
    calculationType: 'percentage'
  },
  {
    key: 'overhead_own_forces',
    name: 'overhead_own_forces',
    label: 'ООЗ собств. силы',
    tooltip: 'Общехозяйственные затраты собственными силами',
    max: 50,
    suffix: '%',
    baseType: 'ownForcesBase',
    calculationType: 'percentage'
  },
  {
    key: 'overhead_subcontract',
    name: 'overhead_subcontract',
    label: 'ООЗ Субподряд',
    tooltip: 'Общехозяйственные затраты субподряда (от суммы Субматериалов ПЗ + Субработ ПЗ)',
    max: 50,
    suffix: '%',
    baseType: 'subcontractBaseOriginal',
    calculationType: 'percentage'
  },
  {
    key: 'general_costs_without_subcontract',
    name: 'general_costs_without_subcontract',
    label: 'ОФЗ (Без субподряда)',
    tooltip: 'Общефирменные затраты без субподряда',
    max: 30,
    suffix: '%',
    baseType: 'ownForcesBase',
    calculationType: 'percentage'
  },
  {
    key: 'profit_own_forces',
    name: 'profit_own_forces',
    label: 'Прибыль собств. силы',
    tooltip: 'Прибыль от работ собственными силами',
    max: 50,
    suffix: '%',
    baseType: 'ownForcesBase',
    calculationType: 'percentage'
  },
  {
    key: 'profit_subcontract',
    name: 'profit_subcontract',
    label: 'Прибыль Субподряд',
    tooltip: 'Прибыль от субподрядных работ',
    max: 50,
    suffix: '%',
    baseType: 'subcontractBase',
    calculationType: 'percentage'
  }
];

export const MarkupEditor: React.FC<MarkupEditorProps> = ({ 
  tenderId, 
  baseCosts, 
  onMarkupChange 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [markupData, setMarkupData] = useState<TenderMarkupPercentages | null>(null);
  const [calculatedFinancials, setCalculatedFinancials] = useState<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tenderId) {
      loadMarkupData();
    }
  }, [tenderId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const loadMarkupData = async () => {
    setLoading(true);
    try {
      console.log('🚀 [MarkupEditor] Loading markup data for tender:', tenderId);
      
      const data = await getActiveTenderMarkup(tenderId);
      console.log('🔍 [MarkupEditor] Raw data type:', typeof data, 'is array:', Array.isArray(data), 'data:', data);
      
      // Если вернулся массив, берем первый элемент
      const markupObj = Array.isArray(data) ? data[0] : data;
      setMarkupData(markupObj);
      
      if (markupObj) {
        form.setFieldsValue(markupObj);
      }
      
      console.log('✅ [MarkupEditor] Markup data loaded:', data);
    } catch (error) {
      console.error('❌ [MarkupEditor] Error loading markup data:', error);
      message.error('Ошибка загрузки настроек накруток');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancials = useCallback(() => {
    if (!markupData) return;
    
    console.log('🚀 [MarkupEditor] Calculating financials with markup:', markupData);
    
    const financials = calculateMarkupFinancials(baseCosts, markupData);
    setCalculatedFinancials(financials);
    
    if (onMarkupChange) {
      onMarkupChange(financials);
    }
    
    console.log('✅ [MarkupEditor] Financials calculated:', financials);
  }, [baseCosts, markupData, onMarkupChange]);

  useEffect(() => {
    if (markupData && baseCosts.materials >= 0) {
      calculateFinancials();
    }
  }, [calculateFinancials, markupData, baseCosts]);

  const handleSave = async () => {
    if (!markupData) return;
    
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      console.log('🚀 [MarkupEditor] Saving markup updates:', values);
      
      const updateData: UpdateTenderMarkupPercentages = values;
      const updatedData = await updateTenderMarkup(markupData.id, updateData);
      setMarkupData(updatedData);
      
      message.success('✅ Настройки накруток сохранены!');
      console.log('✅ [MarkupEditor] Markup saved successfully:', updatedData);
      
    } catch (error) {
      console.error('❌ [MarkupEditor] Error saving markup:', error);
      message.error('Ошибка сохранения настроек накруток');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (markupData) {
      form.setFieldsValue(markupData);
      message.info('Значения возвращены к сохраненным');
    }
  };

  // Функция для расчета стоимости конкретной накрутки
  const calculateMarkupCost = (field: any, formValues: any) => {
    if (!calculatedFinancials || !formValues[field.name]) return 0;
    
    const value = formValues[field.name];
    const baseValues = {
      works: baseCosts.works,
      materials: baseCosts.materials,
      submaterials: baseCosts.submaterials,
      subworks: baseCosts.subworks,
      worksAfter16: calculatedFinancials.worksAfter16 || 0,
      subtotalAfterGrowth: calculatedFinancials.subtotalAfterGrowth || 0,
      contingencyBase: (calculatedFinancials.worksWithGrowth || 0) + (calculatedFinancials.materialsWithGrowth || 0),
      ownForcesBase: (calculatedFinancials.materialsWithGrowth || 0) + (calculatedFinancials.worksWithGrowth || 0),
      subcontractBase: (calculatedFinancials.submaterialsWithGrowth || 0) + (calculatedFinancials.subworksWithGrowth || 0),
      subcontractBaseOriginal: baseCosts.submaterials + baseCosts.subworks // Базовые ПЗ для ООЗ субподряда
    };
    
    const baseValue = baseValues[field.baseType as keyof typeof baseValues] || 0;
    
    if (field.calculationType === 'coefficient') {
      return baseValue * value;
    } else if (field.calculationType === 'percentage') {
      return baseValue * (value / 100);
    }
    
    return 0;
  };

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    if (markupData && values) {
      const tempMarkupData = { ...markupData, ...values };
      const financials = calculateMarkupFinancials(baseCosts, tempMarkupData);
      setCalculatedFinancials(financials);
      
      if (onMarkupChange) {
        onMarkupChange(financials);
      }

      // Автоматическое сохранение с задержкой 2 секунды
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setAutoSaving(true);
          console.log('🚀 [MarkupEditor] Auto-saving markup changes. ID:', markupData.id, 'Values:', values);
          
          if (!markupData.id) {
            console.error('❌ [MarkupEditor] No ID for auto-save, markupData:', markupData);
            return;
          }
          
          const updateData: UpdateTenderMarkupPercentages = values;
          const updatedData = await updateTenderMarkup(markupData.id, updateData);
          setMarkupData(updatedData);
          console.log('✅ [MarkupEditor] Auto-save successful:', updatedData);
        } catch (error) {
          console.error('❌ [MarkupEditor] Auto-save error:', error);
          message.error('Ошибка автосохранения');
        } finally {
          setAutoSaving(false);
        }
      }, 2000);
    }
  };

  // Создаем данные для таблицы
  const tableData = markupFields.map(field => {
    const formValues = form.getFieldsValue();
    const currentValue = formValues[field.name] || 0;
    const calculatedCost = calculateMarkupCost(field, formValues);
    
    return {
      key: field.key,
      name: field.name,
      label: field.label,
      tooltip: field.tooltip,
      required: field.required,
      max: field.max,
      suffix: field.suffix,
      currentValue,
      calculatedCost
    };
  });

  // Колонки таблицы
  const columns = [
    {
      title: 'Тип накрутки',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      render: (text: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Text strong style={{ fontSize: 13 }}>{text}</Text>
          <InfoCircleOutlined 
            style={{ color: '#8c8c8c', fontSize: 12 }}
            title={record.tooltip}
          />
        </div>
      ),
    },
    {
      title: 'Значение',
      dataIndex: 'currentValue',
      key: 'value',
      width: 150,
      render: (value: number, record: any) => (
        <Form.Item
          name={record.name}
          style={{ margin: 0 }}
          rules={record.required ? [
            { required: true, message: `Укажите ${record.label.toLowerCase()}` },
            { type: 'number', min: 0, max: record.max, message: `Значение от 0 до ${record.max}${record.suffix}` }
          ] : [
            { type: 'number', min: 0, max: record.max, message: `Значение от 0 до ${record.max}${record.suffix}` }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            max={record.max}
            step={0.1}
            precision={2}
            suffix={record.suffix}
            placeholder={`0.00${record.suffix}`}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Расчетная стоимость',
      dataIndex: 'calculatedCost',
      key: 'cost',
      width: 150,
      render: (cost: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          {Math.round(cost).toLocaleString('ru-RU')} ₽
        </Text>
      ),
    },
  ];

  const totalCost = baseCosts.materials + baseCosts.works + baseCosts.submaterials + baseCosts.subworks;

  return (
    <Card 
      loading={loading}
      style={{ 
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined style={{ color: '#1890ff' }} />
          Настройка накруток
          {autoSaving && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              • автосохранение...
            </Text>
          )}
        </Title>
        <Text type="secondary">
          Общая базовая стоимость: <Text strong>{totalCost.toLocaleString('ru-RU')} ₽</Text>
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
      >
        {/* Табличное представление накруток */}
        <Table
          dataSource={tableData}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 20 }}
        />

        <Row style={{ marginTop: 20 }}>
          <Col span={24}>
            <Form.Item 
              name="notes" 
              label="Примечания"
              style={{ marginBottom: 16 }}
            >
              <Input.TextArea
                rows={2}
                placeholder="Дополнительные комментарии..."
              />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="center" style={{ marginTop: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Сохранить
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              Сбросить
            </Button>
          </Space>
        </Row>
      </Form>

      {/* Предварительный расчет */}
      {calculatedFinancials && (
        <div style={{ 
          marginTop: 20,
          padding: 16,
          background: '#f0f2f5',
          borderRadius: 8,
          borderLeft: '4px solid #1890ff'
        }}>
          <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
            <CalculatorOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Предварительный расчет
          </Title>
          
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">Итоговая стоимость:</Text>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                {Math.round(calculatedFinancials.totalCostWithProfit || 0).toLocaleString('ru-RU')} ₽
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Общая прибыль:</Text>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                {Math.round(calculatedFinancials.totalProfit || 0).toLocaleString('ru-RU')} ₽
              </div>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
};