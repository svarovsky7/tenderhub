import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Form, InputNumber, Input, Button, message, Space, Typography, Row, Col, Progress, Statistic, Table, Tooltip } from 'antd';
import { ReloadOutlined, InfoCircleOutlined, SettingOutlined, CalculatorOutlined } from '@ant-design/icons';
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
  tenderData?: {
    title: string;
    client_name: string;
    area_sp?: number;
    area_client?: number;
  };
  onMarkupChange?: (calculatedFinancials: any) => void;
}

// Конфигурация полей для табличного представления
const markupFields = [
  // Базовые затраты (только для отображения, без редактирования)
  {
    key: 'base_materials',
    name: 'base_materials',
    label: 'Материалы (ПЗ)',
    tooltip: 'Базовые затраты на материалы из BOQ',
    isBaseInfo: true,
    baseType: 'materials'
  },
  {
    key: 'base_works',
    name: 'base_works',
    label: 'Работы (ПЗ)',
    tooltip: 'Базовые затраты на работы из BOQ',
    isBaseInfo: true,
    baseType: 'works'
  },
  {
    key: 'base_submaterials',
    name: 'base_submaterials',
    label: 'Субматериалы (ПЗ)',
    tooltip: 'Базовые затраты на субматериалы из BOQ',
    isBaseInfo: true,
    baseType: 'submaterials'
  },
  {
    key: 'base_subworks',
    name: 'base_subworks',
    label: 'Субработы (ПЗ)',
    tooltip: 'Базовые затраты на субработы из BOQ',
    isBaseInfo: true,
    baseType: 'subworks'
  },
  // Редактируемые поля
  {
    key: 'mechanization_service',
    name: 'mechanization_service',
    label: 'Служба механизации раб (бурильщики, автотехника, электрики)',
    tooltip: 'Расчет: Работы ПЗ × процент. Затраты на службу механизации работ (бурильщики, автотехника, электрики)',
    max: 100,
    suffix: '%',
    baseType: 'works',
    calculationType: 'percentage'
  },
  {
    key: 'mbp_gsm',
    name: 'mbp_gsm',
    label: 'МБП+ГСМ (топливо+масло)',
    tooltip: 'Расчет: Работы ПЗ × процент. Малоценные быстроизнашивающиеся предметы и горюче-смазочные материалы',
    max: 100,
    suffix: '%',
    baseType: 'works',
    calculationType: 'percentage'
  },
  {
    key: 'warranty_period',
    name: 'warranty_period',
    label: 'Гарантийный период 5 лет',
    tooltip: 'Расчет: Работы ПЗ × процент. Затраты на гарантийное обслуживание в течение 5 лет',
    max: 100,
    suffix: '%',
    baseType: 'works',
    calculationType: 'percentage'
  },
  {
    key: 'works_16_markup',
    name: 'works_16_markup',
    label: 'Работы 1,6',
    tooltip: 'Расчет: (Работы ПЗ + Служба механизации) × процент. Процент затрат на работы с коэффициентом 1,6',
    max: 1000,
    suffix: '%',
    required: true,
    baseType: 'worksWithMechanization',
    calculationType: 'percentage'
  },
  {
    key: 'works_cost_growth',
    name: 'works_cost_growth',
    label: 'Рост стоимости работ',
    tooltip: 'Расчет: (Работы ПЗ + Работы 1,6 + Служба механизации + МБП+ГСМ) × процент. Процент роста стоимости работ',
    max: 100,
    suffix: '%',
    baseType: 'worksGrowthBase',
    calculationType: 'percentage'
  },
  {
    key: 'materials_cost_growth',
    name: 'materials_cost_growth',
    label: 'Рост стоимости материалов',
    tooltip: 'Расчет: Материалы ПЗ × процент. Процент роста стоимости материалов',
    max: 100,
    suffix: '%',
    baseType: 'materials',
    calculationType: 'percentage'
  },
  {
    key: 'subcontract_works_cost_growth',
    name: 'subcontract_works_cost_growth',
    label: 'Рост работ субподряда',
    tooltip: 'Расчет: Субработы ПЗ × процент. Процент роста стоимости субподрядных работ',
    max: 100,
    suffix: '%',
    baseType: 'subworks',
    calculationType: 'percentage'
  },
  {
    key: 'subcontract_materials_cost_growth',
    name: 'subcontract_materials_cost_growth',
    label: 'Рост материалов субподряда',
    tooltip: 'Расчет: Субматериалы ПЗ × процент. Процент роста стоимости субподрядных материалов',
    max: 100,
    suffix: '%',
    baseType: 'submaterials',
    calculationType: 'percentage'
  },
  {
    key: 'contingency_costs',
    name: 'contingency_costs',
    label: 'Непредвиденные затраты',
    tooltip: 'Расчет: (Работы ПЗ + Материалы ПЗ + МБП+ГСМ + Служба механизации + Работы 1,6) × процент. Резерв на непредвиденные ситуации',
    max: 20,
    suffix: '%',
    baseType: 'contingencyBaseNew',
    calculationType: 'percentage'
  },
  {
    key: 'overhead_own_forces',
    name: 'overhead_own_forces',
    label: 'ООЗ собств. силы',
    tooltip: 'Расчет: (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ + Работы РОСТ + Непредвиденные) × процент. Общехозяйственные затраты собственными силами',
    max: 50,
    suffix: '%',
    baseType: 'ownForcesBaseNew',
    calculationType: 'percentage'
  },
  {
    key: 'overhead_subcontract',
    name: 'overhead_subcontract',
    label: 'ООЗ Субподряд',
    tooltip: 'Расчет: (Субматериалы РОСТ + Субработы РОСТ) × процент. Общехозяйственные затраты субподряда',
    max: 50,
    suffix: '%',
    baseType: 'subcontractBase',
    calculationType: 'percentage'
  },
  {
    key: 'general_costs_without_subcontract',
    name: 'general_costs_without_subcontract',
    label: 'ОФЗ (Без субподряда)',
    tooltip: 'Расчет: (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ + Работы РОСТ + Непредвиденные + ООЗ собств. силы) × процент. Общефирменные затраты без субподряда',
    max: 30,
    suffix: '%',
    baseType: 'generalCostsBase',
    calculationType: 'percentage'
  },
  {
    key: 'profit_own_forces',
    name: 'profit_own_forces',
    label: 'Прибыль собств. силы',
    tooltip: 'Расчет: (Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ + Работы РОСТ + Непредвиденные + ООЗ собств. силы + ОФЗ) × процент. Прибыль от работ собственными силами',
    max: 50,
    suffix: '%',
    baseType: 'profitOwnForcesBase',
    calculationType: 'percentage'
  },
  {
    key: 'profit_subcontract',
    name: 'profit_subcontract',
    label: 'Прибыль Субподряд',
    tooltip: 'Расчет: (Субматериалы РОСТ + Субработы РОСТ + ООЗ Субподряд) × процент. Прибыль от субподрядных работ',
    max: 50,
    suffix: '%',
    baseType: 'subcontractProfitBase',
    calculationType: 'percentage'
  }
];

