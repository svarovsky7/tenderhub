import React from 'react';
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
  Progress
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

  const handleViewTender = (tender: TenderWithSummary) => {
    console.log('👁️ View tender clicked:', tender.id);
    onViewTender(tender);
  };

  const handleEditTender = (tender: TenderWithSummary) => {
    console.log('✏️ Edit tender clicked:', tender.id);
    onEditTender(tender);
  };

  const handleDeleteTender = (tenderId: string) => {
    console.log('🗑️ Delete tender clicked:', tenderId);
    onDeleteTender(tenderId);
  };

  const handleExcelUpload = async (tenderId: string, file: File) => {
    console.log('📤 Excel upload triggered for tender:', tenderId);
    await onExcelUpload(tenderId, file);
  };

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
              {/* Note: status tag removed as status field was removed from schema */}
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

  return (
    <Card>
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
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default TenderTable;