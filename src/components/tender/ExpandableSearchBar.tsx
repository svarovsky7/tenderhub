import React, { useState, useCallback, useEffect } from 'react';
import {
  Input,
  Select,
  Button,
  AutoComplete,
  Space,
  Typography,
  message,
  Spin,
  InputNumber,
  Card
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ToolOutlined,
  BgColorsOutlined
} from '@ant-design/icons';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import type { Material, WorkItem } from '../../lib/supabase/types';

const { Text } = Typography;
const { Option } = Select;

export interface ExpandableSearchBarProps {
  onAddItem: (
    item: Material | WorkItem,
    type: 'material' | 'work',
    quantity: number,
    consumptionCoefficient?: number,
    conversionCoefficient?: number
  ) => void;
  onClose?: () => void;
  placeholder?: string;
}

interface SearchOption {
  value: string;
  label: string;
  item: Material | WorkItem;
  type: 'material' | 'work';
}

const ExpandableSearchBar: React.FC<ExpandableSearchBarProps> = ({
  onAddItem,
  onClose,
  placeholder = "Поиск материалов и работ..."
}) => {
  console.log('🚀 ExpandableSearchBar rendered');

  // State
  const [searchValue, setSearchValue] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'material' | 'work'>('all');
  const [quantity, setQuantity] = useState(1);
  const [searchOptions, setSearchOptions] = useState<SearchOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ item: Material | WorkItem; type: 'material' | 'work' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [consumptionCoefficient, setConsumptionCoefficient] = useState(1);
  const [conversionCoefficient, setConversionCoefficient] = useState(1);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      console.log('📡 Loading materials and works data');
      setIsLoading(true);
      
      try {
        const [materialsResult, worksResult] = await Promise.all([
          materialsApi.getAll({ search: '' }, { limit: 500 }),
          worksApi.getAll({ search: '' }, { limit: 500 })
        ]);

        console.log('📦 Data loaded:', {
          materials: materialsResult.data?.length,
          works: worksResult.data?.length
        });

        if (materialsResult.error) {
          console.error('❌ Materials loading error:', materialsResult.error);
        } else {
          setMaterials(materialsResult.data || []);
        }

        if (worksResult.error) {
          console.error('❌ Works loading error:', worksResult.error);
        } else {
          setWorks(worksResult.data || []);
        }
      } catch (error) {
        console.error('💥 Exception loading data:', error);
        message.error('Ошибка загрузки справочников');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Search handler
  const handleSearch = useCallback((value: string) => {
    console.log('🔍 Search value changed:', value);
    setSearchValue(value);

    if (!value.trim()) {
      setSearchOptions([]);
      return;
    }

    const searchLower = value.toLowerCase().trim();
    const options: SearchOption[] = [];

    // Filter materials
    if (selectedType === 'all' || selectedType === 'material') {
      const filteredMaterials = materials.filter(material =>
        material.name.toLowerCase().includes(searchLower) ||
        (material.description && material.description.toLowerCase().includes(searchLower))
      ).slice(0, 10); // Limit results

      filteredMaterials.forEach(material => {
        options.push({
          value: `material-${material.id}`,
          label: `🧱 ${material.name} (${material.unit})`,
          item: material,
          type: 'material'
        });
      });
    }

    // Filter works
    if (selectedType === 'all' || selectedType === 'work') {
      const filteredWorks = works.filter(work =>
        work.name.toLowerCase().includes(searchLower) ||
        (work.description && work.description.toLowerCase().includes(searchLower))
      ).slice(0, 10); // Limit results

      filteredWorks.forEach(work => {
        options.push({
          value: `work-${work.id}`,
          label: `🔧 ${work.name} (${work.unit})`,
          item: work,
          type: 'work'
        });
      });
    }

    console.log('📋 Search options generated:', options.length);
    setSearchOptions(options);
  }, [materials, works, selectedType]);

  // Select item handler
  const handleSelect = useCallback((value: string) => {
    console.log('✅ Item selected:', value);
    
    const selectedOption = searchOptions.find(opt => opt.value === value);
    if (!selectedOption) {
      console.warn('⚠️ Selected option not found');
      return;
    }

    console.log('🎯 Selected item:', {
      item: selectedOption.item.name,
      type: selectedOption.type
    });

    setSelectedItem({
      item: selectedOption.item,
      type: selectedOption.type
    });

    setConsumptionCoefficient(1);
    setConversionCoefficient(1);

    // Clear search
    setSearchValue('');
    setSearchOptions([]);
  }, [searchOptions]);

  // Add item handler
  const handleAddClick = useCallback(() => {
    if (!selectedItem) {
      message.warning('Выберите элемент из списка');
      return;
    }

    if (quantity <= 0) {
      message.warning('Укажите корректное количество');
      return;
    }

    console.log('➕ Adding item:', {
      item: selectedItem.item.name,
      type: selectedItem.type,
      quantity,
      consumptionCoefficient,
      conversionCoefficient
    });

    onAddItem(
      selectedItem.item,
      selectedItem.type,
      quantity,
      consumptionCoefficient,
      conversionCoefficient
    );
    
    // Reset form
    setSelectedItem(null);
    setQuantity(1);
    setSearchValue('');
    setConsumptionCoefficient(1);
    setConversionCoefficient(1);
    
    if (onClose) {
      onClose();
    }
  }, [selectedItem, quantity, onAddItem, onClose]);

  // Type change handler
  const handleTypeChange = useCallback((type: 'all' | 'material' | 'work') => {
    console.log('🔄 Type filter changed:', type);
    setSelectedType(type);
    
    // Re-trigger search with current value
    if (searchValue.trim()) {
      handleSearch(searchValue);
    }
  }, [searchValue, handleSearch]);

  const renderOption = (option: SearchOption) => (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {option.type === 'material' ? (
          <BgColorsOutlined className="text-blue-500" />
        ) : (
          <ToolOutlined className="text-green-500" />
        )}
        <div>
          <Text strong>{option.item.name}</Text>
          <Text type="secondary" className="block text-xs">
            {option.item.unit} • {option.type === 'material' ? 'Материал' : 'Работа'}
          </Text>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="expandable-search-bar" bodyStyle={{ padding: '16px' }}>
      <div className="mb-4">
        <Text strong className="block mb-2">
          Поиск и добавление элемента
        </Text>

        {/* Type Filter and Search */}
        <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
          <Select
            value={selectedType}
            onChange={handleTypeChange}
            style={{ width: 120 }}
            size="middle"
          >
            <Option value="all">Все</Option>
            <Option value="material">
              <BgColorsOutlined className="mr-1" />
              Материалы
            </Option>
            <Option value="work">
              <ToolOutlined className="mr-1" />
              Работы
            </Option>
          </Select>

          <AutoComplete
            value={searchValue}
            onSearch={handleSearch}
            onSelect={handleSelect}
            placeholder={placeholder}
            style={{ flex: 1 }}
            size="middle"
            notFoundContent={isLoading ? <Spin size="small" /> : 'Не найдено'}
            options={searchOptions.map(option => ({
              value: option.value,
              label: renderOption(option)
            }))}
          >
            <Input
              prefix={<SearchOutlined />}
              allowClear
            />
          </AutoComplete>
        </Space.Compact>

        {/* Selected Item Display */}
        {selectedItem && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              {selectedItem.type === 'material' ? (
                <BgColorsOutlined className="text-blue-500" />
              ) : (
                <ToolOutlined className="text-green-500" />
              )}
              <Text strong>{selectedItem.item.name}</Text>
              <Text type="secondary">({selectedItem.item.unit})</Text>
            </div>
          </div>
        )}

        {/* Quantity and Add Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <Text className="whitespace-nowrap">Количество:</Text>
          <InputNumber
            value={quantity}
            onChange={(value) => {
              console.log('✏️ Quantity changed:', value);
              setQuantity(value || 1);
            }}
            min={0.01}
            step={0.01}
            placeholder="Кол-во"
            style={{ width: 100 }}
            size="middle"
          />

          {selectedItem?.type === 'material' && (
            <>
              <Text className="whitespace-nowrap">Коэф. расхода:</Text>
              <InputNumber
                value={consumptionCoefficient}
                onChange={(value) => {
                  console.log('✏️ Consumption coefficient changed:', value);
                  setConsumptionCoefficient(value || 1);
                }}
                min={0.0001}
                step={0.0001}
                placeholder="Расход"
                style={{ width: 100 }}
                size="middle"
              />

              <Text className="whitespace-nowrap">Коэф. перевода:</Text>
              <InputNumber
                value={conversionCoefficient}
                onChange={(value) => {
                  console.log('✏️ Conversion coefficient changed:', value);
                  setConversionCoefficient(value || 1);
                }}
                min={0.0001}
                step={0.0001}
                placeholder="Перевод"
                style={{ width: 100 }}
                size="middle"
              />
            </>
          )}

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddClick}
            disabled={!selectedItem}
            loading={isLoading}
          >
            Добавить
          </Button>

          {onClose && (
            <Button onClick={onClose}>
              Отмена
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <Text type="secondary" className="text-xs">
            {selectedType === 'all' ? 
              `${materials.length} материалов, ${works.length} работ` :
              selectedType === 'material' ? 
                `${materials.length} материалов` :
                `${works.length} работ`
            }
          </Text>
        </div>
      </div>
    </Card>
  );
};

export default ExpandableSearchBar;