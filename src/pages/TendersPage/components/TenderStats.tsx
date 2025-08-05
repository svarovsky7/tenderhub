import React from 'react';
import { Card, Row, Col, Statistic, Badge } from 'antd';
import {
  FolderOpenOutlined,
  TrophyOutlined,
  DollarOutlined
} from '@ant-design/icons';
import type { TenderStatsProps } from '../types';

const TenderStats: React.FC<TenderStatsProps> = ({ stats, loading = false }) => {
  console.log('🚀 TenderStats component rendered');
  console.log('📊 Stats data:', stats);

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card size="small" loading={loading}>
          <Statistic
            title="Всего тендеров"
            value={stats.total}
            prefix={<FolderOpenOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small" loading={loading}>
          <Statistic
            title="Активных"
            value={stats.active}
            prefix={<Badge status="processing" />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small" loading={loading}>
          <Statistic
            title="Выиграно"
            value={stats.won}
            prefix={<TrophyOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small" loading={loading}>
          <Statistic
            title="Общая стоимость"
            value={stats.totalValue / 1000000}
            precision={1}
            suffix="М ₽"
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default TenderStats;