import React, { useState, useEffect, ReactNode } from 'react';
import {
  Table,
  Button,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  Select,
  Card,
  Row,
  Col,
  Statistic,
  Radio,
  Divider,
  Tag
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  BgColorsOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { materialsApi } from '../lib/supabase/api';
import type { Material } from '../lib/supabase/types';
import { DecimalInput } from '../components/common';
import { CURRENCY_OPTIONS } from '../utils/currencyConverter';

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [currentItemType, setCurrentItemType] = useState<string>('material');
  // No authentication needed
  // All features available without authentication
  const canEdit = true;

  const deliveryType = Form.useWatch('delivery_price_type', form);

  // Загрузка материалов
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await materialsApi.getAll();
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      message.error('Ошибка загрузки материалов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  // Inline редактирование материала
  const handleSaveInlineEdit = async (values: any) => {
    try {
      // Ensure consumption coefficient is at least 1
      if (values.consumption_coefficient && values.consumption_coefficient < 1) {
        values.consumption_coefficient = 1;
      }

      // Clear delivery amount if not "amount" type
      if (values.delivery_price_type !== 'amount') {
        values.delivery_amount = null;
      }

      if (editingMaterialId && editingMaterialId !== 'new') {
        const { error } = await materialsApi.update(editingMaterialId, values);
        if (error) throw error;
        message.success('Материал обновлен');
      } else {
        const { error } = await materialsApi.create(values);
        if (error) throw error;
        message.success('Материал добавлен');
      }
      setEditingMaterialId(null);
      setIsAdding(false);
      form.resetFields();
      loadMaterials();
    } catch (error) {
      message.error('Ошибка сохранения материала');
      console.error(error);
    }
  };

  // Удаление материала
  const handleDelete = async (id: string) => {
    try {
      const { error } = await materialsApi.delete(id);
      if (error) throw error;
      message.success('Материал удален');
      loadMaterials();
    } catch (error) {
      message.error('Ошибка удаления материала');
      console.error(error);
    }
  };

  // Начать inline редактирование
  const handleEdit = (material: Material) => {
    setEditingMaterialId(material.id);
    const itemType = material.item_type || 'material';
    form.setFieldsValue({
      ...material,
      item_type: itemType,
      material_type: material.material_type || 'main',
      consumption_coefficient: material.consumption_coefficient || 1,
      currency_type: material.currency_type || 'RUB',
      delivery_price_type: material.delivery_price_type || 'included',
      quote_link: material.quote_link || ''
    });
    setSelectedCurrency(material.currency_type || 'RUB');
    setCurrentItemType(itemType);
  };

  // Начать добавление нового материала
  const handleAdd = () => {
    setIsAdding(true);
    setEditingMaterialId('new');
    form.setFieldsValue({
      item_type: 'material',
      material_type: 'main',
      consumption_coefficient: 1,
      currency_type: 'RUB',
      delivery_price_type: 'included'
    });
    setSelectedCurrency('RUB');
    setCurrentItemType('material');
  };

  // Отмена inline редактирования
  const handleCancelInlineEdit = () => {
    setEditingMaterialId(null);
    setIsAdding(false);
    form.resetFields();
    setCurrentItemType('material');
  };

  // Фильтрация по поиску
  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Колонки таблицы
  const columns: ColumnsType<Material> = [
    {
      title: 'Тип',
      key: 'type_combined',
      width: 85,
      align: 'center',
      render: (_, record) => {
        const isMaterial = record.item_type === 'material';
        const isMain = record.material_type === 'main';

        // Иконка и цвет для типа элемента
        const itemIcon = isMaterial ?
          <BgColorsOutlined style={{ color: '#2196f3', fontSize: '12px' }} /> :
          <BgColorsOutlined style={{ color: '#8bc34a', fontSize: '12px' }} />;
        const itemColor = isMaterial ? 'blue' : 'green';
        const itemLabel = isMaterial ? 'Материал' : 'Суб-мат';

        // Цвет для типа материала
        const typeColor = isMain ? 'default' : 'warning';
        const typeLabel = isMain ? 'Основной' : 'Вспомог.';

        const tagStyle = {
          padding: '0 4px',
          fontSize: '11px',
          lineHeight: '18px',
          height: '18px',
          display: 'inline-flex',
          alignItems: 'center'
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
            <Tag color={itemColor} icon={itemIcon} style={tagStyle}>
              {itemLabel}
            </Tag>
            <Tag color={typeColor} style={tagStyle}>
              {typeLabel}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      align: 'center',
      render: (category) => category || '-',
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 345,
      align: 'left',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      align: 'center',
    },
    {
      title: 'Коэфф. расхода',
      dataIndex: 'consumption_coefficient',
      key: 'consumption_coefficient',
      width: 120,
      align: 'center',
      render: (value) => value ? value.toFixed(2) : '1.00',
    },
    {
      title: 'Цена',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      align: 'center',
      render: (rate, record) => {
        if (!rate) return '-';
        const symbol = CURRENCY_OPTIONS.find(c => c.value === (record.currency_type || 'RUB'))?.symbol;
        return `${rate.toFixed(2)} ${symbol}`;
      },
    },
    {
      title: 'Валюта',
      dataIndex: 'currency_type',
      key: 'currency_type',
      width: 80,
      align: 'center',
      render: (type) => type || 'RUB',
    },
    {
      title: 'Доставка',
      dataIndex: 'delivery_price_type',
      key: 'delivery_price_type',
      width: 140,
      align: 'center',
      render: (type, record) => {
        if (!type) return 'Включена';
        switch (type) {
          case 'included':
            return 'Включена';
          case 'not_included':
            return 'Не включена';
          case 'amount':
            return `Сумма: ${record.delivery_amount || 0} ₽`;
          default:
            return type;
        }
      },
    },
    {
      title: 'Ссылка на КП',
      dataIndex: 'quote_link',
      key: 'quote_link',
      width: 150,
      align: 'center',
      render: (link) => link ? (
        <a href={link} target="_blank" rel="noopener noreferrer">
          Ссылка
        </a>
      ) : '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
            disabled={!canEdit}
          />
          <Popconfirm
            title="Удалить материал?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Статистика
  const stats = {
    total: materials.length
  };

  return (
    <div className="materials-page">
      <style>
        {`
          .row-type-material {
            background-color: rgba(33, 150, 243, 0.1) !important;
          }
          .row-type-material:hover td {
            background-color: rgba(33, 150, 243, 0.15) !important;
          }
          .row-type-submaterial {
            background-color: rgba(139, 195, 74, 0.25) !important;
          }
          .row-type-submaterial:hover td {
            background-color: rgba(139, 195, 74, 0.35) !important;
          }
        `}
      </style>
      <Card className="mb-4">
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Всего материалов"
              value={stats.total}
              prefix={<FileExcelOutlined />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Активных материалов"
              value={stats.total}
              prefix={<FileExcelOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <Space>
            <Input
              placeholder="Поиск материалов..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadMaterials}
              loading={loading}
            >
              Обновить
            </Button>
          </Space>
          {canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Добавить материал
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={[
            ...(isAdding ? [{
              id: 'new',
              name: '',
              item_type: 'material',
              material_type: 'main',
              unit: '',
              consumption_coefficient: 1,
              unit_rate: 0,
              currency_type: 'RUB',
              delivery_price_type: 'included',
              delivery_amount: 0,
              base_price: 0,
              conversion_coefficient: null,
              description: null,
              category: null,
              quote_link: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as Material] : []),
            ...filteredMaterials
          ]}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => {
            if (record.id === 'new') return '';
            switch (record.item_type) {
              case 'material':
                return 'row-type-material';
              case 'sub_material':
                return 'row-type-submaterial';
              default:
                return '';
            }
          }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          expandable={{
            expandedRowKeys: editingMaterialId ? [editingMaterialId] : [],
            expandedRowRender: (record) => {
              if (editingMaterialId === record.id) {
                const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol || '₽';
                const isNewRecord = record.id === 'new';
                const itemType = currentItemType || form.getFieldValue('item_type') || record.item_type || 'material';

                // Цвета для разных типов элементов
                const colorScheme = {
                  'material': { bg: 'rgba(33, 150, 243, 0.05)', border: '#2196f3' }, // голубой
                  'sub_material': { bg: 'rgba(139, 195, 74, 0.15)', border: '#8bc34a' }, // салатовый
                  'work': { bg: 'rgba(255, 152, 0, 0.05)', border: '#ff9800' }, // оранжевый
                  'sub_work': { bg: 'rgba(156, 39, 176, 0.05)', border: '#9c27b0' } // фиолетовый
                };

                const colors = colorScheme[itemType] || colorScheme['material'];

                return (
                  <div style={{
                    padding: '16px',
                    backgroundColor: colors.bg,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '8px',
                    margin: '8px 0'
                  }}>
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleSaveInlineEdit}
                      size="small"
                    >
                      <Row gutter={4}>
                        <Col>
                          <Form.Item
                            name="item_type"
                            label="Тип элемента"
                            rules={[{ required: true, message: 'Выберите тип элемента' }]}
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Radio.Group onChange={(e) => {
                              // Обновляем форму и состояние для перерисовки с новым цветом
                              form.setFieldValue('item_type', e.target.value);
                              setCurrentItemType(e.target.value);
                            }}>
                              <Radio.Button value="material">Материал</Radio.Button>
                              <Radio.Button value="sub_material">Суб-материал</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                        <Col>
                          <Form.Item
                            name="material_type"
                            label="Тип материала"
                            rules={[{ required: true, message: 'Выберите тип материала' }]}
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Radio.Group>
                              <Radio.Button value="main">Основной</Radio.Button>
                              <Radio.Button value="auxiliary">Вспомогательный</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            name="category"
                            label="Категория"
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Select placeholder="Выберите категорию">
                              <Select.Option value="Металлопрокат">Металлопрокат</Select.Option>
                              <Select.Option value="Кабельная продукция">Кабельная продукция</Select.Option>
                              <Select.Option value="Электротехника">Электротехника</Select.Option>
                              <Select.Option value="Крепеж">Крепеж</Select.Option>
                              <Select.Option value="Инструмент">Инструмент</Select.Option>
                              <Select.Option value="Расходные материалы">Расходные материалы</Select.Option>
                              <Select.Option value="Бетон и растворы">Бетон и растворы</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            name="name"
                            label="Наименование материала"
                            rules={[{ required: true, message: 'Введите наименование материала' }]}
                            style={{ marginBottom: 16 }}
                          >
                            <Input placeholder="Например: Кабель ВВГнг-LS 3х2.5" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={4}>
                        <Col span={3}>
                          <Form.Item
                            name="unit"
                            label="Ед. изм."
                            rules={[{ required: true, message: 'Введите единицу измерения' }]}
                            style={{ marginRight: 12 }}
                          >
                            <Select>
                              <Select.Option value="шт">шт</Select.Option>
                              <Select.Option value="кг">кг</Select.Option>
                              <Select.Option value="м">м</Select.Option>
                              <Select.Option value="м2">м²</Select.Option>
                              <Select.Option value="м3">м³</Select.Option>
                              <Select.Option value="л">л</Select.Option>
                              <Select.Option value="т">т</Select.Option>
                              <Select.Option value="компл">компл</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            name="consumption_coefficient"
                            label="Коэфф. расхода"
                            rules={[
                              { type: 'number', min: 1, message: 'Значение не может быть менее 1,00' }
                            ]}
                            style={{ marginRight: 12 }}
                          >
                            <DecimalInput
                              min={1}
                              precision={4}
                              placeholder="1.0000"
                              onChange={(value) => {
                                if (value && value < 1) {
                                  message.warning('Значение коэффициента расхода не может быть менее 1');
                                  form.setFieldValue('consumption_coefficient', 1);
                                  return 1;
                                }
                                return value;
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            name="currency_type"
                            label="Валюта"
                            rules={[{ required: true, message: 'Выберите валюту' }]}
                            style={{ marginRight: 12 }}
                          >
                            <Select
                              value={selectedCurrency}
                              onChange={setSelectedCurrency}
                            >
                              {CURRENCY_OPTIONS.map(currency => (
                                <Select.Option key={currency.value} value={currency.value}>
                                  {currency.symbol}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            name="unit_rate"
                            label={`Цена за ед. (${currencySymbol})`}
                            style={{ marginRight: 12 }}
                          >
                            <DecimalInput
                              min={0}
                              precision={2}
                              placeholder="0.00"
                              addonAfter={currencySymbol}
                            />
                          </Form.Item>
                        </Col>
                        <Col>
                          <Form.Item
                            name="delivery_price_type"
                            label="Доставка"
                            rules={[{ required: true, message: 'Выберите тип доставки' }]}
                            style={{ marginRight: 4 }}
                          >
                            <Radio.Group>
                              <Radio.Button value="included">Вкл.</Radio.Button>
                              <Radio.Button value="not_included">3%</Radio.Button>
                              <Radio.Button value="amount">Сумма</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                        {deliveryType === 'amount' && (
                          <Col>
                            <Form.Item
                              name="delivery_amount"
                              label="Сумма доставки"
                              rules={[
                                {
                                  validator: (_, value) => {
                                    if (deliveryType === 'amount' && (!value || value <= 0)) {
                                      return Promise.reject('Введите сумму доставки');
                                    }
                                    return Promise.resolve();
                                  }
                                }
                              ]}
                            >
                              <DecimalInput
                                min={0}
                                precision={2}
                                placeholder="0.00"
                                addonAfter="₽"
                                style={{ width: 120 }}
                              />
                            </Form.Item>
                          </Col>
                        )}
                      </Row>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="quote_link"
                            label="Ссылка на КП"
                            rules={[
                              { type: 'url', message: 'Введите корректную ссылку' }
                            ]}
                          >
                            <Input placeholder="https://example.com/quote.pdf" />
                          </Form.Item>
                        </Col>
                        <Col span={9}>
                          <Form.Item
                            name="description"
                            label="Описание"
                          >
                            <Input.TextArea
                              rows={2}
                              placeholder="Дополнительная информация о материале"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item label=" ">
                            <Space style={{ float: 'right' }}>
                              <Button onClick={handleCancelInlineEdit}>
                                Отмена
                              </Button>
                              <Button type="primary" htmlType="submit">
                                {isNewRecord ? 'Добавить' : 'Сохранить'}
                              </Button>
                            </Space>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </div>
                );
              }
              return null;
            },
            expandRowByClick: false,
            showExpandColumn: false,
            rowExpandable: (record) => editingMaterialId === record.id
          }}
        />
      </Card>
    </div>
  );
};

export default Materials;