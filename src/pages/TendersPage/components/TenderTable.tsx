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
  Divider,
  message
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  SyncOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import ExcelUpload from './ExcelUpload';
import EditableCell from './EditableCell';
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
  onExcelUpload,
  onUpdateBOQCurrencyRates
}) => {
  console.log('🚀 TenderTable component rendered');
  console.log('📊 Tenders count:', tenders.length);
  console.log('📄 Pagination:', pagination);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleViewTender = (tender: TenderWithSummary) => {
    console.log('👁️ View tender clicked:', tender.id);
    onViewTender(tender);
  };

  const handleEditTender = (tender: TenderWithSummary) => {
    console.log('✏️ Edit tender clicked:', tender.id);
    setEditingKey(tender.id!);
    form.setFieldsValue({
      ...tender,
      submission_deadline: tender.submission_deadline ? dayjs(tender.submission_deadline) : null,
      version: tender.version || 1,
      usd_rate: tender.usd_rate || null,
      eur_rate: tender.eur_rate || null,
      cny_rate: tender.cny_rate || null
    });
  };

  const handleInlineEdit = async (tenderId: string, field: string, value: any) => {
    console.log('🔄 Inline edit:', { tenderId, field, value });
    console.log('📝 Field type:', typeof value, 'Field name:', field);
    try {
      const updates = {
        id: tenderId,
        [field]: value
      };
      console.log('📤 Sending updates:', updates);
      await onEditTender(updates as any);
      message.success('Изменения сохранены');
    } catch (error) {
      console.error('❌ Inline edit failed:', error);
      message.error('Ошибка сохранения');
      throw error;
    }
  };

  const handleSaveEdit = async (record: TenderWithSummary) => {
    try {
      const values = await form.validateFields();
      console.log('💾 Saving tender edits:', values);
      console.log('💾 Form values detail:');
      console.log('  USD:', values.usd_rate);
      console.log('  EUR:', values.eur_rate);
      console.log('  CNY:', values.cny_rate);
      
      const updates = {
        ...values,
        id: record.id,
        submission_deadline: values.submission_deadline?.format('YYYY-MM-DD HH:mm:ss'),
        // Ensure currency fields are included
        usd_rate: values.usd_rate || null,
        eur_rate: values.eur_rate || null,
        cny_rate: values.cny_rate || null
      };
      
      console.log('📤 Final updates object:', updates);
      
      await onEditTender(updates);
      setEditingKey(null);
      form.resetFields();
      message.success('Изменения сохранены');
    } catch (error) {
      console.error('❌ Edit validation failed:', error);
      message.error('Ошибка сохранения');
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    form.resetFields();
  };

  const handleDeleteTender = (tenderId: string) => {
    console.log('🗑️ Delete tender clicked:', tenderId);
    onDeleteTender(tenderId);
  };

  const handleUpdateCurrencyRates = async (tenderId: string) => {
    console.log('💱 Update currency rates clicked:', tenderId);
    if (onUpdateBOQCurrencyRates) {
      try {
        await onUpdateBOQCurrencyRates(tenderId);
      } catch (error) {
        console.error('❌ Failed to update currency rates:', error);
        message.error('Ошибка обновления курсов валют');
      }
    }
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
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <div className="flex items-start gap-3">
              <Avatar 
                size="large" 
                icon={<FolderOpenOutlined />}
                className="bg-blue-500 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Form.Item
                    name="title"
                    style={{ margin: 0, flex: 1, minWidth: '150px' }}
                  >
                    <Input
                      placeholder="Название тендера"
                      style={{ fontWeight: 600 }}
                    />
                  </Form.Item>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Text type="secondary" className="text-sm">v</Text>
                    <Form.Item
                      name="version"
                      style={{ margin: 0, width: '50px' }}
                    >
                      <InputNumber
                        min={1}
                        placeholder="1"
                        size="small"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Text type="secondary" className="text-sm flex-shrink-0">№</Text>
                    <Form.Item
                      name="tender_number"
                      style={{ margin: 0 }}
                    >
                      <Input
                        size="small"
                        style={{ width: '110px', fontSize: '12px' }}
                        placeholder="T-2024-001"
                      />
                    </Form.Item>
                  </div>
                  <Text type="secondary" className="text-sm">•</Text>
                  <Form.Item
                    name="client_name"
                    style={{ margin: 0, flex: 1, minWidth: '120px' }}
                  >
                    <Input
                      size="small"
                      style={{ fontSize: '12px' }}
                      placeholder="Название заказчика"
                    />
                  </Form.Item>
                </div>
              </div>
            </div>
          );
        }
        
        return (
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
              <Text type="secondary" className="text-sm">
                №{record.tender_number || '—'} • {record.client_name || '—'}
              </Text>
            </div>
          </div>
        );
      },
      width: 380
    },
    {
      title: <div className="text-center">Создан</div>,
      dataIndex: 'created_at',
      key: 'created',
      width: 100,
      align: 'center' as const,
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
      title: <div className="text-center">Дедлайн</div>,
      dataIndex: 'submission_deadline',
      key: 'deadline',
      width: 140,
      align: 'center' as const,
      render: (deadline, record) => {
        const isEditing = editingKey === record.id;
        const date = deadline ? dayjs(deadline) : null;
        const isOverdue = date && date.isBefore(dayjs());
        const isNear = date && date.diff(dayjs(), 'days') <= 3;
        
        // Show Form.Item in edit mode, otherwise show EditableCell for inline editing
        if (isEditing) {
          return (
            <div className="text-center">
              <CalendarOutlined className="mb-1 block text-gray-400" />
              <Form.Item
                name="submission_deadline"
                style={{ margin: 0 }}
              >
                <DatePicker
                  showTime
                  format="DD.MM.YYYY HH:mm"
                  style={{ width: '100%', maxWidth: '160px' }}
                  placeholder="Дата и время"
                  size="small"
                />
              </Form.Item>
            </div>
          );
        }
        
        return (
          <div className={`text-center ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}>
            <CalendarOutlined className="mb-1 block" />
            <EditableCell
              value={deadline}
              type="date"
              onChange={(value) => handleInlineEdit(record.id!, 'submission_deadline', value)}
              formatter={(val) => val ? dayjs(val).format('DD.MM.YYYY') : '—'}
              className={`text-xs ${isOverdue ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}
              showEditIcon={false}
            />
          </div>
        );
      },
      sorter: (a, b) => dayjs(a.submission_deadline || 0).unix() - dayjs(b.submission_deadline || 0).unix()
    },
    {
      title: <div className="text-center">Стоимость позиций</div>,
      key: 'boq_value',
      width: 140,
      align: 'center' as const,
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
    {
      title: <div className="text-center">Площадь по СП</div>,
      key: 'area_sp',
      width: 120,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        // Show Form.Item in edit mode, otherwise show EditableCell for inline editing
        if (isEditing) {
          return (
            <div className="text-center px-1">
              <Form.Item
                name="area_sp"
                style={{ margin: 0 }}
              >
                <InputNumber
                  style={{ width: '100%', maxWidth: '110px' }}
                  placeholder="0"
                  suffix="м²"
                  precision={2}
                  min={0}
                  size="small"
                />
              </Form.Item>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <EditableCell
              value={record.area_sp}
              type="number"
              onChange={(value) => handleInlineEdit(record.id!, 'area_sp', value)}
              formatter={(val) => val ? `${val.toLocaleString('ru-RU')} м²` : '—'}
              suffix="м²"
              precision={2}
              min={0}
              className="text-sm font-semibold"
              showEditIcon={false}
            />
          </div>
        );
      },
      sorter: (a, b) => (a.area_sp || 0) - (b.area_sp || 0)
    },
    {
      title: <div className="text-center">Площадь от Заказчика</div>,
      key: 'area_client', 
      width: 140,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        // Show Form.Item in edit mode, otherwise show EditableCell for inline editing
        if (isEditing) {
          return (
            <div className="text-center px-1">
              <Form.Item
                name="area_client"
                style={{ margin: 0 }}
              >
                <InputNumber
                  style={{ width: '100%', maxWidth: '110px' }}
                  placeholder="0"
                  suffix="м²"
                  precision={2}
                  min={0}
                  size="small"
                />
              </Form.Item>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <EditableCell
              value={record.area_client}
              type="number"
              onChange={(value) => handleInlineEdit(record.id!, 'area_client', value)}
              formatter={(val) => val ? `${val.toLocaleString('ru-RU')} м²` : '—'}
              suffix="м²"
              precision={2}
              min={0}
              className="text-sm font-semibold"
              showEditIcon={false}
            />
          </div>
        );
      },
      sorter: (a, b) => (a.area_client || 0) - (b.area_client || 0)
    },
    {
      title: <div className="text-center">Курс USD</div>,
      key: 'usd_rate',
      width: 100,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <div className="text-center px-1">
              <Form.Item
                name="usd_rate"
                style={{ margin: 0 }}
              >
                <InputNumber
                  style={{ width: '100%', maxWidth: '90px' }}
                  placeholder="0"
                  prefix="$"
                  precision={4}
                  min={0}
                  size="small"
                />
              </Form.Item>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <EditableCell
              value={record.usd_rate}
              type="number"
              onChange={(value) => handleInlineEdit(record.id!, 'usd_rate', value)}
              formatter={(val) => val ? `$ ${val.toFixed(4)}` : '—'}
              precision={4}
              min={0}
              className="text-sm font-semibold text-green-600"
              showEditIcon={false}
            />
          </div>
        );
      },
      sorter: (a, b) => (a.usd_rate || 0) - (b.usd_rate || 0)
    },
    {
      title: <div className="text-center">Курс EUR</div>,
      key: 'eur_rate',
      width: 100,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <div className="text-center px-1">
              <Form.Item
                name="eur_rate"
                style={{ margin: 0 }}
              >
                <InputNumber
                  style={{ width: '100%', maxWidth: '90px' }}
                  placeholder="0"
                  prefix="€"
                  precision={4}
                  min={0}
                  size="small"
                />
              </Form.Item>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <EditableCell
              value={record.eur_rate}
              type="number"
              onChange={(value) => handleInlineEdit(record.id!, 'eur_rate', value)}
              formatter={(val) => val ? `€ ${val.toFixed(4)}` : '—'}
              precision={4}
              min={0}
              className="text-sm font-semibold text-blue-600"
              showEditIcon={false}
            />
          </div>
        );
      },
      sorter: (a, b) => (a.eur_rate || 0) - (b.eur_rate || 0)
    },
    {
      title: <div className="text-center">Курс CNY</div>,
      key: 'cny_rate',
      width: 100,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <div className="text-center px-1">
              <Form.Item
                name="cny_rate"
                style={{ margin: 0 }}
              >
                <InputNumber
                  style={{ width: '100%', maxWidth: '90px' }}
                  placeholder="0"
                  prefix="¥"
                  precision={4}
                  min={0}
                  size="small"
                />
              </Form.Item>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <EditableCell
              value={record.cny_rate}
              type="number"
              onChange={(value) => handleInlineEdit(record.id!, 'cny_rate', value)}
              formatter={(val) => val ? `¥ ${val.toFixed(4)}` : '—'}
              precision={4}
              min={0}
              className="text-sm font-semibold text-red-600"
              showEditIcon={false}
            />
          </div>
        );
      },
      sorter: (a, b) => (a.cny_rate || 0) - (b.cny_rate || 0)
    },
    {
      title: <div className="text-center">Прогресс</div>,
      key: 'progress',
      width: 120,
      align: 'center' as const,
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
      title: <div className="text-center">Описание</div>,
      dataIndex: 'description',
      key: 'description',
      width: 200,
      align: 'center' as const,
      render: (description, record) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <Form.Item
              name="description"
              style={{ margin: 0 }}
            >
              <Input.TextArea
                rows={2}
                placeholder="Описание тендера"
                style={{ fontSize: '12px' }}
              />
            </Form.Item>
          );
        }
        
        return (
          <Text className="text-xs" style={{ display: 'block' }}>
            {description || '—'}
          </Text>
        );
      }
    },
    {
      title: <div className="text-center">Действия</div>,
      key: 'actions',
      width: 150,
      align: 'center' as const,
      render: (_, record) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <Space size="small">
              <Tooltip title="Сохранить">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleSaveEdit(record)}
                />
              </Tooltip>
              <Tooltip title="Отмена">
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                />
              </Tooltip>
            </Space>
          );
        }
        
        // Check if tender has any currency rates defined
        const hasCurrencyRates = record.usd_rate || record.eur_rate || record.cny_rate;
        
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
            {hasCurrencyRates && onUpdateBOQCurrencyRates && (
              <Tooltip title="Обновить курсы валют в позициях BOQ">
                <Button
                  type="text"
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => handleUpdateCurrencyRates(record.id!)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>
            )}
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


  return (
    <Card>
      <style>
        {`
          .ant-picker-input > input {
            text-align: center !important;
          }
        `}
      </style>
      <Form form={form} component={false}>
        <Table
          columns={columns}
          dataSource={tenders}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={onTableChange}
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
        scroll={{ x: 1200 }}
      />
      </Form>
    </Card>
  );
};

export default TenderTable;