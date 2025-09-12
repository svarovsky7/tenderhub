import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Row,
  Col,
  Radio,
  Divider
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { boqItemsApi, materialsApi, worksApi, tendersApi } from '../../lib/supabase/api';
import type { BOQItem, Material, WorkItem } from '../../lib/supabase/types';
import { DecimalInput } from '../common';
import { InputNumber } from 'antd';
import { CURRENCY_OPTIONS, convertToRuble, getCurrencyRate } from '../../utils/currencyConverter';

const { TextArea } = Input;
const { Option } = Select;

interface BOQItemFormProps {
  tenderId: string;
  positionId: string;
  visible: boolean;
  onCancel: () => void;
  onSuccess: (item: BOQItem) => void;
  editingItem?: BOQItem | null;
}

interface FormData {
  item_type: 'material' | 'work' | 'sub_material' | 'sub_work';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  material_id?: string;
  work_id?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
  sort_order?: number;
  delivery_price_type?: 'included' | 'not_included' | 'amount';
  delivery_amount?: number;
  currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY';
}

const BOQItemForm: React.FC<BOQItemFormProps> = ({
  tenderId,
  positionId,
  visible,
  onCancel,
  onSuccess,
  editingItem
}) => {
  const [form] = Form.useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<{
    materials: Material[];
    works: WorkItem[];
  }>({ materials: [], works: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [tenderRates, setTenderRates] = useState<{
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  }>({});

  const isEditing = !!editingItem;
  const itemType = Form.useWatch('item_type', form);

  // Load library items and tender info on mount
  useEffect(() => {
    loadLibraryItems();
    loadTenderRates();
  }, [tenderId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible && editingItem) {
      form.setFieldsValue({
        item_type: editingItem.item_type,
        description: editingItem.description,
        unit: editingItem.unit,
        quantity: editingItem.quantity,
        unit_rate: editingItem.unit_rate,
        material_id: editingItem.material_id || undefined,
        work_id: editingItem.work_id || undefined,
        category: editingItem.category || '',
        subcategory: editingItem.subcategory || '',
        notes: editingItem.notes || '',
        sort_order: editingItem.sort_order || 0,
        consumption_coefficient: editingItem.consumption_coefficient || undefined,
        conversion_coefficient: editingItem.conversion_coefficient || undefined,
        delivery_price_type: editingItem.delivery_price_type || 'included',
        delivery_amount: editingItem.delivery_amount || 0
      });
    } else if (visible) {
      form.resetFields();
      setSelectedCurrency('RUB');
      form.setFieldsValue({ item_type: 'material', sort_order: 0, delivery_price_type: 'included', delivery_amount: 0 });
    }
  }, [visible, editingItem, form]);

  const loadTenderRates = async () => {
    try {
      const result = await tendersApi.getById(tenderId);
      if (result.data) {
        setTenderRates({
          usd_rate: result.data.usd_rate,
          eur_rate: result.data.eur_rate,
          cny_rate: result.data.cny_rate
        });
      }
    } catch (error) {
      console.error('Error loading tender rates:', error);
    }
  };

  const loadLibraryItems = async () => {
    setSearchLoading(true);
    try {
      const [materialsResult, worksResult] = await Promise.all([
        materialsApi.getAll(),
        worksApi.getAll()
      ]);

      setLibraryItems({
        materials: materialsResult.data || [],
        works: worksResult.data || []
      });
    } catch (error) {
      console.error('Error loading library items:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCurrencyChange = (currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => {
    console.log('💱 Currency changed:', currency);
    setSelectedCurrency(currency);
    form.setFieldsValue({ currency_type: currency });
  };

  const handleLibraryItemSelect = (_value: string, option: any) => {
    const selectedItem = option.item;
    
    // Auto-fill form fields
    form.setFieldsValue({
      description: selectedItem.name,
      unit: selectedItem.unit,
      unit_rate: selectedItem.base_price,
      category: selectedItem.category || '',
      currency_type: 'RUB' // Reset to RUB when selecting from library
    });
    setSelectedCurrency('RUB');
  };

  const getLibraryOptions = () => {
    const items = (itemType === 'material' || itemType === 'sub_material') ? libraryItems.materials : libraryItems.works;
    return items.map(item => ({
      value: item.id,
      label: `${item.code} - ${item.name} (${item.base_price} ₽/${item.unit})`,
      item: item
    }));
  };

  const handleSubmit = async (values: FormData) => {
    setLoading(true);

    try {
      const itemData = {
        ...values,
        tender_id: tenderId,
        client_position_id: positionId,
        material_id: (values.item_type === 'material' || values.item_type === 'sub_material') ? values.material_id : null,
        work_id: values.item_type === 'work' ? values.work_id : null,
        consumption_coefficient: (values.item_type === 'material' || values.item_type === 'sub_material') ? values.consumption_coefficient : null,
        conversion_coefficient: (values.item_type === 'material' || values.item_type === 'sub_material') ? values.conversion_coefficient : null,
        delivery_price_type: (values.item_type === 'material' || values.item_type === 'sub_material') ? values.delivery_price_type : null,
        delivery_amount: (values.item_type === 'material' || values.item_type === 'sub_material') ? values.delivery_amount : null,
        currency_type: values.currency_type || 'RUB',
        // unit_rate already contains the price in the selected currency
        currency_rate: values.currency_type && values.currency_type !== 'RUB' && tenderRates
          ? getCurrencyRate(values.currency_type, tenderRates)
          : null
      };

      if (isEditing && editingItem) {
        const result = await boqItemsApi.update(editingItem.id, itemData);
        if (result.error) {
          throw new Error(result.error);
        }
        message.success('Элемент BOQ обновлен');
        onSuccess(result.data!);
      } else {
        const result = await boqItemsApi.create(itemData);
        if (result.error) {
          throw new Error(result.error);
        }
        message.success('Элемент BOQ создан');
        onSuccess(result.data!);
      }
      
      form.resetFields();
      setSelectedCurrency('RUB');
    } catch (error) {
      message.error(`Ошибка: ${error}`);
      console.error('BOQ item form error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedCurrency('RUB');
    onCancel();
  };

  return (
    <>
      {/* Стили для модального окна */}
      <style jsx>{`
        :global(.boq-item-modal .ant-modal-body) {
          max-height: 80vh;
          overflow-y: auto;
          padding-bottom: 24px;
        }
        
        :global(.boq-item-modal .ant-form-item:last-of-type) {
          margin-bottom: 24px;
        }
        
        :global(.boq-item-modal .ant-divider) {
          margin: 24px 0;
        }
        
        @media (max-width: 768px) {
          :global(.boq-item-modal) {
            margin: 0;
            max-width: 100vw;
            top: 0;
            padding-bottom: 0;
          }
          
          :global(.boq-item-modal .ant-modal-content) {
            border-radius: 0;
          }
          
          :global(.boq-item-modal .ant-modal-body) {
            max-height: calc(100vh - 110px);
            padding: 16px;
          }
        }
      `}</style>
      <Modal
      title={isEditing ? 'Редактировать элемент' : 'Добавить элемент BOQ'}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnHidden
      className="boq-item-modal"
      styles={{
        body: {
          paddingBottom: '24px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
        style={{ paddingBottom: '16px' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="item_type"
              label="Тип элемента"
              rules={[{ required: true, message: 'Выберите тип элемента' }]}
            >
              <Radio.Group>
                <Radio.Button value="material">Материал</Radio.Button>
                <Radio.Button value="sub_material">Субматериал</Radio.Button>
                <Radio.Button value="work">Работа</Radio.Button>
                <Radio.Button value="sub_work">Субработа</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
          
          <Col span={16}>
            <Form.Item
              name={(itemType === 'material' || itemType === 'sub_material') ? 'material_id' : 'work_id'}
              label={`Выбрать из справочника ${(itemType === 'material' || itemType === 'sub_material') ? 'материалов' : 'работ'}`}
            >
              <Select
                showSearch
                placeholder={`Найти ${(itemType === 'material' || itemType === 'sub_material') ? 'материал' : 'работу'} в справочнике`}
                optionFilterProp="label"
                onSelect={handleLibraryItemSelect}
                loading={searchLoading}
                allowClear
                suffixIcon={<SearchOutlined />}
              >
                {getLibraryOptions().map(option => (
                  <Option key={option.value} value={option.value} item={option.item}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Наименование"
          rules={[
            { required: true, message: 'Введите наименование' },
            { min: 3, message: 'Наименование должно содержать минимум 3 символа' }
          ]}
        >
          <Input 
            placeholder={`Наименование ${(itemType === 'material' || itemType === 'sub_material') ? 'материала' : 'работы'}`}
            maxLength={500}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={4}>
            <Form.Item
              name="unit"
              label="Ед. изм."
              rules={[{ required: true, message: 'Введите единицу' }]}
            >
              <Select
                showSearch
                placeholder="Выберите"
                size="small"
              >
                <Option value="м">м</Option>
                <Option value="м2">м²</Option>
                <Option value="м3">м³</Option>
                <Option value="кг">кг</Option>
                <Option value="т">т</Option>
                <Option value="шт">шт</Option>
                <Option value="л">л</Option>
                <Option value="компл">компл</Option>
                <Option value="услуга">услуга</Option>
              </Select>
            </Form.Item>
          </Col>

          {/* Currency selector */}
          <Col span={4}>
            <Form.Item
              name="currency_type"
              label="Валюта"
              initialValue="RUB"
            >
              <Select
                size="small"
                onChange={handleCurrencyChange}
                options={CURRENCY_OPTIONS}
              />
            </Form.Item>
          </Col>
          
          <Col span={6}>
            <Form.Item
              name="quantity"
              label="Количество"
              rules={[
                { required: true, message: 'Введите количество' },
                { type: 'number', min: 0.0001, message: 'Количество должно быть больше 0' }
              ]}
            >
              <DecimalInput
                min={0.0001}
                precision={4}
                placeholder="0.0000"
                className="w-full"
              />
            </Form.Item>
          </Col>
          
          <Col span={5}>
            <Form.Item
              name="unit_rate"
              label={`Цена (${CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol})`}
              tooltip={selectedCurrency !== 'RUB' && tenderRates ? `Курс: ${getCurrencyRate(selectedCurrency as 'USD' | 'EUR' | 'CNY', tenderRates) || 'Не задан'} ₽` : undefined}
              rules={[
                { required: true, message: 'Введите цену' },
                { type: 'number', min: 0, message: 'Цена не может быть отрицательной' }
              ]}
            >
              <DecimalInput
                min={0}
                precision={2}
                placeholder="0.00"
                size="small"
                addonAfter={CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol}
                className="w-full"
              />
            </Form.Item>
          </Col>
          
          <Col span={5}>
            <Form.Item
              label="Общая стоимость"
            >
              <DecimalInput
                value={(() => {
                  const quantity = Form.useWatch('quantity', form) || 0;
                  const unitRate = Form.useWatch('unit_rate', form) || 0;
                  const currencyType = Form.useWatch('currency_type', form) || 'RUB';
                  
                  // Convert to rubles for display
                  let rubleRate = unitRate;
                  if (currencyType !== 'RUB' && tenderRates) {
                    const rate = getCurrencyRate(currencyType as 'USD' | 'EUR' | 'CNY', tenderRates);
                    if (rate) {
                      rubleRate = unitRate * rate;
                    }
                  }
                  
                  return quantity * rubleRate;
                })()}
                precision={2}
                addonAfter="₽"
                disabled
                className="w-full"
              />
            </Form.Item>
          </Col>
        </Row>

        {(itemType === 'material' || itemType === 'sub_material') && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="consumption_coefficient"
                label="Коэффициент расхода материала"
                tooltip="Коэффициент расхода материала на единицу работ"
                rules={[
                  { type: 'number', min: 1, message: 'Значение коэфф. расхода не может быть менее 1,00' }
                ]}
              >
                <DecimalInput
                  min={1}
                  precision={4}
                  placeholder="1.0000"
                  className="w-full"
                  onChange={(value) => {
                    // Ensure value is at least 1
                    if (value && value < 1) {
                      message.warning('Значение коэффициента расхода не может быть менее 1');
                      form.setFieldValue('consumption_coefficient', 1);
                      return 1;
                    }
                    return value;
                  }}
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="conversion_coefficient"
                label="Коэффициент перевода единицы измерения"
                tooltip="Коэффициент для перевода единиц измерения"
              >
                <DecimalInput
                  min={0}
                  precision={4}
                  placeholder="1.0000"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {(itemType === 'material' || itemType === 'sub_material') && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="delivery_price_type"
                label="Тип доставки"
                rules={[{ required: true, message: 'Выберите тип доставки' }]}
              >
                <Select placeholder="Выберите тип доставки">
                  <Option value="included">Доставка включена</Option>
                  <Option value="not_included">Доставка не включена</Option>
                  <Option value="amount">Фиксированная сумма</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="delivery_amount"
                label="Сумма доставки"
                rules={[
                  {
                    validator: (_, value) => {
                      const deliveryType = form.getFieldValue('delivery_price_type');
                      if (deliveryType === 'amount' && (!value || value <= 0)) {
                        return Promise.reject('Введите сумму доставки');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
                dependencies={['delivery_price_type']}
              >
                <DecimalInput
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  addonAfter="₽"
                  className="w-full"
                  disabled={Form.useWatch('delivery_price_type', form) !== 'amount'}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="category"
              label="Категория"
            >
              <Input placeholder="Например: Бетон, Арматура" maxLength={100} />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="subcategory"  
              label="Подкатегория"
            >
              <Input placeholder="Дополнительная классификация" maxLength={100} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Примечания"
        >
          <TextArea 
            rows={2}
            placeholder="Дополнительная информация, особенности, требования"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="sort_order"
          label="Порядок сортировки"
          initialValue={0}
          className="mb-6"
        >
          <DecimalInput
            min={0}
            precision={0}
            placeholder="0"
            className="w-full"
          />
        </Form.Item>

        <Divider className="my-6" />

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={handleCancel}>
            Отмена
          </Button>
          <Button 
            type="primary" 
            htmlType="submit"
            loading={loading}
            icon={<PlusOutlined />}
          >
            {isEditing ? 'Сохранить изменения' : 'Добавить элемент BOQ'}
          </Button>
        </div>
      </Form>
    </Modal>
    </>
  );
};

export default BOQItemForm;