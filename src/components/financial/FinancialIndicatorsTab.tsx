import React from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Typography, Space, Tag } from 'antd';
import { 
  DollarOutlined, 
  LineChartOutlined, 
  PercentageOutlined, 
  CalculatorOutlined,
  PieChartOutlined,
  BarChartOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  BuildOutlined,
  FundOutlined,
  TeamOutlined,
  SafetyCertificateOutlined
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
  markupData?: {
    works_16_markup?: number;
    mechanization_service?: number;
    mbp_gsm?: number;
    warranty_period?: number;
    works_cost_growth?: number;
    materials_cost_growth?: number;
    contingency_costs?: number;
    overhead_own_forces?: number;
    general_costs_without_subcontract?: number;
    profit_own_forces?: number;
  };
}

export const FinancialIndicatorsTab: React.FC<FinancialIndicatorsTabProps> = ({ 
  stats, 
  costsWithCalculations,
  markupData = {}
}) => {
  console.log('🚀 [FinancialIndicatorsTab] Rendering with stats:', stats);

  // Базовые расчеты
  const totalDirectCosts = stats.actualTotalCost;
  const estimatedRevenue = totalDirectCosts * 1.20; // 20% общая маржа для демонстрации
  const estimatedProfit = estimatedRevenue - totalDirectCosts;
  const profitMargin = totalDirectCosts > 0 ? (estimatedProfit / estimatedRevenue * 100) : 0;

  // Расчет структуры прямых затрат
  const directCostStructure = [
    {
      key: 'own_materials',
      category: 'Материалы собственные',
      icon: <BuildOutlined />,
      amount: stats.actualTotalMaterials,
      percentage: totalDirectCosts > 0 ? (stats.actualTotalMaterials / totalDirectCosts * 100) : 0,
      color: '#059669',
      bgGradient: 'from-emerald-50 to-emerald-100'
    },
    {
      key: 'own_works',
      category: 'Работы собственные',
      icon: <TeamOutlined />,
      amount: stats.actualTotalWorks,
      percentage: totalDirectCosts > 0 ? (stats.actualTotalWorks / totalDirectCosts * 100) : 0,
      color: '#2563eb',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    {
      key: 'sub_materials',
      category: 'Материалы субподрядные',
      icon: <FundOutlined />,
      amount: stats.actualTotalSubmaterials,
      percentage: totalDirectCosts > 0 ? (stats.actualTotalSubmaterials / totalDirectCosts * 100) : 0,
      color: '#16a34a',
      bgGradient: 'from-green-50 to-green-100'
    },
    {
      key: 'sub_works',
      category: 'Работы субподрядные',
      icon: <SafetyCertificateOutlined />,
      amount: stats.actualTotalSubworks,
      percentage: totalDirectCosts > 0 ? (stats.actualTotalSubworks / totalDirectCosts * 100) : 0,
      color: '#9333ea',
      bgGradient: 'from-purple-50 to-purple-100'
    }
  ];

  // Структура накруток (на основе данных из markupData)
  const markupStructure = [
    { key: 'works_16', label: 'Работы 1,6', value: markupData.works_16_markup || 60, color: '#f59e0b' },
    { key: 'mechanization', label: 'Служба механизации', value: markupData.mechanization_service || 0, color: '#06b6d4' },
    { key: 'mbp_gsm', label: 'МБП+ГСМ', value: markupData.mbp_gsm || 0, color: '#8b5cf6' },
    { key: 'growth', label: 'Рост стоимости', value: markupData.works_cost_growth || 5, color: '#10b981' },
    { key: 'contingency', label: 'Непредвиденные', value: markupData.contingency_costs || 2, color: '#ef4444' },
    { key: 'overhead', label: 'ООЗ', value: markupData.overhead_own_forces || 8, color: '#f97316' },
    { key: 'general', label: 'ОФЗ', value: markupData.general_costs_without_subcontract || 5, color: '#84cc16' },
    { key: 'profit', label: 'Прибыль', value: markupData.profit_own_forces || 12, color: '#22c55e' }
  ];

  // Показатели эффективности
  const materialIntensity = totalDirectCosts > 0 ? ((stats.actualTotalMaterials + stats.actualTotalSubmaterials) / totalDirectCosts * 100) : 0;
  const workIntensity = totalDirectCosts > 0 ? ((stats.actualTotalWorks + stats.actualTotalSubworks) / totalDirectCosts * 100) : 0;
  const subcontractShare = totalDirectCosts > 0 ? ((stats.actualTotalSubmaterials + stats.actualTotalSubworks) / totalDirectCosts * 100) : 0;
  const roi = totalDirectCosts > 0 ? (estimatedProfit / totalDirectCosts * 100) : 0;

  return (
    <div className="p-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <PieChartOutlined className="text-white text-lg" />
              </div>
              Аналитика финансовых показателей
            </h3>
            <p className="text-gray-600">Комплексный анализ структуры затрат, накруток и эффективности проекта</p>
          </div>
          <Tag color="blue" className="px-4 py-2 text-sm font-medium">
            Проектный стандарт
          </Tag>
        </div>
      </div>

      {/* 1. Ключевые показатели */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <TrophyOutlined className="text-amber-500" />
          1. Ключевые показатели
        </h4>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-gray-700 font-medium text-sm">Прямые затраты</span>}
                value={totalDirectCosts}
                precision={0}
                valueStyle={{ color: '#059669', fontSize: '18px', fontWeight: '700' }}
                prefix={<DollarOutlined className="text-emerald-600" />}
                suffix="₽"
                formatter={(value) => `${Number(value).toLocaleString('ru-RU')}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-gray-700 font-medium text-sm">Ожидаемая выручка</span>}
                value={estimatedRevenue}
                precision={0}
                valueStyle={{ color: '#2563eb', fontSize: '18px', fontWeight: '700' }}
                prefix={<LineChartOutlined className="text-blue-600" />}
                suffix="₽"
                formatter={(value) => `${Number(value).toLocaleString('ru-RU')}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-gray-700 font-medium text-sm">Прибыль проекта</span>}
                value={estimatedProfit}
                precision={0}
                valueStyle={{ color: '#16a34a', fontSize: '18px', fontWeight: '700' }}
                prefix={<RiseOutlined className="text-green-600" />}
                suffix="₽"
                formatter={(value) => `${Number(value).toLocaleString('ru-RU')}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-gray-700 font-medium text-sm">Рентабельность</span>}
                value={profitMargin}
                precision={1}
                valueStyle={{ color: '#9333ea', fontSize: '18px', fontWeight: '700' }}
                prefix={<PercentageOutlined className="text-purple-600" />}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 2. Структура прямых затрат */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <BarChartOutlined className="text-blue-500" />
          2. Структура прямых затрат
        </h4>
        <Row gutter={[16, 16]}>
          {directCostStructure.map((item) => (
            <Col xs={12} sm={12} lg={6} key={item.key}>
              <Card className={`border-0 shadow-sm bg-gradient-to-br ${item.bgGradient} hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color: item.color }} className="text-lg">{item.icon}</span>
                    <span className="text-gray-700 font-medium text-sm">{item.category}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-bold" style={{ color: item.color }}>
                    {Math.round(item.amount).toLocaleString('ru-RU')} ₽
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      percent={item.percentage} 
                      size="small" 
                      showInfo={false}
                      strokeColor={item.color}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-gray-600">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 3. Структура наценок */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <ThunderboltOutlined className="text-orange-500" />
          3. Структура наценок
        </h4>
        <Row gutter={[12, 12]}>
          {markupStructure.map((markup) => (
            <Col xs={12} sm={8} md={6} lg={3} key={markup.key}>
              <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1" style={{ color: markup.color }}>
                    {markup.value.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    {markup.label}
                  </div>
                  <Progress 
                    percent={Math.min(markup.value, 100)} 
                    size="small" 
                    showInfo={false}
                    strokeColor={markup.color}
                    className="mt-2"
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 4. Показатели эффективности */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <CalculatorOutlined className="text-green-500" />
          4. Показатели эффективности
        </h4>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {materialIntensity.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-700 font-medium">Материалоемкость</div>
                <div className="text-xs text-gray-500 mt-1">Доля материалов в проекте</div>
                <Progress 
                  percent={materialIntensity} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#ef4444"
                  className="mt-2"
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {workIntensity.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-700 font-medium">Трудоемкость</div>
                <div className="text-xs text-gray-500 mt-1">Доля работ в проекте</div>
                <Progress 
                  percent={workIntensity} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#2563eb"
                  className="mt-2"
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {subcontractShare.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-700 font-medium">Доля субподряда</div>
                <div className="text-xs text-gray-500 mt-1">Внешние подрядчики</div>
                <Progress 
                  percent={subcontractShare} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#9333ea"
                  className="mt-2"
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-md transition-shadow">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600 mb-2">
                  {roi.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-700 font-medium">ROI проекта</div>
                <div className="text-xs text-gray-500 mt-1">Возврат инвестиций</div>
                <Progress 
                  percent={Math.min(roi, 100)} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#f59e0b"
                  className="mt-2"
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Summary insight */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-cyan-50">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
            <ThunderboltOutlined className="text-white" />
          </div>
          <div>
            <h5 className="text-gray-900 font-semibold mb-2">Аналитические выводы</h5>
            <Space wrap>
              <Tag color={materialIntensity > 60 ? 'red' : materialIntensity > 40 ? 'orange' : 'green'}>
                Материалоемкость: {materialIntensity > 60 ? 'Высокая' : materialIntensity > 40 ? 'Средняя' : 'Низкая'}
              </Tag>
              <Tag color={subcontractShare > 50 ? 'purple' : subcontractShare > 30 ? 'blue' : 'green'}>
                Субподряд: {subcontractShare > 50 ? 'Высокий' : subcontractShare > 30 ? 'Средний' : 'Низкий'}
              </Tag>
              <Tag color={roi > 15 ? 'green' : roi > 10 ? 'orange' : 'red'}>
                Рентабельность: {roi > 15 ? 'Отличная' : roi > 10 ? 'Хорошая' : 'Требует оптимизации'}
              </Tag>
            </Space>
          </div>
        </div>
      </Card>
    </div>
  );
};