import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message, Button, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '../../lib/supabase/api/materials';
import { worksApi } from '../../lib/supabase/api/works';
import { workMaterialTemplatesApi, type WorkMaterialTemplate } from '../../lib/supabase/api/work-material-templates';

interface EditTemplateItemModalProps {
  open: boolean;
  onClose: () => void;
  templateItem: any; // Template item with library data
}

const EditTemplateItemModal: React.FC<EditTemplateItemModalProps> = ({
  open,
  onClose,
  templateItem
}) => {
  console.log('🚀 EditTemplateItemModal render:', { open, templateItem });

  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [selectedWorkType, setSelectedWorkType] = useState<'work' | 'sub_work'>('work');
  const [selectedMaterialType, setSelectedMaterialType] = useState<'material' | 'sub_material'>('material');

  // Загрузка работ
  const { data: works = [] } = useQuery({
    queryKey: ['works-library'],
    queryFn: async () => {
      const response = await worksApi.getAll();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    }
  });

  // Загрузка материалов
  const { data: materials = [] } = useQuery({
    queryKey: ['materials-library'],
    queryFn: async () => {
      const response = await materialsApi.getAll();
      if (response.error) throw new Error(response.error);
      return response.data || [];
    }
  });

  // Обновление элемента шаблона
  const updateMutation = useMutation({
    mutationFn: async (values: WorkMaterialTemplate) => {
      return await workMaterialTemplatesApi.updateTemplateItem(templateItem.template_item_id, values);
    },
    onSuccess: () => {
      message.success('Элемент шаблона обновлен');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      onClose();
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.message || 'Неизвестная ошибка'}`);
    }
  });

  // Удаление элемента шаблона
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await workMaterialTemplatesApi.deleteTemplateItem(templateItem.template_item_id);
    },
    onSuccess: () => {
      message.success('Элемент шаблона удален');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      onClose();
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message || 'Неизвестная ошибка'}`);
    }
  });

  // Заполнение формы при открытии
  useEffect(() => {
    if (templateItem && open) {
      console.log('🔄 Filling form with template item data:', templateItem);

      // Определяем типы элементов
      const workType = templateItem.work_library_id ? 'work' : 'sub_work';
      const materialType = templateItem.material_library_id ? 'material' : 'sub_material';

      setSelectedWorkType(workType);
      setSelectedMaterialType(materialType);

      form.setFieldsValue({
        template_name: templateItem.template_name,
        template_description: templateItem.template_description,
        work_type: workType,
        work_id: templateItem.work_library_id || templateItem.sub_work_library_id,
        material_type: materialType,
        material_id: templateItem.material_library_id || templateItem.sub_material_library_id,
        conversion_coefficient: templateItem.conversion_coefficient,
        is_linked_to_work: templateItem.is_linked_to_work,
        notes: templateItem.notes
      });
    }
  }, [templateItem, open, form]);

  const handleSubmit = (values: any) => {
    console.log('🚀 Form submitted:', values);

    const templateData: WorkMaterialTemplate = {
      template_name: values.template_name,
      template_description: values.template_description,
      work_library_id: values.work_type === 'work' ? values.work_id : undefined,
      sub_work_library_id: values.work_type === 'sub_work' ? values.work_id : undefined,
      material_library_id: values.material_type === 'material' ? values.material_id : undefined,
      sub_material_library_id: values.material_type === 'sub_material' ? values.material_id : undefined,
      conversion_coefficient: values.conversion_coefficient || 1.0,
      is_linked_to_work: values.is_linked_to_work !== false,
      notes: values.notes
    };

    updateMutation.mutate(templateData);
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Удалить элемент шаблона?',
      content: 'Вы уверены, что хотите удалить этот элемент шаблона?',
      onOk: () => deleteMutation.mutate(),
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Фильтрация элементов по типу
  const getWorkOptions = () => {
    return works
      .filter(work => work.item_type === selectedWorkType)
      .map(work => ({
        value: work.id,
        label: work.name
      }));
  };

  const getMaterialOptions = () => {
    return materials
      .filter(material => material.item_type === selectedMaterialType)
      .map(material => ({
        value: material.id,
        label: material.name
      }));
  };

  const workData = templateItem?.work_library || templateItem?.sub_work_library;
  const materialData = templateItem?.material_library || templateItem?.sub_material_library;

  return (
    <Modal
      title="Редактировать элемент шаблона"
      open={open}
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={updateMutation.isPending}
      width={600}
      destroyOnClose
      footer={[
        <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDelete} loading={deleteMutation.isPending}>
          Удалить
        </Button>,
        <Button key="cancel" onClick={handleCancel}>
          Отмена
        </Button>,
        <Button key="submit" type="primary" loading={updateMutation.isPending} onClick={form.submit}>
          Сохранить
        </Button>,
      ]}
    >
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="text-sm text-gray-600 mb-2">Текущие данные:</div>
        <div className="space-y-1 text-sm">
          <div><strong>Работа:</strong> {workData?.name || 'Не найдена'}</div>
          <div><strong>Материал:</strong> {materialData?.name || 'Не найден'}</div>
          <div><strong>Коэффициент:</strong> {templateItem?.conversion_coefficient}</div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
      >
        <Form.Item
          name="template_name"
          label="Название шаблона"
          rules={[{ required: true, message: 'Введите название шаблона' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="template_description"
          label="Описание шаблона"
        >
          <Input.TextArea rows={2} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          {/* Выбор работы */}
          <div>
            <Form.Item
              name="work_type"
              label="Тип работы"
              rules={[{ required: true, message: 'Выберите тип работы' }]}
            >
              <Select
                value={selectedWorkType}
                onChange={setSelectedWorkType}
                options={[
                  { value: 'work', label: 'Работа' },
                  { value: 'sub_work', label: 'Суб-работа' }
                ]}
              />
            </Form.Item>

            <Form.Item
              name="work_id"
              label="Работа"
              rules={[{ required: true, message: 'Выберите работу' }]}
            >
              <Select
                showSearch
                placeholder="Выберите работу"
                options={getWorkOptions()}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </div>

          {/* Выбор материала */}
          <div>
            <Form.Item
              name="material_type"
              label="Тип материала"
              rules={[{ required: true, message: 'Выберите тип материала' }]}
            >
              <Select
                value={selectedMaterialType}
                onChange={setSelectedMaterialType}
                options={[
                  { value: 'material', label: 'Материал' },
                  { value: 'sub_material', label: 'Суб-материал' }
                ]}
              />
            </Form.Item>

            <Form.Item
              name="material_id"
              label="Материал"
              rules={[{ required: true, message: 'Выберите материал' }]}
            >
              <Select
                showSearch
                placeholder="Выберите материал"
                options={getMaterialOptions()}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </div>
        </div>

        <Form.Item
          name="conversion_coefficient"
          label="Коэффициент перевода"
          rules={[
            { required: true, message: 'Введите коэффициент перевода' },
            { type: 'number', min: 0.0001, message: 'Коэффициент должен быть больше 0' }
          ]}
        >
          <InputNumber
            min={0.0001}
            max={99999}
            step={0.1}
            precision={4}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="is_linked_to_work"
          label="Привязан к работе"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Примечания"
        >
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTemplateItemModal;