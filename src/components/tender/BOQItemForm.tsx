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
  InputNumber,
  Radio,
  Divider
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { boqItemsApi, materialsApi, worksApi } from '../../lib/supabase/api';
import type { BOQItem, Material, WorkItem } from '../../lib/supabase/types';

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
  item_type: 'material' | 'work';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  material_id?: string;
  work_id?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
  sort_order?: number;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
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

  const isEditing = !!editingItem;
  const itemType = Form.useWatch('item_type', form);

  // Load library items on mount
  useEffect(() => {
    loadLibraryItems();
  }, []);

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
        consumption_coefficient: editingItem.consumption_coefficient || 1,
        conversion_coefficient: editingItem.conversion_coefficient || 1
      });
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({
        item_type: 'material',
        sort_order: 0,
        consumption_coefficient: 1,
        conversion_coefficient: 1,
      });
    }
  }, [visible, editingItem, form]);

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

  const handleLibraryItemSelect = (_value: string, option: any) => {
    const selectedItem = option.item;
    
    // Auto-fill form fields
    form.setFieldsValue({
      description: selectedItem.name,
      unit: selectedItem.unit,
      unit_rate: selectedItem.base_price,
      category: selectedItem.category || ''
    });
  };

  const getLibraryOptions = () => {
    const items = itemType === 'material' ? libraryItems.materials : libraryItems.works;
    return items.map(item => ({
      value: item.id,
      label: `${item.code} - ${item.name} (${item.base_price} ₽/${item.unit})`,
      item: item
    }));
  };

  const handleSubmit = async (values: FormData) => {
    console.log('🚀 BOQItemForm handleSubmit called with:', values);
    setLoading(true);

    try {
      const itemData = {
        ...values,
        tender_id: tenderId,
        client_position_id: positionId,
        material_id: values.item_type === 'material' ? values.material_id : null,
        work_id: values.item_type === 'work' ? values.work_id : null,
        consumption_coefficient:
          values.item_type === 'material' ? values.consumption_coefficient : undefined,
        conversion_coefficient:
          values.item_type === 'material' ? values.conversion_coefficient : undefined,
      };

      console.log('📡 Sending BOQ item data:', itemData);

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
    } catch (error) {
      message.error(`Ошибка: ${error}`);
      console.error('BOQ item form error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={isEditing ? 'Редактировать элемент BOQ' : 'Добавить элемент BOQ'}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
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
                <Radio.Button value="work">Работа</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
          
          <Col span={16}>
            <Form.Item
              name={itemType === 'material' ? 'material_id' : 'work_id'}
              label={`Выбрать из справочника ${itemType === 'material' ? 'материалов' : 'работ'}`}
            >
              <Select
                showSearch
                placeholder={`Найти ${itemType === 'material' ? 'материал' : 'работу'} в справочнике`}
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
            placeholder={`Наименование ${itemType === 'material' ? 'материала' : 'работы'}`}
            maxLength={500}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="unit"
              label="Единица измерения"
              rules={[{ required: true, message: 'Введите единицу измерения' }]}
            >
              <Select
                showSearch
                placeholder="Выберите или введите"
              >
                <Option value="м">м (метр)</Option>
                <Option value="м2">м² (кв. метр)</Option>
                <Option value="м3">м³ (куб. метр)</Option>
                <Option value="кг">кг (килограмм)</Option>
                <Option value="т">т (тонна)</Option>
                <Option value="шт">шт (штука)</Option>
                <Option value="л">л (литр)</Option>
                <Option value="компл">компл (комплект)</Option>
                <Option value="услуга">услуга</Option>
              </Select>
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
              <InputNumber
                min={0.0001}
                precision={4}
                placeholder="0.0000"
                className="w-full"
              />
            </Form.Item>
          </Col>
          
          <Col span={6}>
            <Form.Item
              name="unit_rate"
              label="Цена за единицу"
              rules={[
                { required: true, message: 'Введите цену за единицу' },
                { type: 'number', min: 0, message: 'Цена не может быть отрицательной' }
              ]}
            >
              <InputNumber
                min={0}
                precision={2}
                placeholder="0.00"
                addonAfter="₽"
                className="w-full"
              />
            </Form.Item>
          </Col>
          
          <Col span={6}>
            <Form.Item
              label="Общая стоимость"
            >
              <InputNumber
                value={(Form.useWatch('quantity', form) || 0) * (Form.useWatch('unit_rate', form) || 0)}
                precision={2}
                addonAfter="₽"
                disabled
                className="w-full"
              />
            </Form.Item>
          </Col>
        </Row>

        {itemType === 'material' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="consumption_coefficient"
                label="Коэф. расхода"
                rules={[{ required: true, message: 'Введите коэффициент расхода' }]}
              >
                <InputNumber
                  min={0.0001}
                  precision={4}
                  placeholder="1.0000"
                  className="w-full"
                  onChange={(value) =>
                    console.log('✏️ Consumption coefficient changed:', value)
                  }
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="conversion_coefficient"
                label="Коэф. перевода"
                rules={[{ required: true, message: 'Введите коэффициент перевода' }]}
              >
                <InputNumber
                  min={0.0001}
                  precision={4}
                  placeholder="1.0000"
                  className="w-full"
                  onChange={(value) =>
                    console.log('✏️ Conversion coefficient changed:', value)
                  }
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
        >
          <InputNumber
            min={0}
            placeholder="0"
            className="w-full"
          />
        </Form.Item>

        <Divider />

        <div className="flex justify-end gap-2">
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
  );
};

export default BOQItemForm;