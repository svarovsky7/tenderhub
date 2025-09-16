import React, { memo } from 'react';
import { Row, Col, Typography, Tag, Button, Divider } from 'antd';
import {
  ExpandAltOutlined,
  ShrinkOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface PositionHeaderProps {
  position: any;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onQuickAdd?: () => void;
  stats: {
    worksCount: number;
    materialsCount: number;
    totalCost: number;
  };
  visualIndent?: number;
  positionColors?: any;
}

const PositionHeader: React.FC<PositionHeaderProps> = ({
  position,
  isExpanded,
  onToggle,
  onDelete,
  onQuickAdd,
  stats,
  visualIndent = 0,
  positionColors = {}
}) => {
  return (
    <div
      className="position-header"
      style={{
        borderLeft: `4px solid ${positionColors.borderColor || '#1890ff'}`,
        backgroundColor: positionColors.backgroundColor || '#fafafa',
        paddingLeft: visualIndent
      }}
    >
      <Row gutter={[8, 8]} align="middle" className="p-4">
        <Col span={1}>
          <Button
            type="text"
            size="small"
            icon={isExpanded ? <ShrinkOutlined /> : <ExpandAltOutlined />}
            onClick={onToggle}
          />
        </Col>

        <Col span={14}>
          <div>
            <Title level={5} className="mb-1">
              {position.position_number}. {position.work_name}
            </Title>
            {position.item_no && (
              <Text type="secondary" className="text-sm">
                №{position.item_no}
              </Text>
            )}
            {position.is_additional && (
              <Tag color="orange" className="ml-2">
                ДОП
              </Tag>
            )}
          </div>
        </Col>

        <Col span={6}>
          <div className="text-right">
            <Text strong className="text-lg">
              {stats.totalCost.toFixed(2)} ₽
            </Text>
            <div>
              <Text type="secondary" className="text-sm">
                Работ: {stats.worksCount} | Материалов: {stats.materialsCount}
              </Text>
            </div>
          </div>
        </Col>

        <Col span={3}>
          <div className="flex gap-1 justify-end">
            {onQuickAdd && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={onQuickAdd}
              >
                Добавить
              </Button>
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
    </div>
  );
};

export default memo(PositionHeader);