import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Space,
  Typography,
  message,
  Divider,
  Row,
  Col,
  Alert
} from 'antd';
import { 
  TruckOutlined, 
  DollarOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import type { WorkMaterialLink } from '../../lib/supabase/api/work-material-links';
import type { BOQItemWithLibrary } from '../../lib/supabase/types';

const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

interface MaterialLinkModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  workItem: BOQItemWithLibrary | null;
  materialItem: BOQItemWithLibrary | null;
  positionId: string;
  existingLink?: WorkMaterialLink | null;
}

type DeliveryPriceType = 'included' | 'not_included' | 'amount';

interface FormValues {
  material_quantity_per_work: number;
  usage_coefficient: number;
  delivery_price_type: DeliveryPriceType;
  delivery_amount?: number;
  notes?: string;
}

const MaterialLinkModal: React.FC<MaterialLinkModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  workItem,
  materialItem,
  positionId,
  existingLink
}) => {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryPriceType>('included');

  const isEditing = !!existingLink;

  useEffect(() => {
    if (visible) {
      if (existingLink) {
        // Редактирование существующей связи
        form.setFieldsValue({
          material_quantity_per_work: existingLink.material_quantity_per_work || 1.0,
          usage_coefficient: existingLink.usage_coefficient || 1.0,
          delivery_price_type: existingLink.delivery_price_type || 'included',
          delivery_amount: existingLink.delivery_amount || 0,
          notes: existingLink.notes || ''
        });
        setDeliveryType(existingLink.delivery_price_type || 'included');
      } else {
        // Новая связь - используем значения из материала как значения по умолчанию
        const defaultDeliveryType = materialItem?.delivery_price_type || 'included';
        const defaultDeliveryAmount = materialItem?.delivery_amount || 0;
        
        form.resetFields();
        form.setFieldsValue({
          material_quantity_per_work: 1.0,
          usage_coefficient: 1.0,
          delivery_price_type: defaultDeliveryType,
          delivery_amount: defaultDeliveryAmount
        });
        setDeliveryType(defaultDeliveryType as DeliveryPriceType);
      }
    }
  }, [visible, existingLink, materialItem, form]);

  const handleDeliveryTypeChange = (value: DeliveryPriceType) => {
    console.log('🚀 Delivery type changed:', value);
    setDeliveryType(value);
    
    // Если выбран не "Сумма", обнуляем поле суммы
    if (value !== 'amount') {
      form.setFieldValue('delivery_amount', 0);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    console.log('🚀 Submitting material link form:', values);
    
    if (!workItem || !materialItem) {
      message.error('Не выбрана работа или материал');
      return;
    }

    setLoading(true);

    try {
      const linkData: WorkMaterialLink = {
        client_position_id: positionId,
        work_boq_item_id: workItem.id,
        material_boq_item_id: materialItem.id,
        material_quantity_per_work: values.material_quantity_per_work,
        usage_coefficient: values.usage_coefficient,
        delivery_price_type: values.delivery_price_type,
        delivery_amount: values.delivery_price_type === 'amount' ? values.delivery_amount : 0,
        notes: values.notes
      };

      let result;
      if (isEditing && existingLink?.id) {
        // Обновляем существующую связь
        result = await workMaterialLinksApi.updateLink(existingLink.id, linkData);
        if (!result.error) {
          message.success('Связь материала с работой обновлена');
        }
      } else {
        // Создаем новую связь
        result = await workMaterialLinksApi.createLink(linkData);
        if (!result.error) {
          message.success('Материал успешно связан с работой');
        }
      }

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('✅ Material link saved successfully');
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('❌ Error saving material link:', error);
      message.error(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    if (!materialItem || !workItem) return 0;
    
    const quantity = form.getFieldValue('material_quantity_per_work') || 1;
    const coefficient = form.getFieldValue('usage_coefficient') || 1;
    const workQuantity = workItem.quantity || 0;
    const materialRate = materialItem.unit_rate || 0;
    
    const baseCost = workQuantity * quantity * coefficient * materialRate;
    
    if (deliveryType === 'amount') {
      const deliveryAmount = form.getFieldValue('delivery_amount') || 0;
      return baseCost + deliveryAmount;
    }
    
    return baseCost;
  };

  return (
    <Modal
      title={
        <Space>
          <TruckOutlined />
          {isEditing ? 'Редактировать связь материала' : 'Связать материал с работой'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={null}
      destroyOnClose
    >
      {workItem && materialItem && (
        <>
          <Alert
            message="Информация о связываемых элементах"
            description={
              <div>
                <div><strong>Работа:</strong> {workItem.description}</div>
                <div><strong>Материал:</strong> {materialItem.description}</div>
                <div><strong>Количество работ:</strong> {workItem.quantity} {workItem.unit}</div>
                <div><strong>Цена материала:</strong> {materialItem.unit_rate} ₽/{materialItem.unit}</div>
              </div>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            className="mb-4"
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              material_quantity_per_work: 1.0,
              usage_coefficient: 1.0,
              delivery_price_type: 'included',
              delivery_amount: 0
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="material_quantity_per_work"
                  label="Количество материала на единицу работы"
                  rules={[
                    { required: true, message: 'Укажите количество' },
                    { type: 'number', min: 0.0001, message: 'Количество должно быть больше 0' }
                  ]}
                  tooltip="Сколько единиц материала требуется на одну единицу работы"
                >
                  <InputNumber
                    min={0.0001}
                    precision={4}
                    placeholder="1.0000"
                    style={{ width: '100%' }}
                    addonAfter={materialItem.unit}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="usage_coefficient"
                  label="Коэффициент использования"
                  rules={[
                    { required: true, message: 'Укажите коэффициент' },
                    { type: 'number', min: 0.0001, message: 'Коэффициент должен быть больше 0' }
                  ]}
                  tooltip="Коэффициент потерь/запаса материала (1.1 = +10% на потери)"
                >
                  <InputNumber
                    min={0.0001}
                    precision={4}
                    placeholder="1.0000"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">
              <Space>
                <TruckOutlined />
                Параметры доставки
              </Space>
            </Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="delivery_price_type"
                  label="Цена доставки"
                  rules={[{ required: true, message: 'Выберите тип цены доставки' }]}
                  tooltip="Как учитывается стоимость доставки материала"
                >
                  <Select
                    placeholder="Выберите тип"
                    onChange={handleDeliveryTypeChange}
                  >
                    <Option value="included">
                      <Space>
                        <DollarOutlined />
                        В цене (включена в стоимость)
                      </Space>
                    </Option>
                    <Option value="not_included">
                      <Space>
                        <TruckOutlined />
                        Не в цене (оплачивается отдельно)
                      </Space>
                    </Option>
                    <Option value="amount">
                      <Space>
                        <DollarOutlined />
                        Сумма (указать конкретную сумму)
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                {deliveryType === 'amount' && (
                  <Form.Item
                    name="delivery_amount"
                    label="Сумма доставки"
                    rules={[
                      { required: true, message: 'Укажите сумму доставки' },
                      { type: 'number', min: 0, message: 'Сумма не может быть отрицательной' }
                    ]}
                    tooltip="Фиксированная сумма доставки для всего объема материала"
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      style={{ width: '100%' }}
                      addonAfter="₽"
                    />
                  </Form.Item>
                )}
              </Col>
            </Row>

            <Form.Item
              name="notes"
              label="Примечания"
            >
              <TextArea
                rows={3}
                placeholder="Дополнительная информация о связи материала с работой"
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Divider />

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <Row>
                <Col span={12}>
                  <Text strong>Общее количество материала:</Text>
                </Col>
                <Col span={12} className="text-right">
                  <Text>
                    {((workItem.quantity || 0) * (form.getFieldValue('material_quantity_per_work') || 1) * (form.getFieldValue('usage_coefficient') || 1)).toFixed(4)} {materialItem.unit}
                  </Text>
                </Col>
              </Row>
              <Row className="mt-2">
                <Col span={12}>
                  <Text strong>Общая стоимость:</Text>
                </Col>
                <Col span={12} className="text-right">
                  <Text strong className="text-lg">
                    {calculateTotalCost().toFixed(2)} ₽
                  </Text>
                </Col>
              </Row>
              {deliveryType === 'amount' && (
                <Row className="mt-1">
                  <Col span={12}>
                    <Text type="secondary">(включая доставку)</Text>
                  </Col>
                </Row>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={onCancel}>
                Отмена
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
              >
                {isEditing ? 'Сохранить изменения' : 'Связать материал'}
              </Button>
            </div>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default MaterialLinkModal;