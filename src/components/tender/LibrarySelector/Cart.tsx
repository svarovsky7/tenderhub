import React, { useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  InputNumber,
  Input,
  Space,
  Typography,
  Tag,
  Empty,
  message
} from 'antd';
import {
  ShoppingCartOutlined,
  DeleteOutlined,
  ClearOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { CartProps, CartItem } from './types';

const { Text } = Typography;
const { TextArea } = Input;

const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  onClear,
  onConfirm
}) => {
  console.log('🚀 Cart rendered with:', { itemsCount: items.length });

  const handleQuantityChange = useCallback((itemId: string, value: number | null) => {
    console.log('🔢 Quantity changed for item:', { itemId, value });
    if (value && value > 0) {
      onUpdateQuantity(itemId, value);
    }
  }, [onUpdateQuantity]);

  const handleNotesChange = useCallback((itemId: string, value: string) => {
    console.log('📝 Notes changed for item:', { itemId, notesLength: value.length });
    onUpdateNotes(itemId, value);
  }, [onUpdateNotes]);

  const handleRemoveItem = useCallback((itemId: string) => {
    console.log('🗑️ Remove item clicked:', itemId);
    onRemoveItem(itemId);
  }, [onRemoveItem]);

  const handleClearCart = useCallback(() => {
    console.log('🧹 Clear cart clicked');
    if (items.length === 0) {
      message.warning('Корзина уже пуста');
      return;
    }
    onClear();
    message.success('Корзина очищена');
  }, [items.length, onClear]);

  const handleConfirm = useCallback(() => {
    console.log('✅ Confirm cart clicked with items:', items);
    if (items.length === 0) {
      message.warning('Корзина пуста');
      return;
    }
    onConfirm();
  }, [items, onConfirm]);

  const totalCost = items.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);

  const cartColumns: ColumnsType<CartItem> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div>
            <Tag color={record.type === 'material' ? 'blue' : 'green'}>
              {record.type === 'material' ? 'Материал' : 'Работа'}
            </Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: 'Цена',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 100,
      render: (price) => `${price?.toFixed(2)} ₽`
    },
    {
      title: 'Количество',
      key: 'quantity',
      width: 120,
      render: (_, record) => (
        <InputNumber
          size="small"
          min={0.01}
          step={0.01}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record.id, value)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 100,
      render: (_, record) => `${(record.basePrice * record.quantity).toFixed(2)} ₽`
    },
    {
      title: 'Примечания',
      key: 'notes',
      width: 150,
      render: (_, record) => (
        <TextArea
          size="small"
          placeholder="Примечания..."
          value={record.notes || ''}
          onChange={(e) => handleNotesChange(record.id, e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
        />
      )
    },
    {
      title: 'Действие',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.id)}
          title="Удалить из корзины"
          danger
        />
      )
    }
  ];

  if (items.length === 0) {
    return (
      <Card>
        <Empty
          image={<ShoppingCartOutlined style={{ fontSize: 48, color: '#ccc' }} />}
          description="Корзина пуста"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex justify-between items-center">
          <Space>
            <ShoppingCartOutlined />
            <span>Корзина ({items.length})</span>
          </Space>
          <Space>
            <Text strong>Общая сумма: {totalCost.toFixed(2)} ₽</Text>
          </Space>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex justify-end">
          <Space>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearCart}
              title="Очистить корзину"
            >
              Очистить
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleConfirm}
            >
              Подтвердить выбор
            </Button>
          </Space>
        </div>
        <Table
          rowKey="id"
          dataSource={items}
          columns={cartColumns}
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
        />
      </div>
    </Card>
  );
};

export default Cart;