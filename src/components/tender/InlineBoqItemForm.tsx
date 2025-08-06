import React, { useEffect, useState } from 'react';
import { AutoComplete, Select, InputNumber, Button, Space, message } from 'antd';
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
  type: 'material' | 'work';
  itemId: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
}

const schema = yup.object({
  type: yup.string().required(),
  itemId: yup.string().required(),
  description: yup.string().required(),
  unit: yup.string().required(),
  quantity: yup.number().min(0).required(),
  unit_rate: yup.number().min(0).required()
});

const InlineBoqItemForm: React.FC<InlineBoqItemFormProps> = ({
  tenderId,
  positionId,
  onSuccess,
  onCancel
}) => {
  console.log('🚀 InlineBoqItemForm mounted', { tenderId, positionId });
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      type: 'work',
      itemId: '',
      description: '',
      unit: '',
      quantity: 0,
      unit_rate: 0
    }
  });

  const type = watch('type');
  const description = watch('description');
  const unit = watch('unit');
  const quantity = watch('quantity');
  const unitRate = watch('unit_rate');

  const [options, setOptions] = useState<{ value: string; label: string; item: Material | WorkItem }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('🔄 Form values changed', { type, description, unit, quantity, unitRate });
  }, [type, description, unit, quantity, unitRate]);

  useEffect(() => {
    loadLibraryItems();
  }, [type]);

  const loadLibraryItems = async () => {
    console.log('📡 Loading library items', { type });
    const startTime = performance.now();
    try {
      const result = type === 'material' ? await materialsApi.getAll() : await worksApi.getAll();
      console.log('📦 Library items result', { count: result.data?.length });
      setOptions(
        (result.data || []).map((item) => ({
          value: item.id,
          label: `${item.code} - ${item.name}`,
          item
        }))
      );
    } catch (error) {
      console.error('💥 loadLibraryItems error', error);
      message.error('Ошибка загрузки библиотеки');
    } finally {
      const endTime = performance.now();
      console.log('⏱️ loadLibraryItems completed in:', `${endTime - startTime}ms`);
    }
  };

  const handleSelectItem = (value: string, option: any) => {
    console.log('🖱️ Library item selected', { value, item: option.item });
    setValue('itemId', value);
    setValue('description', option.item.name);
    setValue('unit', option.item.unit);
    setValue('unit_rate', option.item.base_price);
    setUnitOptions([{ value: option.item.unit, label: option.item.unit }]);
  };

  const onSubmit = async (values: FormValues) => {
    console.log('🚀 onSubmit called', values);
    setLoading(true);
    const startTime = performance.now();
    try {
      const payload = {
        tender_id: tenderId,
        client_position_id: positionId,
        item_type: values.type,
        description: values.description,
        unit: values.unit,
        quantity: values.quantity,
        unit_rate: values.unit_rate,
        material_id: values.type === 'material' ? values.itemId : null,
        work_id: values.type === 'work' ? values.itemId : null
      };
      console.log('📡 Calling boqItemsApi.create', payload);
      const result = await boqItemsApi.create(payload);
      console.log('📦 API result', result);
      if (result.error) {
        throw new Error(result.error);
      }
      message.success('Элемент BOQ создан');
      onSuccess();
      reset();
    } catch (error) {
      console.error('💥 InlineBoqItemForm submit error', error);
      message.error(`Ошибка: ${error instanceof Error ? error.message : error}`);
    } finally {
      setLoading(false);
      const endTime = performance.now();
      console.log('⏱️ onSubmit completed in:', `${endTime - startTime}ms`);
    }
  };

  const handleCancel = () => {
    console.log('🖱️ Cancel inline form');
    onCancel();
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mb-4">
      <Space align="start" wrap>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{ width: 120 }}
              onChange={(value) => {
                console.log('🖱️ Type changed', { from: field.value, to: value });
                field.onChange(value);
              }}
            >
              <Select.Option value="material">Материал</Select.Option>
              <Select.Option value="work">Работа</Select.Option>
            </Select>
          )}
        />
        <Controller
          name="itemId"
          control={control}
          render={({ field }) => (
            <AutoComplete
              options={options}
              style={{ width: 250 }}
              onSelect={(value, option) => {
                field.onChange(value);
                handleSelectItem(value, option);
              }}
              placeholder="Наименование"
            />
          )}
        />
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{ width: 100 }}
              options={unitOptions}
            />
          )}
        />
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <InputNumber {...field} min={0} precision={3} style={{ width: 100 }} />
          )}
        />
        <Controller
          name="unit_rate"
          control={control}
          render={({ field }) => (
            <InputNumber {...field} min={0} precision={2} style={{ width: 120 }} />
          )}
        />
        <InputNumber
          value={(quantity || 0) * (unitRate || 0)}
          readOnly
          precision={2}
          style={{ width: 130 }}
        />
        <Space>
          <Button
            htmlType="submit"
            type="text"
            icon={<CheckOutlined />}
            loading={loading}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleCancel}
          />
        </Space>
      </Space>
    </form>
  );
};

export default InlineBoqItemForm;
