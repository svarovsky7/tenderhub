import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Form, 
  InputNumber, 
  Row, 
  Col, 
  Badge, 
  Progress, 
  message, 
  Button,
  Input,
  Typography,
  Tooltip,
  Spin,
  Select
} from 'antd';
import { 
  PlusOutlined, 
  BuildOutlined, 
  ToolOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import type { Material, Work } from '../../lib/supabase/types';
import EnhancedAutocomplete from './EnhancedAutocomplete';
import { CostCascadeSelector } from '../common';
import { CURRENCY_OPTIONS, convertToRuble, getCurrencyRate } from '../../utils/currencyConverter';
import styles from '../../styles/EnhancedQuickAddCard.module.css';

const { Title } = Typography;

interface EnhancedQuickAddCardProps {
  type: 'work' | 'material';
  onAdd: (data: any) => Promise<void>;
  loading?: boolean;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

interface FormValues {
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  cost_node_id?: string | null;
  cost_node_display?: string;
  currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY';
}

interface SubmissionState {
  isSubmitting: boolean;
  progress: number;
  stage: 'validating' | 'processing' | 'saving' | 'completed';
  error?: string;
}

const EnhancedQuickAddCard: React.FC<EnhancedQuickAddCardProps> = React.memo(({ 
  type, 
  onAdd, 
  loading = false,
  tender 
}) => {
  console.log('🚀 EnhancedQuickAddCard rendered', { type, tender });
  
  const [form] = Form.useForm<FormValues>();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<(Material | Work)[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    isSubmitting: false,
    progress: 0,
    stage: 'validating'
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');

  const isWork = type === 'work';
  
  // Configuration for different card types
  const cardConfig = useMemo(() => ({
    work: {
      title: 'Быстрое добавление работ',
      icon: <BuildOutlined />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#667eea',
      bgColor: 'rgba(102, 126, 234, 0.1)'
    },
    material: {
      title: 'Быстрое добавление материалов',
      icon: <ToolOutlined />,
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      color: '#11998e',
      bgColor: 'rgba(17, 153, 142, 0.1)'
    }
  }), []);

  const config = cardConfig[type];

  // Debounced search for suggestions
  const loadSuggestions = useCallback(async (search: string) => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }

    console.log(`🔍 Loading ${type} suggestions for:`, search);
    setLoadingSuggestions(true);
    
    try {
      const api = isWork ? worksApi : materialsApi;
      const result = await api.search(search, { limit: 8 });
      
      if (result.data) {
        console.log(`✅ Found ${result.data.length} suggestions`);
        setSuggestions(result.data);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error(`❌ Error loading ${type} suggestions:`, error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [isWork, type]);

  // Debounce search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        loadSuggestions(searchTerm);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, loadSuggestions]);

  // Handle currency change
  const handleCurrencyChange = useCallback((currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => {
    console.log('💱 Currency changed:', currency);
    setSelectedCurrency(currency);
    form.setFieldsValue({ currency_type: currency });
  }, [form]);

  // Handle unit rate change - now stores the price in selected currency
  const handleUnitRateChange = useCallback((value: number | null) => {
    console.log('💰 Unit rate changed:', value, 'Currency:', selectedCurrency);
    // unit_rate now stores the price in the selected currency
    // No conversion needed here
  }, [selectedCurrency]);

  // Calculate total cost when values change
  const handleFormValuesChange = useCallback(() => {
    const quantity = form.getFieldValue('quantity') || 0;
    const unitRate = form.getFieldValue('unit_rate') || 0;
    const consumptionCoeff = form.getFieldValue('consumption_coefficient') || 1;
    const conversionCoeff = form.getFieldValue('conversion_coefficient') || 1;
    const currencyType = form.getFieldValue('currency_type') || 'RUB';
    
    // Convert to rubles for display
    let rubleRate = unitRate;
    if (currencyType !== 'RUB' && tender) {
      const rate = getCurrencyRate(currencyType as 'USD' | 'EUR' | 'CNY', tender);
      if (rate) {
        rubleRate = unitRate * rate;
      }
    }
    
    let cost = quantity * rubleRate;
    if (!isWork) {
      cost = cost * consumptionCoeff * conversionCoeff;
    }
    
    setTotalCost(cost);
  }, [form, isWork, tender]);

  // Progress simulation for better UX
  const simulateProgress = useCallback(async () => {
    const stages = [
      { stage: 'validating' as const, progress: 25, delay: 300 },
      { stage: 'processing' as const, progress: 60, delay: 500 },
      { stage: 'saving' as const, progress: 90, delay: 400 },
      { stage: 'completed' as const, progress: 100, delay: 200 }
    ];

    for (const { stage, progress, delay } of stages) {
      setSubmissionState(prev => ({ ...prev, stage, progress }));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }, []);

  const handleSubmit = useCallback(async (values: FormValues) => {
    console.log(`🚀 Submitting ${type}:`, values);
    
    setSubmissionState({
      isSubmitting: true,
      progress: 0,
      stage: 'validating'
    });

    try {
      // Simulate progress
      await simulateProgress();
      
      // Prepare submission data with currency info
      const submissionData: any = {
        ...values,
        currency_type: values.currency_type || 'RUB',
        // unit_rate already contains the price in the selected currency
        currency_rate: values.currency_type && values.currency_type !== 'RUB' && tender 
          ? getCurrencyRate(values.currency_type, tender) 
          : null,
        type,
        item_type: type,
        cost_node_id: values.cost_node_id || null,
        cost_node_display: values.cost_node_display || null
      };
      
      // Actual submission
      await onAdd(submissionData);

      // Success state
      setShowSuccess(true);
      form.resetFields();
      setSearchTerm('');
      setSuggestions([]);
      setTotalCost(0);
      setSelectedCurrency('RUB');
      
      message.success({
        content: `${isWork ? 'Работа' : 'Материал'} успешно добавлен${isWork ? '' : ''}`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });

      // Reset success animation after delay
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (error) {
      console.error(`❌ Error adding ${type}:`, error);
      setSubmissionState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }));
      
      message.error({
        content: `Ошибка добавления ${isWork ? 'работы' : 'материала'}`,
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      });
    } finally {
      setTimeout(() => {
        setSubmissionState({
          isSubmitting: false,
          progress: 0,
          stage: 'validating'
        });
      }, 1000);
    }
  }, [onAdd, type, isWork, form, simulateProgress]);

  const handleSuggestionSelect = useCallback((suggestion: Material | Work) => {
    console.log('🎯 Suggestion selected:', suggestion);
    
    form.setFieldsValue({
      description: suggestion.name,
      unit: suggestion.unit,
      currency_type: 'RUB' // Reset to RUB when selecting from library
    });
    setSearchTerm(suggestion.name);
    setSuggestions([]);
    setSelectedCurrency('RUB');
    
    // Trigger cost calculation
    setTimeout(handleFormValuesChange, 100);
  }, [form, handleFormValuesChange]);

  const getProgressColor = () => {
    if (submissionState.error) return '#ff4d4f';
    if (submissionState.stage === 'completed') return '#52c41a';
    return '#1890ff';
  };

  const getStageText = () => {
    switch (submissionState.stage) {
      case 'validating': return 'Проверка данных...';
      case 'processing': return 'Обработка...';
      case 'saving': return 'Сохранение...';
      case 'completed': return 'Готово!';
      default: return '';
    }
  };

  return (
    <div 
      className={`${styles.cardContainer} ${isWork ? '' : styles.materialCard} ${showSuccess ? styles.successAnimation : ''}`}
      style={{
        background: config.gradient,
        minHeight: '500px'
      }}
    >
      {/* Floating decorative elements */}
      <div className={styles.floatingElements}>
        <div className={styles.floatingElement} />
        <div className={styles.floatingElement} />
        <div className={styles.floatingElement} />
      </div>

      <div className={styles.cardContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconContainer}>
              <div className={styles.icon}>
                {config.icon}
              </div>
            </div>
            <Title level={3} className={styles.title}>
              {config.title}
            </Title>
          </div>
          
          <Badge 
            count={suggestions.length} 
            showZero={false} 
            className={styles.badge}
            style={{ backgroundColor: '#52c41a' }}
          />
        </div>

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
          className={styles.formContainer}
        >
          {/* Search/Autocomplete */}
          <Form.Item
            name="description"
            label={<span className={styles.label}>Название {isWork ? 'работы' : 'материала'}</span>}
            rules={[{ required: true, message: `Введите название ${isWork ? 'работы' : 'материала'}` }]}
            className={styles.formItem}
          >
            <EnhancedAutocomplete
              type={type}
              value={searchTerm}
              onChange={setSearchTerm}
              onSelect={handleSuggestionSelect}
              suggestions={suggestions}
              loading={loadingSuggestions}
              placeholder={`Поиск и добавление ${isWork ? 'работ' : 'материалов'}...`}
            />
          </Form.Item>

          {/* Basic Fields Row */}
          <Row gutter={16}>
            <Col xs={24} sm={4}>
              <Form.Item
                name="unit"
                label={<span className={styles.label}>Ед. изм.</span>}
                rules={[{ required: true, message: 'Введите единицу измерения' }]}
                className={styles.formItem}
              >
                <Input
                  placeholder="м², шт, кг"
                  size="large"
                  className={styles.input}
                />
              </Form.Item>
            </Col>

            {/* Currency selector */}
            <Col xs={24} sm={4}>
              <Form.Item
                name="currency_type"
                label={<span className={styles.label}>Валюта</span>}
                className={styles.formItem}
                initialValue="RUB"
              >
                <Select
                  size="large"
                  className={styles.input}
                  onChange={handleCurrencyChange}
                  options={CURRENCY_OPTIONS}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={8}>
              <Form.Item
                name="quantity"
                label={<span className={styles.label}>Количество</span>}
                rules={[{ required: true, message: 'Введите количество' }]}
                className={styles.formItem}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  size="large"
                  className={`${styles.input} ${styles.numberInput}`}
                />
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={8}>
              <Form.Item
                name="unit_rate"
                label={
                  <span className={styles.label}>
                    Цена за ед. ({CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol})
                    {selectedCurrency !== 'RUB' && tender && (
                      <Tooltip title={`Курс: ${getCurrencyRate(selectedCurrency as 'USD' | 'EUR' | 'CNY', tender) || 'Не задан'} ₽`}>
                        <InfoCircleOutlined className="ml-1 opacity-60" />
                      </Tooltip>
                    )}
                  </span>
                }
                rules={[{ required: true, message: 'Введите цену' }]}
                className={styles.formItem}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="0.00"
                  size="large"
                  className={`${styles.input} ${styles.numberInput}`}
                  addonAfter={CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol}
                  onChange={handleUnitRateChange}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Cost Category Selector */}
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="cost_node_id"
                label={<span className={styles.label}>Категория затрат</span>}
                className={styles.formItem}
              >
                <CostCascadeSelector
                  placeholder="Выберите категорию затрат"
                  onChange={(costNodeId, displayValue) => {
                    form.setFieldValue('cost_node_id', costNodeId);
                    form.setFieldValue('cost_node_display', displayValue);
                    console.log('🚀 Cost category selected:', { costNodeId, displayValue });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Material-specific coefficients */}
          {!isWork && (
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="consumption_coefficient"
                  label={
                    <span className={styles.label}>
                      Коэф. расхода
                      <Tooltip title="Коэффициент, учитывающий потери материала">
                        <InfoCircleOutlined className="ml-1 opacity-60" />
                      </Tooltip>
                    </span>
                  }
                  initialValue={1}
                  className={styles.formItem}
                >
                  <InputNumber
                    min={0.01}
                    step={0.01}
                    precision={2}
                    placeholder="1.00"
                    size="large"
                    className={`${styles.input} ${styles.numberInput}`}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="conversion_coefficient"
                  label={
                    <span className={styles.label}>
                      Коэф. перевода
                      <Tooltip title="Коэффициент для перевода единиц измерения">
                        <InfoCircleOutlined className="ml-1 opacity-60" />
                      </Tooltip>
                    </span>
                  }
                  initialValue={1}
                  className={styles.formItem}
                >
                  <InputNumber
                    min={0.01}
                    step={0.01}
                    precision={2}
                    placeholder="1.00"
                    size="large"
                    className={`${styles.input} ${styles.numberInput}`}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Cost preview */}
          {totalCost > 0 && (
            <div className={`${styles.glassMorphism} p-4 mb-4`}>
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Общая стоимость:</span>
                <span className="text-2xl font-bold text-white">
                  {totalCost.toLocaleString('ru-RU', { 
                    style: 'currency', 
                    currency: 'RUB' 
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          {submissionState.isSubmitting && (
            <div className={`${styles.progressContainer} ${styles.visible}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {getStageText()}
                </span>
                <span className="text-white text-sm">
                  {submissionState.progress}%
                </span>
              </div>
              <Progress
                percent={submissionState.progress}
                showInfo={false}
                strokeColor={getProgressColor()}
                className={styles.customProgress}
              />
            </div>
          )}

          {/* Submit button */}
          <div className={styles.submitSection}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submissionState.isSubmitting || loading}
              disabled={submissionState.isSubmitting}
              className={`${styles.submitButton} ${
                submissionState.isSubmitting ? styles.loadingButton : ''
              }`}
              icon={
                submissionState.stage === 'completed' 
                  ? <CheckCircleOutlined /> 
                  : <PlusOutlined />
              }
            >
              {submissionState.isSubmitting 
                ? getStageText()
                : `Добавить ${isWork ? 'работу' : 'материал'}`
              }
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
});

EnhancedQuickAddCard.displayName = 'EnhancedQuickAddCard';

export default EnhancedQuickAddCard;