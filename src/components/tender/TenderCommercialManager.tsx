import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Empty, 
  Spin, 
  message, 
  Card,
  Space,
  Typography,
  Table,
  Row,
  Col,
  Statistic,
  InputNumber,
  Tooltip,
  Tag
} from 'antd';
import { ReloadOutlined, BuildOutlined, ToolOutlined, DollarOutlined, PercentageOutlined } from '@ant-design/icons';
import { clientPositionsApi, boqApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import { getActiveTenderMarkup } from '../../lib/supabase/api/tender-markup';
import type { ClientPositionInsert, ClientPositionType } from '../../lib/supabase/types';
import type { TenderMarkupPercentages } from '../../lib/supabase/types/tender-markup';
import { formatQuantity } from '../../utils/formatters';
import { 
  calculateBOQItemCommercialCost,
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateWorkCommercialCost 
} from '../../utils/calculateCommercialCost';

const { Title, Text } = Typography;

interface TenderCommercialManagerProps {
  tenderId: string;
  onStatsUpdate?: (stats: { 
    totalBaseCost: number; 
    totalCommercialCost: number; 
    totalMarkup: number; 
    positions: number 
  }) => void;
}

interface ClientPositionWithCommercial {
  id: string;
  tender_id: string;
  position_number: number;
  item_no: string;
  work_name: string;
  total_materials_cost: number;
  total_works_cost: number;
  total_commercial_materials_cost?: number;
  total_commercial_works_cost?: number;
  created_at: string;
  updated_at: string;
  position_type?: ClientPositionType;
  boq_items?: any[];
  base_total_cost?: number;
  commercial_total_cost?: number;
  markup_percentage?: number;
  // Новые поля для детализации
  works_unit_price?: number;       // Средняя цена работ за единицу
  materials_unit_price?: number;   // Средняя цена материалов за единицу
  works_total_volume?: number;     // Общий объем работ
  materials_total_volume?: number; // Общий объем материалов
  works_total_cost?: number;       // Итого работы (руб)
  materials_total_cost?: number;   // Итого материалы (руб)
  // Дополнительные поля для количеств
  client_quantity?: number;        // Кол-во Заказчика (area_client)
  gp_quantity?: number;            // Кол-во ГП (area_sp)
  manual_volume?: number;          // Ручной объем
}

const TenderCommercialManager: React.FC<TenderCommercialManagerProps> = ({ 
  tenderId,
  onStatsUpdate 
}) => {
  console.log('🚀 TenderCommercialManager MOUNTED/RENDERED for tender:', tenderId, 'at', new Date().toISOString());

  const [positions, setPositions] = useState<ClientPositionWithCommercial[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Sort positions by position number
  const sortPositionsByNumber = useCallback((positions: ClientPositionWithCommercial[]): ClientPositionWithCommercial[] => {
    return [...positions].sort((a, b) => a.position_number - b.position_number);
  }, []);

  // Calculate and update stats
  const updateStats = useCallback((positionsList: ClientPositionWithCommercial[]) => {
    const stats = {
      positions: positionsList.length,
      totalBaseCost: 0,
      totalCommercialCost: 0,
      totalMarkup: 0
    };

    positionsList.forEach(position => {
      const baseCost = (position.total_materials_cost || 0) + (position.total_works_cost || 0);
      const commercialCost = (position.total_commercial_materials_cost || 0) + (position.total_commercial_works_cost || 0);
      
      stats.totalBaseCost += baseCost;
      stats.totalCommercialCost += commercialCost;
    });

    stats.totalMarkup = stats.totalCommercialCost - stats.totalBaseCost;

    console.log('📊 Commercial Stats calculated:', stats);
    onStatsUpdate?.(stats);
  }, [onStatsUpdate]);

  // Load positions with commercial data
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading commercial positions for tender:', tenderId);
    setLoading(true);
    try {
      // Загружаем проценты накруток для тендера
      const markups = await getActiveTenderMarkup(tenderId);
      if (!markups) {
        console.warn('⚠️ No markup percentages found for tender:', tenderId);
        message.warning('Не найдены проценты накруток для тендера');
      }
      console.log('✅ Markup percentages loaded:', markups);

      const result = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ Positions loaded:', result.data?.length);

      // Load BOQ items for each position to calculate commercial costs
      const positionsWithCommercial = await Promise.all(
        (result.data || []).map(async (pos) => {
          // Load BOQ items for this position
          const { data: boqItems } = await boqApi.getByClientPositionId(pos.id);
          
          const items = boqItems || [];
          
          // Calculate base costs
          const baseMaterialsCost = items
            .filter(item => item.item_type === 'material' || item.item_type === 'sub_material')
            .reduce((sum, item) => sum + (item.total_amount || 0), 0);
          
          const baseWorksCost = items
            .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
            .reduce((sum, item) => sum + (item.total_amount || 0), 0);

          // Calculate commercial costs using markup percentages
          // Для материалов: основные (связанные) vs вспомогательные (несвязанные)
          let totalMaterialsCommercialCost = 0;
          let totalWorksMarkupFromMaterials = 0;
          
          items
            .filter(item => item.item_type === 'material' || item.item_type === 'sub_material')
            .forEach(item => {
              let quantity = item.quantity || 0;
              const isLinkedMaterial = !!item.work_link;
              
              // For linked materials, calculate quantity based on work volume and coefficients
              if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
                const work = items.find(procItem => {
                  if (item.work_link.work_boq_item_id && 
                      procItem.id === item.work_link.work_boq_item_id && 
                      procItem.item_type === 'work') {
                    return true;
                  }
                  if (item.work_link.sub_work_boq_item_id && 
                      procItem.id === item.work_link.sub_work_boq_item_id && 
                      procItem.item_type === 'sub_work') {
                    return true;
                  }
                  return false;
                });
                
                if (work) {
                  const consumptionCoef = item.consumption_coefficient || 
                                         item.work_link.material_quantity_per_work || 1;
                  const conversionCoef = item.conversion_coefficient || 
                                        item.work_link.usage_coefficient || 1;
                  const workQuantity = work.quantity || 0;
                  quantity = workQuantity * consumptionCoef * conversionCoef;
                }
              }
              
              // Базовая стоимость материала за единицу
              const baseCost = (item.unit_rate || 0) + (item.delivery_amount || 0);
              // Полная базовая стоимость материала (Материалы ПЗ)
              const fullBaseCost = baseCost * quantity;
              
              if (markups) {
                if (isLinkedMaterial) {
                  // Основной материал (связан с работой)
                  const result = calculateMainMaterialCommercialCost(fullBaseCost, markups);
                  totalMaterialsCommercialCost += result.materialCost; // Остается только базовая стоимость
                  totalWorksMarkupFromMaterials += result.workMarkup; // Наценка переходит в работы
                } else {
                  // Вспомогательный материал (не связан с работой)
                  const result = calculateAuxiliaryMaterialCommercialCost(fullBaseCost, markups);
                  totalMaterialsCommercialCost += result.materialCost; // Всегда 0 для вспомогательных
                  totalWorksMarkupFromMaterials += result.workMarkup; // Вся стоимость переходит в работы
                }
              } else {
                totalMaterialsCommercialCost += fullBaseCost;
              }
            });
          
          const commercialMaterialsCost = totalMaterialsCommercialCost;

          const commercialWorksOnlyCost = items
            .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
            .reduce((sum, item) => {
              const quantity = item.quantity || 0;
              // Базовая стоимость работы (Работа ПЗ)
              const baseCost = (item.unit_rate || 0) * quantity;
              
              // Используем правильную функцию для расчета коммерческой стоимости работ
              let commercialTotalCost = baseCost;
              
              if (markups) {
                if (item.item_type === 'work') {
                  // Для работ собственными силами
                  commercialTotalCost = calculateWorkCommercialCost(baseCost, markups);
                  console.log('💰 Work commercial cost:', {
                    description: item.description,
                    baseCost,
                    commercialCost: commercialTotalCost,
                    markup: commercialTotalCost - baseCost
                  });
                } else if (item.item_type === 'sub_work') {
                  // Для субподрядных работ используем базовую функцию
                  commercialTotalCost = calculateBOQItemCommercialCost(item.item_type, baseCost, markups);
                  console.log('💰 Sub-work commercial cost:', {
                    description: item.description,
                    baseCost,
                    commercialCost: commercialTotalCost,
                    markup: commercialTotalCost - baseCost
                  });
                }
              } else {
                commercialTotalCost = baseCost * (item.commercial_markup_coefficient || 1);
              }
              
              return sum + commercialTotalCost;
            }, 0);
          
          // Коммерческая стоимость работ = работы + наценки от материалов
          const commercialWorksCost = commercialWorksOnlyCost + totalWorksMarkupFromMaterials;

          const baseTotalCost = baseMaterialsCost + baseWorksCost;
          const commercialTotalCost = commercialMaterialsCost + commercialWorksCost;
          const markupPercentage = baseTotalCost > 0 ? ((commercialTotalCost - baseTotalCost) / baseTotalCost) * 100 : 0;

          // Расчет детализации по работам и материалам
          const workItems = items.filter(item => item.item_type === 'work' || item.item_type === 'sub_work');
          const materialItems = items.filter(item => item.item_type === 'material' || item.item_type === 'sub_material');

          // Для работ - используем рассчитанную коммерческую стоимость
          const worksTotalVolume = workItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const worksTotalCost = commercialWorksCost; // Используем уже рассчитанную коммерческую стоимость работ
          const worksUnitPrice = worksTotalVolume > 0 ? worksTotalCost / worksTotalVolume : 0;

          // Для материалов - используем рассчитанную коммерческую стоимость  
          let materialsTotalVolume = 0;

          materialItems.forEach(item => {
            let quantity = item.quantity || 0;
            
            // Для связанных материалов, рассчитываем количество на основе работ
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
              const work = items.find(procItem => {
                if (item.work_link.work_boq_item_id && 
                    procItem.id === item.work_link.work_boq_item_id && 
                    procItem.item_type === 'work') {
                  return true;
                }
                if (item.work_link.sub_work_boq_item_id && 
                    procItem.id === item.work_link.sub_work_boq_item_id && 
                    procItem.item_type === 'sub_work') {
                  return true;
                }
                return false;
              });
              
              if (work) {
                const consumptionCoef = item.consumption_coefficient || 
                                       item.work_link.material_quantity_per_work || 1;
                const conversionCoef = item.conversion_coefficient || 
                                      item.work_link.usage_coefficient || 1;
                const workQuantity = work.quantity || 0;
                quantity = workQuantity * consumptionCoef * conversionCoef;
              }
            }

            materialsTotalVolume += quantity;
          });

          const materialsTotalCost = commercialMaterialsCost; // Используем уже рассчитанную коммерческую стоимость материалов
          const materialsUnitPrice = materialsTotalVolume > 0 ? materialsTotalCost / materialsTotalVolume : 0;
          
          return {
            ...pos,
            boq_items: items,
            total_commercial_materials_cost: commercialMaterialsCost,
            total_commercial_works_cost: commercialWorksCost,
            base_total_cost: baseTotalCost,
            commercial_total_cost: commercialTotalCost,
            markup_percentage: markupPercentage,
            // Новые поля для детализации
            works_unit_price: worksUnitPrice,
            materials_unit_price: materialsUnitPrice,
            works_total_volume: worksTotalVolume,
            materials_total_volume: materialsTotalVolume,
            works_total_cost: worksTotalCost,
            materials_total_cost: materialsTotalCost,
            // Данные из позиции заказчика (не из тендера)
            client_quantity: pos.volume || 0,        // Кол-во Заказчика из Excel
            gp_quantity: pos.manual_volume || 0,     // Кол-во ГП (объем, заданный вручную ГП)
            manual_volume: pos.manual_volume || 0    // Дублируем для совместимости
          };
        })
      );
      
      console.log('✅ Positions with commercial data loaded:', positionsWithCommercial);
      setPositions(positionsWithCommercial);
      updateStats(positionsWithCommercial);
    } catch (error) {
      console.error('❌ Load commercial positions error:', error);
      message.error('Ошибка загрузки коммерческих позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId, updateStats]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Update commercial markup coefficient for BOQ item
  const updateCommercialMarkup = async (positionId: string, itemId: string, newCoefficient: number) => {
    try {
      console.log('🔄 Updating commercial markup:', { positionId, itemId, newCoefficient });
      
      // Update via API (you'll need to implement this in your BOQ API)
      // await boqApi.updateCommercialMarkup(itemId, newCoefficient);
      
      // Reload positions to reflect changes
      loadPositions();
      message.success('Коммерческая наценка обновлена');
    } catch (error) {
      console.error('❌ Update commercial markup error:', error);
      message.error('Ошибка обновления коммерческой наценки');
    }
  };

  // Table columns for commercial positions
  const columns = [
    {
      title: '№',
      dataIndex: 'position_number',
      key: 'position_number',
      width: 60,
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => a.position_number - b.position_number,
      fixed: 'left' as const,
    },
    {
      title: 'Наименование позиции',
      dataIndex: 'work_name',
      key: 'work_name',
      ellipsis: true,
      width: 200,
      fixed: 'left' as const,
    },
    {
      title: 'Кол-во Заказчика',
      key: 'client_quantity',
      width: 120,
      align: 'center' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text>
          {record.client_quantity && record.client_quantity > 0 
            ? formatQuantity(record.client_quantity, 2)
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.client_quantity || 0) - (b.client_quantity || 0),
    },
    {
      title: 'Кол-во ГП',
      key: 'gp_quantity',
      width: 100,
      align: 'center' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text>
          {record.gp_quantity && record.gp_quantity > 0 
            ? formatQuantity(record.gp_quantity, 2)
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.gp_quantity || 0) - (b.gp_quantity || 0),
    },
    {
      title: 'Цена работ за ед.изм',
      key: 'works_unit_price',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text>
          {record.works_unit_price && record.works_unit_price > 0 
            ? `${formatQuantity(record.works_unit_price, 2)} ₽/ед.` 
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.works_unit_price || 0) - (b.works_unit_price || 0),
    },
    {
      title: 'Цена материала за ед.изм',
      key: 'materials_unit_price',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text>
          {record.materials_unit_price && record.materials_unit_price > 0 
            ? `${formatQuantity(record.materials_unit_price, 2)} ₽/ед.` 
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.materials_unit_price || 0) - (b.materials_unit_price || 0),
    },
    {
      title: 'Итого работа, руб',
      key: 'works_total_cost',
      width: 130,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text strong style={{ color: '#1890ff' }}>
          {record.works_total_cost && record.works_total_cost > 0 
            ? `${formatQuantity(record.works_total_cost, 0)} ₽` 
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.works_total_cost || 0) - (b.works_total_cost || 0),
    },
    {
      title: 'Итого материал, руб',
      key: 'materials_total_cost',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text strong style={{ color: '#722ed1' }}>
          {record.materials_total_cost && record.materials_total_cost > 0 
            ? `${formatQuantity(record.materials_total_cost, 0)} ₽` 
            : '—'}
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.materials_total_cost || 0) - (b.materials_total_cost || 0),
    },
    {
      title: 'Базовая стоимость',
      key: 'base_cost',
      width: 140,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text strong>
          {formatQuantity(record.base_total_cost || 0, 0)} ₽
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.base_total_cost || 0) - (b.base_total_cost || 0),
    },
    {
      title: 'Коммерческая стоимость',
      key: 'commercial_cost',
      width: 160,
      align: 'right' as const,
      render: (record: ClientPositionWithCommercial) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatQuantity(record.commercial_total_cost || 0, 0)} ₽
        </Text>
      ),
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.commercial_total_cost || 0) - (b.commercial_total_cost || 0),
    },
    {
      title: 'Наценка',
      key: 'markup',
      width: 120,
      align: 'right' as const,
      fixed: 'right' as const,
      render: (record: ClientPositionWithCommercial) => {
        const markup = (record.commercial_total_cost || 0) - (record.base_total_cost || 0);
        const percentage = record.markup_percentage || 0;
        return (
          <div className="text-right">
            <div>
              <Text strong style={{ color: markup >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {markup >= 0 ? '+' : ''}{formatQuantity(markup, 0)} ₽
              </Text>
            </div>
            <div>
              <Tag color={percentage >= 0 ? 'green' : 'red'} size="small">
                {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
              </Tag>
            </div>
          </div>
        );
      },
      sorter: (a: ClientPositionWithCommercial, b: ClientPositionWithCommercial) => (a.markup_percentage || 0) - (b.markup_percentage || 0),
    },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <Card className="shadow-sm mb-3 w-full" bodyStyle={{ padding: '10px 16px' }}>
        <div className="flex flex-col">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
            {/* Statistics */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <DollarOutlined className="text-blue-500" style={{ fontSize: 16 }} />
                <div className="flex items-baseline gap-1">
                  <Text type="secondary" className="text-xs" style={{ cursor: 'default' }}>Позиций:</Text>
                  <Text strong className="text-sm" style={{ cursor: 'default' }}>{positions.length}</Text>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <BuildOutlined className="text-orange-500" style={{ fontSize: 16 }} />
                <div className="flex items-baseline gap-1">
                  <Text type="secondary" className="text-xs" style={{ cursor: 'default' }}>Работ:</Text>
                  <Text strong className="text-sm" style={{ cursor: 'default' }}>
                    {positions.reduce((sum, pos) => 
                      sum + (pos.boq_items?.filter(item => 
                        item.item_type === 'work' || item.item_type === 'sub_work'
                      ).length || 0), 0
                    )}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ToolOutlined className="text-purple-500" style={{ fontSize: 16 }} />
                <div className="flex items-baseline gap-1">
                  <Text type="secondary" className="text-xs" style={{ cursor: 'default' }}>Материалов:</Text>
                  <Text strong className="text-sm" style={{ cursor: 'default' }}>
                    {positions.reduce((sum, pos) => 
                      sum + (pos.boq_items?.filter(item => 
                        item.item_type === 'material' || item.item_type === 'sub_material'
                      ).length || 0), 0
                    )}
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Buttons */}
            <Space className="flex-shrink-0 flex items-center" size="small">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadPositions}
                loading={loading}
                size="middle"
              >
                Обновить
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {/* Commercial Summary */}
      <Card className="shadow-sm mb-3 w-full" bodyStyle={{ padding: '16px' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={8}>
            <Statistic
              title="Базовая стоимость"
              value={positions.reduce((sum, pos) => sum + (pos.base_total_cost || 0), 0)}
              formatter={(value) => `${formatQuantity(Number(value), 0)} ₽`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Коммерческая стоимость"
              value={positions.reduce((sum, pos) => sum + (pos.commercial_total_cost || 0), 0)}
              formatter={(value) => `${formatQuantity(Number(value), 0)} ₽`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="Общая наценка"
              value={positions.reduce((sum, pos) => sum + ((pos.commercial_total_cost || 0) - (pos.base_total_cost || 0)), 0)}
              formatter={(value) => {
                const markup = Number(value);
                return `${markup >= 0 ? '+' : ''}${formatQuantity(markup, 0)} ₽`;
              }}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PercentageOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Positions Table */}
      {loading && positions.length === 0 ? (
        <Card className="text-center py-12 w-full">
          <Spin size="large" />
        </Card>
      ) : positions.length === 0 ? (
        <Card className="w-full">
          <Empty
            description="Нет позиций для отображения коммерческих стоимостей"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Card className="w-full">
          <Table
            dataSource={sortPositionsByNumber(positions)}
            columns={columns}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} позиций`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20,
            }}
            scroll={{ x: 1620, y: 600 }}
            size="small"
            bordered
            sticky
          />
        </Card>
      )}
    </div>
  );
};

export default TenderCommercialManager;