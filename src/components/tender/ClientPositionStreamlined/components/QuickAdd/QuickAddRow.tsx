import React, { useState } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { DecimalInput } from '../../../../common';
import CostDetailCascadeSelector from '../../../../common/CostDetailCascadeSelector';
import { getCurrencyRate, CURRENCY_OPTIONS } from '../../../../../utils/currencyConverter';

interface QuickAddRowProps {
  quickAddForm: FormInstance;
  handleQuickAdd: (values: any) => void;
  handleCurrencyChange: (currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => void;
  setQuickAddMode: (mode: boolean) => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  works: any[];
  tender?: any;
}

export const QuickAddRow: React.FC<QuickAddRowProps> = ({
  quickAddForm,
  handleQuickAdd,
  handleCurrencyChange,
  setQuickAddMode,
  selectedCurrency,
  setSelectedCurrency,
  works,
  tender
}) => {
  // State for quick add form type
  const [quickAddFormType, setQuickAddFormType] = useState<string>('work');

  // Determine background color based on type
  const getAddBackgroundColor = () => {
    switch(quickAddFormType) {
      case 'work':
        return 'rgba(254, 215, 170, 0.2)'; // Light orange for work
      case 'sub_work':
        return 'rgba(233, 213, 255, 0.2)'; // Light purple for sub-work
      case 'material':
        return 'rgba(219, 234, 254, 0.2)'; // Light blue for material
      case 'sub_material':
        return 'rgba(187, 247, 208, 0.2)'; // Light green for sub-material
      default:
        return '#f9f9f9';
    }
  };

  const getBorderColor = () => {
    switch(quickAddFormType) {
      case 'work':
        return '#fb923c'; // Orange border
      case 'sub_work':
        return '#c084fc'; // Purple border
      case 'material':
        return '#60a5fa'; // Blue border
      case 'sub_material':
        return '#34d399'; // Green border
      default:
        return '#d9d9d9';
    }
  };

  return (
    <Form
      form={quickAddForm}
      layout="vertical"
      onFinish={handleQuickAdd}
      className="w-full"
      style={{
        padding: '12px',
        backgroundColor: getAddBackgroundColor(),
        borderRadius: '4px',
        border: `2px solid ${getBorderColor()}`,
        boxShadow: `0 2px 4px ${getBorderColor()}33`,
        marginBottom: '16px'
      }}
    >
      <Form.Item
        noStyle
        shouldUpdate
      >
        {({ getFieldValue }) => {
          const currentType = getFieldValue('type') || 'work';
          if (currentType !== quickAddFormType) {
            setQuickAddFormType(currentType);
          }
          const isWork = currentType === 'work' || currentType === 'sub_work';
          const isMaterial = currentType === 'material' || currentType === 'sub_material';

          return (
            <>
            {/* Main fields row - adapted for both works and materials */}
            <div className="flex items-end gap-2 mb-3">
              {/* Type */}
              <Form.Item
                name="type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
                className="mb-0"
                initialValue="work"
                style={{ width: '110px' }}
              >
                <Select size="small" placeholder="Тип" onChange={setQuickAddFormType}>
                  <Select.Option value="work">Работа</Select.Option>
                  <Select.Option value="sub_work">Суб-работа</Select.Option>
                  <Select.Option value="material">Материал</Select.Option>
                  <Select.Option value="sub_material">Суб-мат</Select.Option>
                </Select>
              </Form.Item>

              {/* Material Type - only for materials, right after Type */}
              {isMaterial && (
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
              )}

              {/* Name - expands to fill available space */}
              <Form.Item
                name="description"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Наименование</span>}
                className="mb-0 flex-1"
                style={{ minWidth: '200px' }}
                rules={[{ required: true, message: 'Наименование' }]}
              >
                <Input.TextArea
                  placeholder={isWork ? "Наименование работы" : "Наименование материала"}
                  size="small"
                  autoSize={{ minRows: 1, maxRows: 2 }}
                  style={{ resize: 'none' }}
                />
              </Form.Item>

              {/* Work Link - only for materials */}
              {isMaterial && (
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
                    onChange={(workId) => {
                      if (!workId) {
                        quickAddForm.setFieldsValue({ quantity: undefined });
                        return;
                      }
                      const work = works.find(w => w.id === workId);
                      if (work && work.quantity) {
                        const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                        const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                        const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                        quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                      }
                    }}
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
              )}

              {/* Coefficients - only for materials */}
              {isMaterial && (
                <>
                  <Form.Item
                    name="consumption_coefficient"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.расх</span>}
                    className="mb-0"
                    initialValue={1}
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
                      style={{ textAlign: 'center' }}
                      onChange={(value) => {
                        // Ensure value is at least 1
                        const validValue = value && value < 1 ? 1 : value;
                        if (value && value < 1) {
                          message.warning('Значение коэффициента расхода не может быть менее 1');
                          quickAddForm.setFieldValue('consumption_coefficient', 1);
                        }
                        const workId = quickAddForm.getFieldValue('work_id');
                        if (!workId) return;
                        const work = works.find(w => w.id === workId);
                        if (work && work.quantity) {
                          const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                          const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                          const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                          quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                        }
                      }}
                    />
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
                    {({ getFieldValue }) => (
                      <Form.Item
                        name="conversion_coefficient"
                        label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.перев</span>}
                        className="mb-0"
                        initialValue={1}
                        style={{ width: '70px' }}
                      >
                        <DecimalInput
                          placeholder="1.00"
                          min={0}
                          precision={4}
                          size="small"
                          disabled={!getFieldValue('work_id')}
                          style={{ textAlign: 'center' }}
                          onChange={() => {
                            const workId = quickAddForm.getFieldValue('work_id');
                            if (!workId) return;
                            const work = works.find(w => w.id === workId);
                            if (work && work.quantity) {
                              const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                              const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                              const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                              quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                            }
                          }}
                        />
                      </Form.Item>
                    )}
                  </Form.Item>
                </>
              )}

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
                      disabled={isMaterial && !!getFieldValue('work_id')}
                      style={{ textAlign: 'center' }}
                    />
                  </Form.Item>
                )}
              </Form.Item>

