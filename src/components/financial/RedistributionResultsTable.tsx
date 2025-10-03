import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Spin,
  message,
  Typography,
  Space,
  Tag,
  Tooltip,
  Button
} from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { clientPositionsApi, tendersApi } from '../../lib/supabase/api';
import { costRedistributionApi } from '../../lib/supabase/api/cost-redistribution';
import { supabase } from '../../lib/supabase/client';
import { formatQuantity } from '../../utils/formatters';
import { calculateWorkPortion } from '../../utils/calculations';
import type { ClientPosition } from '../../lib/supabase/types';

const { Text } = Typography;

interface RedistributionResultsTableProps {
  tenderId: string;
  tenderTitle: string;
  onRefresh?: () => void;
}

interface PositionWithRedistribution extends ClientPosition {
  original_works_cost: number;
  redistributed_works_cost: number;
  adjustment_amount: number;
  total_commercial_materials_cost?: number;
  total_commercial_works_cost?: number;
}

const RedistributionResultsTable: React.FC<RedistributionResultsTableProps> = ({
  tenderId,
  tenderTitle,
  onRefresh
}) => {
  console.log('🚀 RedistributionResultsTable rendered for tender:', tenderId);

  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<PositionWithRedistribution[]>([]);
  const [redistributionId, setRedistributionId] = useState<string | null>(null);
  const [tenderVersion, setTenderVersion] = useState<number>(1);

  // Загрузить активное перераспределение и позиции
  const loadRedistributionResults = useCallback(async () => {
    console.log('📡 Loading redistribution results for tender:', tenderId);
    setLoading(true);

    try {
      // Получить информацию о тендере
      const tenderResult = await tendersApi.getById(tenderId);
      const tenderData = Array.isArray(tenderResult.data)
        ? tenderResult.data[0]
        : tenderResult.data?.[0] || tenderResult.data;

      if (tenderData) {
        setTenderVersion(tenderData.version || 1);
      }

      // Получить активное перераспределение
      const redistributionResult = await costRedistributionApi.getActiveRedistribution(tenderId);

      if (redistributionResult.error) {
        console.error('❌ Error loading active redistribution:', redistributionResult.error);
        message.warning('Нет активного перераспределения для этого тендера');
        setPositions([]);
        setRedistributionId(null);
        setLoading(false);
        return;
      }

      if (!redistributionResult.data) {
        console.log('⚠️ No active redistribution found');
        message.info('Создайте перераспределение для просмотра результатов');
        setPositions([]);
        setRedistributionId(null);
        setLoading(false);
        return;
      }

      const activeRedistribution = redistributionResult.data;
      setRedistributionId(activeRedistribution.id);
      console.log('✅ Active redistribution found:', activeRedistribution.id);

      // Загрузить позиции
      const positionsResult = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });

      if (positionsResult.error) {
        console.error('❌ Error loading positions:', positionsResult.error);
        message.error('Ошибка загрузки позиций');
        setLoading(false);
        return;
      }

      const basePositions = positionsResult.data || [];
      console.log('📊 Base positions loaded:', basePositions.length);

      // Для каждой позиции рассчитать коммерческие стоимости с учетом перераспределения
      const positionsWithRedistribution: PositionWithRedistribution[] = await Promise.all(
        basePositions.map(async (position) => {
          // Загрузить BOQ элементы для этой позиции
          const { data: boqItems, error: boqError } = await supabase
            .from('boq_items')
            .select('id, commercial_cost, item_type, material_type, total_amount, quantity')
            .eq('client_position_id', position.id);

          if (boqError) {
            console.error('❌ Error loading BOQ items for position:', position.id, boqError);
            return {
              ...position,
              original_works_cost: 0,
              redistributed_works_cost: 0,
              adjustment_amount: 0,
              total_commercial_materials_cost: 0
            };
          }

          // Получить детали перераспределения для BOQ элементов этой позиции
          const boqItemIds = (boqItems || []).map(item => item.id);

          if (boqItemIds.length === 0) {
            return {
              ...position,
              original_works_cost: position.total_commercial_works_cost || 0,
              redistributed_works_cost: position.total_commercial_works_cost || 0,
              adjustment_amount: 0
            };
          }

          const { data: redistributionDetails, error: detailsError } = await supabase
            .from('cost_redistribution_details')
            .select('boq_item_id, original_commercial_cost, redistributed_commercial_cost, adjustment_amount')
            .eq('redistribution_id', activeRedistribution.id)
            .in('boq_item_id', boqItemIds);

          if (detailsError) {
            console.error('❌ Error loading redistribution details:', detailsError);
            return {
              ...position,
              original_works_cost: position.total_commercial_works_cost || 0,
              redistributed_works_cost: position.total_commercial_works_cost || 0,
              adjustment_amount: 0
            };
          }

          // Рассчитать суммарные изменения на уровне BOQ items
          let originalWorksCost = 0;
          let redistributedWorksCost = 0;
          let materialsCost = 0; // Стоимость материалов БЕЗ наценки

          console.log(`📊 Position ${position.position_number}: Processing ${boqItems?.length || 0} BOQ items`);

          // Для каждого BOQ item рассчитать work portion и material portion
          for (const boqItem of boqItems || []) {
            // Рассчитать исходную work portion
            const originalWorkPortion = calculateWorkPortion(
              boqItem.item_type,
              boqItem.material_type,
              boqItem.commercial_cost,
              boqItem.total_amount || 0
            );
            originalWorksCost += originalWorkPortion;

            // Рассчитать material portion (только для основных материалов)
            // total_amount - это УЖЕ итоговая сумма материала
            if ((boqItem.item_type === 'material' || boqItem.item_type === 'sub_material') &&
                boqItem.material_type === 'main') {
              materialsCost += boqItem.total_amount || 0;
            }

            // Найти детали перераспределения для этого BOQ item
            const detail = redistributionDetails?.find(d => d.boq_item_id === boqItem.id);

            if (detail) {
              // Есть перераспределение - рассчитать work portion от redistributed_commercial_cost
              const redistributedWorkPortion = calculateWorkPortion(
                boqItem.item_type,
                boqItem.material_type,
                detail.redistributed_commercial_cost,
                boqItem.total_amount || 0
              );
              redistributedWorksCost += redistributedWorkPortion;

              console.log(`  ↔️ BOQ item ${boqItem.id}: original=${originalWorkPortion.toFixed(2)}, redistributed=${redistributedWorkPortion.toFixed(2)}, diff=${(redistributedWorkPortion - originalWorkPortion).toFixed(2)}`);
            } else {
              // Нет перераспределения - использовать исходную work portion
              redistributedWorksCost += originalWorkPortion;
            }
          }

          const totalAdjustment = redistributedWorksCost - originalWorksCost;

          console.log(`✅ Position ${position.position_number}: original=${originalWorksCost.toFixed(2)}, redistributed=${redistributedWorksCost.toFixed(2)}, adjustment=${totalAdjustment.toFixed(2)}`);
          console.log(`   Materials cost (corrected): ${materialsCost.toFixed(2)}`);
          console.log(`   Total (corrected): ${(redistributedWorksCost + materialsCost).toFixed(2)}`);

          return {
            ...position,
            original_works_cost: originalWorksCost,
            redistributed_works_cost: redistributedWorksCost,
            adjustment_amount: totalAdjustment,
            total_commercial_materials_cost: materialsCost, // Используем пересчитанное значение
            total_commercial_works_cost: redistributedWorksCost
          };
        })
      );

      console.log('✅ Positions with redistribution calculated:', positionsWithRedistribution.length);
      setPositions(positionsWithRedistribution.sort((a, b) => a.position_number - b.position_number));
    } catch (error) {
      console.error('💥 Exception loading redistribution results:', error);
      message.error('Ошибка загрузки результатов перераспределения');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    loadRedistributionResults();
  }, [loadRedistributionResults]);

  const handleRefresh = () => {
    loadRedistributionResults();
    onRefresh?.();
  };

  // Колонки таблицы (структура как в /commercial-costs)
  const columns = [
    {
      title: '№',
      dataIndex: 'position_number',
      key: 'position_number',
      width: 60,
      fixed: 'left' as const,
      render: (num: number) => <Text strong>{num}</Text>
    },
    {
      title: 'Наименование работ',
      dataIndex: 'work_name',
      key: 'work_name',
      width: 300,
      fixed: 'left' as const,
      ellipsis: true,
      render: (name: string) => (
        <Tooltip title={name}>
          <Text>{name}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center' as const
    },
    {
      title: 'Стоимость работ (исходная)',
      dataIndex: 'original_works_cost',
      key: 'original_works_cost',
      width: 150,
      align: 'right' as const,
      render: (cost: number) => (
        <Text type="secondary">{formatQuantity(cost, 0)} ₽</Text>
      )
    },
    {
      title: 'Корректировка',
      dataIndex: 'adjustment_amount',
      key: 'adjustment_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => {
        const color = amount > 0 ? 'green' : amount < 0 ? 'red' : 'default';
        const sign = amount > 0 ? '+' : '';
        return (
          <Tag color={color}>
            {sign}{formatQuantity(amount, 0)} ₽
          </Tag>
        );
      }
    },
    {
      title: 'Стоимость работ (после перераспределения)',
      dataIndex: 'redistributed_works_cost',
      key: 'redistributed_works_cost',
      width: 180,
      align: 'right' as const,
      render: (cost: number) => (
        <Text strong style={{ color: '#1890ff' }}>{formatQuantity(cost, 0)} ₽</Text>
      )
    },
    {
      title: 'Стоимость материалов',
      dataIndex: 'total_commercial_materials_cost',
      key: 'total_commercial_materials_cost',
      width: 150,
      align: 'right' as const,
      render: (cost: number) => (
        <Text>{formatQuantity(cost || 0, 0)} ₽</Text>
      )
    },
    {
      title: 'Итого (с перераспределением)',
      key: 'total_with_redistribution',
      width: 180,
      align: 'right' as const,
      render: (_: any, record: PositionWithRedistribution) => {
        const total = (record.redistributed_works_cost || 0) + (record.total_commercial_materials_cost || 0);
        return (
          <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
            {formatQuantity(total, 0)} ₽
          </Text>
        );
      }
    }
  ];

  // Рассчитать итоги
  const totals = positions.reduce(
    (acc, pos) => ({
      originalWorks: acc.originalWorks + (pos.original_works_cost || 0),
      adjustments: acc.adjustments + (pos.adjustment_amount || 0),
      redistributedWorks: acc.redistributedWorks + (pos.redistributed_works_cost || 0),
      materials: acc.materials + (pos.total_commercial_materials_cost || 0),
      total: acc.total + ((pos.redistributed_works_cost || 0) + (pos.total_commercial_materials_cost || 0))
    }),
    { originalWorks: 0, adjustments: 0, redistributedWorks: 0, materials: 0, total: 0 }
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" tip="Загрузка результатов перераспределения..." />
      </div>
    );
  }

  if (!redistributionId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Нет активного перераспределения для этого тендера.
          <br />
          Создайте перераспределение для просмотра результатов.
        </Text>
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Заголовок с кнопками */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Text strong style={{ fontSize: 16 }}>
            Результаты перераспределения
          </Text>
          <Tag color="blue">Позиций: {positions.length}</Tag>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        padding: '16px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div>
          <Text type="secondary">Исходная стоимость работ:</Text>
          <div><Text strong style={{ fontSize: 18 }}>{formatQuantity(totals.originalWorks, 2)} ₽</Text></div>
        </div>
        <div>
          <Text type="secondary">Корректировка:</Text>
          <div>
            <Text strong style={{ fontSize: 18, color: totals.adjustments >= 0 ? '#52c41a' : '#f5222d' }}>
              {totals.adjustments >= 0 ? '+' : ''}{formatQuantity(totals.adjustments, 2)} ₽
            </Text>
          </div>
        </div>
        <div>
          <Text type="secondary">Стоимость работ после:</Text>
          <div><Text strong style={{ fontSize: 18, color: '#1890ff' }}>{formatQuantity(totals.redistributedWorks, 2)} ₽</Text></div>
        </div>
        <div>
          <Text type="secondary">Стоимость материалов:</Text>
          <div><Text strong style={{ fontSize: 18 }}>{formatQuantity(totals.materials, 2)} ₽</Text></div>
        </div>
        <div>
          <Text type="secondary">Итого:</Text>
          <div><Text strong style={{ fontSize: 20, color: '#52c41a' }}>{formatQuantity(totals.total, 2)} ₽</Text></div>
        </div>
      </div>

      {/* Таблица */}
      <Table
        columns={columns}
        dataSource={positions}
        rowKey="id"
        pagination={{
          pageSize: 50,
          showTotal: (total) => `Всего позиций: ${total}`,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200']
        }}
        scroll={{ x: 1400 }}
        bordered
        size="small"
      />
    </Space>
  );
};

export default RedistributionResultsTable;
