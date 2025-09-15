import React, { useEffect } from 'react';
import { AutoComplete, Button, Form, Select, Space, Tooltip, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DecimalInput } from '../common';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '../../lib/supabase/api/materials';
import { worksApi } from '../../lib/supabase/api/works';
import { workMaterialTemplatesApi, type WorkMaterialTemplate } from '../../lib/supabase/api/work-material-templates';

interface InlineTemplateFormProps {
  onCancel: () => void;
  editingTemplate?: WorkMaterialTemplate | null;
}

interface FormValues {
  template_name: string;
  template_description?: string;
  work_item_type: 'work' | 'sub_work';
  work_description: string;
  material_item_type: 'material' | 'sub_material';
  material_description: string;
  conversion_coefficient: number;
  is_linked_to_work: boolean;
  notes?: string;
  work_id?: string;
  material_id?: string;
}

interface LibraryOption {
  value: string;
  label: string;
  item: any;
}

const schema = yup.object({
  template_name: yup.string().required('Введите название шаблона'),
  work_description: yup.string().required('Выберите работу'),
  material_description: yup.string().required('Выберите материал'),
  conversion_coefficient: yup
    .number()
    .typeError('Введите коэффициент перевода')
    .min(0.0001, 'Коэффициент должен быть больше 0')
    .required('Введите коэффициент перевода'),
});

