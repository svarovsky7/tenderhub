import React, { useMemo } from 'react';
import { Table, Button, Space, Tooltip, Tag, Empty } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  LinkOutlined,
  DollarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

interface BOQTableProps {
  items: BOQItemWithLibrary[];
  editingItemId: string | null;
  editForm: React.ReactNode;
  onEdit: (item: BOQItemWithLibrary) => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (item: BOQItemWithLibrary) => void;
  onLinkMaterial?: (workId: string) => void;
  loading?: boolean;
  canEdit?: boolean;
}

const BOQTable: React.FC<BOQTableProps> = ({
  items,
  editingItemId,
  editForm,
  onEdit,
  onDelete,
  onDuplicate,
  onLinkMaterial,
  loading = false,
  canEdit = true
}) => {
  // Get item type badge
  const getItemTypeBadge = (item: BOQItemWithLibrary) => {
    switch (item.item_type) {
      case 'work':
        return <Tag color="orange">Работа</Tag>;
      case 'sub_work':
        return <Tag color="purple">Суб-работа</Tag>;
      case 'material':
        return <Tag color="blue">Материал</Tag>;
      case 'sub_material':
        return <Tag color="green">Суб-материал</Tag>;
      default:
        return null;
    }
  };

  // Get row style based on item type
  const getRowStyle = (record: BOQItemWithLibrary) => {
    const baseStyle = 'transition-all duration-200';

    switch (record.item_type) {
      case 'work':
        return `${baseStyle} hover:bg-orange-50`;
      case 'sub_work':
        return `${baseStyle} hover:bg-purple-50`;
      case 'material':
        return `${baseStyle} hover:bg-blue-50`;
      case 'sub_material':
        return `${baseStyle} hover:bg-green-50`;
      default:
        return baseStyle;
    }
  };

  // Table columns
  const columns: ColumnsType<BOQItemWithLibrary> = useMemo(() => [
    {
      title: 'Тип',
      key: 'type',
      width: 120,
      fixed: 'left',
      render: (_, record) => getItemTypeBadge(record)
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string, record) => (
        <Tooltip placement="topLeft" title={text}>
          <div className="flex items-center gap-2">
            <span>{text}</span>
            {record.library_link && (
              <Tag color="gold" className="text-xs">
                Из библиотеки
              </Tag>
            )}
            {record.work_link && (
              <Tooltip title="Связан с работой">
                <LinkOutlined className="text-blue-500" />
              </Tooltip>
            )}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center'
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'center',
      render: (value: number) => value?.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      })
    },
    {
      title: 'Цена',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      align: 'right',
      render: (value: number, record) => {
        const currency = record.currency_type || 'RUB';
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
        return (
          <span>
            {value?.toLocaleString('ru-RU', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })} {symbol}
          </span>
        );
      }
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 150,
      align: 'right',
      render: (_, record) => {
        const total = (record.quantity || 0) * (record.unit_rate || 0);
        const currencyRate = record.currency_rate || 1;
        const totalInRub = total * currencyRate;

        return (
          <div>
            <div className="font-medium">
              {totalInRub.toLocaleString('ru-RU', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              })} ₽
            </div>
            {record.currency_type && record.currency_type !== 'RUB' && (
              <div className="text-xs text-gray-500">
                ({total.toLocaleString('ru-RU', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                })} {record.currency_type})
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        if (!canEdit) return null;

        const isWork = record.item_type === 'work' || record.item_type === 'sub_work';

        return (
          <Space size="small">
            <Tooltip title="Редактировать">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>

            {isWork && onLinkMaterial && (
              <Tooltip title="Привязать материал">
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => onLinkMaterial(record.id)}
                />
              </Tooltip>
            )}

            <Tooltip title="Дублировать">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => onDuplicate(record)}
              />
            </Tooltip>

            <Tooltip title="Удалить">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record.id)}
              />
            </Tooltip>
          </Space>
        );
      }
    }
  ], [canEdit, onDelete, onDuplicate, onEdit, onLinkMaterial]);

  // Summary calculation
  const summary = useMemo(() => {
    const worksTotal = items
      .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
      .reduce((sum, item) => {
        const total = (item.quantity || 0) * (item.unit_rate || 0) * (item.currency_rate || 1);
        return sum + total;
      }, 0);

    const materialsTotal = items
      .filter(item => item.item_type === 'material' || item.item_type === 'sub_material')
      .reduce((sum, item) => {
        const total = (item.quantity || 0) * (item.unit_rate || 0) * (item.currency_rate || 1);
        return sum + total;
      }, 0);

    return {
      works: worksTotal,
      materials: materialsTotal,
      total: worksTotal + materialsTotal
    };
  }, [items]);

  // Custom row rendering for edit forms
  const components = useMemo(() => ({
    body: {
      row: ({ children, ...props }: any) => {
        const record = props['data-row-key'] ?
          items.find(item => item.id === props['data-row-key']) :
          null;

        // Show edit form if this item is being edited
        if (record && editingItemId === record.id) {
          return (
            <tr>
              <td colSpan={columns.length} style={{ padding: 0 }}>
                {editForm}
              </td>
            </tr>
          );
        }

        return <tr {...props}>{children}</tr>;
      }
    }
  }), [editingItemId, editForm, items, columns.length]);

  if (items.length === 0) {
    return (
      <Empty
        description="Нет элементов BOQ"
        className="py-8"
      />
    );
  }

  return (
    <div className="boq-table-container">
      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        scroll={{ x: 1200, y: 600 }}
        components={components}
        onRow={(record) => ({
          'data-row-key': record.id,
          className: getRowStyle(record),
          onDoubleClick: () => canEdit && onEdit(record)
        })}
        summary={() => (
          <Table.Summary fixed="bottom">
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <strong>Итого:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    Работы: {summary.works.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    })} ₽
                  </div>
                  <div className="text-xs text-gray-500">
                    Материалы: {summary.materials.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    })} ₽
                  </div>
                  <div className="font-bold text-green-600">
                    Всего: {summary.total.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    })} ₽
                  </div>
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default React.memo(BOQTable);