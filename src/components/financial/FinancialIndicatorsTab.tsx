import React from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Typography, Divider } from 'antd';
import { 
  DollarOutlined, 
  LineChartOutlined, 
  PercentageOutlined, 
  CalculatorOutlined,
  PieChartOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface FinancialIndicatorsTabProps {
  stats: {
    actualTotalMaterials: number;
    actualTotalWorks: number;
    actualTotalSubmaterials: number;
    actualTotalSubworks: number;
    actualTotalCost: number;
  };
  costsWithCalculations: any[];
}

export const FinancialIndicatorsTab: React.FC<FinancialIndicatorsTabProps> = ({ 
  stats, 
  costsWithCalculations 
}) => {
  console.log('🚀 [FinancialIndicatorsTab] Rendering with stats:', stats);

  // Расчет рентабельности (примерные значения для демонстрации)
  const profitMargin = 15; // 15% маржа
  const totalRevenue = stats.actualTotalCost * (1 + profitMargin / 100);
  const profit = totalRevenue - stats.actualTotalCost;

  // Расчет структуры затрат
  const costStructure = [
    {
      key: 'materials',
      category: 'Материалы (BOQ)',
      amount: stats.actualTotalMaterials,
      percentage: stats.actualTotalCost > 0 ? (stats.actualTotalMaterials / stats.actualTotalCost * 100) : 0,
      color: '#ff7875'
    },
    {
      key: 'works',
      category: 'Работы (BOQ)',
      amount: stats.actualTotalWorks,
      percentage: stats.actualTotalCost > 0 ? (stats.actualTotalWorks / stats.actualTotalCost * 100) : 0,
      color: '#73d13d'
    },
    {
      key: 'submaterials',
      category: 'Субматериалы',
      amount: stats.actualTotalSubmaterials,
      percentage: stats.actualTotalCost > 0 ? (stats.actualTotalSubmaterials / stats.actualTotalCost * 100) : 0,
      color: '#40a9ff'
    },
    {
      key: 'subworks',
      category: 'Субработы',
      amount: stats.actualTotalSubworks,
      percentage: stats.actualTotalCost > 0 ? (stats.actualTotalSubworks / stats.actualTotalCost * 100) : 0,
      color: '#b37feb'
    }
  ];

  const costStructureColumns = [
    {
      title: 'Категория затрат',
      dataIndex: 'category',
      key: 'category',
      render: (text: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 12, 
              height: 12, 
              backgroundColor: record.color, 
              borderRadius: '50%', 
              marginRight: 8 
            }} 
          />
          {text}
        </div>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => (
        <Text className="money-value" strong>
          {Math.round(value).toLocaleString('ru-RU')} ₽
        </Text>
      ),
      align: 'right' as const,
    },
    {
      title: 'Доля в структуре',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress 
            percent={value} 
            size="small" 
            showInfo={false} 
            style={{ minWidth: 60, flex: 1 }}
          />
          <Text strong>{value.toFixed(1)}%</Text>
        </div>
      ),
      width: 150,
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <PieChartOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />
        Финансовые показатели проекта
      </Title>

      {/* Основные финансовые показатели */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Общие затраты"
              value={stats.actualTotalCost}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<DollarOutlined />}
              suffix="₽"
              formatter={(value) => `${Number(value).toLocaleString('ru-RU')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ожидаемая выручка"
              value={totalRevenue}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<LineChartOutlined />}
              suffix="₽"
              formatter={(value) => `${Number(value).toLocaleString('ru-RU')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Прибыль"
              value={profit}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CalculatorOutlined />}
              suffix="₽"
              formatter={(value) => `${Number(value).toLocaleString('ru-RU')}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Рентабельность"
              value={profitMargin}
              precision={1}
              valueStyle={{ color: '#722ed1' }}
              prefix={<PercentageOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Структура затрат */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
              <BarChartOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />
              Структура затрат по категориям
            </Title>
            <Table
              columns={costStructureColumns}
              dataSource={costStructure}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Итого:</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong className="money-value">
                        {Math.round(stats.actualTotalCost).toLocaleString('ru-RU')} ₽
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <Text strong>100.0%</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
              Ключевые показатели
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Text type="secondary">Средняя стоимость за м²</Text>
                <br />
                <Text strong className="money-value">
                  {stats.actualTotalCost > 0 ? 
                    `${Math.round(stats.actualTotalCost / 100).toLocaleString('ru-RU')} ₽/м²` : 
                    '0 ₽/м²'
                  }
                </Text>
              </div>
              
              <div>
                <Text type="secondary">Материалы в общих затратах</Text>
                <br />
                <Progress 
                  percent={costStructure[0].percentage} 
                  strokeColor="#ff7875"
                  format={(percent) => `${percent?.toFixed(1)}%`}
                />
              </div>
              
              <div>
                <Text type="secondary">Работы в общих затратах</Text>
                <br />
                <Progress 
                  percent={costStructure[1].percentage} 
                  strokeColor="#73d13d"
                  format={(percent) => `${percent?.toFixed(1)}%`}
                />
              </div>

              <div>
                <Text type="secondary">ROI проекта</Text>
                <br />
                <Text strong style={{ color: '#52c41a' }}>
                  {((profit / stats.actualTotalCost) * 100).toFixed(1)}%
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};