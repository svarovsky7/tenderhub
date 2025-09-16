import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  AutoComplete,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Spin,
  message,
  Empty
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import type { Material, WorkItem } from '../../lib/supabase/types';
import { debounce } from 'lodash';

const { Text } = Typography;
const { Option } = Select;

interface InlineLibrarySelectorProps {
  type: 'work' | 'material';
  onAdd: (item: Material | WorkItem) => void;
  placeholder?: string;
}

interface LibraryOption {
  value: string;
  label: React.ReactNode;
  item: Material | WorkItem;
}

const InlineLibrarySelector: React.FC<InlineLibrarySelectorProps> = ({
  type,
  onAdd,
  placeholder
}) => {
  console.log('🚀 InlineLibrarySelector render:', { type });

  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState<Material | WorkItem | null>(null);
  const [itemType, setItemType] = useState<'work' | 'sub_work' | 'material' | 'sub_material'>(
    type === 'work' ? 'work' : 'material'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<Material | WorkItem>>([]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (value: string, currentItemType: typeof itemType) => {
        if (!value || value.length < 2) {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        console.log('🔍 Searching for:', { value, type, itemType: currentItemType });
        setIsSearching(true);

        try {
          if (type === 'work') {
            const result = await worksApi.getAll(
              {
                search: value
              },
              { limit: 100 }
            );
            console.log('📦 Works API response:', {
              error: result.error,
              dataLength: result.data?.length,
              data: result.data?.slice(0, 3) // Show first 3 items for debugging
            });

            if (!result.error && result.data && result.data.length > 0) {
              // Log item types for debugging
              const itemTypes = result.data.map(item => item.item_type);
              console.log('🔍 Found item_types in data:', [...new Set(itemTypes)]);
              console.log('🔍 Looking for item_type:', currentItemType);

              // Check if items have item_type field
              const hasItemType = result.data.some(item => item.item_type !== undefined && item.item_type !== null);

              if (!hasItemType) {
                console.log('⚠️ Warning: items do not have item_type field, showing all results');
                // If no item_type field, show all results
                setSearchResults(result.data);
              } else {
                // Filter by item_type on client side
                const filteredData = result.data.filter(
                  item => {
                    const matches = item.item_type === currentItemType;
                    if (!matches && result.data.length <= 10) {
                      console.log(`❌ Filtered out: ${item.name} (type: ${item.item_type}, looking for: ${currentItemType})`);
                    }
                    return matches;
                  }
                );
                console.log('✅ Filtered works:', filteredData.length, 'of', result.data.length, 'items');

                // If no results after filtering, maybe item_type values are different
                if (filteredData.length === 0 && result.data.length > 0) {
                  console.log('⚠️ No items matched the filter. Showing all results for debugging.');
                  console.log('First 5 items with their types:', result.data.slice(0, 5).map(i => ({ name: i.name, type: i.item_type })));
                  // Temporarily show all results to help debug
                  setSearchResults(result.data.slice(0, 10));
                } else {
                  setSearchResults(filteredData);
                }
              }
            } else {
              console.log('⚠️ No works found or error occurred');
              setSearchResults([]);
            }
          } else {
            const result = await materialsApi.getAll(
              {
                search: value
              },
              { limit: 100 }
            );
            console.log('📦 Materials API response:', {
              error: result.error,
              dataLength: result.data?.length,
              data: result.data?.slice(0, 3) // Show first 3 items for debugging
            });

            if (!result.error && result.data && result.data.length > 0) {
              // Log item types for debugging
              const itemTypes = result.data.map(item => item.item_type);
              console.log('🔍 Found item_types in data:', [...new Set(itemTypes)]);
              console.log('🔍 Looking for item_type:', currentItemType);

              // Check if items have item_type field
              const hasItemType = result.data.some(item => item.item_type !== undefined && item.item_type !== null);

              if (!hasItemType) {
                console.log('⚠️ Warning: items do not have item_type field, showing all results');
                // If no item_type field, show all results
                setSearchResults(result.data);
              } else {
                // Filter by item_type on client side
                const filteredData = result.data.filter(
                  item => {
                    const matches = item.item_type === currentItemType;
                    if (!matches && result.data.length <= 10) {
                      console.log(`❌ Filtered out: ${item.name} (type: ${item.item_type}, looking for: ${currentItemType})`);
                    }
                    return matches;
                  }
                );
                console.log('✅ Filtered materials:', filteredData.length, 'of', result.data.length, 'items');

                // If no results after filtering, maybe item_type values are different
                if (filteredData.length === 0 && result.data.length > 0) {
                  console.log('⚠️ No items matched the filter. Showing all results for debugging.');
                  console.log('First 5 items with their types:', result.data.slice(0, 5).map(i => ({ name: i.name, type: i.item_type })));
                  // Temporarily show all results to help debug
                  setSearchResults(result.data.slice(0, 10));
                } else {
                  setSearchResults(filteredData);
                }
              }
            } else {
              console.log('⚠️ No materials found or error occurred');
              setSearchResults([]);
            }
          }
        } catch (error) {
          console.error('❌ Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [type]
  );

  // Effect for searching
  useEffect(() => {
    debouncedSearch(searchValue, itemType);

    // Cleanup function to cancel pending debounced calls
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchValue, itemType, debouncedSearch]);

  // Generate options for autocomplete
  const options: LibraryOption[] = useMemo(() => {
    console.log('📋 Generating options from searchResults:', searchResults.length);
    return searchResults.map(item => ({
      value: item.id,
      label: (
        <div>
          <div style={{ fontWeight: 500 }}>
            {item.name}
          </div>
          {item.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.description}
            </Text>
          )}
          <Space style={{ marginTop: 4 }}>
            <Tag color="blue">{item.unit}</Tag>
            {item.category && <Tag>{item.category}</Tag>}
            {item.unit_rate && (
              <Tag color="green">
                {item.unit_rate} {item.currency_type || 'RUB'}
              </Tag>
            )}
          </Space>
        </div>
      ),
      item
    }));
  }, [searchResults]);

  // Handle selection
  const handleSelect = useCallback((_value: string, option: LibraryOption) => {
    console.log('✅ Selected item:', option.item);
    setSelectedItem(option.item);
    setSearchValue(option.item.name);
  }, []);

  // Handle add
  const handleAdd = useCallback(() => {
    if (!selectedItem) {
      message.warning('Выберите элемент для добавления');
      return;
    }

    console.log('➕ Adding item to template:', selectedItem);

    // Update item type based on selection
    const updatedItem = {
      ...selectedItem,
      item_type: itemType as 'work' | 'sub_work' | 'material' | 'sub_material'
    };

    console.log('➕ Final item to add:', {
      name: updatedItem.name,
      item_type: updatedItem.item_type,
      original_item_type: selectedItem.item_type
    });

    onAdd(updatedItem);

    // Clear form
    setSearchValue('');
    setSelectedItem(null);
    setSearchResults([]);

    message.success(`${type === 'work' ? 'Работа' : 'Материал'} добавлен${type === 'work' ? 'а' : ''}`);
  }, [selectedItem, itemType, onAdd, type]);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    console.log('🔄 Search value changed:', value);
    setSearchValue(value);
    if (!value || value.length === 0) {
      setSelectedItem(null);
      setSearchResults([]);
    }
  }, []);

  // Get icon based on type
  const getIcon = () => {
    const iconColor = getColorScheme().titleColor;
    return type === 'work'
      ? <ToolOutlined style={{ color: iconColor }} />
      : <AppstoreOutlined style={{ color: iconColor }} />;
  };

  // Get color scheme based on itemType
  const getColorScheme = () => {
    switch (itemType) {
      case 'work':
        return {
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', // orange-50 to orange-100
          borderColor: '#fb923c', // orange-400
          titleColor: '#ea580c' // orange-600
        };
      case 'sub_work':
        return {
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', // purple-50 to purple-100
          borderColor: '#c084fc', // purple-400
          titleColor: '#9333ea' // purple-600
        };
      case 'material':
        return {
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', // blue-50 to blue-100
          borderColor: '#60a5fa', // blue-400
          titleColor: '#2563eb' // blue-600
        };
      case 'sub_material':
        return {
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', // green-50 to green-100
          borderColor: '#4ade80', // green-400
          titleColor: '#16a34a' // green-600
        };
      default:
        return {
          background: '#ffffff',
          borderColor: '#d9d9d9',
          titleColor: '#000000'
        };
    }
  };

  const colorScheme = getColorScheme();

  return (
    <>
      <style>
        {`
          .selector-card-${itemType} {
            background: ${colorScheme.background};
            border: 1px solid ${colorScheme.borderColor} !important;
            transition: all 0.3s ease;
          }

          .selector-card-${itemType}:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }

          .selector-card-${itemType} .ant-card-head {
            background: transparent !important;
            border-bottom: 1px solid ${colorScheme.borderColor}40 !important;
          }

          .selector-card-${itemType} .ant-card-head-title {
            color: ${colorScheme.titleColor} !important;
            font-weight: 600;
          }

          .selector-card-${itemType} .ant-btn-primary {
            background: ${colorScheme.titleColor}30 !important;
            border-color: ${colorScheme.borderColor} !important;
            color: ${colorScheme.titleColor} !important;
            font-weight: 500;
            transition: all 0.3s ease;
          }

          .selector-card-${itemType} .ant-btn-primary:hover:not(:disabled) {
            background: ${colorScheme.titleColor}50 !important;
            border-color: ${colorScheme.titleColor} !important;
            color: ${colorScheme.titleColor} !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px ${colorScheme.titleColor}20 !important;
          }

          .selector-card-${itemType} .ant-btn-primary:disabled {
            background: #f5f5f5 !important;
            border-color: #d9d9d9 !important;
            color: #bfbfbf !important;
          }

          .selector-card-${itemType} .ant-btn-primary .anticon {
            color: inherit !important;
          }

          .selector-card-${itemType} .ant-select-selector {
            border-color: ${colorScheme.borderColor} !important;
          }

          .selector-card-${itemType} .ant-select-focused .ant-select-selector {
            border-color: ${colorScheme.titleColor} !important;
            box-shadow: 0 0 0 2px ${colorScheme.borderColor}20 !important;
          }

          .selector-card-${itemType} .ant-input {
            border-color: ${colorScheme.borderColor} !important;
          }

          .selector-card-${itemType} .ant-input:focus {
            border-color: ${colorScheme.titleColor} !important;
            box-shadow: 0 0 0 2px ${colorScheme.borderColor}20 !important;
          }
        `}
      </style>
      <Card
        size="small"
        className={`mb-3 selector-card-${itemType}`}
        title={
          <Space>
            {getIcon()}
            <span>Добавить {type === 'work' ? 'работу' : 'материал'}</span>
          </Space>
        }
      >
      <Space.Compact style={{ width: '100%' }}>
        <Select
          value={itemType}
          onChange={(value) => setItemType(value as typeof itemType)}
          style={{ width: 150 }}
        >
          {type === 'work' ? (
            <>
              <Option value="work">Работа</Option>
              <Option value="sub_work">Суб-работа</Option>
            </>
          ) : (
            <>
              <Option value="material">Материал</Option>
              <Option value="sub_material">Суб-материал</Option>
            </>
          )}
        </Select>

        <AutoComplete
          value={searchValue}
          onChange={handleSearchChange}
          onSelect={handleSelect}
          options={options}
          style={{ flex: 1 }}
          placeholder={placeholder || `Начните вводить название ${type === 'work' ? 'работы' : 'материала'}...`}
          filterOption={false}
          showSearch={true}
          open={searchValue.length >= 2 ? undefined : false}
          notFoundContent={
            isSearching ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <Spin size="small" />
                <div style={{ marginTop: 8 }}>Поиск...</div>
              </div>
            ) : searchValue.length >= 2 ? (
              <Empty
                description={`${type === 'work' ? 'Работы' : 'Материалы'} не найдены`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                Введите минимум 2 символа для поиска
              </div>
            )
          }
          suffixIcon={<SearchOutlined />}
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={!selectedItem}
        >
          Добавить
        </Button>
      </Space.Compact>

      {/* Show selected item details */}
      {selectedItem && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
          <Text strong>Выбрано: </Text>
          <Text>{selectedItem.name}</Text>
          <Tag color="blue" style={{ marginLeft: 8 }}>{selectedItem.unit}</Tag>
        </div>
      )}
    </Card>
    </>
  );
};

export default InlineLibrarySelector;