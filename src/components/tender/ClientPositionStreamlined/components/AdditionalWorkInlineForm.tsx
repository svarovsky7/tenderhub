import React, { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  AutoComplete,
  Button,
  Space,
  message,
  Card,
  Typography
} from 'antd';
import { PlusOutlined, CloseOutlined, LinkOutlined } from '@ant-design/icons';
import { clientPositionsApi } from '../../../../lib/supabase/api';
import type { ClientPositionInsert } from '../../../../lib/supabase/types';

const { Text } = Typography;

interface AdditionalWorkInlineFormProps {
  parentPositionId: string;
  parentPositionName: string;
  tenderId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const AdditionalWorkInlineForm: React.FC<AdditionalWorkInlineFormProps> = ({
  parentPositionId,
  parentPositionName,
  tenderId,
  onSuccess,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    console.log('🚀 Creating additional work:', {
      values,
      parentPositionId,
      parentPositionName,
      tenderId,
      parentPositionIdType: typeof parentPositionId,
      tenderIdType: typeof tenderId
    });

    if (!parentPositionId ||
        parentPositionId === 'undefined' ||
        parentPositionId === undefined ||
        parentPositionId === null ||
        parentPositionId === '') {
      console.error('❌ Invalid parentPositionId:', {
        value: parentPositionId,
        type: typeof parentPositionId
      });
      message.error('Ошибка: не указана родительская позиция');
      return;
    }

    if (!tenderId ||
        tenderId === 'undefined' ||
        tenderId === undefined ||
        tenderId === null ||
        tenderId === '') {
      console.error('❌ Invalid tenderId:', {
        value: tenderId,
        type: typeof tenderId
      });
      message.error('Ошибка: не указан тендер');
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const additionalWorkData: Omit<ClientPositionInsert, 'tender_id' | 'is_additional' | 'parent_position_id' | 'position_type'> = {
        work_name: values.work_name,
        item_no: '', // Will be set by API
        unit: values.unit || 'компл.',
        volume: null, // ДОП работы не имеют объема заказчика
        manual_volume: values.volume || null, // Объем ГП для ДОП работ
        client_note: null, // ДОП работы не имеют примечания заказчика
        manual_note: values.manual_note || null, // Примечание ГП для ДОП работ
        total_materials_cost: 0,
        total_works_cost: 0,
        hierarchy_level: 6 // Executable level
      };

      // Create additional work via API with tenderId
      const result = await clientPositionsApi.createAdditionalWork(
        parentPositionId,
        tenderId,
        additionalWorkData
      );

      if (result.error) {
        console.error('❌ Error creating additional work:', result.error);
        message.error(result.error);
        return;
      }

      console.log('✅ Additional work created successfully:', result.data);
      message.success('ДОП работа успешно создана');

      // Reset form and trigger parent refresh
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('💥 Exception creating additional work:', error);
      message.error('Ошибка при создании ДОП работы');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Card
      size="small"
      className="mb-4 border-orange-300"
      styles={{
        body: { padding: '12px 16px' },
        header: {
          backgroundColor: '#fffbe6',
          borderBottom: '1px solid #ffe58f',
          padding: '8px 16px'
        }
      }}
      title={
        <Space>
          <LinkOutlined style={{ color: '#faad14' }} />
          <span>Добавление ДОП работы</span>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            к позиции: <strong>{parentPositionName}</strong>
          </Text>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleCancel}
          title="Отменить"
        />
      }
    >
      <Form
        form={form}
        layout="inline"
        onFinish={handleSubmit}
        initialValues={{
          unit: 'компл.'
        }}
        style={{ width: '100%' }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item
            name="work_name"
            style={{ flex: 1, marginBottom: 0 }}
            rules={[
              { required: true, message: 'Введите наименование работы' },
              { min: 3, message: 'Минимум 3 символа' }
            ]}
          >
            <Input
              placeholder="Наименование ДОП работы"
              prefix="ДОП: "
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="volume"
            style={{ width: 120, marginBottom: 0 }}
          >
            <InputNumber
              min={0}
              step={0.01}
              placeholder="Объем ГП"
              style={{ width: '100%' }}
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="unit"
            style={{ width: 120, marginBottom: 0 }}
            rules={[{ required: true, message: 'Введите единицу' }]}
          >
            <AutoComplete
              placeholder="Ед. изм."
              disabled={loading}
              options={[
                { value: 'компл.' },
                { value: 'шт' },
                { value: 'м²' },
                { value: 'м³' },
                { value: 'м.п.' },
                { value: 'т' },
                { value: 'кг' },
                { value: 'л' },
                { value: 'м' },
                { value: 'см' },
                { value: 'мм' },
                { value: 'км' },
                { value: 'га' },
                { value: 'час' },
                { value: 'смена' },
                { value: 'сутки' },
                { value: 'месяц' }
              ]}
              filterOption={(inputValue, option) =>
                option!.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
              }
            />
          </Form.Item>

          <Form.Item
            name="manual_note"
            style={{ flex: 0.5, marginBottom: 0 }}
          >
            <Input
              placeholder="Примечание ГП"
              disabled={loading}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={loading}
            style={{ marginLeft: 8 }}
          >
            Создать
          </Button>

          <Button
            onClick={handleCancel}
            disabled={loading}
            style={{ marginLeft: 4 }}
          >
            Отмена
          </Button>
        </Space.Compact>
      </Form>

      <div style={{
        marginTop: 12,
        padding: 8,
        backgroundColor: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: 4,
        fontSize: 12
      }}>
        <Text type="warning">
          <strong>Примечание:</strong> После создания ДОП работы вы сможете добавить в неё
          работы и материалы через стандартный интерфейс BOQ.
        </Text>
      </div>
    </Card>
  );
};

export default AdditionalWorkInlineForm;