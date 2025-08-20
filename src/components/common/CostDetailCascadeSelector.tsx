import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dropdown, Spin, message, Tag, Space, Empty, Input, Divider, Button, Typography } from 'antd';
import { 
  EnvironmentOutlined, 
  FolderOutlined, 
  FileTextOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  CloseCircleFilled
} from '@ant-design/icons';
import {
  getCategoriesWithDetails,
  getLocations,
  searchDetailCategories,
  getDetailCategoryDisplay,
  type CostCategory,
  type DetailCostCategory,
  type Location,
  type DetailCategorySearchResult
} from '../../lib/supabase/api/construction-costs';
import { debounce } from 'lodash';

interface CostDetailCascadeSelectorProps {
  value?: string | null;
  onChange?: (value: string | null, displayValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

interface SelectionState {
  category: CostCategory | null;
  detail: DetailCostCategory | null;
  location: Location | null;
}

const CostDetailCascadeSelector: React.FC<CostDetailCascadeSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Выберите категорию затрат',
  disabled = false,
  style,
  className
}) => {
  console.log('🚀 [CostDetailCascadeSelector] Rendering with value:', value);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'category' | 'detail' | 'location'>('category');
  const [categoriesWithDetails, setCategoriesWithDetails] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DetailCategorySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Refs for handling blur
  const inputRef = useRef<any>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [selection, setSelection] = useState<SelectionState>({
    category: null,
    detail: null,
    location: null
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load display value for existing value
  useEffect(() => {
    if (value && value !== 'fallback') {
      loadDisplayValue(value);
    } else if (!value) {
      setDisplayValue('');
      setInputValue('');
    }
  }, [value]);
  
  // Sync input value with display value when not searching
  useEffect(() => {
    if (!searchTerm && displayValue) {
      setInputValue(displayValue);
    }
  }, [displayValue, searchTerm]);

  const loadData = async () => {
    console.log('🚀 [CostDetailCascadeSelector] Loading data');
    setLoading(true);
    
    try {
      // Load categories with details
      const { data: catData, error: catError } = await getCategoriesWithDetails();
      if (catError) {
        console.error('❌ Error loading categories:', catError);
        message.error('Ошибка загрузки категорий');
      } else {
        setCategoriesWithDetails(catData || []);
        console.log('✅ Loaded categories:', catData?.length);
      }
      
      // Load locations
      const { data: locData, error: locError } = await getLocations();
      if (locError) {
        console.error('❌ Error loading locations:', locError);
        message.error('Ошибка загрузки локаций');
      } else {
        setLocations(locData || []);
        console.log('✅ Loaded locations:', locData?.length);
      }
    } catch (err) {
      console.error('❌ Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDisplayValue = async (detailCategoryId: string) => {
    console.log('🚀 [CostDetailCascadeSelector] Loading display value for:', detailCategoryId);
    
    try {
      const { data, error } = await getDetailCategoryDisplay(detailCategoryId);
      
      if (error) {
        console.error('❌ Error loading display value:', error);
        return;
      }
      
      if (data) {
        setDisplayValue(data);
        console.log('✅ Display value loaded:', data);
      }
    } catch (err) {
      console.error('❌ Error loading display value:', err);
    }
  };

  const handleReset = useCallback(() => {
    console.log('🚀 [CostDetailCascadeSelector] Resetting selection');
    
    setSelection({
      category: null,
      detail: null,
      location: null
    });
    setStep('category');
    setDisplayValue('');
    setInputValue('');
    setSearchTerm('');
    setSearchResults([]);
    
    if (onChange) {
      onChange(null, '');
    }
  }, [onChange]);
  
  // Handle cascade selection
  const handleCategorySelect = (category: CostCategory) => {
    console.log('🚀 [CostDetailCascadeSelector] Category selected:', category.name);
    setSelection({
      ...selection,
      category,
      detail: null,
      location: null
    });
    setStep('detail');
  };
  
  const handleDetailSelect = (detail: DetailCostCategory) => {
    console.log('🚀 [CostDetailCascadeSelector] Detail selected:', detail.name);
    setSelection({
      ...selection,
      detail
    });
    setStep('location');
  };
  
  const handleLocationSelect = (location: Location) => {
    console.log('🚀 [CostDetailCascadeSelector] Location selected:', location);
    
    const { detail, category } = selection;
    if (!detail || !category) return;
    
    // Find the detail_cost_category record that matches our selection
    const selectedDetailCategory = detail;
    
    if (selectedDetailCategory && selectedDetailCategory.id) {
      const locationName = [location.city, location.region, location.country]
        .filter(Boolean)
        .join(', ') || 'Локация не указана';
      
      const newDisplayValue = `${category.name} → ${detail.name} → ${locationName}`;
      
      setDisplayValue(newDisplayValue);
      setInputValue(newDisplayValue);
      setSelection({ ...selection, location });
      setIsOpen(false);
      setStep('category');
      
      if (onChange) {
        onChange(selectedDetailCategory.id, newDisplayValue);
      }
      
      console.log('✅ Selection completed:', {
        detailCategoryId: selectedDetailCategory.id,
        displayValue: newDisplayValue
      });
      
      message.success('Категория затрат выбрана');
    }
  };
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      console.log('🔍 [CostDetailCascadeSelector] Searching for:', term);
      setSearchLoading(true);
      
      try {
        const { data, error } = await searchDetailCategories(term, 30);
        
        if (error) {
          console.error('❌ Search error:', error);
          message.error('Ошибка поиска');
          return;
        }
        
        setSearchResults(data || []);
        console.log('✅ Search results:', data?.length);
      } catch (err) {
        console.error('❌ Search exception:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 200),
    []
  );
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchTerm(value);
    
    if (value) {
      debouncedSearch(value);
      if (!isOpen) {
        setIsOpen(true);
      }
    } else {
      setSearchResults([]);
      setSearchTerm('');
      // Reset to display value if exists and different
      if (displayValue && inputValue !== displayValue) {
        setInputValue(displayValue);
      }
    }
  };
  
  // Handle search result selection
  const handleSearchResultSelect = (result: DetailCategorySearchResult) => {
    console.log('🚀 [CostDetailCascadeSelector] Selected search result:', result);
    
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    
    setDisplayValue(result.display_name);
    setInputValue(result.display_name);
    setSearchTerm('');
    setSearchResults([]);
    setIsOpen(false);
    
    if (onChange) {
      onChange(result.id, result.display_name);
    }
    
    console.log('✅ Selection completed:', {
      detailCategoryId: result.id,
      displayValue: result.display_name
    });
    
    message.success('Категория затрат выбрана');
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };
  
  // Handle input blur
  const handleInputBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      if (!searchTerm && displayValue && inputValue !== displayValue) {
        setInputValue(displayValue);
      }
    }, 200);
  };

  const renderCascadeMode = () => {
    if (loading) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      );
    }

    // Category selection
    if (step === 'category') {
      return (
        <div>
          {!searchTerm && (
            <div style={{ 
              padding: '8px 12px', 
              background: '#e6f7ff', 
              borderBottom: '1px solid #91d5ff',
              fontSize: '12px',
              color: '#1890ff'
            }}>
              💡 Начните вводить для поиска или выберите из списка
            </div>
          )}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <Text style={{ fontWeight: 500 }}>Выберите категорию затрат</Text>
            </div>
            {categoriesWithDetails.map((category) => (
              <div
                key={category.id}
                className="cost-selector-item"
                onClick={() => handleCategorySelect(category)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Space>
                  <FolderOutlined style={{ color: '#1890ff' }} />
                  <span>{category.name}</span>
                </Space>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Detail selection
    if (step === 'detail' && selection.category) {
      const categoryDetails = categoriesWithDetails.find(c => c.id === selection.category?.id)?.details || [];
      
      return (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            <Space>
              <Button
                type="text"
                size="small"
                onClick={() => setStep('category')}
              >
                ← Назад
              </Button>
              <Text style={{ fontWeight: 500 }}>Выберите детализацию</Text>
            </Space>
          </div>
          <div style={{ padding: '4px 12px', background: '#f9f9f9', borderBottom: '1px solid #f0f0f0' }}>
            <Tag color="blue">{selection.category.name}</Tag>
          </div>
          {categoryDetails.length > 0 ? (
            categoryDetails.map((detail: DetailCostCategory) => (
              <div
                key={detail.id}
                className="cost-selector-item"
                onClick={() => handleDetailSelect(detail)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Space>
                  <FileTextOutlined style={{ color: '#52c41a' }} />
                  <span>{detail.name}</span>
                  {detail.unit_cost && (
                    <Tag color="green">{detail.unit_cost.toLocaleString('ru-RU')} ₽</Tag>
                  )}
                </Space>
              </div>
            ))
          ) : (
            <Empty description="Нет детализации для этой категории" style={{ padding: '20px' }} />
          )}
        </div>
      );
    }
    
    // Location selection
    if (step === 'location' && selection.detail) {
      return (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            <Space>
              <Button
                type="text"
                size="small"
                onClick={() => setStep('detail')}
              >
                ← Назад
              </Button>
              <Text style={{ fontWeight: 500 }}>Выберите локацию</Text>
            </Space>
          </div>
          <div style={{ padding: '4px 12px', background: '#f9f9f9', borderBottom: '1px solid #f0f0f0' }}>
            <Space>
              <Tag color="blue">{selection.category?.name}</Tag>
              <ArrowRightOutlined style={{ fontSize: '10px', color: '#8c8c8c' }} />
              <Tag color="green">{selection.detail.name}</Tag>
            </Space>
          </div>
          {locations.map((location) => {
            const locationName = [location.city, location.region, location.country]
              .filter(Boolean)
              .join(', ') || 'Локация не указана';
            
            return (
              <div
                key={location.id}
                className="cost-selector-item"
                onClick={() => handleLocationSelect(location)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Space>
                  <EnvironmentOutlined style={{ color: '#fa8c16' }} />
                  <span>{locationName}</span>
                </Space>
              </div>
            );
          })}
        </div>
      );
    }
    
    return null;
  };

  const renderSearchMode = () => {
    return (
      <div>
        <div style={{ 
          padding: '8px 12px', 
          background: '#f5f5f5', 
          borderBottom: '1px solid #e8e8e8',
          fontSize: '12px',
          color: '#8c8c8c'
        }}>
          <SearchOutlined /> Результаты поиска
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {searchLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin size="small" />
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((result) => (
              <div
                key={result.id}
                className="cost-selector-item"
                onClick={() => handleSearchResultSelect(result)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #f5f5f5'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ fontSize: '13px', color: '#262626' }}>
                  {result.name}
                </div>
                <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
                  {result.category_name} → {result.location_name}
                </div>
                {result.unit_cost && (
                  <div style={{ fontSize: '11px', color: '#52c41a', marginTop: '1px' }}>
                    {result.unit_cost.toLocaleString('ru-RU')} ₽
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty 
              description="Ничего не найдено" 
              style={{ padding: '20px' }}
            />
          )}
        </div>
      </div>
    );
  };

  const renderDropdown = () => {
    // If user is typing - show search results
    if (searchTerm && searchTerm.trim().length >= 2) {
      return renderSearchMode();
    }
    
    // If user is typing but less than 2 characters
    if (searchTerm && searchTerm.trim().length < 2) {
      return (
        <div>
          <div style={{ 
            padding: '16px', 
            textAlign: 'center', 
            color: '#8c8c8c',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <SearchOutlined style={{ marginRight: 8 }} />
            Введите минимум 2 символа для поиска
          </div>
          <Divider style={{ margin: '0' }}>или выберите из списка</Divider>
          {renderCascadeMode()}
        </div>
      );
    }
    
    // If input is focused but no text - show cascade selection
    return renderCascadeMode();
  };

  const { Text } = Typography;

  return (
    <Dropdown
      open={isOpen}
      trigger={[]}
      placement="bottomLeft"
      getPopupContainer={(trigger) => trigger.parentElement || document.body}
      overlay={
        <div 
          style={{ 
            backgroundColor: 'white',
            border: '1px solid #d9d9d9',
            borderRadius: '8px',
            boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
            minWidth: '300px'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {renderDropdown()}
        </div>
      }
    >
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', ...style }}
        className={className}
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        suffix={
          inputValue && !disabled ? (
            <CloseCircleFilled
              style={{ color: '#bfbfbf', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            />
          ) : null
        }
      />
    </Dropdown>
  );
};

export default CostDetailCascadeSelector;