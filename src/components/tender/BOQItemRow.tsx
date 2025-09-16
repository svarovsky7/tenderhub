import React, { memo } from 'react';
import { Row, Col, Typography, Tag, Button } from 'antd';
import { DeleteOutlined, EditOutlined, LinkOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BOQItemRowProps {
  item: any;
  isWork: boolean;
  commercialCost?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onLink?: () => void;
}

const BOQItemRow: React.FC<BOQItemRowProps> = ({
  item,
  isWork,
  commercialCost = 0,
  onEdit,
  onDelete,
  onLink
}) => {
  return (
    <Row
      gutter={[8, 0]}
      className={`py-2 px-3 rounded hover:bg-gray-50 ${isWork ? 'bg-blue-50' : 'bg-green-50'}`}
      align="middle"
    >
      <Col span={8}>
        <div>
          <Text strong className="text-sm">
            {item.work_name || item.material_name || 'Без названия'}
          </Text>
          {item.item_no && (
            <div>
              <Text type="secondary" className="text-xs">
                №{item.item_no}
              </Text>
            </div>
          )}
        </div>
      </Col>

      <Col span={3}>
        <Text className="text-sm">
          {typeof item.quantity === 'number' ? item.quantity.toFixed(2) : '0.00'}
        </Text>
      </Col>

      <Col span={2}>
        <Text type="secondary" className="text-xs">
          {item.unit || 'шт'}
        </Text>
      </Col>

      <Col span={4}>
        <Text className="text-sm">
          {typeof item.unit_rate === 'number' ? item.unit_rate.toFixed(2) : '0.00'} ₽
        </Text>
      </Col>

      <Col span={4}>
        <Text strong className="text-sm">
          {typeof item.total_amount === 'number' ? item.total_amount.toFixed(2) : '0.00'} ₽
        </Text>
        {commercialCost > 0 && (
          <div>
            <Text type="secondary" className="text-xs">
              Ком: {commercialCost.toFixed(2)} ₽
            </Text>
          </div>
        )}
      </Col>

      <Col span={3}>
        <div className="flex gap-1">
          {onEdit && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
            />
          )}
          {onLink && isWork && (
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={onLink}
            />
          )}
          {onDelete && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
            />
          )}
        </div>
      </Col>
    </Row>
  );
};

export default memo(BOQItemRow);