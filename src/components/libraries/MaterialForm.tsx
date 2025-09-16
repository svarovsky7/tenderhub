import React, { useEffect, useState } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Spin, message, AutoComplete } from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialsWithNamesApi } from '../../lib/supabase/api/materials-with-names';
import type { Material, MaterialInsert, MaterialUpdate } from '../../lib/supabase/types';

const { Option } = Select;
const { TextArea } = Input;

interface MaterialFormProps {
  material?: Material;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MaterialForm: React.FC<MaterialFormProps> = ({ material, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [nameOptions, setNameOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Загрузка существующих наименований для автодополнения
  const { data: existingNames } = useQuery({
    queryKey: ['material-names'],
    queryFn: async () => {
      const result = await materialsWithNamesApi.getNames();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Обновляем опции автодополнения
  useEffect(() => {
    if (existingNames) {
      setNameOptions(existingNames.map(n => ({ value: n.name, label: n.name })));
    }
  }, [existingNames]);

  // Мутация для создания материала
  const createMutation = useMutation({
    mutationFn: async (values: MaterialInsert & { name: string }) => {
      const result = await materialsWithNamesApi.create(values);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Материал успешно создан');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-names'] });
      form.resetFields();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('❌ Ошибка создания материала:', error);
      message.error('Ошибка при создании материала');
    },
  });

  // Мутация для обновления материала
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: MaterialUpdate & { id: string; name?: string }) => {
      const result = await materialsWithNamesApi.update(id, values);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Материал успешно обновлен');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-names'] });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('❌ Ошибка обновления материала:', error);
      message.error('Ошибка при обновлении материала');
    },
  });

  // Заполнение формы при редактировании
  useEffect(() => {
    if (material) {
      form.setFieldsValue({
        name: material.name,
        description: material.description,
        unit: material.unit,
        category: material.category,
        material_type: material.material_type,
        consumption_coefficient: material.consumption_coefficient || 1,
        unit_rate: material.unit_rate || 0,
        currency_type: material.currency_type || 'RUB',
        delivery_price_type: material.delivery_price_type || 'included',
        delivery_amount: material.delivery_amount || 0,
        quote_link: material.quote_link,
      });
    }
  }, [material, form]);

  const handleSubmit = async (values: any) => {
    console.log('🚀 Отправка формы материала:', values);

    if (material?.id) {
      await updateMutation.mutateAsync({ id: material.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleSearchName = (searchText: string) => {
    if (!searchText) {
      setNameOptions(existingNames?.map(n => ({ value: n.name, label: n.name })) || []);
      return;
    }

    const filtered = existingNames?.filter(n =>
      n.name.toLowerCase().includes(searchText.toLowerCase())
    ) || [];

    setNameOptions(filtered.map(n => ({ value: n.name, label: n.name })));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card title={material ? 'Редактирование материала' : 'Создание материала'}>
      <Spin spinning={isLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            unit: 'шт',
            currency_type: 'RUB',
            delivery_price_type: 'included',
            consumption_coefficient: 1,
            unit_rate: 0,
            delivery_amount: 0,
          }}
        >
          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование материала' }]}
          >
            <AutoComplete
              options={nameOptions}
              onSearch={handleSearchName}
              placeholder="Введите наименование материала"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea rows={3} placeholder="Описание материала" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="unit"
              label="Единица измерения"
              rules={[{ required: true, message: 'Выберите единицу измерения' }]}
            >
              <Select placeholder="Выберите единицу">
                <Option value="шт">шт</Option>
                <Option value="м">м</Option>
                <Option value="м2">м²</Option>
                <Option value="м3">м³</Option>
                <Option value="кг">кг</Option>
                <Option value="т">т</Option>
                <Option value="л">л</Option>
                <Option value="комплект">комплект</Option>
                <Option value="упаковка">упаковка</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="category"
              label="Категория"
            >
              <Input placeholder="Категория материала" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="material_type"
              label="Тип материала"
            >
              <Select placeholder="Выберите тип">
                <Option value="основной">Основной</Option>
                <Option value="вспомогательный">Вспомогательный</Option>
                <Option value="расходный">Расходный</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="consumption_coefficient"
              label="Коэффициент расхода"
              rules={[{ type: 'number', min: 1, message: 'Значение должно быть не менее 1' }]}
            >
              <InputNumber
                min={1}
                step={0.01}
                placeholder="1.00"
                className="w-full"
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item
              name="unit_rate"
              label="Цена за единицу"
              rules={[{ type: 'number', min: 0, message: 'Цена не может быть отрицательной' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                placeholder="0.00"
                className="w-full"
              />
            </Form.Item>

            <Form.Item
              name="currency_type"
              label="Валюта"
            >
              <Select>
                <Option value="RUB">₽ RUB</Option>
                <Option value="USD">$ USD</Option>
                <Option value="EUR">€ EUR</Option>
                <Option value="CNY">¥ CNY</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="delivery_price_type"
              label="Тип доставки"
            >
              <Select>
                <Option value="included">Включено в цену</Option>
                <Option value="not_included">Не включено (+3%)</Option>
                <Option value="amount">Фиксированная сумма</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.delivery_price_type !== currentValues.delivery_price_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('delivery_price_type') === 'amount' && (
                <Form.Item
                  name="delivery_amount"
                  label="Стоимость доставки за единицу"
                  rules={[{ type: 'number', min: 0, message: 'Сумма не может быть отрицательной' }]}
                >
                  <InputNumber
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    className="w-full"
                  />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item
            name="quote_link"
            label="Ссылка на КП"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex gap-2">
              <Button
                type="primary"
                htmlType="submit"
                icon={material ? <SaveOutlined /> : <PlusOutlined />}
                loading={isLoading}
              >
                {material ? 'Сохранить' : 'Создать'}
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  Отмена
                </Button>
              )}
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};

export default MaterialForm;