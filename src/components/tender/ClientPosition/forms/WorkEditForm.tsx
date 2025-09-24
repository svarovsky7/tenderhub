import React, { useMemo } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Row, Col, Tag } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

const { Option } = Select;

interface WorkEditFormProps {
  item: BOQItemWithLibrary;
  form: any;
  tender?: any;
  tenderMarkup?: any;
  onSave: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const WorkEditForm: React.FC<WorkEditFormProps> = ({
  item,
  form,
  tender,
  tenderMarkup,
  onSave,
  onCancel,
  loading = false
}) => {
  // Watch form fields for dynamic calculation
  const quantity = Form.useWatch('quantity', form) || 0;
  const unitRate = Form.useWatch('unit_rate', form) || 0;
  const itemType = Form.useWatch('item_type', form) || item.item_type;
  const currencyType = Form.useWatch('currency_type', form) || 'RUB';
  const currencyRate = Form.useWatch('currency_rate', form) || 1;

  // Calculate commercial cost
  const commercialCost = useMemo(() => {
    if (!tenderMarkup || !unitRate || !quantity) return 0;

    const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
    const baseCost = quantity * unitRate * currencyMultiplier;

    if (itemType === 'work') {
      // Apply work markup calculation
      return baseCost * (1 + (tenderMarkup.works_markup_percentage || 0) / 100);
    } else if (itemType === 'sub_work') {
      // Apply subcontract markup
      return baseCost * (1 + (tenderMarkup.subcontract_markup_percentage || 0) / 100);
    }

    return baseCost;
  }, [quantity, unitRate, itemType, tenderMarkup, currencyType, currencyRate]);

  // Get currency rate from tender
  const getCurrencyRate = (currency: string) => {
    if (!tender) return 1;
    switch (currency) {
      case 'USD': return tender.usd_rate || 1;
      case 'EUR': return tender.eur_rate || 1;
      case 'CNY': return tender.cny_rate || 1;
      default: return 1;
    }
  };

  // Handle currency change
  const handleCurrencyChange = (currency: string) => {
    if (currency === 'RUB') {
      form.setFieldsValue({ currency_rate: 1 });
    } else {
      const rate = getCurrencyRate(currency);
      form.setFieldsValue({ currency_rate: rate });
    }
  };

  // Determine background color based on item type
  const getEditBackgroundColor = () => {
    switch (item.item_type) {
      case 'work':
        return 'rgba(254, 215, 170, 0.3)'; // Orange for work
      case 'sub_work':
        return 'rgba(233, 213, 255, 0.3)'; // Purple for sub-work
      default:
        return '#f0f8ff';
    }
  };

  const getBorderColor = () => {
    switch (item.item_type) {
      case 'work':
        return '#fb923c'; // Orange border
      case 'sub_work':
        return '#c084fc'; // Purple border
      default:
        return '#1890ff';
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSave}
      className="w-full"
      style={{
        padding: '12px',
        backgroundColor: getEditBackgroundColor(),
        borderRadius: '4px',
        border: `2px solid ${getBorderColor()}`,
        boxShadow: `0 2px 4px ${getBorderColor()}33`
      }}
    >
      <Row gutter={[12, 12]}>
        {/* Type */}
        <Col xs={24} sm={6} md={4}>
          <Form.Item
            name="item_type"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
            className="mb-0"
          >
            <Select size="small">
              <Option value="work">Работа</Option>
              <Option value="sub_work">Суб-работа</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Description */}
        <Col xs={24} sm={18} md={8}>
          <Form.Item
            name="description"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Описание</span>}
            className="mb-0"
            rules={[{ required: true, message: 'Введите описание' }]}
          >
            <Input size="small" placeholder="Описание работы" />
          </Form.Item>
        </Col>

        {/* Unit */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="unit"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ед.изм.</span>}
            className="mb-0"
          >
            <Select size="small">
              <Option value="м²">м²</Option>
              <Option value="м³">м³</Option>
              <Option value="м">м</Option>
              <Option value="шт">шт</Option>
              <Option value="компл">компл</Option>
              <Option value="т">т</Option>
              <Option value="кг">кг</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Quantity */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="quantity"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Количество</span>}
            className="mb-0"
            rules={[{ required: true, message: 'Введите количество' }]}
          >
            <InputNumber
              size="small"
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>

        {/* Currency */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="currency_type"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Валюта</span>}
            className="mb-0"
          >
            <Select size="small" onChange={handleCurrencyChange}>
              <Option value="RUB">₽ RUB</Option>
              <Option value="USD">$ USD</Option>
              <Option value="EUR">€ EUR</Option>
              <Option value="CNY">¥ CNY</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Unit Rate */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="unit_rate"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Цена за ед.</span>}
            className="mb-0"
          >
            <InputNumber
              size="small"
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Second row with additional fields */}
      <Row gutter={[12, 12]} className="mt-3">
        {/* Quote Link */}
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="quote_link"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ссылка на КП</span>}
            className="mb-0"
          >
            <Input size="small" placeholder="https://..." />
          </Form.Item>
        </Col>

        {/* Note */}
        <Col xs={24} sm={12} md={8}>
          <Form.Item
            name="note"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Примечание</span>}
            className="mb-0"
          >
            <Input size="small" placeholder="Примечание" />
          </Form.Item>
        </Col>

        {/* Commercial Cost Display */}
        <Col xs={24} sm={12} md={4}>
          <div className="flex flex-col">
            <span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Коммерческая цена</span>
            <Tag color="green" className="mt-1">
              {commercialCost.toLocaleString('ru-RU', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              })} ₽
            </Tag>
          </div>
        </Col>

        {/* Actions */}
        <Col xs={24} sm={12} md={4}>
          <Space className="mt-4">
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={loading}
            >
              Сохранить
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={onCancel}
              disabled={loading}
            >
              Отмена
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );
};

export default React.memo(WorkEditForm);