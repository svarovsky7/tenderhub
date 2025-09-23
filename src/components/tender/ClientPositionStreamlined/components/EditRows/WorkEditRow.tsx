import React, { useMemo } from 'react';
import { Form, Input, Select, Button } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { DecimalInput } from '../../../../common';
import CostDetailCascadeSelector from '../../../../common/CostDetailCascadeSelector';
import { formatCurrency } from '../../../../../utils/formatters';
import { getCurrencySymbol, getCurrencyRate } from '../../../../../utils/currencyConverter';
import {
  calculateWorkCommercialCost,
  calculateSubcontractWorkCommercialCost
} from '../../../../../utils/calculateCommercialCost';
import type { BOQItemWithLibrary } from '../../../../../lib/supabase/types/boq';

interface WorkEditRowProps {
  item: BOQItemWithLibrary;
  workEditForm: FormInstance;
  handleSaveWorkEdit: (values: any) => void;
  handleCancelWorkEdit: () => void;
  tenderMarkup: any;
  tender?: any;
}

export const WorkEditRow: React.FC<WorkEditRowProps> = ({
  item,
  workEditForm,
  handleSaveWorkEdit,
  handleCancelWorkEdit,
  tenderMarkup,
  tender
}) => {
  // Watch form fields for dynamic calculation
  const quantity = Form.useWatch('quantity', workEditForm) || 0;
  const unitRate = Form.useWatch('unit_rate', workEditForm) || 0;
  const itemType = Form.useWatch('item_type', workEditForm) || item.item_type;
  const currencyType = Form.useWatch('currency_type', workEditForm) || 'RUB';
  const currencyRate = Form.useWatch('currency_rate', workEditForm) || 1;

  // Calculate commercial cost
  const commercialCost = useMemo(() => {
    if (!tenderMarkup || !unitRate || !quantity) return 0;

    const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
    const baseCost = quantity * unitRate * currencyMultiplier;

    if (itemType === 'work') {
      return calculateWorkCommercialCost(baseCost, tenderMarkup);
    } else if (itemType === 'sub_work') {
      return calculateSubcontractWorkCommercialCost(baseCost, tenderMarkup);
    }

    return baseCost;
  }, [quantity, unitRate, itemType, tenderMarkup, currencyType, currencyRate]);

  // Determine background color based on item type
  const getEditBackgroundColor = () => {
    switch(item.item_type) {
      case 'work':
        return 'rgba(254, 215, 170, 0.3)'; // Orange for work (fed7aa with opacity)
      case 'sub_work':
        return 'rgba(233, 213, 255, 0.3)'; // Purple for sub-work (e9d5ff with opacity)
      default:
        return '#f0f8ff';
    }
  };

  const getBorderColor = () => {
    switch(item.item_type) {
      case 'work':
        return '#fb923c'; // Orange border
      case 'sub_work':
        return '#c084fc'; // Purple border
      default:
        return '#1890ff';
    }
  };

  return (
    <tr>
      <td colSpan={13} style={{ padding: 0 }}>
        <Form
          form={workEditForm}
          layout="vertical"
          onFinish={handleSaveWorkEdit}
          className="w-full"
          style={{
            padding: '12px',
            backgroundColor: getEditBackgroundColor(),
            borderRadius: '4px',
            border: `2px solid ${getBorderColor()}`,
            boxShadow: `0 2px 4px ${getBorderColor()}33`
          }}
        >
          {/* First row with main fields */}
          <div className="flex items-end gap-2 mb-3">
            {/* Type */}
            <Form.Item
              name="item_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
              className="mb-0"
              style={{ width: '110px' }}
              rules={[{ required: true, message: 'Тип' }]}
            >
              <Select size="small" placeholder="Тип">
                <Select.Option value="work">Работа</Select.Option>
                <Select.Option value="sub_work">Суб-работа</Select.Option>
              </Select>
            </Form.Item>

            {/* Name - expanded */}
            <Form.Item
              name="description"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Наименование</span>}
              className="mb-0"
              style={{ flex: '1 1 auto', minWidth: '0' }}
              rules={[{ required: true, message: 'Наименование' }]}
            >
              <Input.TextArea
                placeholder="Наименование работы"
                size="small"
                autoSize={{ minRows: 1, maxRows: 2 }}
                style={{ resize: 'none', width: '100%' }}
              />
            </Form.Item>

            {/* Quantity */}
            <Form.Item
              name="quantity"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Количество</span>}
              className="mb-0"
              style={{ width: '100px' }}
              rules={[{ required: true, message: 'Кол-во' }]}
            >
              <DecimalInput
                placeholder="0.00"
                min={0}
                precision={2}
                size="small"
              />
            </Form.Item>

            {/* Unit */}
            <Form.Item
              name="unit"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ед. изм.</span>}
              className="mb-0"
              style={{ width: '110px' }}
              rules={[{ required: true, message: 'Ед.' }]}
            >
              <Input placeholder="шт" size="small" />
            </Form.Item>

            {/* Currency fields */}
            <>
              <Form.Item
                name="currency_type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Валюта</span>}
                className="mb-0"
                style={{ width: '80px' }}
              >
                <Select
                  size="small"
                  onChange={(value) => {
                    // Update currency rate when currency changes
                    const newRate = value !== 'RUB' && tender ? getCurrencyRate(value, tender) : null;
                    workEditForm.setFieldValue('currency_rate', newRate);
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
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Цена за ед.</span>}
                    className="mb-0"
                    style={{ width: '120px' }}
                    rules={[{ required: true, message: 'Цена' }]}
                  >
                    <DecimalInput
                      placeholder="0.00"
                      min={0}
                      precision={2}
                      size="small"
                      suffix={currencySymbol}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            {/* Total */}
            <Form.Item
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Сумма</span>}
              className="mb-0"
              style={{ width: '140px' }}
            >
              <div style={{
                height: '24px',
                padding: '0 8px',
                background: '#f5f5f5',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'normal',
                color: '#000'
              }}>
                {formatCurrency(quantity * unitRate * (currencyType !== 'RUB' && currencyRate ? currencyRate : 1))}
              </div>
            </Form.Item>
          </div>

          {/* Second row with category */}
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
                onClick={handleCancelWorkEdit}
                size="middle"
                danger
                style={{ height: '32px', fontSize: '13px' }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                size="middle"
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