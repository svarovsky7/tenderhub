import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Input, InputNumber, Select, Radio, message } from 'antd';
import AutoCompleteSearch from '../common/AutoCompleteSearch';
import { CostCascadeSelector } from '../common';
import { CURRENCY_SYMBOLS, CURRENCY_OPTIONS } from '../../utils/currencyConverter';
import type { BOQItem, DeliveryPriceType } from '../../lib/supabase/types';

const { TextArea } = Input;

interface BOQItemEditFormProps {
  visible: boolean;
  item: BOQItem | null;
  onSave: (updates: Partial<BOQItem>) => Promise<void>;
  onCancel: () => void;
}

export const BOQItemEditForm: React.FC<BOQItemEditFormProps> = ({
  visible,
  item,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<{
    description: string;
    quantity: number;
    unit_rate: number;
    consumption_coefficient?: number;
    conversion_coefficient?: number;
    delivery_price_type?: DeliveryPriceType;
    delivery_amount?: number;
    detail_cost_category_id?: string | null;
    cost_node_display?: string | null;
    currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY';
    currency_rate?: number | null;
    quote_link?: string;
    note?: string;
  }>({
    description: '',
    quantity: 0,
    unit_rate: 0
  });

  const [loading, setLoading] = useState(false);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description || '',
        quantity: item.quantity || 0,
        unit_rate: item.unit_rate || 0,
        consumption_coefficient: item.consumption_coefficient || 1,
        conversion_coefficient: item.conversion_coefficient || 1,
        delivery_price_type: item.delivery_price_type || 'included',
        delivery_amount: item.delivery_amount || 0,
        detail_cost_category_id: item.detail_cost_category_id,
        cost_node_display: item.cost_node_display,
        currency_type: item.original_currency || 'RUB',
        currency_rate: item.currency_rate,
        quote_link: item.quote_link || '',
        note: item.note || ''
      });
    }
  }, [item]);

  const handleSave = useCallback(async () => {
    if (!item) return;

    setLoading(true);
    try {
      const updates: Partial<BOQItem> = {
        description: formData.description,
        quantity: formData.quantity,
        unit_rate: formData.unit_rate,
        consumption_coefficient: formData.consumption_coefficient,
        conversion_coefficient: formData.conversion_coefficient,
        delivery_price_type: formData.delivery_price_type,
        delivery_amount: formData.delivery_amount,
        detail_cost_category_id: formData.detail_cost_category_id,
        cost_node_display: formData.cost_node_display,
        original_currency: formData.currency_type,
        currency_rate: formData.currency_rate,
        quote_link: formData.quote_link,
        note: formData.note
      };

      await onSave(updates);
      onCancel(); // Close modal
    } catch (error) {
      console.error('❌ Error saving BOQ item:', error);
      message.error('Ошибка сохранения позиции');
    } finally {
      setLoading(false);
    }
  }, [item, formData, onSave, onCancel]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDeliveryTypeChange = useCallback((type: DeliveryPriceType) => {
    setFormData(prev => ({
      ...prev,
      delivery_price_type: type,
      delivery_amount: type === 'not_included' ? prev.unit_rate * 0.03 : 0
    }));
  }, []);

  const handleCostCategorySelect = useCallback((categoryId: string | null, displayText: string | null) => {
    setFormData(prev => ({
      ...prev,
      detail_cost_category_id: categoryId,
      cost_node_display: displayText
    }));
  }, []);

  if (!item) return null;

  const isMaterial = item.item_type === 'material' || item.item_type === 'unlinked_material';

  return (
    <Modal
      title={`Редактирование ${isMaterial ? 'материала' : 'работы'}`}
      open={visible}
      onOk={handleSave}
      onCancel={onCancel}
      confirmLoading={loading}
      width={800}
      okText="Сохранить"
      cancelText="Отмена"
    >
      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Наименование
          </label>
          <TextArea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={2}
            placeholder="Введите наименование"
          />
        </div>

        {/* Quantity and Unit Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество
            </label>
            <InputNumber
              value={formData.quantity}
              onChange={(value) => handleFieldChange('quantity', value || 0)}
              min={0}
              precision={3}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Цена за единицу
            </label>
            <InputNumber
              value={formData.unit_rate}
              onChange={(value) => handleFieldChange('unit_rate', value || 0)}
              min={0}
              precision={2}
              className="w-full"
              addonAfter={CURRENCY_SYMBOLS[formData.currency_type || 'RUB']}
            />
          </div>
        </div>

        {/* Currency for materials */}
        {isMaterial && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Валюта
              </label>
              <Select
                value={formData.currency_type}
                onChange={(value) => handleFieldChange('currency_type', value)}
                className="w-full"
                options={CURRENCY_OPTIONS}
              />
            </div>
            {formData.currency_type && formData.currency_type !== 'RUB' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Курс валюты
                </label>
                <InputNumber
                  value={formData.currency_rate}
                  onChange={(value) => handleFieldChange('currency_rate', value)}
                  min={0}
                  precision={4}
                  className="w-full"
                  placeholder="Курс к рублю"
                />
              </div>
            )}
          </div>
        )}

        {/* Coefficients for materials */}
        {isMaterial && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Коэффициент расхода
              </label>
              <InputNumber
                value={formData.consumption_coefficient}
                onChange={(value) => handleFieldChange('consumption_coefficient', value || 1)}
                min={0}
                precision={4}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Коэффициент пересчета
              </label>
              <InputNumber
                value={formData.conversion_coefficient}
                onChange={(value) => handleFieldChange('conversion_coefficient', value || 1)}
                min={0}
                precision={4}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Delivery for materials */}
        {isMaterial && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип доставки
              </label>
              <Radio.Group
                value={formData.delivery_price_type}
                onChange={(e) => handleDeliveryTypeChange(e.target.value)}
              >
                <Radio value="included">Включена в цену</Radio>
                <Radio value="not_included">Не включена (3%)</Radio>
                <Radio value="amount">Фиксированная сумма</Radio>
              </Radio.Group>
            </div>

            {formData.delivery_price_type === 'amount' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Стоимость доставки за единицу
                </label>
                <InputNumber
                  value={formData.delivery_amount}
                  onChange={(value) => handleFieldChange('delivery_amount', value || 0)}
                  min={0}
                  precision={2}
                  className="w-full"
                  addonAfter={CURRENCY_SYMBOLS[formData.currency_type || 'RUB']}
                />
              </div>
            )}
          </>
        )}

        {/* Cost category for works */}
        {!isMaterial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория затрат
            </label>
            <CostCascadeSelector
              value={formData.detail_cost_category_id}
              onChange={handleCostCategorySelect}
              placeholder="Выберите категорию затрат"
            />
          </div>
        )}

        {/* Additional fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ссылка на КП
            </label>
            <Input
              value={formData.quote_link}
              onChange={(e) => handleFieldChange('quote_link', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примечание
            </label>
            <Input
              value={formData.note}
              onChange={(e) => handleFieldChange('note', e.target.value)}
              placeholder="Дополнительная информация"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};