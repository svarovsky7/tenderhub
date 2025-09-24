import React from 'react';
import { Row, Col, Statistic, Card, Tag, Space, Tooltip, Progress } from 'antd';
import {
  ToolOutlined,
  BuildOutlined,
  DollarOutlined,
  CalculatorOutlined,
  PercentageOutlined,
  FileTextOutlined
} from '@ant-design/icons';

interface PositionStatisticsProps {
  totalItems: number;
  worksCount: number;
  materialsCount: number;
  totalCost: number;
  commercialCosts: {
    works: number;
    materials: number;
    total: number;
    breakdown: any[];
  };
  manualVolume?: number | null;
  manualNote?: string | null;
  unit?: string;
}

const PositionStatistics: React.FC<PositionStatisticsProps> = ({
  totalItems,
  worksCount,
  materialsCount,
  totalCost,
  commercialCosts,
  manualVolume,
  manualNote,
  unit
}) => {
  // Calculate markup percentage
  const markupPercentage = totalCost > 0
    ? ((commercialCosts.total - totalCost) / totalCost) * 100
    : 0;

  // Calculate work/material ratio
  const workPercentage = totalItems > 0 ? (worksCount / totalItems) * 100 : 0;
  const materialPercentage = totalItems > 0 ? (materialsCount / totalItems) * 100 : 0;

  return (
    <Card className="mb-4 shadow-sm">
      <Row gutter={[16, 16]}>
        {/* Items Statistics */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                <FileTextOutlined />
                <span>Всего элементов</span>
              </Space>
            }
            value={totalItems}
            suffix={
              <Tooltip title="Распределение по типам">
                <Space direction="vertical" size="small" className="ml-2">
                  <Tag color="orange" className="text-xs">
                    <BuildOutlined /> {worksCount} работ
                  </Tag>
                  <Tag color="blue" className="text-xs">
                    <ToolOutlined /> {materialsCount} материалов
                  </Tag>
                </Space>
              </Tooltip>
            }
          />
        </Col>

        {/* Base Cost */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                <DollarOutlined />
                <span>Базовая стоимость</span>
              </Space>
            }
            value={totalCost}
            precision={2}
            suffix="₽"
            valueStyle={{ color: '#52c41a' }}
            formatter={(value) => {
              const num = Number(value);
              if (num >= 1000000) {
                return `${(num / 1000000).toFixed(2)} млн`;
              } else if (num >= 1000) {
                return `${(num / 1000).toFixed(2)} тыс`;
              }
              return num.toLocaleString('ru-RU');
            }}
          />
        </Col>

        {/* Commercial Cost */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                <CalculatorOutlined />
                <span>Коммерческая стоимость</span>
              </Space>
            }
            value={commercialCosts.total}
            precision={2}
            suffix="₽"
            valueStyle={{ color: '#1890ff' }}
            formatter={(value) => {
              const num = Number(value);
              if (num >= 1000000) {
                return `${(num / 1000000).toFixed(2)} млн`;
              } else if (num >= 1000) {
                return `${(num / 1000).toFixed(2)} тыс`;
              }
              return num.toLocaleString('ru-RU');
            }}
          />
          {markupPercentage > 0 && (
            <div className="mt-2">
              <Tooltip title={`Наценка: ${markupPercentage.toFixed(1)}%`}>
                <Progress
                  percent={Math.min(markupPercentage, 100)}
                  size="small"
                  format={() => `+${markupPercentage.toFixed(1)}%`}
                  strokeColor="#52c41a"
                />
              </Tooltip>
            </div>
          )}
        </Col>

        {/* Manual Volume */}
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                <PercentageOutlined />
                <span>Количество ГП</span>
              </Space>
            }
            value={manualVolume || 0}
            suffix={unit || 'шт'}
            valueStyle={{ color: manualVolume ? '#fa8c16' : '#d9d9d9' }}
          />
          {manualNote && (
            <Tooltip title={manualNote}>
              <Tag color="blue" className="mt-2">
                <FileTextOutlined /> Есть примечание
              </Tag>
            </Tooltip>
          )}
        </Col>
      </Row>

      {/* Distribution Chart */}
      {totalItems > 0 && (
        <Row className="mt-4 pt-4 border-t border-gray-200">
          <Col span={24}>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Распределение элементов:</span>
              <Space>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span className="text-xs">Работы {workPercentage.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <span className="text-xs">Материалы {materialPercentage.toFixed(0)}%</span>
                </div>
              </Space>
            </div>
            <div className="flex h-2 mt-2 rounded overflow-hidden">
              <div
                className="bg-orange-400"
                style={{ width: `${workPercentage}%` }}
              />
              <div
                className="bg-blue-400"
                style={{ width: `${materialPercentage}%` }}
              />
            </div>
          </Col>
        </Row>
      )}

      {/* Cost Breakdown */}
      {commercialCosts.total > 0 && (
        <Row className="mt-4 pt-4 border-t border-gray-200">
          <Col span={24}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Разбивка коммерческой стоимости:</span>
            </div>
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between">
                <span className="text-sm">Работы:</span>
                <span className="text-sm font-medium">
                  {commercialCosts.works.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Материалы:</span>
                <span className="text-sm font-medium">
                  {commercialCosts.materials.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-medium">Итого:</span>
                <span className="text-sm font-bold text-green-600">
                  {commercialCosts.total.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </span>
              </div>
            </Space>
          </Col>
        </Row>
      )}
    </Card>
  );
};

export default React.memo(PositionStatistics);