              {/* Unit */}
              <Form.Item
                name="unit"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Ед. изм.</span>}
                className="mb-0"
                style={{ width: '110px' }}
                rules={[{ required: true, message: 'Ед.' }]}
              >
                <Input placeholder="шт" size="small" style={{ textAlign: 'center' }} />
              </Form.Item>

              {/* Currency selector - always show for testing */}
              <Form.Item
                name="currency_type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Валюта</span>}
                className="mb-0"
                style={{ width: '70px' }}
                initialValue="RUB"
              >
                <Select
                  size="small"
                  style={{ textAlign: 'center' }}
                  onChange={handleCurrencyChange}
                >
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

              {/* Hidden field to store currency rate */}
              {selectedCurrency !== 'RUB' && (
                <Form.Item
                  name="currency_rate"
                  hidden
                  initialValue={tender ? getCurrencyRate(selectedCurrency, tender) : 1}
                >
                  <Input />
                </Form.Item>
              )}

              {/* Price */}
              <Form.Item
                name="unit_rate"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>
                  Цена {selectedCurrency === 'RUB' ? '₽' : CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol}
                </span>}
                className="mb-0"
                style={{ width: '90px' }}
                rules={[{ required: true, message: 'Цена' }]}
              >
                <DecimalInput
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  size="small"
                  suffix={selectedCurrency === 'RUB' ? '₽' : CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol}
                  style={{ textAlign: 'center' }}
                />
              </Form.Item>

              {/* Delivery - only for materials */}
              {isMaterial && (
                <>
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
                </>
              )}
            </div>

            {/* Second row: Category field and Action Buttons */}
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
                  style={{ width: '100%' }}
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
                <Input.TextArea
                  placeholder="Примечание к элементу"
                  size="small"
                  rows={2}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              {/* Action Buttons - same row on desktop */}
              <div className="flex gap-2 flex-shrink-0 sm:pb-1">
                <Button
                  type="default"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setQuickAddMode(false);
                    quickAddForm.resetFields();
                    setQuickAddFormType('work');
                    setSelectedCurrency('RUB');
                  }}
                  size="middle"
                  danger
                  style={{ height: '32px', fontSize: '13px' }}
                >
                  Отмена
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  htmlType="submit"
                  size="middle"
                  style={{ height: '32px', fontSize: '13px' }}
                >
                  Добавить
                </Button>
              </div>
            </div>
            </>
          );
        }}
      </Form.Item>
    </Form>
  );
};