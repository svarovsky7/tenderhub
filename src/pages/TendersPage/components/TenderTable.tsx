import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Typography,
  Tooltip,
  Empty,
  Progress,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import ExcelUpload from './ExcelUpload';
// Note: status-related imports removed as status field was removed from schema
import type { TenderTableProps, TenderWithSummary } from '../types';

const { Text } = Typography;

const TenderTable: React.FC<TenderTableProps> = ({
  tenders,
  loading,
  pagination,
  onTableChange,
  onViewTender,
  onEditTender,
  onDeleteTender,
  onExcelUpload
}) => {
  console.log('🚀 TenderTable component rendered');
  console.log('📊 Tenders count:', tenders.length);
  console.log('📄 Pagination:', pagination);

  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleViewTender = (tender: TenderWithSummary) => {
    console.log('👁️ View tender clicked:', tender.id);
    onViewTender(tender);
  };

  const handleEditTender = (tender: TenderWithSummary) => {
    console.log('✏️ Edit tender clicked:', tender.id);
    setEditingKey(tender.id!);
    setExpandedRowKeys([tender.id!]);
    form.setFieldsValue({
      ...tender,
      submission_deadline: tender.submission_deadline ? dayjs(tender.submission_deadline) : null
    });
  };

  const handleSaveEdit = async (record: TenderWithSummary) => {
    try {
      const values = await form.validateFields();
      console.log('💾 Saving tender edits:', values);
      
      const updates = {
        ...values,
        id: record.id,
        submission_deadline: values.submission_deadline?.format('YYYY-MM-DD HH:mm:ss')
      };
      
      await onEditTender(updates);
      setEditingKey(null);
      setExpandedRowKeys([]);
      form.resetFields();
    } catch (error) {
      console.error('❌ Edit validation failed:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setExpandedRowKeys([]);
    form.resetFields();
  };

  const handleDeleteTender = (tenderId: string) => {
    console.log('🗑️ Delete tender clicked:', tenderId);
    onDeleteTender(tenderId);
  };

  const handleExcelUpload = async (tenderId: string, file: File) => {
    console.log('📤 Excel upload triggered for tender:', tenderId);
    await onExcelUpload(tenderId, file);
  };

  // Check if any tender has area_sp data
  const hasAreaSP = tenders.some(tender => tender.area_sp && tender.area_sp > 0);
  
  // Check if any tender has area_client data
  const hasAreaClient = tenders.some(tender => tender.area_client && tender.area_client > 0);

  const columns: ColumnsType<TenderWithSummary> = [
    {
      title: 'Тендер',
      key: 'tender',
      render: (_, record) => (
        <div className="flex items-start gap-3">
          <Avatar 
            size="large" 
            icon={<FolderOpenOutlined />}
            className="bg-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Text 
                strong 
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleViewTender(record)}
              >
                {record.title}
              </Text>
              <Tag color="blue" size="small">
                v{record.version || 1}
              </Tag>
            </div>
            <Text type="secondary" className="text-sm block">
              №{record.tender_number} • {record.client_name}
            </Text>
          </div>
        </div>
      ),
      width: 300
    },
    {
      title: 'Дедлайн',
      dataIndex: 'submission_deadline',
      key: 'deadline',
      width: 120,
      render: (deadline) => {
        if (!deadline) return '-';
        
        const date = dayjs(deadline);
        const isOverdue = date.isBefore(dayjs());
        const isNear = date.diff(dayjs(), 'days') <= 3;
        
        return (
          <div className={`text-center ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}>
            <CalendarOutlined className="mb-1 block" />
            <Text className={`text-xs block ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}>
              {date.format('DD.MM.YYYY')}
            </Text>
          </div>
        );
      },
      sorter: (a, b) => dayjs(a.submission_deadline || 0).unix() - dayjs(b.submission_deadline || 0).unix()
    },
    {
      title: 'ВОР Стоимость',
      key: 'boq_value',
      width: 120,
      render: (_, record) => (
        <div className="text-center">
          <DollarOutlined className="mb-1 block text-green-500" />
          {record.boq_total_value ? (
            <Text strong className="text-sm block">
              {(record.boq_total_value / 1000000).toFixed(1)}М ₽
            </Text>
          ) : (
            <Text type="secondary" className="text-sm block">
              Не заполнено
            </Text>
          )}
        </div>
      ),
      sorter: (a, b) => (a.boq_total_value || 0) - (b.boq_total_value || 0)
    },
    // Conditionally add Area SP column
    ...(hasAreaSP ? [{
      title: 'Площадь по СП',
      key: 'area_sp',
      width: 120,
      render: (_, record) => (
        <div className="text-center">
          <Text className="text-xs text-gray-500 block mb-1">м²</Text>
          {record.area_sp ? (
            <Text strong className="text-sm block">
              {record.area_sp.toLocaleString('ru-RU')}
            </Text>
          ) : (
            <Text type="secondary" className="text-sm block">
              —
            </Text>
          )}
        </div>
      ),
      sorter: (a, b) => (a.area_sp || 0) - (b.area_sp || 0)
    }] : []),
    // Conditionally add Area Client column
    ...(hasAreaClient ? [{
      title: 'Площадь от Заказчика',
      key: 'area_client', 
      width: 140,
      render: (_, record) => (
        <div className="text-center">
          <Text className="text-xs text-gray-500 block mb-1">м²</Text>
          {record.area_client ? (
            <Text strong className="text-sm block">
              {record.area_client.toLocaleString('ru-RU')}
            </Text>
          ) : (
            <Text type="secondary" className="text-sm block">
              —
            </Text>
          )}
        </div>
      ),
      sorter: (a, b) => (a.area_client || 0) - (b.area_client || 0)
    }] : []),
    {
      title: 'Прогресс',
      key: 'progress',
      width: 120,
      render: (_, record) => {
        const progress = 75; // Temporarily hardcoded until backend supports this field
        const itemsCount = record.total_items || 0;
        
        return (
          <div className="text-center">
            <Progress 
              type="circle" 
              size={40} 
              percent={progress} 
              strokeColor="#52c41a"
              format={() => `${progress}%`}
            />
            <Text type="secondary" className="text-xs block mt-1">
              {itemsCount} позиций
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created',
      width: 100,
      render: (created) => (
        <div className="text-center">
          <ClockCircleOutlined className="mb-1 block text-gray-400" />
          <Text type="secondary" className="text-xs">
            {dayjs(created).format('DD.MM.YYYY')}
          </Text>
        </div>
      ),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => {
        return (
          <Space size="small">
            <ExcelUpload 
              tenderId={record.id!}
              onUpload={(file) => handleExcelUpload(record.id!, file)}
            />
            <Tooltip title="Открыть">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewTender(record)}
              />
            </Tooltip>
            <Tooltip title="Редактировать">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditTender(record)}
              />
            </Tooltip>
            <Tooltip title="Удалить">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  console.log('🖱️ Delete button clicked for record:', record);
                  console.log('🔑 Record ID:', record.id);
                  console.log('📝 Record title:', record.title);
                  handleDeleteTender(record.id!);
                }}
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  // Expandable row render function for inline editing
  const expandedRowRender = (record: TenderWithSummary) => {
    const isEditing = editingKey === record.id;
    
    if (!isEditing) return null;
    
    return (
      <div className="p-4 bg-gray-50">
        <Form
          form={form}
          layout="vertical"
          className="max-w-4xl"
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
                tooltip="Увеличьте версию при загрузке нового ВОР"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="client_name"
                label="Заказчик"
                rules={[{ required: true, message: 'Введите название заказчика' }]}
              >
                <Input placeholder="Название организации-заказчика" />
              </Form.Item>
            </Col>
            <Col span={12}>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={handleCancelEdit}>
              Отмена
            </Button>
            <Button 
              type="primary" 
              onClick={() => handleSaveEdit(record)}
            >
              Сохранить
            </Button>
          </div>
        </Form>
      </div>
    );
  };

  return (
    <Card>
      <Table
        columns={columns}
        dataSource={tenders}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        expandable={{
          expandedRowRender,
          expandedRowKeys,
          onExpandedRowsChange: (keys) => {
            // Only allow expansion if we're editing
            if (editingKey) {
              setExpandedRowKeys(keys as string[]);
            }
          },
          expandIcon: () => null, // Hide expand icon since we expand programmatically
          expandRowByClick: false
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Тендеры не найдены"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  console.log('🖱️ Create first tender button clicked from empty state');
                  // This will be handled by parent component
                }}
              >
                Создать первый тендер
              </Button>
            </Empty>
          )
        }}
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default TenderTable;