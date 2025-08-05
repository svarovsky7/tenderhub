import React, { useState, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  message,
  Steps,
  Card,
  Row,
  Col,
  Alert
} from 'antd';
import {
  FolderAddOutlined,
  CheckOutlined,
  SettingOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { clientPositionsApi } from '../../lib/supabase/api';
import type { ClientPositionInsert, ClientPositionStatus } from '../../lib/supabase/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface AddPositionModalProps {
  visible: boolean;
  tenderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PositionFormData {
  title: string;
  description?: string;
  category?: string;
  status: ClientPositionStatus;
  priority?: number;
}

const defaultCategories = [
  'Строительные работы',
  'Отделочные работы',
  'Инженерные системы',
  'Электромонтажные работы',
  'Сантехнические работы',
  'Материалы',
  'Оборудование',
  'Транспортные работы',
  'Демонтажные работы',
  'Благоустройство'
];

const priorityOptions = [
  { value: 1, label: 'Высокий', color: 'red' },
  { value: 2, label: 'Средний', color: 'orange' },
  { value: 3, label: 'Низкий', color: 'green' }
];

const AddPositionModal: React.FC<AddPositionModalProps> = ({
  visible,
  tenderId,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm<PositionFormData>();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      setCurrentStep(0);
      // Set default values
      form.setFieldsValue({
        status: 'active',
        priority: 2
      });
    }
  }, [visible, form]);

  const handleSubmit = useCallback(async (values: PositionFormData) => {
    setLoading(true);

    try {
      const positionData: ClientPositionInsert = {
        tender_id: tenderId,
        title: values.title,
        description: values.description,
        category: values.category,
        status: values.status,
        priority: values.priority
      };

      const result = await clientPositionsApi.create(positionData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      message.success('Позиция заказчика создана успешно');
      onSuccess();
    } catch (error) {
      message.error('Ошибка создания позиции');
      console.error('Create position error:', error);
    } finally {
      setLoading(false);
    }
  }, [tenderId, onSuccess]);

  const handleNext = useCallback(async () => {
    try {
      if (currentStep === 0) {
        // Validate basic info
        await form.validateFields(['title']);
        setCurrentStep(1);
      } else if (currentStep === 1) {
        // Submit form
        const values = await form.validateFields();
        await handleSubmit(values);
      }
    } catch {
      // Validation errors are handled by form
    }
  }, [currentStep, form, handleSubmit]);

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const steps = [
    {
      title: 'Основная информация',
      icon: <FileTextOutlined />,
      description: 'Название и описание позиции'
    },
    {
      title: 'Настройки',
      icon: <SettingOutlined />,
      description: 'Категория и приоритет'
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Title level={4} className="mb-4">
                <FolderAddOutlined className="mr-2" />
                Создание новой позиции заказчика
              </Title>
              <Paragraph type="secondary">
                Позиции заказчика используются для группировки материалов и работ 
                по разделам проекта. Это помогает структурировать ведомость объемов работ.
              </Paragraph>
            </div>

            <Form.Item
              name="title"
              label="Название позиции"
              rules={[
                { required: true, message: 'Введите название позиции' },
                { min: 3, message: 'Название должно содержать минимум 3 символа' },
                { max: 200, message: 'Название не должно превышать 200 символов' }
              ]}
            >
              <Input
                placeholder="Например: Кладочные работы, Электромонтажные работы"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Описание (опционально)"
              extra="Подробное описание работ, включаемых в данную позицию"
            >
              <TextArea
                rows={4}
                placeholder="Подробное описание позиции заказчика..."
                showCount
                maxLength={1000}
              />
            </Form.Item>

            <Alert
              message="Совет"
              description="Используйте понятные названия позиций, которые соответствуют разделам проектной документации"
              type="info"
              showIcon
              className="bg-blue-50"
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Title level={4} className="mb-4">
                <SettingOutlined className="mr-2" />
                Настройки позиции
              </Title>
              <Paragraph type="secondary">
                Настройте категорию, статус и приоритет для лучшей организации работы.
              </Paragraph>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="Категория"
                  extra="Помогает группировать похожие позиции"
                >
                  <Select
                    placeholder="Выберите или введите категорию"
                    showSearch
                    allowClear
                    optionFilterProp="children"
                  >
                    {defaultCategories.map(category => (
                      <Option key={category} value={category}>
                        {category}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Статус"
                  rules={[{ required: true, message: 'Выберите статус' }]}
                >
                  <Select placeholder="Выберите статус">
                    <Option value="active">Активна</Option>
                    <Option value="inactive">Неактивна</Option>
                    <Option value="completed">Завершена</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="priority"
              label="Приоритет"
              extra="Влияет на порядок отображения в списке"
            >
              <Select placeholder="Выберите приоритет">
                {priorityOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Space>
                      <div 
                        className={`w-3 h-3 rounded-full bg-${option.color}-500`}
                      />
                      {option.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Summary Card */}
            <Card className="bg-gray-50" size="small">
              <Title level={5} className="mb-3">Предварительный просмотр</Title>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const title = getFieldValue('title') || 'Новая позиция';
                  const description = getFieldValue('description');
                  const category = getFieldValue('category');
                  const status = getFieldValue('status');
                  const priority = getFieldValue('priority');

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Title level={5} className="mb-0">{title}</Title>
                        <div className="flex gap-2">
                          {status && (
                            <span className={`
                              px-2 py-1 rounded text-xs font-medium
                              ${status === 'active' ? 'bg-green-100 text-green-700' : ''}
                              ${status === 'inactive' ? 'bg-gray-100 text-gray-700' : ''}
                              ${status === 'completed' ? 'bg-blue-100 text-blue-700' : ''}
                            `}>
                              {status === 'active' ? 'Активна' : status === 'inactive' ? 'Неактивна' : 'Завершена'}
                            </span>
                          )}
                          {priority && (
                            <span className={`
                              px-2 py-1 rounded text-xs font-medium
                              ${priority === 1 ? 'bg-red-100 text-red-700' : ''}
                              ${priority === 2 ? 'bg-orange-100 text-orange-700' : ''}
                              ${priority === 3 ? 'bg-green-100 text-green-700' : ''}
                            `}>
                              {priorityOptions.find(p => p.value === priority)?.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {description && (
                        <Text type="secondary" className="text-sm">
                          {description}
                        </Text>
                      )}
                      {category && (
                        <Text type="secondary" className="text-xs">
                          Категория: {category}
                        </Text>
                      )}
                    </div>
                  );
                }}
              </Form.Item>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FolderAddOutlined />
          Новая позиция заказчика
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        {/* Steps */}
        <div className="mb-6">
          <Steps current={currentStep} size="small">
            {steps.map((step, index) => (
              <Steps.Step
                key={index}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </Steps>
        </div>

        <Divider className="my-6" />

        {/* Step Content */}
        {renderStepContent()}

        <Divider className="my-6" />

        {/* Navigation */}
        <div className="flex justify-between">
          <div>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                Назад
              </Button>
            )}
          </div>

          <Space>
            <Button onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="primary"
              onClick={handleNext}
              loading={loading}
              icon={currentStep === steps.length - 1 ? <CheckOutlined /> : undefined}
            >
              {currentStep === steps.length - 1 ? 'Создать позицию' : 'Далее'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default AddPositionModal;