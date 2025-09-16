import React, { useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Spin, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { worksWithNamesApi } from '../../lib/supabase/api/works-with-names';
import type { Work, WorkInsert, WorkUpdate } from '../../lib/supabase/types';

const { Option } = Select;
const { TextArea } = Input;

interface FullWorkFormProps {
  work?: Work;
  onSuccess?: () => void;
}

const FullWorkForm: React.FC<FullWorkFormProps> = ({ work, onSuccess }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Загрузка существующих наименований для выбора
  const { data: existingNames } = useQuery({
    queryKey: ['work-names'],
    queryFn: async () => {
      const result = await worksWithNamesApi.getNames();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Мутация для создания работы
  const createMutation = useMutation({
    mutationFn: async (values: WorkInsert & { name: string }) => {
      const result = await worksWithNamesApi.create(values);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Данные работы успешно сохранены');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names-list'] });
      form.resetFields();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('❌ Ошибка создания работы:', error);
      message.error('Ошибка при создании работы');
    },
  });

  // Мутация для обновления работы
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: WorkUpdate & { id: string; name?: string }) => {
      const result = await worksWithNamesApi.update(id, values);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Данные работы успешно обновлены');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names-list'] });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('❌ Ошибка обновления работы:', error);
      message.error('Ошибка при обновлении работы');
    },
  });

  // Заполнение формы при редактировании
  useEffect(() => {
    if (work) {
      form.setFieldsValue({
        name: work.name,
        description: work.description,
        unit: work.unit,
        category: work.category,
        unit_rate: work.unit_rate || 0,
        currency_type: work.currency_type || 'RUB',
      });
    }
  }, [work, form]);

  const handleSubmit = async (values: any) => {
    console.log('🚀 Отправка формы работы:', values);

    // Находим имя по выбранному ID
    const selectedName = existingNames?.find(n => n.id === values.nameId);
    if (!selectedName) {
      message.error('Выберите наименование работы');
      return;
    }

    const submitData = {
      ...values,
      name: selectedName.name,
      item_type: 'work',
      nameId: undefined, // Убираем nameId, так как API ожидает name
    };

    if (work?.id) {
      await updateMutation.mutateAsync({ id: work.id, ...submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card title="Задать базовые данные работе">
      <Spin spinning={isLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            unit: 'м2',
            currency_type: 'RUB',
            unit_rate: 0,
          }}
        >
          <Form.Item
            name="nameId"
            label="Наименование работы"
            rules={[{ required: true, message: 'Выберите наименование работы' }]}
          >
            <Select
              placeholder="Выберите наименование работы"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {existingNames?.map(name => (
                <Option key={name.id} value={name.id}>
                  {name.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea rows={3} placeholder="Описание работы" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="unit"
              label="Единица измерения"
              rules={[{ required: true, message: 'Выберите единицу измерения' }]}
            >
              <Select placeholder="Выберите единицу">
                <Option value="м2">м²</Option>
                <Option value="м">м</Option>
                <Option value="м3">м³</Option>
                <Option value="шт">шт</Option>
                <Option value="кг">кг</Option>
                <Option value="т">т</Option>
                <Option value="час">час</Option>
                <Option value="смена">смена</Option>
                <Option value="комплект">комплект</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="category"
              label="Категория"
            >
              <Input placeholder="Категория работы" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="unit_rate"
              label="Стоимость за единицу"
              rules={[{ type: 'number', min: 0, message: 'Стоимость не может быть отрицательной' }]}
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
          </div>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isLoading}
            >
              Сохранить данные
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};

export default FullWorkForm;