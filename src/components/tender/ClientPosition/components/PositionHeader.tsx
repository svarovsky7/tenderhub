import React from 'react';
import { Card, Tag, Tooltip, Typography, Space } from 'antd';
import {
  DownOutlined,
  RightOutlined,
  FolderOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BuildOutlined
} from '@ant-design/icons';
import type { ClientPositionWithDetails } from '../../../../lib/supabase/types';

const { Text } = Typography;

interface PositionHeaderProps {
  position: ClientPositionWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
  level: number;
  totalItems: number;
  totalCost: number;
}

const PositionHeader: React.FC<PositionHeaderProps> = ({
  position,
  isExpanded,
  onToggle,
  level,
  totalItems,
  totalCost
}) => {
  // Determine position type and styling
  const getPositionTypeInfo = () => {
    if (position.is_folder) {
      if (level === 0) {
        return {
          icon: <FolderOutlined />,
          label: 'Раздел',
          color: 'blue',
          bgColor: 'bg-blue-50'
        };
      } else if (level === 1) {
        return {
          icon: <FolderOutlined />,
          label: 'Подраздел',
          color: 'cyan',
          bgColor: 'bg-cyan-50'
        };
      } else {
        return {
          icon: <FolderOutlined />,
          label: 'Папка',
          color: 'geekblue',
          bgColor: 'bg-gray-50'
        };
      }
    } else if (position.is_additional) {
      return {
        icon: <BuildOutlined />,
        label: 'ДОП',
        color: 'purple',
        bgColor: 'bg-purple-50'
      };
    } else {
      return {
        icon: <FileTextOutlined />,
        label: 'Позиция',
        color: 'green',
        bgColor: 'bg-green-50'
      };
    }
  };

  const positionTypeInfo = getPositionTypeInfo();

  return (
    <Card.Meta
      title={
        <div
          className={`flex items-center justify-between cursor-pointer py-2 px-3 rounded-lg hover:${positionTypeInfo.bgColor} transition-colors`}
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 flex-1">
            {/* Expand/Collapse Icon */}
            <div className="flex items-center" style={{ width: '20px' }}>
              {isExpanded ? (
                <DownOutlined className="text-gray-400" />
              ) : (
                <RightOutlined className="text-gray-400" />
              )}
            </div>

            {/* Position Number and Type */}
            <Space size="small">
              <Tag icon={positionTypeInfo.icon} color={positionTypeInfo.color}>
                {position.position_number}
              </Tag>
              <Tag color={positionTypeInfo.color}>
                {positionTypeInfo.label}
              </Tag>
            </Space>

            {/* Position Name */}
            <div className="flex-1 min-w-0">
              <Tooltip title={position.work_name}>
                <Text strong className="text-base block truncate">
                  {position.work_name || 'Без названия'}
                </Text>
              </Tooltip>
            </div>

            {/* Additional Work Indicator */}
            {position.is_additional && (
              <Tag color="purple" className="ml-2">
                Дополнительная работа
              </Tag>
            )}
          </div>

          {/* Statistics */}
          <div className="flex items-center gap-4 ml-4">
            {/* Item Count */}
            {totalItems > 0 && (
              <Tooltip title="Количество элементов">
                <div className="flex items-center gap-1">
                  <AppstoreOutlined className="text-gray-400" />
                  <Text type="secondary">{totalItems}</Text>
                </div>
              </Tooltip>
            )}

            {/* Total Cost */}
            {totalCost > 0 && (
              <Tooltip title="Общая стоимость">
                <Text strong className="text-green-600">
                  {totalCost.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </Text>
              </Tooltip>
            )}

            {/* Manual Volume */}
            {position.manual_volume && (
              <Tooltip title="Количество ГП">
                <Tag color="orange">
                  {position.manual_volume} {position.unit || 'шт'}
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>
      }
    />
  );
};

export default React.memo(PositionHeader);