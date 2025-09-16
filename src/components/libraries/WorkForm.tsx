import React, { useEffect, useState } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Spin, message, AutoComplete } from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { worksWithNamesApi } from '../../lib/supabase/api/works-with-names';
import type { Work, WorkInsert, WorkUpdate } from '../../lib/supabase/types';

const { Option } = Select;
const { TextArea } = Input;

interface WorkFormProps {
  work?: Work;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const WorkForm: React.FC<WorkFormProps> = ({ work, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [nameOptions, setNameOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Загрузка существующих наименований для автодополнения
  const { data: existingNames } = useQuery({
    queryKey: ['work-names'],
    queryFn: async () => {
      const result = await worksWithNamesApi.getNames();
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

  // Мутация для создания работы
  const createMutation = useMutation({
    mutationFn: async (values: WorkInsert & { name: string }) => {
      const result = await worksWithNamesApi.create(values);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      message.success('Работа успешно создана');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names'] });
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
      message.success('Работа успешно обновлена');
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-names'] });
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

    // Устанавливаем item_type как 'work'
    const submitValues = {
      ...values,
      item_type: 'work',
    };

    if (work?.id) {
      await updateMutation.mutateAsync({ id: work.id, ...submitValues });
    } else {
      await createMutation.mutateAsync(submitValues);
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
    <Card title={work ? 'Редактирование работы' : 'Создание работы'}>
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
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование работы' }]}
          >
            <AutoComplete
              options={nameOptions}
              onSearch={handleSearchName}
              placeholder="Введите наименование работы"
              allowClear
            />
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
            <div className="flex gap-2">
              <Button
                type="primary"
                htmlType="submit"
                icon={work ? <SaveOutlined /> : <PlusOutlined />}
                loading={isLoading}
              >
                {work ? 'Сохранить' : 'Создать'}
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

export default WorkForm;