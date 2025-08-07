import React, { useEffect, useState } from 'react';
import { AutoComplete, Button, Form, InputNumber, Select, Space, Tooltip, message } from 'antd';
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
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  conversion_coefficient?: number;
  consumption_coefficient?: number;
  material_id?: string;
  work_id?: string;
}

interface LibraryOption {
  value: string;
  label: string;
  item: Material | WorkItem;
}

const schema = yup.object({
  item_type: yup.mixed<'material' | 'work'>().oneOf(['material', 'work']).required(),
  description: yup.string().required('Введите наименование'),
  unit: yup.string().required('Выберите единицу'),
  quantity: yup
    .number()
    .typeError('Введите количество')
    .moreThan(0, 'Количество должно быть больше 0')
    .required('Введите количество'),
  unit_rate: yup
    .number()
    .typeError('Введите цену')
    .min(0, 'Цена не может быть отрицательной')
    .required('Введите цену'),
  conversion_coefficient: yup
    .number()
    .typeError('Введите коэффициент перевода')
    .min(0, 'Коэффициент не может быть отрицательным')
    .when('item_type', {
      is: 'material',
      then: s => s.required('Введите коэффициент перевода'),
      otherwise: s => s.optional(),
    }),
  consumption_coefficient: yup
    .number()
    .typeError('Введите коэффициент расхода')
    .min(0, 'Коэффициент не может быть отрицательным')
    .when('item_type', {
      is: 'material',
      then: s => s.required('Введите коэффициент расхода'),
      otherwise: s => s.optional(),
    }),
});

