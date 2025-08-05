import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Space, 
  message,
  Popconfirm,
  Select,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';
import { boqApi, materialsApi, worksApi } from '../lib/supabase/api';
import type { BOQItem, Material, Work } from '../lib/supabase/types';
// Removed auth imports - no authentication needed

const { Title, Text } = Typography;
const { Option } = Select;

interface ExtendedBOQItem extends BOQItem {
  library_item_name?: string;
  library_item_unit?: string;
  library_item_price?: number;
}

const TenderBoq: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const [boqItems, setBoqItems] = useState<ExtendedBOQItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedBOQItem | null>(null);
  const [form] = Form.useForm();
  // No authentication needed
  // All features available without authentication
  const canEdit = true;

  // Загрузка данных
  useEffect(() => {
    if (tenderId) {
      loadBoqItems();
      loadLibraries();
    }
  }, [tenderId]);

  const loadBoqItems = async () => {
    if (!tenderId) return;
    setLoading(true);
    try {
      const { data, error } = await boqApi.getByTenderId(tenderId);
      if (error) throw error;
      setBoqItems(data || []);
    } catch (error) {
      message.error('Ошибка загрузки ВОР');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadLibraries = async () => {
    try {
      const [materialsResult, worksResult] = await Promise.all([
        materialsApi.getAll(),
        worksApi.getAll()
      ]);
      
      if (materialsResult.error) throw materialsResult.error;
      if (worksResult.error) throw worksResult.error;
      
      setMaterials(materialsResult.data || []);
      setWorks(worksResult.data || []);
    } catch (error) {
      message.error('Ошибка загрузки справочников');
      console.error(error);
    }
  };

  // Добавление/редактирование строки ВОР
  const handleSubmit = async (values: any) => {
    if (!tenderId) return;

    try {
      // Находим выбранный элемент из библиотеки
      let libraryItem = null;
      if (values.item_type === 'material' && values.library_material_id) {
        libraryItem = materials.find(m => m.id === values.library_material_id);
      } else if (values.item_type === 'work' && values.library_work_id) {
        libraryItem = works.find(w => w.id === values.library_work_id);
      }

      const itemData = {
        tender_id: tenderId,
        item_number: values.item_number,
        item_type: values.item_type,
        description: values.description,
        unit: libraryItem?.unit || values.unit,
        quantity: values.quantity,
        unit_rate: libraryItem ? 
          (values.item_type === 'material' ? libraryItem.base_price : (libraryItem as Work).base_rate) : 
          values.unit_rate,
        library_material_id: values.item_type === 'material' ? values.library_material_id : null,
        library_work_id: values.item_type === 'work' ? values.library_work_id : null,
        category: values.category,
        created_by: 'system' // No user authentication
      };

      if (editingItem) {
        const { error } = await boqApi.update(editingItem.id, itemData);
        if (error) throw error;
        message.success('Строка ВОР обновлена');
      } else {
        const { error } = await boqApi.create(itemData);
        if (error) throw error;
        message.success('Строка ВОР добавлена');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingItem(null);
      loadBoqItems();
    } catch (error) {
      message.error('Ошибка сохранения строки ВОР');
      console.error(error);
    }
  };

  // Удаление строки ВОР
  const handleDelete = async (id: string) => {
    try {
      const { error } = await boqApi.delete(id);
      if (error) throw error;
      message.success('Строка ВОР удалена');
      loadBoqItems();
    } catch (error) {
      message.error('Ошибка удаления строки ВОР');
      console.error(error);
    }
  };

  // Открытие модального окна для редактирования
  const handleEdit = (item: ExtendedBOQItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      library_material_id: item.library_material_id,
      library_work_id: item.library_work_id
    });
    setModalVisible(true);
  };

  // Обработка выбора из библиотеки
  const handleLibraryItemSelect = (itemType: 'material' | 'work', itemId: string) => {
    let selectedItem = null;
    if (itemType === 'material') {
      selectedItem = materials.find(m => m.id === itemId);
      form.setFieldsValue({
        unit: selectedItem?.unit,
        unit_rate: selectedItem?.base_price,
        library_work_id: null
      });
    } else if (itemType === 'work') {
      selectedItem = works.find(w => w.id === itemId);
      form.setFieldsValue({
        unit: selectedItem?.unit,
        unit_rate: (selectedItem as Work)?.base_rate,
        library_material_id: null
      });
    }
  };

  // Колонки таблицы
  const columns: ColumnsType<ExtendedBOQItem> = [
    {
      title: '№',
      dataIndex: 'item_number',
      key: 'item_number',
      width: 80,
      sorter: (a, b) => a.item_number.localeCompare(b.item_number),
    },
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'material' ? 'blue' : 'green'}>
          {type === 'material' ? 'Материал' : 'Работа'}
        </Tag>
      ),
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (quantity) => quantity?.toFixed(2),
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      render: (rate) => `${rate?.toFixed(2)} ₽`,
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (_, record) => {
        const total = (record.quantity || 0) * (record.unit_rate || 0);
        return `${total.toFixed(2)} ₽`;
      },
    },
    {
      title: 'Источник',
      key: 'source',
      width: 100,
      render: (_, record) => {
        if (record.library_material_id || record.library_work_id) {
          return <Tag color="gold">Справочник</Tag>;
        }
        return <Tag>Вручную</Tag>;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
            disabled={!canEdit}
          />
          <Popconfirm
            title="Удалить строку ВОР?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
            disabled={!canEdit}
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              disabled={!canEdit}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Расчет общей суммы
  const totalAmount = boqItems.reduce((sum, item) => {
    return sum + ((item.quantity || 0) * (item.unit_rate || 0));
  }, 0);

  return (
    <div className="tender-boq-page">
      <Card className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <Title level={3} className="mb-2">
              <FileTextOutlined className="mr-2" />
              Ведомость объемов работ
            </Title>
            <Text type="secondary">Тендер ID: {tenderId}</Text>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <Text strong>Всего позиций: {boqItems.length}</Text>
            </div>
            <div>
              <Text strong className="text-lg">
                <CalculatorOutlined className="mr-1" />
                Общая сумма: {totalAmount.toFixed(2)} ₽
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <Space>
            <Button 
              icon={<SaveOutlined />} 
              onClick={loadBoqItems}
              loading={loading}
            >
              Обновить
            </Button>
          </Space>
          {canEdit && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingItem(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Добавить строку ВОР
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={boqItems}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingItem ? 'Редактировать строку ВОР' : 'Добавить строку ВОР'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingItem(null);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="item_number"
                label="Номер позиции"
                rules={[{ required: true, message: 'Введите номер позиции' }]}
              >
                <Input placeholder="1.1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="item_type"
                label="Тип"
                rules={[{ required: true, message: 'Выберите тип' }]}
              >
                <Select 
                  placeholder="Выберите тип"
                  onChange={() => {
                    form.setFieldsValue({
                      library_material_id: null,
                      library_work_id: null,
                      unit: '',
                      unit_rate: null
                    });
                  }}
                >
                  <Option value="material">Материал</Option>
                  <Option value="work">Работа</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="category"
                label="Категория"
              >
                <Input placeholder="Опционально" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
            prevValues.item_type !== currentValues.item_type
          }>
            {({ getFieldValue }) => {
              const itemType = getFieldValue('item_type');
              if (itemType === 'material') {
                return (
                  <Form.Item
                    name="library_material_id"
                    label="Материал из справочника"
                  >
                    <Select
                      placeholder="Выберите материал или оставьте пустым для ручного ввода"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      onChange={(value) => value && handleLibraryItemSelect('material', value)}
                    >
                      {materials.map(material => (
                        <Option key={material.id} value={material.id}>
                          {material.name} ({material.unit}) - {material.base_price.toFixed(2)} ₽
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              } else if (itemType === 'work') {
                return (
                  <Form.Item
                    name="library_work_id"
                    label="Работа из справочника"
                  >
                    <Select
                      placeholder="Выберите работу или оставьте пустым для ручного ввода"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      onChange={(value) => value && handleLibraryItemSelect('work', value)}
                    >
                      {works.map(work => (
                        <Option key={work.id} value={work.id}>
                          {work.name} ({work.unit}) - {work.base_rate.toFixed(2)} ₽
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="description"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="unit"
                label="Ед. изм."
                rules={[{ required: true, message: 'Введите единицу' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[{ required: true, message: 'Введите количество' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="unit_rate"
                label="Цена за ед. (₽)"
                rules={[{ required: true, message: 'Введите цену' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                prevValues.quantity !== currentValues.quantity || 
                prevValues.unit_rate !== currentValues.unit_rate
              }>
                {({ getFieldValue }) => {
                  const quantity = getFieldValue('quantity') || 0;
                  const unitRate = getFieldValue('unit_rate') || 0;
                  const total = quantity * unitRate;
                  return (
                    <Form.Item label="Сумма">
                      <Input 
                        value={`${total.toFixed(2)} ₽`} 
                        disabled 
                        style={{ fontWeight: 'bold' }}
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingItem(null);
              }}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingItem ? 'Сохранить' : 'Добавить'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenderBoq;