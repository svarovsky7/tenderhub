import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
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
import { DecimalInput } from '../common';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import type { WorkMaterialLink } from '../../lib/supabase/api/work-material-links';
import { boqItemsApi } from '../../lib/supabase/api/boq/items';
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
      // Сначала обновляем параметры доставки в самом материале
      const materialUpdateResult = await boqItemsApi.update(materialItem.id, {
        delivery_price_type: values.delivery_price_type,
        delivery_amount: values.delivery_price_type === 'amount' ? values.delivery_amount : 0
      });

      if (materialUpdateResult.error) {
        throw new Error(`Ошибка обновления материала: ${materialUpdateResult.error}`);
      }

      // Затем создаем или обновляем связь
      const linkData: WorkMaterialLink = {
        client_position_id: positionId,
        work_boq_item_id: workItem.id,
        material_boq_item_id: materialItem.id,
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
    
    // Используем коэффициенты из самого материала
    const consumptionCoeff = materialItem.consumption_coefficient || 1;
    const conversionCoeff = materialItem.conversion_coefficient || 1;
    const workQuantity = workItem.quantity || 0;
    const materialRate = materialItem.unit_rate || 0;
    
    const baseCost = workQuantity * consumptionCoeff * conversionCoeff * materialRate;
    
    if (deliveryType === 'amount') {
      const deliveryAmount = form.getFieldValue('delivery_amount') || 0;
      // Доставка добавляется к цене единицы материала
      const totalWithDelivery = workQuantity * consumptionCoeff * conversionCoeff * (materialRate + deliveryAmount);
      return totalWithDelivery;
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
                <div><strong>Коэффициент расхода:</strong> {materialItem.consumption_coefficient || 1}</div>
                <div><strong>Коэффициент перевода:</strong> {materialItem.conversion_coefficient || 1}</div>
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
              delivery_price_type: 'included',
              delivery_amount: 0
            }}
          >
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
                    <DecimalInput
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
                    {((workItem.quantity || 0) * (materialItem.consumption_coefficient || 1) * (materialItem.conversion_coefficient || 1)).toFixed(4)} {materialItem.unit}
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