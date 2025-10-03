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
      const flatSourceWithdrawals: SourceWithdrawal[] = sourceWithdrawals.flatMap(sw => {
        if (sw.detail_cost_category_ids && sw.detail_cost_category_ids.length > 0) {
          // Если указаны конкретные detail categories - создаем запись для каждой
          return sw.detail_cost_category_ids.map(detailId => ({
            detail_cost_category_id: detailId,
            percent: sw.percent
          }));
        } else {
          // Если не указаны - используем все detail categories для данной cost_category
          // (для упрощения используем cost_category_id как detail_cost_category_id)
          return [{
            detail_cost_category_id: sw.cost_category_id,
            percent: sw.percent
          }];
        }
      });

      // Аналогично для целевых категорий
      const flatTargetCategories: string[] = targetCategories.flatMap(tc => {
        if (tc.detail_cost_category_ids && tc.detail_cost_category_ids.length > 0) {
          return tc.detail_cost_category_ids;
        } else {
          // Если не указаны - используем cost_category_id
          return [tc.cost_category_id];
        }
      });

      console.log('📤 Flat source withdrawals:', flatSourceWithdrawals);
      console.log('📤 Flat target categories:', flatTargetCategories);

      const result = await costRedistributionApi.createRedistribution({
        tender_id: tenderId,
        redistribution_name: `Перераспределение для "${tenderTitle}"`,
        description: `Создано: ${new Date().toLocaleString('ru-RU')}`,
        source_withdrawals: flatSourceWithdrawals,
        target_categories: flatTargetCategories
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
