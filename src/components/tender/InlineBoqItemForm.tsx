import React, { useEffect, useMemo, useState } from 'react';
import { Form, Select, AutoComplete, InputNumber, Button, Space, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { boqItemsApi, materialsApi, worksApi } from '../../lib/supabase/api';
import type { Material, WorkItem } from '../../lib/supabase/types';

interface InlineBoqItemFormProps {
  tenderId: string;
  positionId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormValues {
  item_type: 'material' | 'work';
  name: string;
  unit: string;
  quantity: number;
  unit_rate: number;
}

const schema = yup
  .object({
    item_type: yup.string().oneOf(['material', 'work']).required(),
    name: yup.string().required('Введите наименование'),
    unit: yup.string().required('Выберите единицу'),
    quantity: yup.number().min(0).required('Введите количество'),
    unit_rate: yup.number().min(0).required('Введите цену'),
  })
  .required();

const InlineBoqItemForm: React.FC<InlineBoqItemFormProps> = ({
  tenderId,
  positionId,
  onSuccess,
  onCancel,
}) => {
  console.log('🚀 InlineBoqItemForm mounted for position:', positionId);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      item_type: 'work',
      name: '',
      unit: '',
      quantity: 0,
      unit_rate: 0,
    },
    resolver: yupResolver(schema),
  });

  const [materials, setMaterials] = useState<Material[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const itemType = watch('item_type');
  const quantity = watch('quantity');
  const unitRate = watch('unit_rate');

  useEffect(() => {
    const load = async () => {
      console.log('📡 Loading library items');
      try {
        const [matRes, workRes] = await Promise.all([
          materialsApi.getAll(),
          worksApi.getAll(),
        ]);
        setMaterials(matRes.data || []);
        setWorks(workRes.data || []);
        console.log('✅ Library items loaded:', {
          materials: matRes.data?.length,
          works: workRes.data?.length,
        });
      } catch (err) {
        console.error('❌ Library loading error:', err);
      }
    };
    load();
  }, []);

  const options = useMemo(() => {
    const items = itemType === 'material' ? materials : works;
    return items.map((item) => ({
      value: item.name,
      label: `${item.code} - ${item.name}`,
      item,
    }));
  }, [itemType, materials, works]);

  const onSelect = (_: string, option: any) => {
    console.log('📝 Library item selected:', option.item);
    const selected = option.item;
    setSelectedId(selected.id);
    setValue('name', selected.name);
    setValue('unit', selected.unit);
    setValue('unit_rate', selected.base_price);
  };

  const onSubmit = async (values: FormValues) => {
    console.log('📦 Submitting inline BOQ item:', values);
    setLoading(true);
    try {
      const data = {
        tender_id: tenderId,
        client_position_id: positionId,
        item_type: values.item_type,
        description: values.name,
        unit: values.unit,
        quantity: values.quantity,
        unit_rate: values.unit_rate,
        material_id: values.item_type === 'material' ? selectedId : null,
        work_id: values.item_type === 'work' ? selectedId : null,
      };
      console.log('📡 Creating BOQ item via API...');
      const result = await boqItemsApi.create(data);
      console.log('📤 API result:', result);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Элемент BOQ создан');
      reset();
      onSuccess();
    } catch (error: any) {
      console.error('💥 Inline form submit error:', error);
      message.error(`Ошибка: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('🛑 Inline form cancelled');
    reset();
    onCancel();
  };

  return (
    <Form layout="inline" onFinish={handleSubmit(onSubmit)} className="mb-4">
      <Controller
        name="item_type"
        control={control}
        render={({ field }) => (
          <Select {...field} style={{ width: 120 }}>
            <Select.Option value="material">Материал</Select.Option>
            <Select.Option value="work">Работа</Select.Option>
          </Select>
        )}
      />
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <AutoComplete
            {...field}
            options={options}
            style={{ width: 220 }}
            onSelect={onSelect}
            placeholder="Наименование"
          />
        )}
      />
      <Controller
        name="unit"
        control={control}
        render={({ field }) => (
          <Select {...field} style={{ width: 100 }} disabled={!field.value}>
            {field.value && (
              <Select.Option value={field.value}>{field.value}</Select.Option>
            )}
          </Select>
        )}
      />
      <Controller
        name="quantity"
        control={control}
        render={({ field }) => (
          <InputNumber {...field} min={0} step={0.001} style={{ width: 100 }} />
        )}
      />
      <Controller
        name="unit_rate"
        control={control}
        render={({ field }) => (
          <InputNumber {...field} min={0} step={0.01} style={{ width: 120 }} />
        )}
      />
      <InputNumber value={quantity * unitRate} readOnly style={{ width: 120 }} />
      <Space>
        <Button
          type="text"
          htmlType="submit"
          icon={<CheckOutlined />}
          loading={loading}
        />
        <Button type="text" onClick={handleCancel} icon={<CloseOutlined />} />
      </Space>
    </Form>
  );
};

export default InlineBoqItemForm;

