import React from 'react';
import { Modal, Form, Input, DatePicker, Select, Row, Col, Button, InputNumber, Divider } from 'antd';
import type { CreateTenderModalProps, TenderInsert } from '../types';

const CreateTenderModal: React.FC<CreateTenderModalProps> = ({
  visible,
  loading,
  onCancel,
  onSubmit
}) => {
  const [form] = Form.useForm();
  
  console.log('🚀 CreateTenderModal component rendered');
  console.log('👁️ Modal visible:', visible);
  console.log('⏳ Loading state:', loading);

  const handleSubmit = async (values: any) => {
    console.log('📝 Form submitted with values:', values);
    console.log('🔍 New fields check - version:', values.version, 'area_sp:', values.area_sp, 'area_client:', values.area_client);
    
    try {
      const tenderData: TenderInsert = {
        title: values.title,
        description: values.description,
        client_name: values.client_name,
        tender_number: values.tender_number,
        submission_deadline: values.submission_deadline?.format('YYYY-MM-DD HH:mm:ss'),
        version: values.version ?? 1,
        area_sp: values.area_sp ?? null,
        area_client: values.area_client ?? null,
        upload_folder: values.upload_folder ?? null,
        bsm_link: values.bsm_link ?? null,
        tz_clarification_link: values.tz_clarification_link ?? null,
        qa_form_link: values.qa_form_link ?? null
      };

      console.log('🔄 Calling onSubmit with processed data:', tenderData);
      console.log('🔍 Processed new fields - version:', tenderData.version, 'area_sp:', tenderData.area_sp, 'area_client:', tenderData.area_client);
      await onSubmit(tenderData);
      
      console.log('✅ Form submission successful, resetting form');
      form.resetFields();
    } catch (error) {
      console.error('❌ Form submission error:', error);
    }
  };

  const handleCancel = () => {
    console.log('❌ Modal cancelled');
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Создать новый тендер"
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
          <Col span={12}>
            <Form.Item
              name="title"
              label="Название тендера"
              rules={[{ required: true, message: 'Введите название' }]}
            >
              <Input placeholder="Название тендерного проекта" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="tender_number"
              label="Номер тендера"
              rules={[{ required: true, message: 'Введите номер' }]}
            >
              <Input placeholder="T-2024-001" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="version"
              label="Версия"
              rules={[{ required: true, message: 'Укажите версию' }]}
              initialValue={1}
            >
              <InputNumber 
                min={1} 
                step={1}
                precision={0}
                placeholder="1" 
                style={{ width: '100%' }}
              />
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
          <Col span={24}>
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
        </Row>

        <Divider orientation="left">Площади</Divider>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="area_sp"
              label="Площадь по СП"
              tooltip="Площадь по строительным правилам"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                suffix="м²"
                precision={2}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="area_client"
              label="Площадь от Заказчика"
              tooltip="Площадь, указанная заказчиком"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                suffix="м²"
                precision={2}
                min={0}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Ссылки и документы</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="upload_folder"
              label="Папка для загрузки КП"
              tooltip="Ссылка на папку для загрузки коммерческого предложения"
            >
              <Input placeholder="https://drive.google.com/..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="bsm_link"
              label="Ссылка на БСМ"
              tooltip="Ссылка на базу строительных материалов"
            >
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tz_clarification_link"
              label="Ссылка на уточнение по ТЗ"
              tooltip="Ссылка на документ с уточнениями технического задания"
            >
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="qa_form_link"
              label="Ссылка на форму вопрос-ответ"
              tooltip="Ссылка на форму для вопросов и ответов"
            >
              <Input placeholder="https://..." />
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
            Создать тендер
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateTenderModal;