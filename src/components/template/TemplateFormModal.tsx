import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi } from '../../lib/supabase/api/materials';
import { worksApi } from '../../lib/supabase/api/works';
import { workMaterialTemplatesApi, type WorkMaterialTemplate } from '../../lib/supabase/api/work-material-templates';

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  editingTemplate?: WorkMaterialTemplate | null;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  open,
  onClose,
  editingTemplate
}) => {
  console.log('🚀 TemplateFormModal render:', { open, editingTemplate });

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

  // Создание/обновление шаблона
  const createMutation = useMutation({
    mutationFn: async (values: WorkMaterialTemplate) => {
      if (editingTemplate?.id) {
        return await workMaterialTemplatesApi.updateTemplateItem(editingTemplate.id, values);
      } else {
        return await workMaterialTemplatesApi.createTemplateItem(values);
      }
    },
    onSuccess: () => {
      message.success(editingTemplate ? 'Элемент шаблона обновлен' : 'Элемент шаблона создан');
      queryClient.invalidateQueries({ queryKey: ['work-material-templates'] });
      onClose();
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.message || 'Неизвестная ошибка'}`);
    }
  });

  // Заполнение формы при редактировании
  useEffect(() => {
    if (editingTemplate && open) {
      console.log('🔄 Filling form with template data:', editingTemplate);

      // Определяем типы элементов
      const workType = editingTemplate.work_library_id ? 'work' : 'sub_work';
      const materialType = editingTemplate.material_library_id ? 'material' : 'sub_material';

      setSelectedWorkType(workType);
      setSelectedMaterialType(materialType);

      form.setFieldsValue({
        template_name: editingTemplate.template_name,
        template_description: editingTemplate.template_description,
        work_type: workType,
        work_id: editingTemplate.work_library_id || editingTemplate.sub_work_library_id,
        material_type: materialType,
        material_id: editingTemplate.material_library_id || editingTemplate.sub_material_library_id,
        conversion_coefficient: editingTemplate.conversion_coefficient,
        is_linked_to_work: editingTemplate.is_linked_to_work,
        notes: editingTemplate.notes
      });
    } else if (open) {
      // Сброс формы для создания нового элемента
      form.resetFields();
      setSelectedWorkType('work');
      setSelectedMaterialType('material');
    }
  }, [editingTemplate, open, form]);

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

    createMutation.mutate(templateData);
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

  return (
    <Modal
      title={editingTemplate ? 'Редактировать элемент шаблона' : 'Создать элемент шаблона'}
      open={open}
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending}
      width={800}
      destroyOnClose
      styles={{
        body: { padding: '24px' },
        header: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
      >
        {/* Основная информация о шаблоне */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 mb-6">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="text-sm font-medium mb-0">Основная информация</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Form.Item
                name="template_name"
                label={<span className="font-medium text-gray-700">Название шаблона</span>}
                rules={[{ required: true, message: 'Введите название шаблона' }]}
                className="mb-3"
              >
                <Input
                  placeholder="Например: Стяжка пола с материалами"
                  className="border-blue-200 focus:border-blue-400 hover:border-blue-300"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="template_description"
                label={<span className="font-medium text-gray-700">Описание шаблона</span>}
                className="mb-0"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Описание назначения шаблона (опционально)"
                  className="border-blue-200 focus:border-blue-400 hover:border-blue-300"
                />
              </Form.Item>
            </div>
          </div>
        </div>

        {/* Выбор работ и материалов */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 mb-6">
          <div className="bg-green-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="text-sm font-medium mb-0">Связанные элементы</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Секция работ */}
              <div className="bg-white rounded-lg border border-green-200 p-4">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium text-gray-800">Работы</span>
                </div>
                <div className="space-y-3">
                  <Form.Item
                    name="work_type"
                    label={<span className="text-sm font-medium text-gray-600">Тип работы</span>}
                    rules={[{ required: true, message: 'Выберите тип работы' }]}
                    className="mb-2"
                  >
                    <Select
                      value={selectedWorkType}
                      onChange={setSelectedWorkType}
                      options={[
                        { value: 'work', label: 'Работа' },
                        { value: 'sub_work', label: 'Суб-работа' }
                      ]}
                      className="[&_.ant-select-selector]:border-green-200 [&_.ant-select-selector]:hover:border-green-300"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="work_id"
                    label={<span className="text-sm font-medium text-gray-600">Выбор работы</span>}
                    rules={[{ required: true, message: 'Выберите работу' }]}
                    className="mb-0"
                  >
                    <Select
                      showSearch
                      placeholder="Выберите работу"
                      options={getWorkOptions()}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      className="[&_.ant-select-selector]:border-green-200 [&_.ant-select-selector]:hover:border-green-300"
                      size="large"
                    />
                  </Form.Item>
                </div>
              </div>

              {/* Секция материалов */}
              <div className="bg-white rounded-lg border border-green-200 p-4">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span className="font-medium text-gray-800">Материалы</span>
                </div>
                <div className="space-y-3">
                  <Form.Item
                    name="material_type"
                    label={<span className="text-sm font-medium text-gray-600">Тип материала</span>}
                    rules={[{ required: true, message: 'Выберите тип материала' }]}
                    className="mb-2"
                  >
                    <Select
                      value={selectedMaterialType}
                      onChange={setSelectedMaterialType}
                      options={[
                        { value: 'material', label: 'Материал' },
                        { value: 'sub_material', label: 'Суб-материал' }
                      ]}
                      className="[&_.ant-select-selector]:border-orange-200 [&_.ant-select-selector]:hover:border-orange-300"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="material_id"
                    label={<span className="text-sm font-medium text-gray-600">Выбор материала</span>}
                    rules={[{ required: true, message: 'Выберите материал' }]}
                    className="mb-0"
                  >
                    <Select
                      showSearch
                      placeholder="Выберите материал"
                      options={getMaterialOptions()}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      className="[&_.ant-select-selector]:border-orange-200 [&_.ant-select-selector]:hover:border-orange-300"
                      size="large"
                    />
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Параметры и настройки */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100 mb-6">
          <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="text-sm font-medium mb-0">Параметры и настройки</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <Form.Item
                  name="conversion_coefficient"
                  label={<span className="font-medium text-gray-700">Коэффициент перевода</span>}
                  rules={[
                    { required: true, message: 'Введите коэффициент перевода' },
                    { type: 'number', min: 0.0001, message: 'Коэффициент должен быть больше 0' }
                  ]}
                  initialValue={1.0}
                  className="mb-0"
                >
                  <InputNumber
                    min={0.0001}
                    max={99999}
                    step={0.1}
                    precision={4}
                    style={{ width: '100%' }}
                    placeholder="1.0"
                    className="border-purple-200 hover:border-purple-300"
                    size="large"
                  />
                </Form.Item>
              </div>

              <div className="flex items-center space-y-4">
                <Form.Item
                  name="is_linked_to_work"
                  label={<span className="font-medium text-gray-700">Привязан к работе</span>}
                  valuePropName="checked"
                  initialValue={true}
                  className="mb-0"
                >
                  <div className="flex items-center space-x-3">
                    <Switch
                      size="default"
                      className="[&_.ant-switch-checked]:bg-purple-500"
                    />
                    <span className="text-sm text-gray-600">Автоматическая привязка</span>
                  </div>
                </Form.Item>
              </div>
            </div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
          <div className="bg-gray-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="text-sm font-medium mb-0">Дополнительная информация</h3>
          </div>
          <div className="p-4">
            <Form.Item
              name="notes"
              label={<span className="font-medium text-gray-700">Примечания</span>}
              className="mb-0"
            >
              <Input.TextArea
                rows={3}
                placeholder="Дополнительные примечания и инструкции по использованию шаблона (опционально)"
                className="border-gray-200 focus:border-gray-400 hover:border-gray-300"
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default TemplateFormModal;