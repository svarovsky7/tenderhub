import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Row, Col, Tag, Switch } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

const { Option } = Select;

interface MaterialEditFormProps {
  item: BOQItemWithLibrary;
  form: any;
  works: BOQItemWithLibrary[];
  onSave: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const MaterialEditForm: React.FC<MaterialEditFormProps> = ({
  item,
  form,
  works,
  onSave,
  onCancel,
  loading = false
}) => {
  // Watch form fields for dynamic calculation
  const workId = Form.useWatch('work_id', form);
  const consumptionCoef = Form.useWatch('consumption_coefficient', form) || 1;
  const conversionCoef = Form.useWatch('conversion_coefficient', form) || 1;
  const baseQuantity = Form.useWatch('base_quantity', form);
  const deliveryType = Form.useWatch('delivery_price_type', form) || 'included';
  const unitRate = Form.useWatch('unit_rate', form) || 0;

  // Calculate quantity based on work link
  useEffect(() => {
    if (workId) {
      const work = works.find(w => w.id === workId);
      if (work && work.quantity) {
        const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
        form.setFieldsValue({ quantity: calculatedQuantity });
      }
    } else if (baseQuantity !== undefined) {
      // For unlinked materials, calculate from base quantity
      const calculatedQuantity = baseQuantity * consumptionCoef;
      form.setFieldsValue({ quantity: calculatedQuantity });
    }
  }, [workId, consumptionCoef, conversionCoef, baseQuantity, works, form]);

  // Handle delivery type change
  const handleDeliveryTypeChange = (type: string) => {
    if (type === 'not_included') {
      // Calculate 3% of unit rate
      const deliveryAmount = unitRate * 0.03;
      form.setFieldsValue({ delivery_amount: deliveryAmount });
    } else if (type === 'included') {
      form.setFieldsValue({ delivery_amount: 0 });
    }
  };

  // Determine background color based on item type
  const getEditBackgroundColor = () => {
    switch (item.item_type) {
      case 'material':
        return 'rgba(191, 219, 254, 0.3)'; // Blue for material
      case 'sub_material':
        return 'rgba(167, 243, 208, 0.3)'; // Green for sub-material
      default:
        return '#f0f8ff';
    }
  };

  const getBorderColor = () => {
    switch (item.item_type) {
      case 'material':
        return '#3b82f6'; // Blue border
      case 'sub_material':
        return '#10b981'; // Green border
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
        <Col xs={24} sm={6} md={3}>
          <Form.Item
            name="item_type"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
            className="mb-0"
          >
            <Select size="small" disabled>
              <Option value="material">Материал</Option>
              <Option value="sub_material">Суб-материал</Option>
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
            <Input size="small" placeholder="Описание материала" />
          </Form.Item>
        </Col>

        {/* Material Type */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="material_type"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип материала</span>}
            className="mb-0"
          >
            <Select size="small">
              <Option value="main">Основной</Option>
              <Option value="auxiliary">Вспомогательный</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Linked Work */}
        <Col xs={24} sm={16} md={6}>
          <Form.Item
            name="work_id"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Связанная работа</span>}
            className="mb-0"
          >
            <Select
              size="small"
              placeholder="Выберите работу"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {works.map(work => (
                <Option key={work.id} value={work.id}>
                  {work.description}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        {/* Unit */}
        <Col xs={24} sm={8} md={2}>
          <Form.Item
            name="unit"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ед.</span>}
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
              <Option value="л">л</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Base Quantity (for unlinked materials) */}
        {!workId && (
          <Col xs={24} sm={8} md={2}>
            <Form.Item
              name="base_quantity"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Базовое кол-во</span>}
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
        )}
      </Row>

      {/* Second row with coefficients and pricing */}
      <Row gutter={[12, 12]} className="mt-3">
        {/* Consumption Coefficient */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="consumption_coefficient"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Коэф. расхода</span>}
            className="mb-0"
          >
            <InputNumber
              size="small"
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="1"
              disabled={!workId && !baseQuantity}
            />
          </Form.Item>
        </Col>

        {/* Conversion Coefficient (only for linked) */}
        {workId && (
          <Col xs={24} sm={8} md={3}>
            <Form.Item
              name="conversion_coefficient"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Коэф. перевода</span>}
              className="mb-0"
            >
              <InputNumber
                size="small"
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="1"
              />
            </Form.Item>
          </Col>
        )}

        {/* Calculated Quantity */}
        <Col xs={24} sm={8} md={3}>
          <Form.Item
            name="quantity"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Итоговое кол-во</span>}
            className="mb-0"
          >
            <InputNumber
              size="small"
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              disabled={!!workId || !!baseQuantity}
              placeholder="0"
            />
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
              onChange={() => {
                if (deliveryType === 'not_included') {
                  handleDeliveryTypeChange('not_included');
                }
              }}
            />
          </Form.Item>
        </Col>

        {/* Delivery Type */}
        <Col xs={24} sm={8} md={4}>
          <Form.Item
            name="delivery_price_type"
            label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Доставка</span>}
            className="mb-0"
          >
            <Select size="small" onChange={handleDeliveryTypeChange}>
              <Option value="included">Включена</Option>
              <Option value="not_included">Не включена (3%)</Option>
              <Option value="amount">Фикс. сумма</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* Delivery Amount (for fixed amount) */}
        {deliveryType === 'amount' && (
          <Col xs={24} sm={8} md={3}>
            <Form.Item
              name="delivery_amount"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Сумма доставки</span>}
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
        )}

        {/* Actions */}
        <Col xs={24} sm={24} md={5}>
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

export default React.memo(MaterialEditForm);