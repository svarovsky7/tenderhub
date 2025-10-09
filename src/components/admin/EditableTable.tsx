import React, { Key } from 'react';
import {
  Table,
  Form,
  Button,
  Space,
  Tag,
  Popconfirm,
  Input,
  Tooltip
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined,
  GlobalOutlined,
  CheckOutlined,
  CloseOutlined,
  ExpandOutlined,
  ShrinkOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';

interface EditableTableProps {
  dataSource: any[];
  loading: boolean;
  editingKey: string;
  form: any;
  onEdit: (record: any) => void;
  onSave: (record: any) => void;
  onCancel: () => void;
  onDelete: (record: any) => void;
  expandedRowKeys?: Key[];
  onExpandedRowsChange?: (expandedRows: Key[]) => void;
}

const EditableTable: React.FC<EditableTableProps> = ({
  dataSource,
  loading,
  editingKey,
  form,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  expandedRowKeys,
  onExpandedRowsChange
}) => {
  const { theme } = useTheme();

  const isEditing = (record: any) => {
    // Для локализаций используем составной ключ
    if (record.type === 'location' && record.detailRecordId) {
      return editingKey === `${record.detailRecordId}-${record.id || 'new'}`;
    }
    return editingKey === String(record.id);
  };

  // Улучшенная редактируемая ячейка
  const EditableCell: React.FC<any> = ({
    editing,
    dataIndex,
    title,
    record,
    children,
    ...restProps
  }) => {
    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[
              {
                required: dataIndex === 'name',
                message: `Введите ${title}!`,
              },
            ]}
          >
            <Input 
              placeholder={`Введите ${title.toLowerCase()}`}
              style={{ borderRadius: 6 }}
            />
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  const columns = [
    {
      title: 'Структура',
      dataIndex: 'name',
      key: 'name',
      editable: true,
      width: 400,
      render: (text: string, record: any) => {
        const indent = (record.level - 1) * 24;
        let icon = null;
        let color = 'default';
        
        if (record.type === 'category') {
          icon = <FolderOutlined style={{ fontSize: 16 }} />;
          color = 'blue';
        } else if (record.type === 'detail') {
          icon = <FileOutlined style={{ fontSize: 14 }} />;
          color = 'green';
        } else if (record.type === 'location') {
          icon = <GlobalOutlined style={{ fontSize: 14 }} />;
          color = 'orange';
        }
        
        return (
          <div style={{
            marginLeft: indent,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              {icon}
              <span style={{
                fontWeight: record.type === 'category' ? 600 : 400,
                fontSize: record.type === 'category' ? 15 : 14,
                color: theme === 'dark' ? '#ffffff' : '#000000'
              }}>
                {text}
              </span>
              {record.type === 'category' && record.children?.length > 0 && (
                <Tag color="blue" size="small" style={{ fontSize: '10px', margin: 0 }}>
                  {record.children.length}
                </Tag>
              )}
              {record.type === 'detail' && record.children?.length > 0 && (
                <Tag 
                  color={record.children.length > 1 ? "orange" : "green"} 
                  size="small" 
                  style={{ 
                    fontSize: '10px', 
                    margin: 0,
                    fontWeight: record.children.length > 1 ? 'bold' : 'normal',
                    animation: record.children.length > 1 ? 'pulse 2s infinite' : 'none',
                    boxShadow: record.children.length > 1 ? '0 0 8px rgba(255, 138, 0, 0.4)' : 'none'
                  }}
                >
                  {record.children.length}
                </Tag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Тип элемента',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: string) => {
        const typeConfig: any = {
          'category': { label: 'Категория', color: 'blue', icon: <FolderOutlined /> },
          'detail': { label: 'Детализация', color: 'green', icon: <FileOutlined /> },
          'location': { label: 'Локализация', color: 'orange', icon: <GlobalOutlined /> }
        };
        const config = typeConfig[type] || { label: type, color: 'default', icon: null };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit',
      key: 'unit',
      editable: true,
      width: 160,
      render: (text: string) => (
        <span style={{
          color: text && text !== '-'
            ? (theme === 'dark' ? '#ffffff' : '#000000')
            : (theme === 'dark' ? 'rgba(255, 255, 255, 0.45)' : '#999'),
          fontWeight: text && text !== '-' ? 500 : 400
        }}>
          {text || 'Не указано'}
        </span>
      )
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      editable: true,
      width: 200,
      ellipsis: { showTitle: false },
      render: (text: string, record: any) => {
        const content = record.type === 'category' && text ? text : 'Нет описания';
        return (
          <Tooltip title={content} placement="topLeft">
            <span style={{ color: content === 'Нет описания' ? '#999' : 'inherit' }}>
              {content}
            </span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Действия',
      dataIndex: 'operation',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const editable = isEditing(record);
        return editable ? (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => onSave(record)}
              style={{ borderRadius: 6 }}
            >
              Сохранить
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={onCancel}
              style={{ borderRadius: 6 }}
            >
              Отмена
            </Button>
          </Space>
        ) : (
          <Space size="small">
            <Tooltip title="Редактировать">
              <Button
                type="link"
                size="small"
                disabled={editingKey !== ''}
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
                style={{ 
                  color: '#1890ff',
                  padding: '4px 8px',
                  borderRadius: 6
                }}
              >
                Изменить
              </Button>
            </Tooltip>
            <Popconfirm
              title={`Удалить ${
                record.type === 'category' ? 'категорию' : 
                record.type === 'detail' ? 'вид затрат' : 'локализацию'
              }?`}
              description={
                record.type === 'category' 
                  ? 'Все вложенные элементы также будут удалены!' 
                  : 'Это действие нельзя отменить.'
              }
              onConfirm={() => onDelete(record)}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Удалить">
                <Button
                  type="link"
                  size="small"
                  danger
                  disabled={editingKey !== ''}
                  icon={<DeleteOutlined />}
                  style={{ 
                    padding: '4px 8px',
                    borderRadius: 6
                  }}
                >
                  Удалить
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const editableColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: any) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  // Функции для управления сворачиванием
  const expandAll = () => {
    if (onExpandedRowsChange) {
      const allExpandableKeys = dataSource
        .filter(record => record.children && record.children.length > 0)
        .map(record => record.key);
      onExpandedRowsChange(allExpandableKeys);
    }
  };

  const collapseAll = () => {
    if (onExpandedRowsChange) {
      onExpandedRowsChange([]);
    }
  };

  const expandCategories = () => {
    if (onExpandedRowsChange) {
      const categoryKeys = dataSource
        .filter(record => record.type === 'category' && record.children?.length > 0)
        .map(record => record.key);
      onExpandedRowsChange(categoryKeys);
    }
  };

  return (
    <Form form={form} component={false}>
      {/* Панель управления сворачиванием */}
      <div style={{
        marginBottom: 16,
        padding: '12px 16px',
        background: theme === 'dark' ? '#141414' : '#f8f9fa',
        borderRadius: '8px',
        border: theme === 'dark' ? '1px solid #424242' : '1px solid #e9ecef'
      }}>
        <Space wrap>
          <span style={{
            fontWeight: 500,
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#495057'
          }}>
            <FolderOpenOutlined /> Управление группировкой:
          </span>
          <Button 
            size="small" 
            icon={<ExpandOutlined />} 
            onClick={expandAll}
            style={{ borderRadius: 6 }}
          >
            Развернуть все
          </Button>
          <Button 
            size="small" 
            icon={<ShrinkOutlined />} 
            onClick={collapseAll}
            style={{ borderRadius: 6 }}
          >
            Свернуть все
          </Button>
          <Button 
            size="small" 
            icon={<FolderOutlined />} 
            onClick={expandCategories}
            type="dashed"
            style={{ borderRadius: 6 }}
          >
            Только категории
          </Button>
        </Space>
      </div>

      <Table
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        bordered
        dataSource={dataSource}
        columns={editableColumns}
        rowKey="key"
        loading={loading}
        pagination={{ 
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} из ${total} записей`,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        rowClassName={(record) => {
          if (record.type === 'category') return 'category-row';
          if (record.type === 'detail') return 'detail-row';
          return 'location-row';
        }}
        expandable={{
          expandedRowKeys: expandedRowKeys,
          onExpandedRowsChange: onExpandedRowsChange,
          indentSize: 24,
          expandRowByClick: false
        }}
        scroll={{ x: 1000 }}
        size="middle"
        style={{
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        locale={{
          emptyText: 'Нет данных для отображения'
        }}
      />
      
      {/* CSS анимация для подсветки счетчика */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </Form>
  );
};

export default EditableTable;