const InlineTemplateForm: React.FC<InlineTemplateFormProps> = ({
  onCancel,
  editingTemplate
}) => {
  console.log('🚀 InlineTemplateForm render:', { editingTemplate });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      template_name: '',
      template_description: '',
      work_item_type: 'work',
      work_description: '',
      material_item_type: 'material',
      material_description: '',
      conversion_coefficient: 1.0,
      is_linked_to_work: true,
      notes: '',
      work_id: undefined,
      material_id: undefined,
    },
    resolver: yupResolver(schema),
  });

  const queryClient = useQueryClient();

  // Загрузка работ (все типы)
  const { data: works = [] } = useQuery({
    queryKey: ['works-library'],
    queryFn: async () => {
      const response = await worksApi.getAll();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    }
  });

  // Загрузка материалов (все типы)
  const { data: materials = [] } = useQuery({
    queryKey: ['materials-library'],
    queryFn: async () => {
      const response = await materialsApi.getAll();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    }
  });

  // Создание/обновление шаблона
  const saveMutation = useMutation({
    mutationFn: async (values: WorkMaterialTemplate) => {
      if (editingTemplate?.template_item_id || editingTemplate?.id) {
        const itemId = editingTemplate.template_item_id || editingTemplate.id;
        return await workMaterialTemplatesApi.updateTemplateItem(itemId, values);
      } else {
        return await workMaterialTemplatesApi.createTemplateItem(values);
      }
    },
    onSuccess: () => {
      message.success(editingTemplate ? 'Элемент шаблона обновлен' : 'Элемент шаблона создан');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      onCancel();
      reset();
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.message || 'Неизвестная ошибка'}`);
    }
  });

  // Заполнение формы при редактировании
  useEffect(() => {
    if (editingTemplate) {
      console.log('🔄 Filling form with template data:', editingTemplate);

      // Определяем данные работы
      const workData = editingTemplate.work_library || editingTemplate.sub_work_library;
      const workType = editingTemplate.work_library_id ? 'work' : 'sub_work';

      // Определяем данные материала
      const materialData = editingTemplate.material_library || editingTemplate.sub_material_library;
      const materialType = editingTemplate.material_library_id ? 'material' : 'sub_material';

      setValue('template_name', editingTemplate.template_name || '');
      setValue('template_description', editingTemplate.template_description || '');
      setValue('work_item_type', workType);
      setValue('work_description', workData?.name || '');
      setValue('work_id', editingTemplate.work_library_id || editingTemplate.sub_work_library_id);
      setValue('material_item_type', materialType);
      setValue('material_description', materialData?.name || '');
      setValue('material_id', editingTemplate.material_library_id || editingTemplate.sub_material_library_id);
      setValue('conversion_coefficient', editingTemplate.conversion_coefficient || 1.0);
      setValue('is_linked_to_work', editingTemplate.is_linked_to_work ?? true);
      setValue('notes', editingTemplate.notes || '');
    } else {
      // Установка значений по умолчанию для новых шаблонов
      setValue('conversion_coefficient', 1.0);
      setValue('is_linked_to_work', true);
    }
  }, [editingTemplate, setValue]);

  const workItemType = watch('work_item_type');
  const materialItemType = watch('material_item_type');

  // Опции для работ
  const workOptions: LibraryOption[] = works
    .filter(work => work.item_type === workItemType)
    .map(work => ({
      value: work.id,
      label: work.name,
      item: work
    }));

  // Опции для материалов
  const materialOptions: LibraryOption[] = materials
    .filter(material => material.item_type === materialItemType)
    .map(material => ({
      value: material.id,
      label: material.name,
      item: material
    }));

  const handleWorkSelect = (_value: string, option: LibraryOption) => {
    console.log('🖱️ Work item selected', { value: _value, item: option.item });
    setValue('work_description', option.item.name);
    setValue('work_id', option.item.id);
  };

  const handleMaterialSelect = (_value: string, option: LibraryOption) => {
    console.log('🖱️ Material item selected', { value: _value, item: option.item });
    setValue('material_description', option.item.name);
    setValue('material_id', option.item.id);
  };

  const onSubmit = async (values: FormValues) => {
    console.log('🚀 Form submitted:', values);

    const templateData: WorkMaterialTemplate = {
      template_name: values.template_name,
      template_description: values.template_description,
      work_library_id: values.work_item_type === 'work' ? values.work_id : undefined,
      sub_work_library_id: values.work_item_type === 'sub_work' ? values.work_id : undefined,
      material_library_id: values.material_item_type === 'material' ? values.material_id : undefined,
      sub_material_library_id: values.material_item_type === 'sub_material' ? values.material_id : undefined,
      conversion_coefficient: values.conversion_coefficient || 1.0,
      is_linked_to_work: values.is_linked_to_work !== false,
      notes: values.notes
    };

    saveMutation.mutate(templateData);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Form layout="inline" onFinish={handleSubmit(onSubmit)} className="mb-4 p-4 bg-gray-50 rounded border">
      {/* Название шаблона */}
      <Form.Item
        validateStatus={errors.template_name ? 'error' : ''}
        help={errors.template_name?.message}
      >
        <Controller
          name="template_name"
          control={control}
          render={({ field }) => (
            <AutoComplete
              {...field}
              placeholder="Название шаблона"
              style={{ width: 200 }}
            />
          )}
        />
      </Form.Item>

      {/* Описание шаблона */}
      <Form.Item>
        <Controller
          name="template_description"
          control={control}
          render={({ field }) => (
            <AutoComplete
              {...field}
              placeholder="Описание (опционально)"
              style={{ width: 180 }}
            />
          )}
        />
      </Form.Item>

      {/* Тип работы */}
      <Form.Item>
        <Controller
          name="work_item_type"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { value: 'work', label: 'Работа' },
                { value: 'sub_work', label: 'Суб-работа' },
              ]}
              style={{ width: 100 }}
            />
          )}
        />
      </Form.Item>

      {/* Выбор работы */}
      <Form.Item
        validateStatus={errors.work_description ? 'error' : ''}
        help={errors.work_description?.message}
      >
        <Controller
          name="work_description"
          control={control}
          render={({ field }) => (
            <AutoComplete
              {...field}
              options={workOptions}
              onSelect={handleWorkSelect}
              placeholder="Выберите работу"
              style={{ width: 200 }}
            />
          )}
        />
      </Form.Item>

      {/* Тип материала */}
      <Form.Item>
        <Controller
          name="material_item_type"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { value: 'material', label: 'Материал' },
                { value: 'sub_material', label: 'Суб-материал' },
              ]}
              style={{ width: 110 }}
            />
          )}
        />
      </Form.Item>

      {/* Выбор материала */}
      <Form.Item
        validateStatus={errors.material_description ? 'error' : ''}
        help={errors.material_description?.message}
      >
        <Controller
          name="material_description"
          control={control}
          render={({ field }) => (
            <AutoComplete
              {...field}
              options={materialOptions}
              onSelect={handleMaterialSelect}
              placeholder="Выберите материал"
              style={{ width: 200 }}
            />
          )}
        />
      </Form.Item>

      {/* Коэффициент перевода */}
      <Form.Item
        validateStatus={errors.conversion_coefficient ? 'error' : ''}
        help={errors.conversion_coefficient?.message}
      >
        <Controller
          name="conversion_coefficient"
          control={control}
          render={({ field }) => (
            <DecimalInput
              {...field}
              min={0.0001}
              precision={4}
              placeholder="Коэф. перевода"
              style={{ width: 120 }}
            />
          )}
        />
      </Form.Item>

      {/* Привязан к работе */}
      <Form.Item>
        <Controller
          name="is_linked_to_work"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { value: true, label: 'Привязан' },
                { value: false, label: 'Не привязан' },
              ]}
              style={{ width: 110 }}
            />
          )}
        />
      </Form.Item>

      {/* Примечания */}
      <Form.Item>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <AutoComplete
              {...field}
              placeholder="Примечания"
              style={{ width: 150 }}
            />
          )}
        />
      </Form.Item>

      {/* Кнопки действий */}
      <Form.Item>
        <Space>
          <Tooltip title="Сохранить">
            <Button
              htmlType="submit"
              type="text"
              icon={<CheckOutlined />}
              loading={saveMutation.isPending}
            />
          </Tooltip>
          <Tooltip title="Отмена">
            <Button onClick={handleCancel} type="text" icon={<CloseOutlined />} />
          </Tooltip>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default InlineTemplateForm;