const InlineBoqItemForm: React.FC<InlineBoqItemFormProps> = ({
  tenderId,
  positionId,
  onSuccess,
  onCancel,
}) => {
  console.log('📋 InlineBoqItemForm render', { tenderId, positionId });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      item_type: 'work',
      description: '',
      unit: '',
      quantity: 0,
      unit_rate: 0,
      conversion_coefficient: 1,
      consumption_coefficient: 1,
    },
    resolver: yupResolver(schema),
  });

  const [libraryItems, setLibraryItems] = useState<{ materials: Material[]; works: WorkItem[] }>({
    materials: [],
    works: [],
  });

  useEffect(() => {
    console.log('📡 Loading library items');
    const load = async () => {
      try {
        const [materialsResult, worksResult] = await Promise.all([
          materialsApi.getAll(),
          worksApi.getAll(),
        ]);
        console.log('📦 Library items loaded', {
          materials: materialsResult.data?.length,
          works: worksResult.data?.length,
        });
        setLibraryItems({
          materials: materialsResult.data || [],
          works: worksResult.data || [],
        });
      } catch (error) {
        console.error('❌ Library load error', error);
      }
    };
    load();
  }, []);

  const itemType = watch('item_type');
  const quantity = watch('quantity');
  const unitRate = watch('unit_rate');

  const options: LibraryOption[] = (itemType === 'material'
    ? libraryItems.materials
    : libraryItems.works
  ).map((item) => ({
    value: item.id,
    label: item.name,
    item,
  }));

  const handleLibrarySelect = (_value: string, option: LibraryOption) => {
    console.log('🖱️ Library item selected', { value: _value, item: option.item });
    setValue('description', option.item.name);
    setValue('unit', option.item.unit);
    setValue('unit_rate', option.item.base_price);
    if (itemType === 'material') {
      setValue('material_id', option.item.id);
      setValue('work_id', undefined);
      setValue('conversion_coefficient', (option.item as any).conversion_coefficient ?? 1);
      setValue('consumption_coefficient', (option.item as any).consumption_coefficient ?? 1);
    } else {
      setValue('work_id', option.item.id);
      setValue('material_id', undefined);
    }
  };

  const onSubmit = async (values: FormValues) => {
    console.log('🚀 Submitting inline BOQ item form', { positionId, values });
    const payload = {
      ...values,
      tender_id: tenderId,
      client_position_id: positionId,
      material_id: values.item_type === 'material' ? values.material_id : null,
      work_id: values.item_type === 'work' ? values.work_id : null,
      conversion_coefficient:
        values.item_type === 'material' ? values.conversion_coefficient : null,
      consumption_coefficient:
        values.item_type === 'material' ? values.consumption_coefficient : null,
    };
    try {
      console.log('📡 Calling boqItemsApi.create', payload);
      const result = await boqItemsApi.create(payload);
      console.log('📩 boqItemsApi.create result', result);
      if (result.error) {
        if (
          result.error.includes('chk_quantity_positive') ||
          result.error.includes('violates check constraint')
        ) {
          message.error('Количество должно быть больше 0');
          console.error('❌ Quantity constraint error', result.error);
          return;
        }
        console.error('❌ Create BOQ item error', result.error);
        message.error('Не удалось сохранить элемент. Попробуйте ещё раз');
        return;
      }
      message.success('Элемент добавлен');
      reset();
      onSuccess();
    } catch (error) {
      console.error('💥 Inline form submit error', error);
      message.error('Не удалось сохранить элемент. Попробуйте ещё раз');
    }
  };

  const handleCancel = () => {
    console.log('🛑 Inline form cancel');
    reset();
    onCancel();
  };

  return (
    <Form layout="inline" onFinish={handleSubmit(onSubmit)} className="mb-4">
      <Form.Item>
        <Controller
          name="item_type"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { value: 'material', label: 'Материал' },
                { value: 'work', label: 'Работа' },
              ]}
              style={{ width: 120 }}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        validateStatus={errors.description ? 'error' : ''}
        help={errors.description?.message}
      >
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <AutoComplete
              {...field}
              options={options}
              onSelect={handleLibrarySelect}
              placeholder="Наименование"
              style={{ width: 200 }}
            />
          )}
        />
      </Form.Item>

      <Form.Item validateStatus={errors.unit ? 'error' : ''} help={errors.unit?.message}>
        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              style={{ width: 120 }}
              options={[
                { value: 'м', label: 'м' },
                { value: 'м2', label: 'м2' },
                { value: 'м3', label: 'м3' },
                { value: 'кг', label: 'кг' },
                { value: 'т', label: 'т' },
                { value: 'шт', label: 'шт' },
                { value: 'л', label: 'л' },
                { value: 'компл', label: 'компл' },
                { value: 'услуга', label: 'услуга' },
              ]}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        validateStatus={errors.quantity ? 'error' : ''}
        help={errors.quantity?.message}
      >
        <Controller
          name="quantity"
          control={control}
          render={({ field }) => (
            <InputNumber
              {...field}
              min={0}
              precision={3}
              placeholder="Кол-во"
              style={{ width: 120 }}
            />
          )}
        />
      </Form.Item>

      <Form.Item
        validateStatus={errors.unit_rate ? 'error' : ''}
        help={errors.unit_rate?.message}
      >
        <Controller
          name="unit_rate"
          control={control}
      render={({ field }) => (
        <InputNumber
          {...field}
          min={0}
          precision={2}
          placeholder="Цена за ед."
          style={{ width: 130 }}
        />
      )}
    />
  </Form.Item>

      {itemType === 'material' && (
        <>
          <Form.Item
            validateStatus={errors.conversion_coefficient ? 'error' : ''}
            help={errors.conversion_coefficient?.message}
          >
            <Controller
              name="conversion_coefficient"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  min={0}
                  precision={4}
                  placeholder="Коэф. перев."
                  style={{ width: 120 }}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            validateStatus={errors.consumption_coefficient ? 'error' : ''}
            help={errors.consumption_coefficient?.message}
          >
            <Controller
              name="consumption_coefficient"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  min={0}
                  precision={4}
                  placeholder="Коэф. расхода"
                  style={{ width: 130 }}
                />
              )}
            />
          </Form.Item>
        </>
      )}

      <Form.Item>
        <InputNumber
          value={(quantity || 0) * (unitRate || 0)}
          precision={2}
          disabled
          placeholder="Сумма"
          style={{ width: 130 }}
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Tooltip title="Сохранить">
            <Button htmlType="submit" type="text" icon={<CheckOutlined />} />
          </Tooltip>
          <Tooltip title="Отмена">
            <Button onClick={handleCancel} type="text" icon={<CloseOutlined />} />
          </Tooltip>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default InlineBoqItemForm;

