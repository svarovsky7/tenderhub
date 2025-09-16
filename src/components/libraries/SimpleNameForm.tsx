import React, { useState } from 'react';
import { Form, Input, Button, Space, message, Select, AutoComplete } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsWithNamesApi } from '../../lib/supabase/api/materials-with-names';
import { worksWithNamesApi } from '../../lib/supabase/api/works-with-names';

interface SimpleNameFormProps {
  type: 'material' | 'work';
  onSuccess?: () => void;
}

const SimpleNameForm: React.FC<SimpleNameFormProps> = ({ type, onSuccess }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { name: string; unit: string }) => {
    setLoading(true);

    try {
      const api = type === 'material' ? materialsWithNamesApi : worksWithNamesApi;
      const result = await api.createName(values.name.trim(), values.unit);

      if (result.error) {
        message.error(result.error);
      } else {
        message.success(result.message || `${type === 'material' ? 'Материал' : 'Работа'} создан(а)`);
        form.resetFields();

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: [type === 'material' ? 'material-names-list' : 'work-names-list']
        });

        onSuccess?.();
      }
    } catch (error) {
      console.error('❌ Ошибка создания наименования:', error);
      message.error('Ошибка при создании наименования');
    } finally {
      setLoading(false);
    }
  };

  const materialUnits = [
    { value: 'шт' },
    { value: 'м' },
    { value: 'м²' },
    { value: 'м³' },
    { value: 'кг' },
    { value: 'т' },
    { value: 'л' },
    { value: 'комплект' },
    { value: 'упаковка' },
    { value: 'пачка' },
    { value: 'рулон' },
    { value: 'лист' }
  ];

  const workUnits = [
    { value: 'м²' },
    { value: 'м' },
    { value: 'м³' },
    { value: 'шт' },
    { value: 'кг' },
    { value: 'т' },
    { value: 'час' },
    { value: 'смена' },
    { value: 'комплект' },
    { value: 'точка' },
    { value: 'узел' },
    { value: 'этаж' }
  ];

  const units = type === 'material' ? materialUnits : workUnits;
  const defaultUnit = type === 'material' ? 'шт' : 'м²';

  // Функция для фильтрации опций при вводе
  const [unitOptions, setUnitOptions] = useState(units);

  const handleUnitSearch = (searchText: string) => {
    if (!searchText) {
      setUnitOptions(units);
      return;
    }

    const filtered = units.filter(unit =>
      unit.value.toLowerCase().includes(searchText.toLowerCase())
    );

    // Если нет совпадений, предлагаем создать новую единицу
    if (filtered.length === 0) {
      setUnitOptions([{ value: searchText }]);
    } else {
      // Добавляем введенный текст как опцию, если его нет в списке
      const exactMatch = filtered.find(u => u.value === searchText);
      if (!exactMatch && searchText.trim()) {
        setUnitOptions([{ value: searchText }, ...filtered]);
      } else {
        setUnitOptions(filtered);
      }
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid rgba(30, 58, 138, 0.1)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: type === 'material'
          ? 'linear-gradient(90deg, #1e3a8a 0%, #059669 50%, #0d9488 100%)'
          : 'linear-gradient(90deg, #f97316 0%, #a855f7 50%, #ec4899 100%)',
        animation: 'shimmer 3s ease-in-out infinite'
      }} />
      <style>
        {`
          @keyframes shimmer {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}
      </style>
      <Form
        form={form}
        layout="inline"
        onFinish={handleSubmit}
        initialValues={{ unit: defaultUnit }}
      >
        <Form.Item
          name="name"
          rules={[
            { required: true, message: 'Введите наименование' },
            { min: 2, message: 'Минимум 2 символа' },
          ]}
          style={{ flex: 1, marginRight: 12 }}
        >
          <Input
            placeholder={`Введите наименование ${type === 'material' ? 'материала' : 'работы'}`}
            size="large"
            style={{
              borderRadius: '8px',
              fontSize: '15px'
            }}
          />
        </Form.Item>

        <Form.Item
          name="unit"
          rules={[{ required: true, message: 'Введите или выберите единицу измерения' }]}
          style={{ width: 160, marginRight: 12 }}
        >
          <AutoComplete
            placeholder="Ед. изм."
            size="large"
            options={unitOptions}
            onSearch={handleUnitSearch}
            onFocus={() => setUnitOptions(units)}
            allowClear
            style={{
              borderRadius: '8px'
            }}
            notFoundContent={
              <div style={{ padding: '8px', color: '#8c8c8c' }}>
                Нажмите Enter для создания новой единицы
              </div>
            }
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={loading}
            size="large"
            style={{
              borderRadius: '8px',
              height: '40px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: 500,
              background: type === 'material'
                ? 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)'
                : 'linear-gradient(135deg, #f97316 0%, #a855f7 100%)',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            Создать {type === 'material' ? 'материал' : 'работу'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SimpleNameForm;