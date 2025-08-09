import React, { useState, useEffect, useCallback } from 'react';
import { AutoComplete, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { materialsApi, worksApi } from '../../lib/supabase/api';
import type { Material, WorkItem } from '../../lib/supabase/types';

interface AutoCompleteSearchProps {
  type: 'work' | 'material';
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string, option: { id: string; name: string; unit: string }) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
}

interface SearchOption {
  value: string;
  label: React.ReactNode;
  id: string;
  name: string;
  unit: string;
}

const AutoCompleteSearch: React.FC<AutoCompleteSearchProps> = ({
  type,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  disabled = false
}) => {
  console.log('🚀 AutoCompleteSearch rendered:', { type, value });

  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState<(Material | WorkItem)[]>([]);

  // Load all items on mount
  useEffect(() => {
    const loadAllItems = async () => {
      console.log('📡 Loading all items for type:', type);
      setLoading(true);

      try {
        const result = type === 'material' 
          ? await materialsApi.getAll({ search: '' }, { limit: 1000 })
          : await worksApi.getAll({ search: '' }, { limit: 1000 });

        if (result.error) {
          console.error('❌ Error loading items:', result.error);
        } else {
          console.log(`✅ Loaded ${result.data?.length || 0} ${type}s`);
          setAllItems(result.data || []);
        }
      } catch (error) {
        console.error('💥 Exception loading items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllItems();
  }, [type]);

  // Filter options based on search value
  const filterOptions = useCallback((searchValue: string) => {
    console.log('🔍 Filtering options for search:', searchValue);
    
    if (!searchValue.trim()) {
      // Show top 10 items when no search
      const topItems = allItems.slice(0, 10);
      return topItems.map(item => ({
        value: item.name,
        label: (
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="font-medium text-sm">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500 truncate">
                  {item.description}
                </div>
              )}
            </div>
            <div className="text-xs text-blue-600 font-medium ml-2">
              {item.unit}
            </div>
          </div>
        ),
        id: item.id,
        name: item.name,
        unit: item.unit
      }));
    }

    // Filter by search term (case insensitive)
    const searchLower = searchValue.toLowerCase();
    const filtered = allItems.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower))
    );

    console.log(`📋 Found ${filtered.length} matching items`);

    return filtered.slice(0, 20).map(item => ({
      value: item.name,
      label: (
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="font-medium text-sm">{item.name}</div>
            {item.description && (
              <div className="text-xs text-gray-500 truncate">
                {item.description}
              </div>
            )}
          </div>
          <div className="text-xs text-blue-600 font-medium ml-2">
            {item.unit}
          </div>
        </div>
      ),
      id: item.id,
      name: item.name,
      unit: item.unit
    }));
  }, [allItems]);

  // Handle search
  const handleSearch = useCallback((searchValue: string) => {
    console.log('🔎 Search triggered:', searchValue);
    const filteredOptions = filterOptions(searchValue);
    setOptions(filteredOptions);
  }, [filterOptions]);

  // Handle selection
  const handleSelect = useCallback((selectedValue: string, option: any) => {
    console.log('✅ Item selected:', { selectedValue, option });
    
    if (option && option.id && option.unit) {
      onSelect(selectedValue, {
        id: option.id,
        name: option.name,
        unit: option.unit
      });
    }
  }, [onSelect]);

  // Handle input change
  const handleChange = useCallback((newValue: string) => {
    console.log('📝 Input changed:', newValue);
    onChange(newValue);
    handleSearch(newValue);
  }, [onChange, handleSearch]);

  // Initial load of options
  useEffect(() => {
    if (allItems.length > 0) {
      handleSearch(value);
    }
  }, [allItems, value, handleSearch]);

  return (
    <AutoComplete
      value={value}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      allowClear
      showSearch
      filterOption={false}
      notFoundContent={loading ? <Spin size="small" /> : 'Не найдено'}
      suffixIcon={loading ? <Spin size="small" /> : <SearchOutlined />}
      popupMatchSelectWidth={false}
      style={{ width: '100%' }}
      styles={{
        popup: {
          root: {
            maxWidth: '400px',
            zIndex: 1050
          }
        }
      }}
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
    />
  );
};

export default AutoCompleteSearch;