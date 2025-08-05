import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Row, Col, Button } from 'antd';
import dayjs from 'dayjs';
import type { EditTenderModalProps, TenderUpdate } from '../types';

const EditTenderModal: React.FC<EditTenderModalProps> = ({
  visible,
  loading,
  editingTender,
  onCancel,
  onSubmit
}) => {
  const [form] = Form.useForm();
  
  console.log('🚀 EditTenderModal component rendered');
  console.log('👁️ Modal visible:', visible);
  console.log('⏳ Loading state:', loading);
  console.log('📝 Editing tender:', editingTender);

  // Populate form when editing tender changes
  useEffect(() => {
    if (editingTender && visible) {
      console.log('🔄 Populating form with tender data:', editingTender);
      form.setFieldsValue({
        ...editingTender,
        submission_deadline: editingTender.submission_deadline ? dayjs(editingTender.submission_deadline) : null
      });
    }
  }, [editingTender, visible, form]);

  const handleSubmit = async (values: any) => {
    console.log('📝 Edit form submitted with values:', values);
    
    if (!editingTender) {
      console.error('❌ No tender being edited');
      return;
    }
    
    try {
      const updates: TenderUpdate = {
        title: values.title,
        description: values.description,
        client_name: values.client_name,
        tender_number: values.tender_number,
        submission_deadline: values.submission_deadline?.format('YYYY-MM-DD HH:mm:ss'),
        estimated_value: values.estimated_value,
        status: values.status
      };

      console.log('🔄 Calling onSubmit with processed data:', updates);
      await onSubmit(updates);
      
      console.log('✅ Edit form submission successful, resetting form');
      form.resetFields();
    } catch (error) {
      console.error('❌ Edit form submission error:', error);
    }
  };

  const handleCancel = () => {
    console.log('❌ Edit modal cancelled');
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Редактировать тендер"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="title"
              label="Название тендера"
              rules={[{ required: true, message: 'Введите название' }]}
            >
              <Input placeholder="Название тендерного проекта" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="tender_number"
              label="Номер тендера"
              rules={[{ required: true, message: 'Введите номер' }]}
            >
              <Input placeholder="T-2024-001" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Описание"
        >
          <Input.TextArea rows={3} placeholder="Подробное описание проекта" />
        </Form.Item>

        <Form.Item
          name="client_name"
          label="Заказчик"
          rules={[{ required: true, message: 'Введите название заказчика' }]}
        >
          <Input placeholder="Название организации-заказчика" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="submission_deadline"
              label="Срок подачи заявки"
            >
              <DatePicker 
                showTime 
                className="w-full"
                placeholder="Выберите дату и время"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="estimated_value"
              label="Ориентировочная стоимость"
            >
              <Input 
                type="number" 
                placeholder="0"
                addonAfter="₽"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Статус"
            >
              <Select>
                <Select.Option value="draft">Черновик</Select.Option>
                <Select.Option value="active">Активный</Select.Option>
                <Select.Option value="submitted">Подан</Select.Option>
                <Select.Option value="awarded">Выигран</Select.Option>
                <Select.Option value="closed">Закрыт</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleCancel}>
            Отмена
          </Button>
          <Button 
            type="primary" 
            htmlType="submit"
            loading={loading}
          >
            Сохранить
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditTenderModal;