import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Table,
  InputNumber,
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
  Tag,
  Spin,
  Divider
} from 'antd';
import {
  CheckCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  WarningOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { SourceWithdrawal } from '../../lib/supabase/types/cost-redistribution';
import { supabase } from '../../lib/supabase/client';
import { costRedistributionApi } from '../../lib/supabase/api/cost-redistribution';
import { formatQuantity } from '../../utils/formatters';
import CascadeCostCategorySelector from './CascadeCostCategorySelector';

const { Title, Text } = Typography;

interface CategoryWithStats {
  id: string;
  name: string;
  current_works_cost: number;
  items_count: number;
}

interface CostRedistributionWizardProps {
  tenderId: string;
  tenderTitle: string;
  onComplete: () => void;
  onCancel: () => void;
}

const CostRedistributionWizard: React.FC<CostRedistributionWizardProps> = ({
  tenderId,
  tenderTitle,
  onComplete,
  onCancel
}) => {
  console.log('🚀 CostRedistributionWizard rendered for tender:', tenderId);

  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Данные категорий
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);

  // Шаг 1: Исходные категории с процентами (расширенная структура с каскадом)
  const [sourceWithdrawals, setSourceWithdrawals] = useState<Array<{
    cost_category_id: string;
    cost_category_name?: string;
    detail_cost_category_ids?: string[];
    detail_cost_category_names?: string[];
    percent: number;
  }>>([]);

  // Шаг 2: Целевые категории (расширенная структура с каскадом)
  const [targetCategories, setTargetCategories] = useState<Array<{
    cost_category_id: string;
    cost_category_name?: string;
    detail_cost_category_ids?: string[];
    detail_cost_category_names?: string[];
  }>>([]);

  // Загрузить категории затрат с текущими стоимостями работ
  useEffect(() => {
    const loadCategories = async () => {
      console.log('📡 Loading cost categories for tender:', tenderId);
      setCategoriesLoading(true);

      try {
        // Загрузить категории с расчётом текущей стоимости работ
        const { data, error } = await supabase
          .rpc('get_categories_with_work_costs', { p_tender_id: tenderId });

        if (error) {
          console.error('❌ Error loading categories:', error);
          message.error('Ошибка загрузки категорий затрат');
          return;
        }

        console.log('✅ Categories loaded:', data);
        setCategories(data || []);
      } catch (error) {
        console.error('💥 Exception loading categories:', error);
        message.error('Ошибка загрузки категорий');
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [tenderId]);

  // Загрузить существующую конфигурацию перераспределения
  useEffect(() => {
    const loadExistingConfig = async () => {
      console.log('📡 Loading existing redistribution config for tender:', tenderId);

      try {
        const result = await costRedistributionApi.getActiveRedistribution(tenderId);

        if (result.error || !result.data) {
          console.log('⚠️ No active redistribution found');
          return;
        }

        const activeRedistribution = result.data;
        console.log('✅ Active redistribution found:', activeRedistribution);

        // Восстановить конфигурацию если она есть
        if (activeRedistribution.source_config && Array.isArray(activeRedistribution.source_config)) {
          console.log('📦 Restoring source config:', activeRedistribution.source_config);
          setSourceWithdrawals(activeRedistribution.source_config);
        }

        if (activeRedistribution.target_config && Array.isArray(activeRedistribution.target_config)) {
          console.log('📦 Restoring target config:', activeRedistribution.target_config);
          setTargetCategories(activeRedistribution.target_config);
        }

        console.log('✅ Configuration restored successfully');
      } catch (error) {
        console.error('💥 Exception loading existing config:', error);
      }
    };

    loadExistingConfig();
  }, [tenderId]);

  // Применить перераспределение с валидацией
  const handleApply = useCallback(async () => {
    // Валидация исходных категорий
    if (sourceWithdrawals.length === 0) {
      message.warning('Выберите хотя бы одну категорию для вычитания');
      return;
    }

    const totalPercent = sourceWithdrawals.reduce((sum, sw) => sum + sw.percent, 0);
    if (totalPercent <= 0) {
      message.warning('Общий процент вычитания должен быть больше 0');
      return;
    }

    // Валидация целевых категорий
    if (targetCategories.length === 0) {
      message.warning('Выберите хотя бы одну целевую категорию');
      return;
    }

    // Проверка что исходные и целевые не пересекаются (по detail_cost_category_ids)
    const sourceDetailIds = sourceWithdrawals.flatMap(sw => sw.detail_cost_category_ids || []);
    const targetDetailIds = targetCategories.flatMap(tc => tc.detail_cost_category_ids || []);

    const overlap = targetDetailIds.some(id => sourceDetailIds.includes(id));

    if (overlap) {
      message.warning('Целевые категории не должны совпадать с исходными');
      return;
    }

    // Применить перераспределение
    await applyRedistribution();
  }, [sourceWithdrawals, targetCategories]);

  // Применить перераспределение
  const applyRedistribution = useCallback(async () => {
    console.log('🚀 Applying redistribution...');
    setLoading(true);

    try {
      // Преобразовать каскадную структуру в формат API
      // API ожидает: { detail_cost_category_id, percent }[]
      const flatSourceWithdrawals: SourceWithdrawal[] = [];

      for (const sw of sourceWithdrawals) {
        if (sw.detail_cost_category_ids && sw.detail_cost_category_ids.length > 0) {
          // Если указаны конкретные detail categories - создаем запись для каждой
          sw.detail_cost_category_ids.forEach(detailId => {
            flatSourceWithdrawals.push({
              detail_cost_category_id: detailId,
              percent: sw.percent
            });
          });
        } else {
          // Если не указаны - получаем все detail_cost_category_ids для данной cost_category
          console.log('📡 Fetching detail categories for cost_category:', sw.cost_category_id);
          const { data: detailCategories, error } = await supabase
            .from('detail_cost_categories')
            .select('id')
            .eq('cost_category_id', sw.cost_category_id);

          if (error) {
            console.error('❌ Error fetching detail categories:', error);
            message.error('Ошибка загрузки видов затрат');
            setLoading(false);
            return;
          }

          if (!detailCategories || detailCategories.length === 0) {
            console.warn('⚠️ No detail categories found for cost_category:', sw.cost_category_id);
            message.warning('Не найдены виды затрат для выбранной категории');
            setLoading(false);
            return;
          }

          detailCategories.forEach(dc => {
            flatSourceWithdrawals.push({
              detail_cost_category_id: dc.id,
              percent: sw.percent
            });
          });
        }
      }

      // Аналогично для целевых категорий
      const flatTargetCategories: string[] = [];

      for (const tc of targetCategories) {
        if (tc.detail_cost_category_ids && tc.detail_cost_category_ids.length > 0) {
          flatTargetCategories.push(...tc.detail_cost_category_ids);
        } else {
          // Если не указаны - получаем все detail_cost_category_ids для данной cost_category
          console.log('📡 Fetching detail categories for target cost_category:', tc.cost_category_id);
          const { data: detailCategories, error } = await supabase
            .from('detail_cost_categories')
            .select('id')
            .eq('cost_category_id', tc.cost_category_id);

          if (error) {
            console.error('❌ Error fetching target detail categories:', error);
            message.error('Ошибка загрузки видов затрат для целевых категорий');
            setLoading(false);
            return;
          }

          if (!detailCategories || detailCategories.length === 0) {
            console.warn('⚠️ No detail categories found for target cost_category:', tc.cost_category_id);
            message.warning('Не найдены виды затрат для целевой категории');
            setLoading(false);
            return;
          }

          flatTargetCategories.push(...detailCategories.map(dc => dc.id));
        }
      }

      console.log('📤 Flat source withdrawals (before dedup):', flatSourceWithdrawals);
      console.log('📤 Flat target categories (before dedup):', flatTargetCategories);

      // Дедуплицировать и объединить проценты для одинаковых detail_cost_category_id
      const sourceMap = new Map<string, number>();
      flatSourceWithdrawals.forEach(sw => {
        const existingPercent = sourceMap.get(sw.detail_cost_category_id) || 0;
        sourceMap.set(sw.detail_cost_category_id, existingPercent + sw.percent);
      });

      const deduplicatedSources: SourceWithdrawal[] = Array.from(sourceMap.entries()).map(([id, percent]) => ({
        detail_cost_category_id: id,
        percent
      }));

      // Дедуплицировать целевые категории
      const deduplicatedTargets = Array.from(new Set(flatTargetCategories));

      console.log('📤 Flat source withdrawals (after dedup):', deduplicatedSources);
      console.log('📤 Flat target categories (after dedup):', deduplicatedTargets);

      const result = await costRedistributionApi.createRedistribution({
        tender_id: tenderId,
        redistribution_name: `Перераспределение для "${tenderTitle}"`,
        description: `Создано: ${new Date().toLocaleString('ru-RU')}`,
        source_withdrawals: deduplicatedSources,
        target_categories: deduplicatedTargets,
        source_config: sourceWithdrawals,  // Сохранить конфигурацию wizard
        target_config: targetCategories    // Сохранить конфигурацию wizard
      });

      if (result.error) {
        console.error('❌ Error applying redistribution:', result.error);
        message.error(`Ошибка: ${result.error}`);
        return;
      }

      console.log('✅ Redistribution applied successfully:', result.data);
      message.success('Перераспределение успешно применено!');
      onComplete();
    } catch (error) {
      console.error('💥 Exception applying redistribution:', error);
      message.error('Ошибка применения перераспределения');
    } finally {
      setLoading(false);
    }
  }, [tenderId, tenderTitle, sourceWithdrawals, targetCategories, onComplete]);

  // Рендер блока 1: Выбор исходных категорий
  const renderStep1 = () => {
    // Получаем список уже выбранных detail_cost_category_ids для исключения
    const excludedDetailIds = sourceWithdrawals
      .flatMap(sw => sw.detail_cost_category_ids || []);

    const handleAddSource = (selection: {
      cost_category_id: string;
      detail_cost_category_ids?: string[];
    }) => {
      console.log('🔹 Adding source selection:', selection);

      setSourceWithdrawals(prev => [
        ...prev,
        {
          ...selection,
          percent: 10 // Начальный процент 10%
        }
      ]);
    };

    const handleRemoveSource = (index: number) => {
      setSourceWithdrawals(prev => prev.filter((_, i) => i !== index));
    };

    const handlePercentUpdate = (index: number, percent: number | null) => {
      if (percent === null || percent === 0) {
        handleRemoveSource(index);
      } else {
        setSourceWithdrawals(prev => prev.map((item, i) =>
          i === index ? { ...item, percent } : item
        ));
      }
    };

    const columns = [
      {
        title: 'Выбор',
        key: 'selection',
        width: '40%',
        render: (_: any, record: any, index: number) => {
          return (
            <div>
              <div><strong>{record.cost_category_name || 'Категория'}</strong></div>
              {record.detail_cost_category_names && record.detail_cost_category_names.length > 0 ? (
                <div>
                  <Text type="secondary">Виды затрат: </Text>
                  {record.detail_cost_category_names.map((name: string, i: number) => (
                    <div key={i}>
                      <Text type="secondary">• {name}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Все виды затрат</Text>
              )}
            </div>
          );
        }
      },
      {
        title: 'Процент (%)',
        key: 'percent',
        width: '20%',
        render: (_: any, record: any, index: number) => (
          <InputNumber
            min={0}
            max={100}
            precision={1}
            value={record.percent}
            onChange={(value) => handlePercentUpdate(index, value)}
            style={{ width: '100%' }}
            suffix="%"
          />
        )
      },
      {
        title: 'Действие',
        key: 'action',
        width: '15%',
        render: (_: any, record: any, index: number) => (
          <Button
            type="link"
            danger
            onClick={() => handleRemoveSource(index)}
          >
            Удалить
          </Button>
        )
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {categoriesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="Загрузка категорий..." />
          </div>
        ) : (
          <>
            {/* Каскадный селектор для добавления категорий */}
            <Card size="small" title="Добавить категорию">
              <CascadeCostCategorySelector
                onSelect={handleAddSource}
                excludeDetailCategories={excludedDetailIds}
              />
            </Card>

            {/* Таблица выбранных категорий */}
            {sourceWithdrawals.length > 0 ? (
              <Table
                dataSource={sourceWithdrawals.map((item, index) => ({ ...item, key: index }))}
                columns={columns}
                rowKey="key"
                pagination={false}
                bordered
              />
            ) : (
              <Alert
                message="Категории не выбраны"
                description="Добавьте хотя бы одну категорию для вычитания"
                type="warning"
                showIcon
              />
            )}
          </>
        )}

        {sourceWithdrawals.length > 0 && (
          <Alert
            message={`Выбрано записей: ${sourceWithdrawals.length}`}
            type="success"
            showIcon
          />
        )}
      </Space>
    );
  };

  // Рендер блока 2: Выбор целевых категорий
  const renderStep2 = () => {
    // Получаем список уже выбранных detail_cost_category_ids для исключения
    const excludedDetailIds = [
      ...sourceWithdrawals.flatMap(sw => sw.detail_cost_category_ids || []),
      ...targetCategories.flatMap(tc => tc.detail_cost_category_ids || [])
    ];

    const handleAddTarget = (selection: {
      cost_category_id: string;
      detail_cost_category_ids?: string[];
    }) => {
      console.log('🔹 Adding target selection:', selection);

      setTargetCategories(prev => [
        ...prev,
        selection
      ]);
    };

    const handleRemoveTarget = (index: number) => {
      setTargetCategories(prev => prev.filter((_, i) => i !== index));
    };

    const columns = [
      {
        title: 'Выбор',
        key: 'selection',
        width: '60%',
        render: (_: any, record: any, index: number) => {
          return (
            <div>
              <div><strong>{record.cost_category_name || 'Категория'}</strong></div>
              {record.detail_cost_category_names && record.detail_cost_category_names.length > 0 ? (
                <div>
                  <Text type="secondary">Виды затрат: </Text>
                  {record.detail_cost_category_names.map((name: string, i: number) => (
                    <div key={i}>
                      <Text type="secondary">• {name}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Все виды затрат</Text>
              )}
            </div>
          );
        }
      },
      {
        title: 'Действие',
        key: 'action',
        width: '15%',
        render: (_: any, record: any, index: number) => (
          <Button
            type="link"
            danger
            onClick={() => handleRemoveTarget(index)}
          >
            Удалить
          </Button>
        )
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Каскадный селектор для добавления категорий */}
        <Card size="small" title="Добавить категорию">
          <CascadeCostCategorySelector
            onSelect={handleAddTarget}
            excludeDetailCategories={excludedDetailIds}
          />
        </Card>

        {/* Таблица выбранных категорий */}
        {targetCategories.length > 0 ? (
          <Table
            dataSource={targetCategories.map((item, index) => ({ ...item, key: index }))}
            columns={columns}
            rowKey="key"
            pagination={false}
            bordered
          />
        ) : (
          <Alert
            message="Категории не выбраны"
            description="Добавьте хотя бы одну целевую категорию для распределения"
            type="warning"
            showIcon
          />
        )}

        {targetCategories.length > 0 && (
          <Alert
            message={`Выбрано записей: ${targetCategories.length}`}
            type="success"
            showIcon
          />
        )}
      </Space>
    );
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Блок 1: Вычитание */}
      <Card title={<Title level={4} style={{ margin: 0 }}>1. Исходные категории (вычитание)</Title>}>
        {renderStep1()}
      </Card>

      {/* Блок 2: Распределение */}
      <Card title={<Title level={4} style={{ margin: 0 }}>2. Целевые категории (распределение)</Title>}>
        {renderStep2()}
      </Card>

      {/* Кнопки управления внизу */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          <Button
            size="large"
            onClick={onCancel}
            icon={<CloseOutlined />}
          >
            Отменить
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleApply}
            loading={loading}
            icon={<CheckCircleOutlined />}
            disabled={sourceWithdrawals.length === 0 || targetCategories.length === 0}
          >
            Перераспределить суммы
          </Button>
        </div>
      </Card>
    </Space>
  );
};

export default CostRedistributionWizard;
