import React from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, Space } from 'antd';
import { 
  DollarOutlined, 
  LineChartOutlined, 
  PercentageOutlined, 
  RiseOutlined,
  PieChartOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ModernFinancialIndicatorsProps {
  data: {
    commercialTotal: number;
    directCosts: {
      materials: number;
      works: number;
      submaterials: number;
      subworks: number;
      total: number;
    };
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
      // Cost values (calculated)
      works16Cost?: number;
      materialsGrowthCost?: number;
      worksGrowthCost?: number;
      submaterialsGrowthCost?: number;
      subworksGrowthCost?: number;
      contingencyCost?: number;
      overheadOwnForces?: number;
      overheadSubcontract?: number;
      generalCosts?: number;
      totalProfit?: number;
    };
    tenderArea?: number;
  };
}

export const ModernFinancialIndicators: React.FC<ModernFinancialIndicatorsProps> = ({ data }) => {
  console.log('🚀 [ModernFinancialIndicators] Executive dashboard rendering with data:', data);

  const { commercialTotal, directCosts, markupData, tenderArea } = data;
  
  // Базовые расчеты для директоров
  const totalDirectCosts = directCosts.total;
  
  // Прибыль = сумма прибыли собственных сил и субподряда из markupData
  const profit = markupData?.totalProfit || (commercialTotal - totalDirectCosts);
  const profitMargin = commercialTotal > 0 ? (profit / commercialTotal * 100) : 0;
  const roi = totalDirectCosts > 0 ? (profit / totalDirectCosts * 100) : 0;

  console.log('💰 [ModernFinancialIndicators] Profit calculation:', {
    totalProfit: markupData?.totalProfit,
    fallbackProfit: commercialTotal - totalDirectCosts,
    finalProfit: profit,
    profitMargin,
    roi
  });

  // Оценка рисков
  const getRiskLevel = () => {
    if (profitMargin >= 15) return { level: 'low', color: 'success', icon: <CheckCircleOutlined />, text: 'Низкий риск' };
    if (profitMargin >= 10) return { level: 'medium', color: 'warning', icon: <WarningOutlined />, text: 'Средний риск' };
    return { level: 'high', color: 'error', icon: <ExclamationCircleOutlined />, text: 'Высокий риск' };
  };

  const riskAssessment = getRiskLevel();

  // Форматирование в миллионы
  const formatMillion = (value: number) => {
    return (value / 1000000).toFixed(1);
  };

  return (
    <div className="p-0">
      {/* Заголовок для директоров */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <PieChartOutlined className="text-white text-xl" />
              </div>
              Финансовые показатели проекта
            </h2>
            <p className="text-gray-600 text-lg">Ключевые метрики для принятия управленческих решений</p>
          </div>
          <Tag color={riskAssessment.color} className="px-6 py-3 text-base font-semibold flex items-center gap-2">
            {riskAssessment.icon}
            {riskAssessment.text}
          </Tag>
        </div>
      </div>

      {/* 4 ключевые метрики для директоров */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarOutlined className="text-white text-2xl" />
              </div>
              <div className="text-4xl font-bold text-blue-700 mb-2">
                {formatMillion(totalDirectCosts)} млн
              </div>
              <div className="text-lg font-semibold text-gray-700">Прямые затраты</div>
              <div className="text-sm text-gray-500 mt-1">Базовая стоимость проекта</div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LineChartOutlined className="text-white text-2xl" />
              </div>
              <div className="text-4xl font-bold text-indigo-700 mb-2">
                {formatMillion(commercialTotal)} млн
              </div>
              <div className="text-lg font-semibold text-gray-700">Коммерческая стоимость</div>
              <div className="text-sm text-gray-500 mt-1">Итоговая цена для заказчика</div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <PercentageOutlined className="text-white text-2xl" />
              </div>
              <div className="text-4xl font-bold text-green-700 mb-2">
                {profitMargin.toFixed(1)}%
              </div>
              <div className="text-lg font-semibold text-gray-700">Маржа прибыли</div>
              <div className="text-sm text-gray-500 mt-1">{formatMillion(profit)} млн ₽ прибыль</div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <RiseOutlined className="text-white text-2xl" />
              </div>
              <div className="text-4xl font-bold text-purple-700 mb-2">
                {roi.toFixed(1)}%
              </div>
              <div className="text-lg font-semibold text-gray-700">ROI проекта</div>
              <div className="text-sm text-gray-500 mt-1">Возврат на инвестиции</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Показатель на м² если есть площадь */}
      {tenderArea && tenderArea > 0 && (
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24}>
            <Card className="border-0 shadow-lg bg-gradient-to-r from-cyan-50 to-teal-50">
              <div className="text-center">
                <h4 className="text-xl font-semibold text-gray-800 mb-4">Стоимость за м²</h4>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <div className="text-2xl font-bold text-cyan-700">
                      {Math.round(commercialTotal / tenderArea).toLocaleString('ru-RU')} ₽/м²
                    </div>
                    <div className="text-gray-600">Коммерческая цена</div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="text-2xl font-bold text-blue-700">
                      {Math.round(totalDirectCosts / tenderArea).toLocaleString('ru-RU')} ₽/м²
                    </div>
                    <div className="text-gray-600">Себестоимость</div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="text-2xl font-bold text-green-700">
                      {Math.round(profit / tenderArea).toLocaleString('ru-RU')} ₽/м²
                    </div>
                    <div className="text-gray-600">Прибыль</div>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Краткая аналитическая сводка для директоров */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-gray-800 mb-4">Управленческое заключение</h4>
          <Space size="large" wrap>
            <Tag 
              color={profitMargin >= 15 ? 'green' : profitMargin >= 10 ? 'orange' : 'red'} 
              className="px-4 py-2 text-base font-medium"
            >
              Проект {profitMargin >= 15 ? 'высоко рентабелен' : profitMargin >= 10 ? 'умеренно рентабелен' : 'требует пересмотра'}
            </Tag>
            <Tag 
              color={roi >= 20 ? 'green' : roi >= 15 ? 'blue' : roi >= 10 ? 'orange' : 'red'} 
              className="px-4 py-2 text-base font-medium"
            >
              ROI: {roi >= 20 ? 'отличный' : roi >= 15 ? 'хороший' : roi >= 10 ? 'средний' : 'низкий'}
            </Tag>
            <Tag 
              color={commercialTotal >= 50000000 ? 'purple' : commercialTotal >= 20000000 ? 'blue' : 'cyan'} 
              className="px-4 py-2 text-base font-medium"
            >
              {commercialTotal >= 50000000 ? 'Крупный проект' : commercialTotal >= 20000000 ? 'Средний проект' : 'Малый проект'}
            </Tag>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ModernFinancialIndicators;