export const MarkupEditor: React.FC<MarkupEditorProps> = ({ 
  tenderId, 
  baseCosts,
  tenderData,
  onMarkupChange 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
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
      message.error('Ошибка загрузки процентов затрат');
    } finally {
      setLoading(false);
    }
  };

  // Internal calculation function that doesn't notify parent
  const calculateFinancialsInternal = useCallback(() => {
    if (!markupData) return;
    
    console.log('🚀 [MarkupEditor] Internal calculation with markup:', markupData);
    
    const financials = calculateMarkupFinancials(baseCosts, markupData);
    setCalculatedFinancials(financials);
    
    console.log('✅ [MarkupEditor] Internal calculation completed:', financials);
  }, [baseCosts, markupData]);

  // Function to calculate and notify parent (for form changes and manual refresh)
  const calculateAndNotifyParent = useCallback(() => {
    if (!markupData) return;
    
    console.log('🚀 [MarkupEditor] Calculating and notifying parent');
    
    const financials = calculateMarkupFinancials(baseCosts, markupData);
    setCalculatedFinancials(financials);
    
    if (onMarkupChange) {
      // Рассчитываем итоговую коммерческую стоимость используя ту же логику что и для отображения
      const formValues = form.getFieldsValue();
      const totalCommercialPrice = calculateTotalCosts(markupFields, formValues);

      console.log('📊 [MarkupEditor] Calculated totalCommercialPrice:', totalCommercialPrice);

      onMarkupChange({
        ...financials,
        totalCommercialPrice
      });
    }
    
    console.log('✅ [MarkupEditor] Parent notified with financials:', financials);
  }, [baseCosts, markupData, onMarkupChange, form]);

  useEffect(() => {
    if (markupData && baseCosts.materials >= 0) {
      calculateFinancialsInternal(); // Don't notify parent on dependency changes
      // После внутреннего расчета, уведомляем родителя
      setTimeout(() => {
        calculateAndNotifyParent();
      }, 100);
    }
  }, [calculateFinancialsInternal, calculateAndNotifyParent]);


  const handleRefreshCalculation = () => {
    const values = form.getFieldsValue();
    if (markupData && values) {
      console.log('🔄 [MarkupEditor] Принудительное обновление расчета');
      
      const tempMarkupData = { ...markupData, ...values };
      setMarkupData(tempMarkupData);
      
      // Force calculation with parent notification
      calculateAndNotifyParent();
      
      message.success('Расчет обновлен');
      console.log('✅ [MarkupEditor] Расчет принудительно обновлен');
    }
  };

  // Функция для расчета стоимости конкретного процента затрат
  const calculateMarkupCost = (field: any, formValues: any) => {
    if (!calculatedFinancials || !formValues[field.name]) return 0;
    
    const value = formValues[field.name];
    
    // Рассчитываем службы для использования в других расчетах
    const mechanizationServiceCost = formValues['mechanization_service'] 
      ? baseCosts.works * (formValues['mechanization_service'] / 100) 
      : 0;
    
    const mbpGsmCost = formValues['mbp_gsm']
      ? baseCosts.works * (formValues['mbp_gsm'] / 100)
      : 0;
    
    // Рассчитываем "Работы 1,6"
    const worksWithMechanization = baseCosts.works + mechanizationServiceCost;
    const works16Result = formValues['works_16_markup']
      ? worksWithMechanization * (formValues['works_16_markup'] / 100)
      : 0;
    
    // Рассчитываем росты для использования в непредвиденных
    const worksGrowthBase = baseCosts.works + works16Result + mechanizationServiceCost + mbpGsmCost;
    const worksGrowthAmount = formValues['works_cost_growth']
      ? worksGrowthBase * (formValues['works_cost_growth'] / 100)
      : 0;
    const worksWithGrowth = worksGrowthBase + worksGrowthAmount;
    
    const materialsGrowthAmount = formValues['materials_cost_growth']
      ? baseCosts.materials * (formValues['materials_cost_growth'] / 100)
      : 0;
    const materialsWithGrowth = baseCosts.materials + materialsGrowthAmount;
    
    // Рассчитываем непредвиденные затраты для использования в ООЗ
    const contingencyCost = formValues['contingency_costs']
      ? (baseCosts.works + baseCosts.materials + mbpGsmCost + mechanizationServiceCost + works16Result) * (formValues['contingency_costs'] / 100)
      : 0;

    // Рассчитываем ООЗ собств. силы для использования в ОФЗ
    const overheadOwnForcesBase = baseCosts.works + mechanizationServiceCost + works16Result + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost;
    const overheadOwnForcesCost = formValues['overhead_own_forces']
      ? overheadOwnForcesBase * (formValues['overhead_own_forces'] / 100)
      : 0;

    // Рассчитываем ОФЗ для использования в прибыли собственных сил
    const generalCostsBase = baseCosts.works + mechanizationServiceCost + works16Result + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost + overheadOwnForcesCost;
    const generalCostsCost = formValues['general_costs_without_subcontract']
      ? generalCostsBase * (formValues['general_costs_without_subcontract'] / 100)
      : 0;

    // Рассчитываем ООЗ Субподряд для использования в прибыли субподряда
    const overheadSubcontractCost = formValues['overhead_subcontract']
      ? ((calculatedFinancials.submaterialsWithGrowth || 0) + (calculatedFinancials.subworksWithGrowth || 0)) * (formValues['overhead_subcontract'] / 100)
      : 0;
    
    // Рассчитываем базу для прибыли собственных сил
    const profitOwnForcesBase = baseCosts.works + mechanizationServiceCost + works16Result + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost + overheadOwnForcesCost + generalCostsCost;
    
    // Рассчитываем базу для прибыли субподряда
    // База = Субматериалы РОСТ (полная сумма) + Субработы РОСТ (полная сумма) + ООЗ субподряда
    const submaterialsGrowthAmount = baseCosts.submaterials * ((formValues['subcontract_materials_cost_growth'] || 0) / 100);
    const subworksGrowthAmount = baseCosts.subworks * ((formValues['subcontract_works_cost_growth'] || 0) / 100);
    const submaterialsWithGrowth = baseCosts.submaterials + submaterialsGrowthAmount;
    const subworksWithGrowth = baseCosts.subworks + subworksGrowthAmount;
    const subcontractProfitBase = submaterialsWithGrowth + subworksWithGrowth + overheadSubcontractCost;

    const baseValues = {
      works: baseCosts.works,
      materials: baseCosts.materials,
      submaterials: baseCosts.submaterials,
      subworks: baseCosts.subworks,
      worksWithMechanization: worksWithMechanization, // База для "Работы 1,6"
      worksGrowthBase: baseCosts.works + works16Result + mechanizationServiceCost + mbpGsmCost, // База для "Рост стоимости работ": Работы ПЗ + Работы 1,6 + Служба механизации + МБП+ГСМ
      worksAfter16WithMbp: works16Result + mbpGsmCost, // Старая база (для совместимости)
      worksAfter16: calculatedFinancials.worksAfter16 || 0,
      subtotalAfterGrowth: calculatedFinancials.subtotalAfterGrowth || 0,
      contingencyBase: (calculatedFinancials.worksWithGrowth || 0) + (calculatedFinancials.materialsWithGrowth || 0),
      contingencyBaseNew: baseCosts.works + baseCosts.materials + mbpGsmCost + mechanizationServiceCost + works16Result, // Новая база для непредвиденных: Работы ПЗ + Материалы ПЗ + МБП+ГСМ + Служба механизации + Работы 1,6
      ownForcesBase: (calculatedFinancials.materialsWithGrowth || 0) + (calculatedFinancials.worksWithGrowth || 0),
      ownForcesBaseNew: baseCosts.works + mechanizationServiceCost + works16Result + baseCosts.materials + mbpGsmCost + materialsGrowthAmount + worksGrowthAmount + contingencyCost, // Новая база для ООЗ собств. силы: Работы ПЗ + Служба механизации + Работы 1,6 + Материалы ПЗ + МБП+ГСМ + Материалы РОСТ (результат) + Работы РОСТ (результат) + Непредвиденные
      overheadOwnForces: overheadOwnForcesCost, // ООЗ собств. силы для расчета ОФЗ
      generalCostsBase: generalCostsBase, // База для ОФЗ: все компоненты ООЗ + результат ООЗ
      generalCosts: generalCostsCost, // ОФЗ для расчета прибыли собственных сил
      profitOwnForcesBase: profitOwnForcesBase, // База для прибыли собств. сил: все компоненты ОФЗ + результат ОФЗ
      overheadSubcontract: overheadSubcontractCost, // ООЗ Субподряд для расчета прибыли субподряда (старая формула)
      subcontractProfitBase: subcontractProfitBase, // Новая база для прибыли субподряда
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

  // Helper функция для расчета общей коммерческой стоимости
  const calculateTotalCosts = (fieldsData: any[], formValues: any) => {
    return fieldsData.reduce((sum, field) => {
      if (field.isBaseInfo) {
        // Для базовых затрат берем их значения
        switch (field.baseType) {
          case 'materials': return sum + baseCosts.materials;
          case 'works': return sum + baseCosts.works;
          case 'submaterials': return sum + baseCosts.submaterials;
          case 'subworks': return sum + baseCosts.subworks;
          default: return sum;
        }
      } else {
        // Для процентных строк берем рассчитанное значение
        return sum + calculateMarkupCost(field, formValues);
      }
    }, 0);
  };

  const handleFormChange = () => {
    const values = form.getFieldsValue();
    if (markupData && values) {
      // Update markup data with new values for calculations
      const tempMarkupData = { ...markupData, ...values };
      
      // Calculate and notify parent immediately with form changes
      const financials = calculateMarkupFinancials(baseCosts, tempMarkupData);
      setCalculatedFinancials(financials);
      
      if (onMarkupChange) {
        // Вычисляем итоговую коммерческую стоимость используя ту же логику что и для отображения
        const totalCommercialPrice = calculateTotalCosts(markupFields, values);

        onMarkupChange({
          ...financials,
          totalCommercialPrice
        });
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
          // Don't call setMarkupData here to avoid triggering the useEffect
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
    const calculatedCost = field.isBaseInfo ? 0 : calculateMarkupCost(field, formValues);
    
    return {
      key: field.key,
      name: field.name,
      label: field.label,
      tooltip: field.tooltip,
      required: field.required,
      max: field.max,
      suffix: field.suffix,
      currentValue,
      calculatedCost,
      isBaseInfo: field.isBaseInfo,
      baseType: field.baseType
    };
  });

  // Рассчитываем итоги
  const totalBaseCosts = baseCosts.materials + baseCosts.works + baseCosts.submaterials + baseCosts.subworks;
  
  // Правильная итоговая стоимость - суммируем все строки таблицы
  const totalCalculatedCosts = tableData.reduce((sum, row) => {
    if (row.isBaseInfo) {
      // Для базовых затрат берем их значения
      switch (row.baseType) {
        case 'materials': return sum + baseCosts.materials;
        case 'works': return sum + baseCosts.works;
        case 'submaterials': return sum + baseCosts.submaterials;
        case 'subworks': return sum + baseCosts.subworks;
        default: return sum;
      }
    } else {
      // Для процентных строк берем расчетную стоимость
      return sum + row.calculatedCost;
    }
  }, 0);
  
  // Итог цены за м² по СП
  const totalCostPerSqm = tenderData?.area_sp && tenderData.area_sp > 0 
    ? totalCalculatedCosts / tenderData.area_sp 
    : 0;

  // Колонки таблицы
  const columns = [
    {
      title: 'Тип процента',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      render: (text: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Text strong style={{ fontSize: 13 }}>{text}</Text>
          <Tooltip title={record.tooltip} placement="topLeft">
            <InfoCircleOutlined 
              style={{ color: '#8c8c8c', fontSize: 12, cursor: 'help' }}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Значение',
      dataIndex: 'currentValue',
      key: 'value',
      width: 50,
      render: (value: number, record: any) => {
        // Для строк базовой информации не показываем поле ввода
        if (record.isBaseInfo) {
          return <div style={{ height: '32px' }}></div>;
        }
        
        return (
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
        );
      },
    },
    {
      title: 'Цена за м² по СП',
      dataIndex: 'costPerSqm',
      key: 'costPerSqm',
      width: 100,
      align: 'center',
      render: (value: number, record: any) => {
        // Для строк базовой информации показываем стоимость базовых затрат за м²
        if (record.isBaseInfo) {
          if (!tenderData?.area_sp || tenderData.area_sp <= 0) {
            return <div style={{ height: '32px' }}></div>;
          }
          
          let baseCost = 0;
          switch (record.baseType) {
            case 'materials':
              baseCost = baseCosts.materials;
              break;
            case 'works':
              baseCost = baseCosts.works;
              break;
            case 'submaterials':
              baseCost = baseCosts.submaterials;
              break;
            case 'subworks':
              baseCost = baseCosts.subworks;
              break;
          }
          
          const costPerSqm = baseCost / tenderData.area_sp;
          
          // Округляем значение
          const displayValue = Math.round(costPerSqm).toLocaleString('ru-RU') + ' ₽/м²';
            
          return (
            <Text style={{ 
              fontSize: 13,
              color: '#666',
              fontWeight: 500
            }}>
              {displayValue}
            </Text>
          );
        }
        
        // Для редактируемых строк показываем стоимость за м² от расчетной стоимости
        if (!tenderData?.area_sp || tenderData.area_sp <= 0 || record.calculatedCost <= 0) {
          return <div style={{ height: '32px' }}></div>;
        }
        
        const costPerSqm = record.calculatedCost / tenderData.area_sp;
        
        // Округляем значение
        const displayValue = Math.round(costPerSqm).toLocaleString('ru-RU') + ' ₽/м²';
        
        return (
          <Text style={{ 
            fontSize: 13,
            color: '#52c41a',
            fontWeight: 500
          }}>
            {displayValue}
          </Text>
        );
      },
    },
    {
      title: 'Расчетная стоимость',
      dataIndex: 'calculatedCost',
      key: 'cost',
      width: 150,
      render: (cost: number, record: any) => {
        // Для строк базовой информации показываем базовые затраты
        if (record.isBaseInfo) {
          let baseCost = 0;
          switch (record.baseType) {
            case 'materials':
              baseCost = baseCosts.materials;
              break;
            case 'works':
              baseCost = baseCosts.works;
              break;
            case 'submaterials':
              baseCost = baseCosts.submaterials;
              break;
            case 'subworks':
              baseCost = baseCosts.subworks;
              break;
          }
          
          return (
            <Text strong style={{ 
              fontSize: 14,
              color: '#1890ff',
              fontWeight: 600
            }}>
              {Math.round(baseCost).toLocaleString('ru-RU')} ₽
            </Text>
          );
        }
        
        return (
          <Text strong style={{ color: '#1890ff' }}>
            {Math.round(cost).toLocaleString('ru-RU')} ₽
          </Text>
        );
      },
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
          Редактирование процентов затрат
          {autoSaving && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              • автосохранение...
            </Text>
          )}
        </Title>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 16, 
          alignItems: 'center',
          marginBottom: 8 
        }}>
          <Text type="secondary">
            Общая базовая стоимость: <Text strong>{Math.round(totalCost).toLocaleString('ru-RU')} ₽</Text>
          </Text>
          
          {tenderData && (
            <>
              {tenderData.area_sp && (
                <Text type="secondary">
                  Площадь СП: <Text strong>{tenderData.area_sp.toLocaleString('ru-RU')} м²</Text>
                </Text>
              )}
              
              {tenderData.area_client && (
                <Text type="secondary">
                  Площадь заказчика: <Text strong>{tenderData.area_client.toLocaleString('ru-RU')} м²</Text>
                </Text>
              )}
              
              {(tenderData.area_sp || tenderData.area_client) && totalCost > 0 && (
                <Text type="secondary">
                  Базовая стоимость за м²: <Text strong>
                    {Math.round(totalCost / (tenderData.area_sp || tenderData.area_client || 1)).toLocaleString('ru-RU')} ₽/м²
                  </Text>
                </Text>
              )}
            </>
          )}
        </div>
        
        {tenderData && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            Проект: <Text strong>{tenderData.title}</Text> • 
            Заказчик: <Text strong>{tenderData.client_name || 'Не указан'}</Text>
          </Text>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
      >
        {/* Табличное представление процентов затрат */}
        <Table
          dataSource={tableData}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 12 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                  ИТОГО
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                {/* Пустая ячейка для столбца "Значение" */}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center">
                <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                  {totalCostPerSqm > 0 ? Math.round(totalCostPerSqm).toLocaleString('ru-RU') : '-'}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <Text strong style={{ fontSize: 14, color: '#1890ff' }}>
                  {Math.round(totalCalculatedCosts).toLocaleString('ru-RU')} ₽
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />

        <Row justify="center" style={{ marginTop: 20 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshCalculation}
            type="primary"
          >
            Обновить расчет
          </Button>
        </Row>
      </Form>

    </Card>
  );
};