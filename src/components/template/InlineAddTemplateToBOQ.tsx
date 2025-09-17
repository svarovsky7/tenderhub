import React, { useState } from 'react';
import { Card, Form, Select, Button, message, Spin, Alert } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tendersApi } from '../../lib/supabase/api/tenders';
import { clientPositionsApi } from '../../lib/supabase/api/client-positions';
import { workMaterialTemplatesApi } from '../../lib/supabase/api/work-material-templates';
import { boqBulkApi } from '../../lib/supabase/api/boq/bulk';

interface InlineAddTemplateToBOQProps {
  templateName: string;
  templateNote?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const InlineAddTemplateToBOQ: React.FC<InlineAddTemplateToBOQProps> = ({
  templateName,
  templateNote,
  onSuccess,
  onCancel
}) => {
  console.log('🚀 InlineAddTemplateToBOQ render:', { templateName, templateNote });

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
      console.log('📊 First tender:', response.data?.[0]); // Проверяем структуру первого тендера
      return response.data || [];
    }
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
      // Фильтруем только executable позиции
      const executablePositions = response.data?.filter(p => p.position_type === 'executable') || [];
      console.log('✅ Executable positions:', executablePositions.length);
      return executablePositions;
    },
    enabled: !!selectedTenderId
  });

  // Мутация для добавления шаблона в BOQ
  const addTemplateMutation = useMutation({
    mutationFn: async ({ tenderId, clientPositionId }: { tenderId: string; clientPositionId: string }) => {
      console.log('🚀 Adding template to BOQ:', { templateName, tenderId, clientPositionId });

      // Проверка типа позиции перед добавлением
      if (clientPositionId) {
        const position = clientPositions.find(p => p.id === clientPositionId);
        if (position && position.position_type !== 'executable') {
          throw new Error('Нельзя добавить шаблон в строку с типом "не исполняемая"');
        }
      }

      // Конвертируем шаблон в BOQ элементы
      console.log('📍 InlineAddTemplateToBOQ: Calling convertTemplateToBOQItems');
      const convertResult = await workMaterialTemplatesApi.convertTemplateToBOQItems(
        templateName,
        tenderId,
        clientPositionId
      );
      console.log('📍 InlineAddTemplateToBOQ: Convert result:', convertResult);

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

      // Добавляем элементы в BOQ через bulk API (всегда в позицию)
      console.log('📍 InlineAddTemplateToBOQ: Calling bulkCreateInPosition');
      const bulkResult = await boqBulkApi.bulkCreateInPosition(clientPositionId, dataToInsert);

      if (bulkResult.error) {
        throw new Error(bulkResult.error);
      }

      return bulkResult.data;
    },
    onSuccess: (itemsCount) => {
      message.success(`Шаблон "${templateName}" добавлен в BOQ (${itemsCount} элементов)`);
      form.resetFields();
      setSelectedTenderId(undefined);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('❌ Failed to add template to BOQ:', error);

      // Если ошибка из-за типа позиции, очищаем поле выбора позиции
      if (error.message.includes('не исполняемая')) {
        form.setFieldValue('client_position_id', undefined);
      }

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

  const handleTenderChange = (tenderId: string) => {
    console.log('🔄 Tender selected:', tenderId);
    setSelectedTenderId(tenderId);
    form.setFieldValue('client_position_id', undefined);
  };

  return (
    <Card
      style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '2px solid #3b82f6'
      }}
      bodyStyle={{ padding: 16 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold m-0">
            Добавление шаблона "{templateName}" в BOQ
          </h3>
          {templateNote && (
            <span className="text-sm text-gray-500 italic">
              {templateNote}
            </span>
          )}
        </div>
        {onCancel && (
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onCancel}
            size="small"
          />
        )}
      </div>

      <Form
        form={form}
        layout="inline"
        onFinish={handleSubmit}
        style={{ gap: 12, alignItems: 'flex-start' }}
      >
        <Form.Item
          name="tender_id"
          rules={[{ required: true, message: 'Выберите тендер' }]}
          style={{ marginBottom: 0, width: 300 }}
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
              label: `${tender.title || tender.client_name} (v${tender.version || 1})`  // Отображаем title и version
            }))}
          />
        </Form.Item>

        <Form.Item
          name="client_position_id"
          rules={[{ required: true, message: 'Выберите позицию заказчика' }]}
          style={{ marginBottom: 0, width: 350 }}
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
              ) : clientPositions.length === 0 ? (
                <div className="text-center text-gray-500 py-2">
                  Нет исполняемых позиций
                </div>
              ) : (
                <div className="text-center text-gray-500 py-2">
                  Нет доступных позиций
                </div>
              )
            }
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={addTemplateMutation.isPending}
            icon={<PlusOutlined />}
            style={{ width: 250 }}
          >
            Добавить шаблон в строку
          </Button>
        </Form.Item>
      </Form>

      {selectedTenderId && clientPositions.length === 0 && !positionsLoading && (
        <Alert
          message="В выбранном тендере нет исполняемых позиций заказчика"
          description="Создайте хотя бы одну исполняемую позицию в тендере для добавления шаблона"
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
        />
      )}
    </Card>
  );
};

export default InlineAddTemplateToBOQ;