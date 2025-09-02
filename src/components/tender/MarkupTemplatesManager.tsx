import React, { useState } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, Input, InputNumber, message, Tag, Tooltip, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CopyOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllMarkupTemplates,
  getMarkupTemplateById,
  createMarkupTemplate,
  updateMarkupTemplate,
  deleteMarkupTemplate,
  setDefaultMarkupTemplate
} from '../../lib/supabase/api/markup-templates';
import type { MarkupTemplate, CreateMarkupTemplate, UpdateMarkupTemplate } from '../../lib/supabase/types/tender-markup';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const MarkupTemplatesManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarkupTemplate | null>(null);
  const [form] = Form.useForm();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // Query for templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['markupTemplates'],
    queryFn: getAllMarkupTemplates
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createMarkupTemplate,
    onSuccess: () => {
      message.success('Шаблон успешно создан');
      queryClient.invalidateQueries({ queryKey: ['markupTemplates'] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(`Ошибка создания: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateMarkupTemplate }) =>
      updateMarkupTemplate(id, updates),
    onSuccess: () => {
      message.success('Шаблон успешно обновлен');
      queryClient.invalidateQueries({ queryKey: ['markupTemplates'] });
      setIsModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMarkupTemplate,
    onSuccess: () => {
      message.success('Шаблон успешно удален');
      queryClient.invalidateQueries({ queryKey: ['markupTemplates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`);
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultMarkupTemplate,
    onSuccess: () => {
      message.success('Шаблон установлен по умолчанию');
      queryClient.invalidateQueries({ queryKey: ['markupTemplates'] });
    },
    onError: (error: any) => {
      message.error(`Ошибка установки: ${error.message}`);
    }
  });

  const handleCreateOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          updates: values
        });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEdit = (template: MarkupTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      works_16_markup: template.works_16_markup,
      mechanization_service: template.mechanization_service,
      mbp_gsm: template.mbp_gsm,
      warranty_period: template.warranty_period,
      works_cost_growth: template.works_cost_growth,
      materials_cost_growth: template.materials_cost_growth,
      subcontract_works_cost_growth: template.subcontract_works_cost_growth,
      subcontract_materials_cost_growth: template.subcontract_materials_cost_growth,
      contingency_costs: template.contingency_costs,
      overhead_own_forces: template.overhead_own_forces,
      overhead_subcontract: template.overhead_subcontract,
      general_costs_without_subcontract: template.general_costs_without_subcontract,
      profit_own_forces: template.profit_own_forces,
      profit_subcontract: template.profit_subcontract
    });
    setIsModalVisible(true);
  };

  const handleDuplicate = (template: MarkupTemplate) => {
    form.setFieldsValue({
      name: `${template.name} (копия)`,
      description: template.description,
      works_16_markup: template.works_16_markup,
      mechanization_service: template.mechanization_service,
      mbp_gsm: template.mbp_gsm,
      warranty_period: template.warranty_period,
      works_cost_growth: template.works_cost_growth,
      materials_cost_growth: template.materials_cost_growth,
      subcontract_works_cost_growth: template.subcontract_works_cost_growth,
      subcontract_materials_cost_growth: template.subcontract_materials_cost_growth,
      contingency_costs: template.contingency_costs,
      overhead_own_forces: template.overhead_own_forces,
      overhead_subcontract: template.overhead_subcontract,
      general_costs_without_subcontract: template.general_costs_without_subcontract,
      profit_own_forces: template.profit_own_forces,
      profit_subcontract: template.profit_subcontract
    });
    setEditingTemplate(null);
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MarkupTemplate) => (
        <Space>
          {record.is_default && <StarFilled className="text-yellow-500" />}
          <Text strong>{text}</Text>
          {record.is_default && <Tag color="gold">По умолчанию</Tag>}
        </Space>
      )
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Основные показатели',
      key: 'main_indicators',
      render: (_, record: MarkupTemplate) => (
        <Space size="small">
          <Tag>Работы 1,6: {record.works_16_markup}%</Tag>
          <Tag>Прибыль СС: {record.profit_own_forces}%</Tag>
          <Tag>Прибыль СП: {record.profit_subcontract}%</Tag>
        </Space>
      )
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_, record: MarkupTemplate) => (
        <Space>
          {!record.is_default && (
            <Tooltip title="Установить по умолчанию">
              <Button
                size="small"
                icon={<StarOutlined />}
                onClick={() => setDefaultMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="Редактировать">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Дублировать">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить шаблон?"
            description="Это действие нельзя отменить"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Tooltip title="Удалить">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={record.is_default}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const expandedRowRender = (record: MarkupTemplate) => {
    const details = [
      { label: 'Работы 1,6', value: `${record.works_16_markup}%` },
      { label: 'Служба механизации', value: `${record.mechanization_service}%` },
      { label: 'МБП+ГСМ', value: `${record.mbp_gsm}%` },
      { label: 'Гарантийный период', value: `${record.warranty_period}%` },
      { label: 'Рост стоимости работ', value: `${record.works_cost_growth}%` },
      { label: 'Рост стоимости материалов', value: `${record.materials_cost_growth}%` },
      { label: 'Рост работ субподряда', value: `${record.subcontract_works_cost_growth}%` },
      { label: 'Рост материалов субподряда', value: `${record.subcontract_materials_cost_growth}%` },
      { label: 'Непредвиденные затраты', value: `${record.contingency_costs}%` },
      { label: 'ООЗ собств. силы', value: `${record.overhead_own_forces}%` },
      { label: 'ООЗ субподряд', value: `${record.overhead_subcontract}%` },
      { label: 'ОФЗ (без субподряда)', value: `${record.general_costs_without_subcontract}%` },
      { label: 'Прибыль собств. силы', value: `${record.profit_own_forces}%` },
      { label: 'Прибыль субподряд', value: `${record.profit_subcontract}%` }
    ];

    return (
      <Row gutter={[16, 8]} className="p-4 bg-gray-50">
        {details.map((item, index) => (
          <Col xs={12} sm={8} md={6} key={index}>
            <Text type="secondary">{item.label}:</Text>
            <Text className="ml-2" strong>{item.value}</Text>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <>
      <Card
        title={
          <Space>
            <CheckCircleOutlined />
            <span>Управление шаблонами накруток</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTemplate(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Создать шаблон
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={isLoading}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpandedRowsChange: setExpandedRowKeys,
            rowExpandable: () => true
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total} шаблонов`
          }}
        />
      </Card>

      <Modal
        title={editingTemplate ? 'Редактировать шаблон' : 'Создать новый шаблон'}
        open={isModalVisible}
        onOk={handleCreateOrUpdate}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTemplate(null);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={900}
        okText={editingTemplate ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            works_16_markup: 160,
            mechanization_service: 0,
            mbp_gsm: 0,
            warranty_period: 0,
            works_cost_growth: 5,
            materials_cost_growth: 3,
            subcontract_works_cost_growth: 7,
            subcontract_materials_cost_growth: 4,
            contingency_costs: 2,
            overhead_own_forces: 8,
            overhead_subcontract: 6,
            general_costs_without_subcontract: 5,
            profit_own_forces: 12,
            profit_subcontract: 8
          }}
        >
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Название шаблона"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Например: Стандартный проект" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="description"
                label="Описание"
              >
                <TextArea rows={1} placeholder="Краткое описание назначения шаблона" />
              </Form.Item>
            </Col>
          </Row>

          <div className="border-t pt-4 mt-4">
            <Title level={5}>Основные накрутки</Title>
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={8} md={6}>
                <Form.Item
                  name="works_16_markup"
                  label={
                    <Tooltip title="Коэффициент увеличения стоимости работ">
                      Работы 1,6
                    </Tooltip>
                  }
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={1000}
                    step={10}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Form.Item
                  name="mechanization_service"
                  label="Служба механизации"
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Form.Item
                  name="mbp_gsm"
                  label="МБП+ГСМ"
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Form.Item
                  name="warranty_period"
                  label="Гарантийный период"
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="border-t pt-4 mt-4">
            <Title level={5}>Рост стоимости</Title>
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={6}>
                <Form.Item
                  name="works_cost_growth"
                  label="Работы"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item
                  name="materials_cost_growth"
                  label="Материалы"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item
                  name="subcontract_works_cost_growth"
                  label="Работы субподряда"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item
                  name="subcontract_materials_cost_growth"
                  label="Материалы субподряда"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="border-t pt-4 mt-4">
            <Title level={5}>Затраты и прибыль</Title>
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="contingency_costs"
                  label="Непредвиденные затраты"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="overhead_own_forces"
                  label="ООЗ собств. силы"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="overhead_subcontract"
                  label="ООЗ субподряд"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="general_costs_without_subcontract"
                  label="ОФЗ (без субподряда)"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="profit_own_forces"
                  label="Прибыль собств. силы"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item
                  name="profit_subcontract"
                  label="Прибыль субподряд"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </>
  );
};