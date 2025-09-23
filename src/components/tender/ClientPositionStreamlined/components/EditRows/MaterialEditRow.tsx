import React, { useMemo } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { DecimalInput } from '../../../../common';
import CostDetailCascadeSelector from '../../../../common/CostDetailCascadeSelector';
import { formatCurrency } from '../../../../../utils/formatters';
import { getCurrencySymbol, getCurrencyRate } from '../../../../../utils/currencyConverter';
import {
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateSubcontractMaterialCommercialCost
} from '../../../../../utils/calculateCommercialCost';
import type { BOQItemWithLibrary } from '../../../../../lib/supabase/types/boq';

interface MaterialEditRowProps {
  item: BOQItemWithLibrary;
  editForm: FormInstance;
  handleSaveInlineEdit: (values: any) => void;
  handleCancelInlineEdit: () => void;
  handleWorkSelectionChange: (workId: string) => void;
  handleCoefficientChange: (value?: number) => void;
  tenderMarkup: any;
  tender?: any;
  works: any[];
  loading?: boolean;
}

export const MaterialEditRow: React.FC<MaterialEditRowProps> = ({
  item,
  editForm,
  handleSaveInlineEdit,
  handleCancelInlineEdit,
  handleWorkSelectionChange,
  handleCoefficientChange,
  tenderMarkup,
  tender,
  works,
  loading
}) => {
  // Watch form fields for dynamic calculation
  const quantity = Form.useWatch('quantity', editForm) || 0;
  const unitRate = Form.useWatch('unit_rate', editForm) || 0;
  const itemType = Form.useWatch('item_type', editForm) || item.item_type;
  const workId = Form.useWatch('work_id', editForm);
  const deliveryType = Form.useWatch('delivery_price_type', editForm) || 'included';
  const deliveryAmount = Form.useWatch('delivery_amount', editForm) || 0;
  const consumptionCoef = Form.useWatch('consumption_coefficient', editForm) || 1;
  const conversionCoef = Form.useWatch('conversion_coefficient', editForm) || 1;
  const currencyType = Form.useWatch('currency_type', editForm) || 'RUB';
  const currencyRate = Form.useWatch('currency_rate', editForm) || 1;

  // Calculate actual quantity based on work link
  const actualQuantity = useMemo(() => {
    if (workId) {
      // Find the linked work to get its quantity
      const linkedWork = works.find(w => w.id === workId);
      const workQuantity = linkedWork?.quantity || 0;
      return workQuantity * consumptionCoef * conversionCoef;
    }
    // For unlinked materials, apply consumption coefficient to base quantity
    return quantity * consumptionCoef;
  }, [workId, quantity, consumptionCoef, conversionCoef, works]);

  // Calculate delivery cost per unit
  const deliveryCost = useMemo(() => {
    const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
    if (deliveryType === 'included') return 0;
    if (deliveryType === 'not_included') return unitRate * currencyMultiplier * 0.03;
    if (deliveryType === 'amount') return deliveryAmount; // deliveryAmount is already in RUB per unit
    return 0;
  }, [deliveryType, deliveryAmount, unitRate, currencyType, currencyRate]);

  // Calculate commercial cost
  const commercialCost = useMemo(() => {
    if (!tenderMarkup || !unitRate) return 0;

    // Apply currency conversion
    const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;

    // Calculate total base cost with delivery
    const baseCostPerUnit = unitRate * currencyMultiplier;
    const totalBaseCost = actualQuantity * baseCostPerUnit;
    const totalDeliveryCost = actualQuantity * deliveryCost;
    const totalCostWithDelivery = totalBaseCost + totalDeliveryCost;

    if (itemType === 'material') {
      // Check if it's linked (main) or unlinked (auxiliary)
      const isLinked = !!workId;
      if (isLinked) {
        // For main materials, return just the base cost (markup goes to works)
        const result = calculateMainMaterialCommercialCost(totalCostWithDelivery, tenderMarkup);
        return result.materialCost;
      } else {
        // For auxiliary materials, return 0 (all cost goes to works)
        const result = calculateAuxiliaryMaterialCommercialCost(totalCostWithDelivery, tenderMarkup);
        return result.materialCost; // This will be 0
      }
    } else if (itemType === 'sub_material') {
      // For sub-materials
      const result = calculateSubcontractMaterialCommercialCost(totalCostWithDelivery, tenderMarkup);
      return result.materialCost;
    }

    return totalCostWithDelivery;
  }, [actualQuantity, unitRate, deliveryCost, itemType, workId, tenderMarkup, currencyType, currencyRate]);

  // Determine background color based on item type and link status
  const getEditBackgroundColor = () => {
    switch(item.item_type) {
      case 'material':
        return item.work_link ? 'rgba(191, 219, 254, 0.3)' : 'rgba(219, 234, 254, 0.3)'; // Blue shades for material
      case 'sub_material':
        return 'rgba(187, 247, 208, 0.3)'; // Green for sub-material (bbf7d0 with opacity)
      default:
        return '#fff5f0';
    }
  };

  const getBorderColor = () => {
    switch(item.item_type) {
      case 'material':
        return '#60a5fa'; // Blue border
      case 'sub_material':
        return '#34d399'; // Green border
      default:
        return '#ff7a45';
    }
  };

  return (
    <tr>
      <td colSpan={13} style={{ padding: 0 }}>
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveInlineEdit}
          className="w-full"
          style={{
            padding: '12px',
            backgroundColor: getEditBackgroundColor(),
            borderRadius: '4px',
            border: `2px solid ${getBorderColor()}`,
            boxShadow: `0 2px 4px ${getBorderColor()}33`
          }}
        >
          {/* Single row with all main fields - compact table-like layout */}
          <div className="flex items-end gap-2 mb-3">
            {/* Type - expanded */}
            <Form.Item
              name="item_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
              className="mb-0"
              style={{ width: '110px' }}
              rules={[{ required: true, message: 'Тип' }]}
            >
              <Select size="small" placeholder="Тип">
                <Select.Option value="material">Материал</Select.Option>
                <Select.Option value="sub_material">Суб-мат</Select.Option>
              </Select>
            </Form.Item>

            {/* Material Type - основной/вспомогательный */}
            <Form.Item
              name="material_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Вид</span>}
              className="mb-0"
              style={{ width: '140px' }}
              initialValue="main"
            >
              <Select size="small" placeholder="Вид материала">
                <Select.Option value="main">Основной</Select.Option>
                <Select.Option value="auxiliary">Вспомогательный</Select.Option>
              </Select>
            </Form.Item>

            {/* Name - expanded to full width */}
            <Form.Item
              name="description"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Наименование</span>}
              className="mb-0 flex-1"
              style={{ minWidth: '200px' }}
              rules={[{ required: true, message: 'Наименование' }]}
            >
              <Input.TextArea
                placeholder="Наименование материала"
                size="small"
                autoSize={{ minRows: 1, maxRows: 2 }}
                style={{ resize: 'none' }}
              />
            </Form.Item>

            {/* Work Link */}
            <Form.Item
              name="work_id"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Привязка к работе</span>}
              className="mb-0"
              style={{ width: '180px' }}
            >
              <Select
                placeholder="Работа"
                allowClear
                size="small"
                showSearch
                onChange={handleWorkSelectionChange}
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {works.map((work) => (
                  <Select.Option key={work.id} value={work.id}>
                    {work.description}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Consumption Coefficient */}
            <Form.Item
              name="consumption_coefficient"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.расх</span>}
              className="mb-0"
              style={{ width: '70px' }}
              rules={[
                { type: 'number', min: 1, message: 'Значение коэффициента расхода не может быть менее 1' }
              ]}
            >
              <DecimalInput
                placeholder="1.00"
                min={1}
                precision={4}
                size="small"
                onChange={(value) => {
                  // Ensure value is at least 1
                  const validValue = value && value < 1 ? 1 : value;
                  if (value && value < 1) {
                    message.warning('Значение коэффициента расхода не может быть менее 1');
                    editForm.setFieldValue('consumption_coefficient', 1);
                  }
                  handleCoefficientChange(validValue);
                }}
                style={{ textAlign: 'center' }}
              />
            </Form.Item>

            {/* Conversion Coefficient */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
              {({ getFieldValue }) => (
                <Form.Item
                  name="conversion_coefficient"
                  label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.перев</span>}
                  className="mb-0"
                  style={{ width: '70px' }}
                >
                  <DecimalInput
                    placeholder="1.00"
                    min={0}
                    precision={4}
                    size="small"
                    disabled={!getFieldValue('work_id')}
                    onChange={handleCoefficientChange}
                    style={{ textAlign: 'center' }}
                  />
                </Form.Item>
              )}
            </Form.Item>

            {/* Quantity */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
              {({ getFieldValue }) => (
                <Form.Item
                  name="quantity"
                  label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Кол-во</span>}
                  className="mb-0"
                  style={{ width: '75px' }}
                  rules={[{ required: true, message: 'Кол-во' }]}
                >
                  <DecimalInput
                    placeholder="0.00"
                    min={0}
                    precision={2}
                    size="small"
                    disabled={!!getFieldValue('work_id')}
                    style={{ textAlign: 'center' }}
                  />
                </Form.Item>
              )}
            </Form.Item>

            {/* Unit - moved after Quantity */}
            <Form.Item
              name="unit"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Ед. изм.</span>}
              className="mb-0"
              style={{ width: '110px' }}
              rules={[{ required: true, message: 'Ед.' }]}
            >
              <Input placeholder="шт" size="small" style={{ textAlign: 'center' }} />
            </Form.Item>

            {/* Currency Type */}
            <>
              <Form.Item
                name="currency_type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Валюта</span>}
                className="mb-0"
                style={{ width: '80px' }}
              >
                <Select
                  size="small"
                  style={{ textAlign: 'center' }}
                  onChange={(value) => {
                    // Update currency rate when currency changes
                    const newRate = value !== 'RUB' && tender ? getCurrencyRate(value, tender) : null;
                    editForm.setFieldValue('currency_rate', newRate);
                  }}
                >
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

              {/* Hidden field to store currency rate */}
              <Form.Item
                name="currency_rate"
                hidden
              >
                <Input />
              </Form.Item>
            </>

            {/* Price */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.currency_type !== curr.currency_type}>
              {({ getFieldValue }) => {
                const selectedCurrency = getFieldValue('currency_type') || 'RUB';
                const currencySymbol = getCurrencySymbol(selectedCurrency);
                return (
                  <Form.Item
                    name="unit_rate"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Цена</span>}
                    className="mb-0"
                    style={{ width: '90px' }}
                    rules={[{ required: true, message: 'Цена' }]}
                  >
                    <DecimalInput
                      placeholder="0.00"
                      min={0}
                      precision={2}
                      size="small"
                      suffix={currencySymbol}
                      style={{ textAlign: 'center' }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            {/* Delivery */}
            <Form.Item
              name="delivery_price_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Доставка</span>}
              className="mb-0"
              style={{ width: '120px' }}
              initialValue="included"
            >
              <Select placeholder="Тип" size="small" style={{ textAlign: 'center' }}>
                <Select.Option value="included">Включена</Select.Option>
                <Select.Option value="not_included">Не вкл. (3%)</Select.Option>
                <Select.Option value="amount">Фикс. сумма</Select.Option>
              </Select>
            </Form.Item>

            {/* Conditional Delivery Amount field */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.delivery_price_type !== curr.delivery_price_type}>
              {({ getFieldValue }) => {
                const deliveryType = getFieldValue('delivery_price_type');
                return deliveryType === 'amount' ? (
                  <Form.Item
                    name="delivery_amount"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Сум.дост</span>}
                    className="mb-0"
                    style={{ width: '80px' }}
                  >
                    <DecimalInput
                      placeholder="0.00"
                      min={0}
                      precision={2}
                      size="small"
                      suffix="₽"
                      style={{ textAlign: 'center' }}
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            {/* Total */}
            <Form.Item
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Сумма</span>}
              className="mb-0"
              style={{ minWidth: '100px', maxWidth: '140px' }}
            >
              <div style={{
                height: '24px',
                padding: '0 8px',
                background: '#f5f5f5',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'normal',
                color: '#000',
                whiteSpace: 'nowrap'
              }}>
                {(() => {
                  // Use actualQuantity which includes coefficients calculation
                  const unitRate = editForm.getFieldValue('unit_rate') || 0;
                  const deliveryType = editForm.getFieldValue('delivery_price_type') || 'included';
                  const deliveryAmount = editForm.getFieldValue('delivery_amount') || 0;
                  const currencyType = editForm.getFieldValue('currency_type') || 'RUB';
                  const currencyRate = editForm.getFieldValue('currency_rate') || 1;

                  const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
                  const baseTotal = actualQuantity * unitRate * currencyMultiplier;
                  let deliveryCost = 0;

                  if (deliveryType === 'not_included') {
                    deliveryCost = baseTotal * 0.03;
                  } else if (deliveryType === 'amount') {
                    // deliveryAmount is per unit in RUB, no need to multiply by currencyMultiplier
                    deliveryCost = deliveryAmount * actualQuantity;
                  }

                  return formatCurrency(baseTotal + deliveryCost);
                })()}
              </div>
            </Form.Item>
          </div>

          {/* Second row: Category field */}
          <div className="flex items-end gap-2 mb-3">
            <Form.Item
              name="detail_cost_category_id"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Категория затрат</span>}
              className="mb-0 flex-1"
              rules={[{ required: true, message: 'Выберите категорию затрат' }]}
            >
              <CostDetailCascadeSelector
                placeholder="Выберите категорию затрат"
                size="small"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          {/* Third row: Quote Link */}
          <div className="flex items-end gap-2 mb-3">
            <Form.Item
              name="quote_link"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ссылка на КП</span>}
              className="mb-0 flex-1"
            >
              <Input
                placeholder="Ссылка на коммерческое предложение"
                size="small"
              />
            </Form.Item>
          </div>

          {/* Fourth row: Note + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
            <Form.Item
              name="note"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Примечание</span>}
              className="mb-0 flex-1"
            >
              <Input
                placeholder="Примечание к элементу"
                size="small"
              />
            </Form.Item>

            {/* Action Buttons - same row on desktop */}
            <div className="flex gap-2 flex-shrink-0 sm:pb-1">
              <Button
                type="default"
                icon={<CloseOutlined />}
                onClick={handleCancelInlineEdit}
                size="middle"
                danger
                style={{ height: '32px', fontSize: '13px' }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<CheckOutlined />}
                size="middle"
                loading={loading}
                style={{ height: '32px', fontSize: '13px' }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </Form>
      </td>
    </tr>
  );
};