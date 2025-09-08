import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Space,
  Typography
} from 'antd';
import { PlusOutlined, LinkOutlined } from '@ant-design/icons';
import { clientPositionsApi } from '../../lib/supabase/api';
import type { ClientPositionInsert } from '../../lib/supabase/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AdditionalWorkModalProps {
  visible: boolean;
  onClose: () => void;
  parentPositionId: string;
  parentPositionName: string;
  tenderId: string;
  onSuccess: () => void;
}

const AdditionalWorkModal: React.FC<AdditionalWorkModalProps> = ({
  visible,
  onClose,
  parentPositionId,
  parentPositionName,
  tenderId,
  onSuccess
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
      
      // Reset form and close modal
      form.resetFields();
      onClose();
      
      // Trigger parent refresh
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
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#faad14' }} />
          <span>Добавление ДОП работы</span>
        </Space>
      }
      open={visible}
      onOk={form.submit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Создать"
      cancelText="Отмена"
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">Привязка к позиции:</Text>
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: 4,
          marginTop: 4
        }}>
          <Text strong>{parentPositionName}</Text>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          unit: 'компл.'
        }}
      >
        <Form.Item
          name="work_name"
          label="Наименование ДОП работы"
          rules={[
            { required: true, message: 'Введите наименование работы' },
            { min: 3, message: 'Минимум 3 символа' }
          ]}
        >
          <Input 
            placeholder="Например: Дополнительное усиление конструкции"
            prefix="ДОП: "
            size="large"
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="large">
          <Form.Item
            name="unit"
            label="Единица измерения"
            style={{ width: 200 }}
            rules={[{ required: true, message: 'Выберите единицу' }]}
          >
            <Select placeholder="Выберите единицу">
              <Select.Option value="компл.">компл.</Select.Option>
              <Select.Option value="шт">шт</Select.Option>
              <Select.Option value="м²">м²</Select.Option>
              <Select.Option value="м³">м³</Select.Option>
              <Select.Option value="м.п.">м.п.</Select.Option>
              <Select.Option value="т">т</Select.Option>
              <Select.Option value="кг">кг</Select.Option>
              <Select.Option value="л">л</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="volume"
            label="Объем ГП"
            style={{ width: 200 }}
          >
            <InputNumber
              min={0}
              step={0.01}
              placeholder="0.00"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>
      </Form>

      <div style={{ 
        marginTop: 16,
        padding: 12,
        backgroundColor: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: 4
      }}>
        <Text type="warning">
          <strong>Обратите внимание:</strong> После создания ДОП работы вы сможете добавить в неё 
          необходимые работы и материалы через стандартный интерфейс BOQ.
        </Text>
      </div>
    </Modal>
  );
};

export default AdditionalWorkModal;