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
  ToolOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { worksApi } from '../lib/supabase/api';
import type { Work } from '../lib/supabase/types';
import { DecimalInput } from '../components/common';
import { CURRENCY_OPTIONS } from '../utils/currencyConverter';

const Works: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [currentItemType, setCurrentItemType] = useState<string>('work');
  // No authentication needed
  // All features available without authentication
  const canEdit = true;

  // Загрузка работ
  const loadWorks = async () => {
    setLoading(true);
    try {
      const { data, error } = await worksApi.getAll();
      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      message.error('Ошибка загрузки работ');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorks();
  }, []);

  // Inline редактирование работы
  const handleSaveInlineEdit = async (values: any) => {
    try {
      if (editingWorkId && editingWorkId !== 'new') {
        const { error } = await worksApi.update(editingWorkId, values);
        if (error) throw error;
        message.success('Работа обновлена');
      } else {
        const { error } = await worksApi.create(values);
        if (error) throw error;
        message.success('Работа добавлена');
      }
      setEditingWorkId(null);
      setIsAdding(false);
      form.resetFields();
      loadWorks();
    } catch (error) {
      message.error('Ошибка сохранения работы');
      console.error(error);
    }
  };

  // Удаление работы
  const handleDelete = async (id: string) => {
    try {
      const { error } = await worksApi.delete(id);
      if (error) throw error;
      message.success('Работа удалена');
      loadWorks();
    } catch (error) {
      message.error('Ошибка удаления работы');
      console.error(error);
    }
  };

  // Начать inline редактирование
  const handleEdit = (work: Work) => {
    setEditingWorkId(work.id);
    const itemType = work.item_type || 'work';
    form.setFieldsValue({
      ...work,
      item_type: itemType,
      currency_type: work.currency_type || 'RUB',
      category: work.category || ''
    });
    setSelectedCurrency(work.currency_type || 'RUB');
    setCurrentItemType(itemType);
  };

  // Начать добавление новой работы
  const handleAdd = () => {
    setIsAdding(true);
    setEditingWorkId('new');
    form.setFieldsValue({
      item_type: 'work',
      currency_type: 'RUB',
      category: ''
    });
    setSelectedCurrency('RUB');
    setCurrentItemType('work');
  };

  // Отмена inline редактирования
  const handleCancelInlineEdit = () => {
    setEditingWorkId(null);
    setIsAdding(false);
    form.resetFields();
    setCurrentItemType('work');
  };

  // Фильтрация по поиску
  const filteredWorks = works.filter(work =>
    work.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Рендер inline формы редактирования
  const renderEditForm = (record?: Work) => {
    const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol || '₽';
    const isNewRecord = !record || record.id === 'new';

    return (
      <div style={{
        padding: '16px',
        backgroundColor: 'rgba(24, 144, 255, 0.05)',
        border: '2px solid #1890ff',
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
                rules={[{ required: true, message: 'Выберите тип работы' }]}
                style={{ marginBottom: 16, marginRight: 8 }}
              >
                <Radio.Group>
                  <Radio.Button value="work">Работа</Radio.Button>
                  <Radio.Button value="sub_work">Суб-работа</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item
                name="category"
                label="Категория"
                style={{ marginBottom: 16, marginRight: 8 }}
              >
                <Select placeholder="Выберите категорию">
                  <Select.Option value="Installation works">Installation works</Select.Option>
                  <Select.Option value="Electrical installation">Electrical installation</Select.Option>
                  <Select.Option value="Finishing works">Finishing works</Select.Option>
                  <Select.Option value="Plumbing works">Plumbing works</Select.Option>
                  <Select.Option value="General construction">General construction</Select.Option>
                  <Select.Option value="Commissioning works">Commissioning works</Select.Option>
                  <Select.Option value="Other works">Other works</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="name"
                label="Наименование работы"
                rules={[{ required: true, message: 'Введите наименование работы' }]}
                style={{ marginBottom: 16, marginRight: 8 }}
              >
                <Input placeholder="Например: Монтаж кабеля" />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item
                name="unit"
                label="Ед. изм."
                rules={[{ required: true, message: 'Введите единицу измерения' }]}
                style={{ marginBottom: 16, marginRight: 8 }}
              >
                <Select>
                  <Select.Option value="м2">м²</Select.Option>
                  <Select.Option value="м3">м³</Select.Option>
                  <Select.Option value="м">м</Select.Option>
                  <Select.Option value="шт">шт</Select.Option>
                  <Select.Option value="т">т</Select.Option>
                  <Select.Option value="компл">компл</Select.Option>
                  <Select.Option value="маш-час">маш-час</Select.Option>
                  <Select.Option value="чел-час">чел-час</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item
                name="currency_type"
                label="Валюта"
                rules={[{ required: true, message: 'Выберите валюту' }]}
                style={{ marginBottom: 16, marginRight: 8 }}
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
                style={{ marginBottom: 16 }}
              >
                <DecimalInput
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  addonAfter={currencySymbol}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={20}>
              <Form.Item
                name="description"
                label="Описание"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Дополнительная информация о работе"
                />
              </Form.Item>
            </Col>
            <Col span={4}>
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

  // Колонки таблицы
  const columns: ColumnsType<Work> = [
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 85,
      align: 'center',
      render: (type) => {
        const isWork = type === 'work';
        const typeIcon = isWork ?
          <ToolOutlined style={{ color: '#ff9800', fontSize: '12px' }} /> :
          <ToolOutlined style={{ color: '#9c27b0', fontSize: '12px' }} />;
        const typeColor = isWork ? 'orange' : 'purple';
        const typeLabel = isWork ? 'Работа' : 'Суб-раб';

        const tagStyle = {
          padding: '0 4px',
          fontSize: '11px',
          lineHeight: '18px',
          height: '18px',
          display: 'inline-flex',
          alignItems: 'center'
        };

        return (
          <Tag color={typeColor} icon={typeIcon} style={tagStyle}>
            {typeLabel}
          </Tag>
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
            title="Удалить работу?"
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
    total: works.length
  };

  return (
    <div className="works-page">
      <style>
        {`
          .row-type-work {
            background-color: rgba(255, 152, 0, 0.1) !important;
          }
          .row-type-work:hover td {
            background-color: rgba(255, 152, 0, 0.15) !important;
          }
          .row-type-subwork {
            background-color: rgba(156, 39, 176, 0.1) !important;
          }
          .row-type-subwork:hover td {
            background-color: rgba(156, 39, 176, 0.15) !important;
          }
        `}
      </style>
      <Card className="mb-4">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Всего работ"
              value={stats.total}
              prefix={<ToolOutlined />}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Активных работ"
              value={stats.total}
              prefix={<ToolOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <Space>
            <Input
              placeholder="Поиск работ..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadWorks}
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
              Добавить работу
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={[
            ...(isAdding ? [{ id: 'new', name: '', item_type: 'work', unit: '', unit_rate: 0, currency_type: 'RUB', category: null, description: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Work] : []),
            ...filteredWorks
          ]}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => {
            if (record.id === 'new') return '';
            switch (record.item_type) {
              case 'work':
                return 'row-type-work';
              case 'sub_work':
                return 'row-type-subwork';
              default:
                return '';
            }
          }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          expandable={{
            expandedRowKeys: editingWorkId ? [editingWorkId] : [],
            expandedRowRender: (record) => {
              if (editingWorkId === record.id) {
                const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol || '₽';
                const isNewRecord = record.id === 'new';
                const itemType = currentItemType || form.getFieldValue('item_type') || record.item_type || 'work';

                // Цвета для разных типов элементов
                const colorScheme = {
                  'work': { bg: 'rgba(255, 152, 0, 0.05)', border: '#ff9800' }, // оранжевый
                  'sub_work': { bg: 'rgba(156, 39, 176, 0.05)', border: '#9c27b0' } // фиолетовый
                };

                const colors = colorScheme[itemType] || colorScheme['work'];

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
                            rules={[{ required: true, message: 'Выберите тип работы' }]}
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Radio.Group onChange={(e) => {
                              // Обновляем форму и состояние для перерисовки с новым цветом
                              form.setFieldValue('item_type', e.target.value);
                              setCurrentItemType(e.target.value);
                            }}>
                              <Radio.Button value="work">Работа</Radio.Button>
                              <Radio.Button value="sub_work">Суб-работа</Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item
                            name="category"
                            label="Категория"
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Select placeholder="Выберите категорию">
                              <Select.Option value="Installation works">Installation works</Select.Option>
                              <Select.Option value="Electrical installation">Electrical installation</Select.Option>
                              <Select.Option value="Finishing works">Finishing works</Select.Option>
                              <Select.Option value="Plumbing works">Plumbing works</Select.Option>
                              <Select.Option value="General construction">General construction</Select.Option>
                              <Select.Option value="Commissioning works">Commissioning works</Select.Option>
                              <Select.Option value="Other works">Other works</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name="name"
                            label="Наименование работы"
                            rules={[{ required: true, message: 'Введите наименование работы' }]}
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Input placeholder="Например: Монтаж кабеля" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            name="unit"
                            label="Ед. изм."
                            rules={[{ required: true, message: 'Введите единицу измерения' }]}
                            style={{ marginBottom: 16, marginRight: 8 }}
                          >
                            <Select>
                              <Select.Option value="м2">м²</Select.Option>
                              <Select.Option value="м3">м³</Select.Option>
                              <Select.Option value="м">м</Select.Option>
                              <Select.Option value="шт">шт</Select.Option>
                              <Select.Option value="т">т</Select.Option>
                              <Select.Option value="компл">компл</Select.Option>
                              <Select.Option value="маш-час">маш-час</Select.Option>
                              <Select.Option value="чел-час">чел-час</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Form.Item
                            name="currency_type"
                            label="Валюта"
                            rules={[{ required: true, message: 'Выберите валюту' }]}
                            style={{ marginBottom: 16, marginRight: 8 }}
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
                            style={{ marginBottom: 16 }}
                          >
                            <DecimalInput
                              min={0}
                              precision={2}
                              placeholder="0.00"
                              addonAfter={currencySymbol}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={20}>
                          <Form.Item
                            name="description"
                            label="Описание"
                          >
                            <Input.TextArea
                              rows={2}
                              placeholder="Дополнительная информация о работе"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
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
            rowExpandable: (record) => editingWorkId === record.id
          }}
        />
      </Card>

    </div>
  );
};

export default Works;