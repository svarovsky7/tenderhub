import React from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Tag,
  Button,
  Space,
  Tooltip,
  Typography,
  Form,
  Input,
  InputNumber,
  Select,
  Dropdown,
  Modal,
  message
} from 'antd';
import {
  BuildOutlined,
  BoxPlotOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { BOQItem } from '../../../../lib/supabase/types';
import { formatQuantity, formatCurrency } from '../../../../utils/formatters';

const { Text } = Typography;
const { Option } = Select;

interface BOQItemWithLibrary extends BOQItem {
  libraryWorkId?: string | null;
  libraryMaterialId?: string | null;
}

export interface ColumnHandlers {
  editingItem: string | null;
  editingMaterialId: string | null;
  editingWorkId: string | null;
  tempManualVolume: number | null;
  selectedCurrency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  editSelectedCurrency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  editForm: any;
  workEditForm: any;
  handleEditWork: (item: BOQItemWithLibrary) => void;
  handleSaveWorkEdit: (values: any) => Promise<void>;
  handleCancelWorkEdit: () => void;
  handleEditMaterial: (item: BOQItemWithLibrary) => void;
  handleSaveInlineEdit: (values: any) => Promise<void>;
  handleCancelInlineEdit: () => void;
  handleLinkMaterials: (workId: string) => void;
  handleDeleteItem: (itemId: string) => Promise<void>;
  setEditSelectedCurrency: (currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => void;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

export const getTableColumns = (handlers: ColumnHandlers): ColumnsType<BOQItemWithLibrary> => {
  const {
    editingItem,
    editingMaterialId,
    editingWorkId,
    tempManualVolume,
    selectedCurrency,
    editSelectedCurrency,
    editForm,
    workEditForm,
    handleEditWork,
    handleSaveWorkEdit,
    handleCancelWorkEdit,
    handleEditMaterial,
    handleSaveInlineEdit,
    handleCancelInlineEdit,
    handleLinkMaterials,
    handleDeleteItem,
    setEditSelectedCurrency,
    tender
  } = handlers;

  return [
    // Type column
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 85,
      render: (type, record) => {
        switch(type) {
          case 'work':
            return (
              <div className="flex justify-center">
                <Tag icon={<BuildOutlined />} color="orange" className="text-xs">Работа</Tag>
              </div>
            );
          case 'sub_work':
            return (
              <div className="flex justify-center">
                <Tag icon={<BuildOutlined />} color="purple" className="text-xs">Суб-раб</Tag>
              </div>
            );
          case 'material':
            return (
              <div className="flex justify-center">
                {record.work_link ? (
                  <Tooltip title={`Связан с работой: ${record.work_link}`}>
                    <Tag icon={<BoxPlotOutlined />} color="blue" className="text-xs">
                      <LinkOutlined className="mr-1" />
                      Материал
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag icon={<BoxPlotOutlined />} color="blue" className="text-xs">Материал</Tag>
                )}
              </div>
            );
          case 'sub_material':
            return (
              <div className="flex justify-center">
                {record.work_link ? (
                  <Tooltip title={`Связан с работой: ${record.work_link}`}>
                    <Tag icon={<BoxPlotOutlined />} color="green" className="text-xs">
                      <LinkOutlined className="mr-1" />
                      Суб-мат
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag icon={<BoxPlotOutlined />} color="green" className="text-xs">Суб-мат</Tag>
                )}
              </div>
            );
          default:
            return <Tag className="text-xs">{type}</Tag>;
        }
      }
    },

    // Description column
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (text, record) => {
        const isEditingWork = editingWorkId === record.id;

        if (isEditingWork && (record.item_type === 'work' || record.item_type === 'sub_work')) {
          return (
            <Form
              form={workEditForm}
              onFinish={handleSaveWorkEdit}
              layout="inline"
              className="flex items-center gap-2"
            >
              <Form.Item
                name="description"
                className="mb-0 flex-1"
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <Input
                  autoFocus
                  size="small"
                  placeholder="Наименование"
                  onPressEnter={() => workEditForm.submit()}
                />
              </Form.Item>
              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => workEditForm.submit()}
                />
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelWorkEdit}
                />
              </Space>
            </Form>
          );
        }

        const isEditing = editingMaterialId === record.id;

        if (isEditing && (record.item_type === 'material' || record.item_type === 'sub_material')) {
          return (
            <Form
              form={editForm}
              onFinish={handleSaveInlineEdit}
              layout="inline"
              className="flex items-center gap-2"
            >
              <Form.Item
                name="description"
                className="mb-0 flex-1"
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <Input
                  autoFocus
                  size="small"
                  placeholder="Наименование"
                  onPressEnter={() => editForm.submit()}
                />
              </Form.Item>
              <Space size="small">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => editForm.submit()}
                />
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelInlineEdit}
                />
              </Space>
            </Form>
          );
        }

        const displayText = record.manual_code
          ? `${record.manual_code} - ${text}`
          : text;

        return (
          <Tooltip placement="topLeft" title={displayText}>
            <span>{displayText}</span>
          </Tooltip>
        );
      }
    },

    // Unit column
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      ellipsis: true,
      render: (text, record) => {
        const isEditingWork = editingWorkId === record.id;

        if (isEditingWork && (record.item_type === 'work' || record.item_type === 'sub_work')) {
          return (
            <Form.Item
              name="unit"
              className="mb-0"
              rules={[{ required: true, message: 'Обязательное поле' }]}
            >
              <Input
                size="small"
                placeholder="Ед."
                style={{ width: '70px' }}
              />
            </Form.Item>
          );
        }

        const isEditing = editingMaterialId === record.id;

        if (isEditing && (record.item_type === 'material' || record.item_type === 'sub_material')) {
          return (
            <Form.Item
              name="unit"
              className="mb-0"
              rules={[{ required: true, message: 'Обязательное поле' }]}
            >
              <Input
                size="small"
                placeholder="Ед."
                style={{ width: '70px' }}
              />
            </Form.Item>
          );
        }

        return <Text className="text-xs">{text || '—'}</Text>;
      }
    },

    // Quantity column
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value, record) => {
        const isEditingWork = editingWorkId === record.id;

        if (isEditingWork && (record.item_type === 'work' || record.item_type === 'sub_work')) {
          return (
            <Form.Item
              name="quantity"
              className="mb-0"
              rules={[{ required: true, message: 'Обязательное поле' }]}
            >
              <InputNumber
                size="small"
                min={0}
                step={0.01}
                placeholder="0"
                style={{ width: '80px' }}
              />
            </Form.Item>
          );
        }

        const isEditing = editingMaterialId === record.id;

        if (isEditing && (record.item_type === 'material' || record.item_type === 'sub_material')) {
          if (record.work_link) {
            return (
              <Form.Item
                name="consumption_coefficient"
                className="mb-0"
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  placeholder="Коэфф."
                  style={{ width: '80px' }}
                />
              </Form.Item>
            );
          } else {
            return (
              <Form.Item
                name="base_quantity"
                className="mb-0"
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  style={{ width: '80px' }}
                />
              </Form.Item>
            );
          }
        }

        const displayValue = record.item_type === 'material' || record.item_type === 'sub_material'
          ? (record.work_link ? record.consumption_coefficient : record.base_quantity)
          : value;

        return (
          <Text className="text-sm font-medium">
            {displayValue !== null && displayValue !== undefined
              ? formatQuantity(displayValue)
              : '—'}
          </Text>
        );
      }
    },

    // Price column
    {
      title: 'Цена за ед.',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 110,
      render: (value, record) => {
        const isEditingWork = editingWorkId === record.id;

        if (isEditingWork && (record.item_type === 'work' || record.item_type === 'sub_work')) {
          return (
            <div className="flex items-center gap-1">
              <Form.Item
                name="unit_rate"
                className="mb-0 flex-1"
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  style={{ width: '70px' }}
                />
              </Form.Item>
              <Select
                size="small"
                value={editSelectedCurrency}
                onChange={setEditSelectedCurrency}
                style={{ width: '55px' }}
              >
                <Option value="RUB">₽</Option>
                <Option value="USD">$</Option>
                <Option value="EUR">€</Option>
                <Option value="CNY">¥</Option>
              </Select>
            </div>
          );
        }

        const isEditing = editingMaterialId === record.id;

        if (isEditing && (record.item_type === 'material' || record.item_type === 'sub_material')) {
          return (
            <div className="flex items-center gap-1">
              <Form.Item
                name="unit_rate"
                className="mb-0 flex-1"
                rules={[{ required: true, message: 'Обязательное поле' }]}
              >
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  style={{ width: '70px' }}
                />
              </Form.Item>
              <Select
                size="small"
                value={editSelectedCurrency}
                onChange={setEditSelectedCurrency}
                style={{ width: '55px' }}
              >
                <Option value="RUB">₽</Option>
                <Option value="USD">$</Option>
                <Option value="EUR">€</Option>
                <Option value="CNY">¥</Option>
              </Select>
            </div>
          );
        }

        const getCurrencyDisplay = () => {
          if (record.original_currency && record.original_currency !== 'RUB') {
            const currencySymbols: Record<string, string> = {
              'USD': '$',
              'EUR': '€',
              'CNY': '¥',
              'RUB': '₽'
            };

            const originalSymbol = currencySymbols[record.original_currency] || record.original_currency;
            const originalAmount = record.original_amount || value;

            const exchangeRate = record.original_currency === 'USD'
              ? tender?.usd_rate
              : record.original_currency === 'EUR'
              ? tender?.eur_rate
              : record.original_currency === 'CNY'
              ? tender?.cny_rate
              : 1;

            if (exchangeRate && originalAmount) {
              const rubAmount = originalAmount * exchangeRate;
              return (
                <Tooltip title={`${formatQuantity(originalAmount)} ${originalSymbol} × ${formatQuantity(exchangeRate, 2)} = ${formatQuantity(rubAmount, 2)} ₽`}>
                  <span className="text-sm">
                    {formatQuantity(rubAmount, 2)} ₽
                    <br />
                    <span className="text-xs text-gray-500">
                      ({formatQuantity(originalAmount)} {originalSymbol})
                    </span>
                  </span>
                </Tooltip>
              );
            }

            return `${formatQuantity(originalAmount)} ${originalSymbol}`;
          }

          return `${value !== null && value !== undefined ? formatQuantity(value) : '—'} ₽`;
        };

        return <Text className="text-sm">{getCurrencyDisplay()}</Text>;
      }
    },

    // Delivery column
    {
      title: 'Доставка',
      dataIndex: 'delivery_amount',
      key: 'delivery_amount',
      width: 85,
      render: (value, record) => {
        const isEditingWork = editingWorkId === record.id;

        if (isEditingWork && (record.item_type === 'work' || record.item_type === 'sub_work')) {
          return <Text className="text-xs text-gray-400">—</Text>;
        }

        const isEditing = editingMaterialId === record.id;

        if (isEditing && (record.item_type === 'material' || record.item_type === 'sub_material')) {
          return (
            <Form.Item
              name="delivery_type"
              className="mb-0"
            >
              <Select
                size="small"
                placeholder="Тип"
                style={{ width: '80px' }}
              >
                <Option value="included">Вкл.</Option>
                <Option value="not_included">3%</Option>
                <Option value="amount">Сумма</Option>
              </Select>
            </Form.Item>
          );
        }

        if (record.item_type === 'work' || record.item_type === 'sub_work') {
          return <Text className="text-xs text-gray-400">—</Text>;
        }

        const displayDelivery = () => {
          if (record.delivery_type === 'included') {
            return <Tag color="green" className="text-xs">Вкл.</Tag>;
          } else if (record.delivery_type === 'not_included') {
            const deliveryAmount = record.unit_rate ? record.unit_rate * 0.03 : 0;
            return (
              <Tooltip title={`3% от ${formatQuantity(record.unit_rate || 0)} ₽`}>
                <span className="text-xs">{formatQuantity(deliveryAmount)} ₽</span>
              </Tooltip>
            );
          } else if (value !== null && value !== undefined) {
            return <span className="text-xs">{formatQuantity(value)} ₽</span>;
          }
          return <Text className="text-xs text-gray-400">—</Text>;
        };

        return displayDelivery();
      }
    },

    // Total column
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (value, record) => {
        const isEditingWork = editingWorkId === record.id;
        const isEditing = editingMaterialId === record.id;

        if (isEditingWork || isEditing) {
          return <Text className="text-sm text-gray-400">—</Text>;
        }

        return (
          <Text className="text-sm font-semibold">
            {value !== null && value !== undefined
              ? formatCurrency(value)
              : '—'}
          </Text>
        );
      }
    },

    // Actions column
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const isEditingWork = editingWorkId === record.id;

        if (isEditingWork) {
          return null; // Actions handled in description column
        }

        const isEditing = editingMaterialId === record.id;

        if (isEditing) {
          return null; // Actions handled in description column
        }

        const menuItems = [
          {
            key: 'edit',
            label: 'Редактировать',
            icon: <EditOutlined />,
            onClick: () => {
              if (record.item_type === 'work' || record.item_type === 'sub_work') {
                handleEditWork(record);
              } else if (record.item_type === 'material' || record.item_type === 'sub_material') {
                handleEditMaterial(record);
              }
            }
          },
          {
            key: 'delete',
            label: 'Удалить',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Подтвердите удаление',
                icon: <ExclamationCircleOutlined />,
                content: `Вы уверены, что хотите удалить "${record.description}"?`,
                okText: 'Удалить',
                okType: 'danger',
                cancelText: 'Отмена',
                onOk: () => handleDeleteItem(record.id)
              });
            }
          }
        ];

        if (record.item_type === 'work') {
          menuItems.splice(1, 0, {
            key: 'link',
            label: 'Связать материалы',
            icon: <LinkOutlined />,
            onClick: () => handleLinkMaterials(record.id)
          });
        }

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              size="small"
              icon={<MoreOutlined />}
              className="hover:bg-gray-100"
            />
          </Dropdown>
        );
      }
    }
  ];
};