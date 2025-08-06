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
  Statistic
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
// Removed auth imports - no authentication needed

const Works: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
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

  // Добавление/редактирование работы
  const handleSubmit = async (values: any) => {
    try {
      if (editingWork) {
        const { error } = await worksApi.update(editingWork.id, values);
        if (error) throw error;
        message.success('Работа обновлена');
      } else {
        const { error } = await worksApi.create(values);
        if (error) throw error;
        message.success('Работа добавлена');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingWork(null);
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

  // Открытие модального окна для редактирования
  const handleEdit = (work: Work) => {
    setEditingWork(work);
    form.setFieldsValue(work);
    setModalVisible(true);
  };

  // Фильтрация по поиску
  const filteredWorks = works.filter(work => 
    work.name.toLowerCase().includes(searchText.toLowerCase()) ||
    work.code.toLowerCase().includes(searchText.toLowerCase())
  );

  // Колонки таблицы
  const columns: ColumnsType<Work> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Цена',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 120,
      render: (rate) => `${rate.toFixed(2)} ₽`,
      sorter: (a, b) => a.base_price - b.base_price,
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
            title="Удалить работу?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
            // All features enabled
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              // All features enabled
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Статистика
  const stats = {
    total: works.length,
    avgRate: works.length > 0 
      ? works.reduce((sum, w) => sum + w.base_price, 0) / works.length 
      : 0
  };

  return (
    <div className="works-page">
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
              title="Средняя ставка" 
              value={stats.avgRate} 
              precision={2}
              suffix="₽"
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
              onClick={() => {
                setEditingWork(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Добавить работу
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredWorks}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
        />
      </Card>

      <Modal
        title={editingWork ? 'Редактировать работу' : 'Добавить работу'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingWork(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Код"
                rules={[{ required: true, message: 'Введите код работы' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Единица измерения"
                rules={[{ required: true, message: 'Введите единицу измерения' }]}
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
          </Row>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование работы' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="base_price"
                label="Базовая ставка (₽)"
                rules={[{ required: true, message: 'Введите ставку' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01}
                  style={{ width: '100%' }}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={value => parseFloat(value!.replace(/\s?/g, '')) as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingWork(null);
              }}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingWork ? 'Сохранить' : 'Добавить'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Works;