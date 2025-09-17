import React, { useState } from 'react';
import { Modal, Form, Select, message, Spin } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tendersApi } from '../../lib/supabase/api/tenders';
import { clientPositionsApi } from '../../lib/supabase/api/client-positions';
import { workMaterialTemplatesApi } from '../../lib/supabase/api/work-material-templates';
import { boqBulkApi } from '../../lib/supabase/api/boq/bulk';

interface AddTemplateToBOQModalProps {
  open: boolean;
  onClose: () => void;
  templateName: string;
}

const AddTemplateToBOQModal: React.FC<AddTemplateToBOQModalProps> = ({
  open,
  onClose,
  templateName
}) => {
  console.log('🚀 AddTemplateToBOQModal render:', { open, templateName });

  const [form] = Form.useForm();
  const [selectedTenderId, setSelectedTenderId] = useState<string>();

  // Загрузка тендеров
  const { data: tenders = [], isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: async () => {
      console.log('📡 Loading tenders');
      const response = await tendersApi.getAll();
      if (response.error) throw new Error(response.error);
      console.log('✅ Tenders loaded:', response.data?.length);
      return response.data || [];
    },
    enabled: open
  });

  // Загрузка позиций заказчика для выбранного тендера
  const { data: clientPositions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['client-positions', selectedTenderId],
    queryFn: async () => {
      if (!selectedTenderId) return [];
      console.log('📡 Loading client positions for tender:', selectedTenderId);
      const response = await clientPositionsApi.getByTenderId(selectedTenderId);
      if (response.error) throw new Error(response.error);
      console.log('✅ Client positions loaded:', response.data?.length);
      return response.data || [];
    },
    enabled: !!selectedTenderId
  });

  // Мутация для добавления шаблона в BOQ
  const addTemplateMutation = useMutation({
    mutationFn: async ({ tenderId, clientPositionId }: { tenderId: string; clientPositionId?: string }) => {
      console.log('🚀 Adding template to BOQ:', { templateName, tenderId, clientPositionId });
      console.log('📍 AddTemplateToBOQModal: Starting template conversion');

      // Конвертируем шаблон в BOQ элементы
      console.log('📍 AddTemplateToBOQModal: Calling convertTemplateToBOQItems');
      const convertResult = await workMaterialTemplatesApi.convertTemplateToBOQItems(
        templateName,
        tenderId,
        clientPositionId
      );
      console.log('📍 AddTemplateToBOQModal: Convert result:', convertResult);

      if (convertResult.error) {
        throw new Error(convertResult.error);
      }

      if (!convertResult.data) {
        throw new Error('Нет элементов для добавления в BOQ');
      }

      // Проверяем формат ответа - новый (с items и links) или старый (массив)
      const dataToInsert = convertResult.data.items ? convertResult.data : convertResult.data;
      const hasItems = Array.isArray(dataToInsert) ? dataToInsert.length > 0 : dataToInsert.items?.length > 0;

      if (!hasItems) {
        throw new Error('Нет элементов для добавления в BOQ');
      }

      // Добавляем элементы в BOQ через bulk API
      console.log('📍 AddTemplateToBOQModal: Calling bulk API with data:', {
        clientPositionId,
        dataType: Array.isArray(dataToInsert) ? 'array' : 'object with items and links',
        itemsCount: Array.isArray(dataToInsert) ? dataToInsert.length : dataToInsert.items?.length,
        linksCount: !Array.isArray(dataToInsert) ? dataToInsert.links?.length : 0
      });

      let bulkResult;
      if (clientPositionId) {
        console.log('📍 AddTemplateToBOQModal: Calling bulkCreateInPosition');
        bulkResult = await boqBulkApi.bulkCreateInPosition(clientPositionId, dataToInsert);
      } else {
        // Для обычного bulkCreate передаем только items если это новый формат
        const itemsToInsert = Array.isArray(dataToInsert) ? dataToInsert : dataToInsert.items;
        bulkResult = await boqBulkApi.bulkCreate(tenderId, itemsToInsert);
      }

      if (bulkResult.error) {
        throw new Error(bulkResult.error);
      }

      return bulkResult.data;
    },
    onSuccess: (itemsCount) => {
      message.success(`Шаблон "${templateName}" добавлен в BOQ (${itemsCount} элементов)`);
      onClose();
      form.resetFields();
      setSelectedTenderId(undefined);
    },
    onError: (error: any) => {
      console.error('❌ Failed to add template to BOQ:', error);
      message.error(`Ошибка добавления в BOQ: ${error.message}`);
    }
  });

  const handleSubmit = (values: any) => {
    console.log('🚀 Form submitted:', values);
    addTemplateMutation.mutate({
      tenderId: values.tender_id,
      clientPositionId: values.client_position_id
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedTenderId(undefined);
    onClose();
  };

  const handleTenderChange = (tenderId: string) => {
    console.log('🔄 Tender selected:', tenderId);
    setSelectedTenderId(tenderId);
    form.setFieldValue('client_position_id', undefined);
  };

  return (
    <Modal
      title={`Добавить шаблон "${templateName}" в BOQ`}
      open={open}
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={addTemplateMutation.isPending}
      width={500}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
      >
        <Form.Item
          name="tender_id"
          label="Выберите тендер"
          rules={[{ required: true, message: 'Выберите тендер' }]}
        >
          <Select
            showSearch
            placeholder="Выберите тендер"
            loading={tendersLoading}
            onChange={handleTenderChange}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={tenders.map(tender => ({
              value: tender.id,
              label: tender.name
            }))}
          />
        </Form.Item>

        <Form.Item
          name="client_position_id"
          label="Позиция заказчика (опционально)"
          help="Оставьте пустым для добавления в корень тендера"
        >
          <Select
            showSearch
            placeholder="Выберите позицию заказчика"
            loading={positionsLoading}
            allowClear
            disabled={!selectedTenderId}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={clientPositions.map(position => ({
              value: position.id,
              label: `${position.position_number}. ${position.work_name}`
            }))}
            notFoundContent={
              !selectedTenderId ? (
                <div className="text-center text-gray-500 py-2">
                  Сначала выберите тендер
                </div>
              ) : positionsLoading ? (
                <div className="text-center py-2">
                  <Spin size="small" /> Загрузка...
                </div>
              ) : (
                <div className="text-center text-gray-500 py-2">
                  Нет доступных позиций
                </div>
              )
            }
          />
        </Form.Item>

        <div className="bg-blue-50 p-3 rounded-md">
          <div className="text-sm text-blue-800">
            <strong>Что будет создано:</strong>
            <div className="mt-1">
              • BOQ элементы для всех работ и материалов из шаблона
            </div>
            <div>
              • Материалы будут автоматически связаны с работами (если настроено)
            </div>
            <div>
              • Коэффициенты перевода и расхода будут применены
            </div>
            <div>
              • Цены и количества нужно будет заполнить вручную
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default AddTemplateToBOQModal;