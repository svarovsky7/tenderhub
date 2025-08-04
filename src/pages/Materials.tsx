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
  Tag,
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
  FileExcelOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { materialsApi } from '../lib/supabase/api';
import type { Material } from '../lib/supabase/types';
import { useAuth } from '../contexts/AuthContext';

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';
  const canEdit = isAdmin || user?.role === 'Engineer';

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

  // Добавление/редактирование материала
  const handleSubmit = async (values: any) => {
    try {
      if (editingMaterial) {
        const { error } = await materialsApi.update(editingMaterial.id, values);
        if (error) throw error;
        message.success('Материал обновлен');
      } else {
        const { error } = await materialsApi.create(values);
        if (error) throw error;
        message.success('Материал добавлен');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingMaterial(null);
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

  // Открытие модального окна для редактирования
  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    form.setFieldsValue(material);
    setModalVisible(true);
  };

  // Фильтрация по поиску
  const filteredMaterials = materials.filter(material => 
    material.name.toLowerCase().includes(searchText.toLowerCase()) ||
    material.code.toLowerCase().includes(searchText.toLowerCase()) ||
    material.category?.toLowerCase().includes(searchText.toLowerCase())
  );

  // Колонки таблицы
  const columns: ColumnsType<Material> = [
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
      render: (price) => `${price.toFixed(2)} ₽`,
      sorter: (a, b) => a.base_price - b.base_price,
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
      render: (category) => category ? <Tag>{category}</Tag> : null,
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
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
            title="Удалить материал?"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
            disabled={!isAdmin}
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              disabled={!isAdmin}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Статистика
  const stats = {
    total: materials.length,
    categories: [...new Set(materials.map(m => m.category).filter(Boolean))].length,
    avgPrice: materials.length > 0 
      ? materials.reduce((sum, m) => sum + m.base_price, 0) / materials.length 
      : 0
  };

  return (
    <div className="materials-page">
      <Card className="mb-4">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic 
              title="Всего материалов" 
              value={stats.total} 
              prefix={<FileExcelOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Категорий" 
              value={stats.categories} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="Средняя цена" 
              value={stats.avgPrice} 
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
              onClick={() => {
                setEditingMaterial(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Добавить материал
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredMaterials}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
        />
      </Card>

      <Modal
        title={editingMaterial ? 'Редактировать материал' : 'Добавить материал'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingMaterial(null);
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
                rules={[{ required: true, message: 'Введите код материала' }]}
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
          </Row>

          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Введите наименование материала' }]}
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
            <Col span={12}>
              <Form.Item
                name="base_price"
                label="Базовая цена (₽)"
                rules={[{ required: true, message: 'Введите цену' }]}
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
            <Col span={12}>
              <Form.Item
                name="category"
                label="Категория"
              >
                <Select allowClear showSearch>
                  <Select.Option value="Бетон и растворы">Бетон и растворы</Select.Option>
                  <Select.Option value="Металлопрокат">Металлопрокат</Select.Option>
                  <Select.Option value="Кирпич и блоки">Кирпич и блоки</Select.Option>
                  <Select.Option value="Изоляция">Изоляция</Select.Option>
                  <Select.Option value="Отделочные материалы">Отделочные материалы</Select.Option>
                  <Select.Option value="Сантехника">Сантехника</Select.Option>
                  <Select.Option value="Электротехника">Электротехника</Select.Option>
                  <Select.Option value="Прочее">Прочее</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="supplier"
            label="Поставщик"
          >
            <Input />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingMaterial(null);
              }}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingMaterial ? 'Сохранить' : 'Добавить'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Materials;