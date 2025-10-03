import React, { useState, useEffect } from 'react';
import { Select, Space, Typography, Spin, Button, message } from 'antd';
import { supabase } from '../../lib/supabase/client';

const { Text } = Typography;

interface CostCategory {
  id: string;
  name: string;
}

interface DetailCostCategory {
  id: string;
  name: string;
  cost_category_id: string;
  location_id: string;
  location_title?: string;
}

// Группированная детализация
interface GroupedDetail {
  name: string; // Название вида затрат
  locations: Array<{
    detail_id: string;
    location_id: string;
    location_title: string;
  }>;
}

interface CascadeCostCategorySelectorProps {
  onSelect: (selection: {
    cost_category_id: string;
    cost_category_name: string;
    detail_cost_category_ids?: string[];
    detail_cost_category_names?: string[];
  }) => void;
  excludeDetailCategories?: string[];
}

/**
 * Каскадный селектор категорий затрат (упрощенный 2-уровневый)
 * Уровень 1: Категория (cost_categories)
 * Уровень 2: Вид затрат (группировка по name в detail_cost_categories)
 */
const CascadeCostCategorySelector: React.FC<CascadeCostCategorySelectorProps> = ({
  onSelect,
  excludeDetailCategories = []
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CostCategory[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [selectedWorkType, setSelectedWorkType] = useState<string | null>(null);

  // Группированные детали по имени
  const [groupedDetails, setGroupedDetails] = useState<Record<string, GroupedDetail>>({});

  // Загрузить категории
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('cost_categories')
          .select('id, name')
          .order('name');

        if (!error && data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Загрузить детальные категории при выборе категории
  useEffect(() => {
    if (!selectedCategoryId) {
      setGroupedDetails({});
      return;
    }

    const loadDetailCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('detail_cost_categories')
          .select(`
            id,
            name,
            cost_category_id,
            location_id,
            location:location_id(title)
          `)
          .eq('cost_category_id', selectedCategoryId)
          .order('name');

        if (!error && data) {
          const formatted = data.map(item => ({
            ...item,
            location_title: (item.location as any)?.title || 'Без локализации'
          }));

          // Группируем по name (вид затрат)
          const grouped: Record<string, GroupedDetail> = {};
          formatted.forEach(dc => {
            if (!grouped[dc.name]) {
              grouped[dc.name] = {
                name: dc.name,
                locations: []
              };
            }
            grouped[dc.name].locations.push({
              detail_id: dc.id,
              location_id: dc.location_id,
              location_title: dc.location_title || 'Без локализации'
            });
          });

          setGroupedDetails(grouped);
        }
      } catch (error) {
        console.error('Error loading detail categories:', error);
      }
    };

    loadDetailCategories();
  }, [selectedCategoryId]);

  // Обработка выбора категории
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(category?.name || '');
    setSelectedWorkType(null);
  };

  // Обработка выбора вида затрат
  const handleWorkTypeChange = (workType: string) => {
    setSelectedWorkType(workType);
  };

  // Применить выбор
  const handleApply = () => {
    if (!selectedCategoryId) {
      message.warning('Выберите категорию');
      return;
    }

    let selectedDetailIds: string[] = [];
    let detailNames: string[] = [];

    if (selectedWorkType) {
      // Выбран конкретный вид затрат - берем все его detail_id
      const detail = groupedDetails[selectedWorkType];
      selectedDetailIds = detail.locations.map(loc => loc.detail_id);
      detailNames = [selectedWorkType]; // Просто имя вида затрат без локализации
    }

    if (selectedDetailIds.length > 0) {
      onSelect({
        cost_category_id: selectedCategoryId,
        cost_category_name: selectedCategoryName,
        detail_cost_category_ids: selectedDetailIds,
        detail_cost_category_names: detailNames
      });
    } else {
      onSelect({
        cost_category_id: selectedCategoryId,
        cost_category_name: selectedCategoryName
      });
    }

    // Сброс
    setSelectedCategoryId(null);
    setSelectedCategoryName('');
    setSelectedWorkType(null);
  };

  // Получаем уникальные виды затрат
  const uniqueWorkTypes = Object.keys(groupedDetails);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space wrap>
        <Text>Категория:</Text>
        <Select
          style={{ width: 250 }}
          placeholder="Выберите категорию"
          value={selectedCategoryId}
          onChange={handleCategoryChange}
          loading={loading}
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.children as string).toLowerCase().includes(input.toLowerCase())
          }
        >
          {categories.map(cat => (
            <Select.Option key={cat.id} value={cat.id}>
              {cat.name}
            </Select.Option>
          ))}
        </Select>

        {selectedCategoryId && uniqueWorkTypes.length > 0 && (
          <>
            <Text>Вид затрат (опционально):</Text>
            <Select
              style={{ minWidth: 300 }}
              placeholder="Все виды затрат"
              value={selectedWorkType}
              onChange={handleWorkTypeChange}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {uniqueWorkTypes.map(workType => (
                <Select.Option key={workType} value={workType}>
                  {workType}
                </Select.Option>
              ))}
            </Select>
          </>
        )}

        <Button type="primary" onClick={handleApply} disabled={!selectedCategoryId}>
          Добавить
        </Button>
      </Space>

      {selectedCategoryId && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {selectedWorkType
            ? `Выбрано: ${selectedWorkType}`
            : 'Будут выбраны все виды затрат данной категории'
          }
        </Text>
      )}
    </Space>
  );
};

export default CascadeCostCategorySelector;
