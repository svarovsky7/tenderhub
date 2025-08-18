import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, Spin, message, Tag, Space, Empty, Input, Switch, Divider } from 'antd';
import { 
  EnvironmentOutlined, 
  FolderOutlined, 
  FileTextOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import {
  getCostCategories,
  getDetailsByCategory,
  findCostNodeByCombination,
  getCostNodeDisplay,
  searchCostNodes,
  type CostCategory,
  type CostDetail,
  type CostNodeSearchResult
} from '../../lib/supabase/api/cost-nodes';
import { debounce } from 'lodash';

interface CostCascadeSelectorProps {
  value?: string | null;
  onChange?: (value: string | null, displayValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  allowSearch?: boolean; // Enable search mode
}

interface SelectionState {
  category: CostCategory | null;
  detail: CostDetail | null;
  locationId: string | null;
  locationName: string | null;
  detailId: string | null;
}

const CostCascadeSelector: React.FC<CostCascadeSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Выберите категорию затрат',
  disabled = false,
  style,
  className,
  allowSearch = true
}) => {
  console.log('🚀 [CostCascadeSelector] Rendering with value:', value);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'category' | 'detail' | 'location'>('category');
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [details, setDetails] = useState<CostDetail[]>([]);
  const [displayValue, setDisplayValue] = useState<string>('');
  
  // Search mode state
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CostNodeSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [selection, setSelection] = useState<SelectionState>({
    category: null,
    detail: null,
    locationId: null,
    locationName: null,
    detailId: null
  });

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load display value for existing value
  useEffect(() => {
    if (value && value !== 'fallback') {
      loadDisplayValue(value);
    } else if (!value) {
      setDisplayValue('');
    }
  }, [value]);

  const loadCategories = async () => {
    console.log('🚀 [CostCascadeSelector] Loading categories');
    setLoading(true);
    
    try {
      const { data, error } = await getCostCategories();
      
      if (error) {
        message.error('Ошибка загрузки категорий: ' + error.message);
        return;
      }
      
      setCategories(data || []);
      console.log('✅ [CostCascadeSelector] Categories loaded:', data?.length);
    } catch (err: any) {
      console.error('❌ [CostCascadeSelector] Error loading categories:', err);
      message.error('Ошибка загрузки категорий');
    } finally {
      setLoading(false);
    }
  };

  const loadDisplayValue = async (costNodeId: string) => {
    console.log('🚀 [CostCascadeSelector] Loading display value for:', costNodeId);
    
    try {
      const { data, error } = await getCostNodeDisplay(costNodeId);
      
      if (error) {
        console.error('❌ [CostCascadeSelector] Error loading display value:', error);
        return;
      }
      
      if (data) {
        setDisplayValue(data);
        console.log('✅ [CostCascadeSelector] Display value loaded:', data);
      }
    } catch (err: any) {
      console.error('❌ [CostCascadeSelector] Error loading display value:', err);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    console.log('🚀 [CostCascadeSelector] Category selected:', categoryId);
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    setSelection(prev => ({
      ...prev,
      category,
      detail: null,
      locationId: null,
      locationName: null,
      detailId: null
    }));
    
    setLoading(true);
    
    try {
      const { data, error } = await getDetailsByCategory(categoryId);
      
      if (error) {
        message.error('Ошибка загрузки детализации: ' + error.message);
        return;
      }
      
      setDetails(data || []);
      setStep('detail');
      console.log('✅ [CostCascadeSelector] Details loaded:', data?.length);
    } catch (err: any) {
      console.error('❌ [CostCascadeSelector] Error loading details:', err);
      message.error('Ошибка загрузки детализации');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailSelect = async (detailIndex: number) => {
    console.log('🚀 [CostCascadeSelector] Detail selected:', detailIndex);
    
    const detail = details[detailIndex];
    if (!detail) return;
    
    // Check if detail has single location
    if (detail.has_single_location && detail.locations?.[0]) {
      // Auto-select single location
      const location = detail.locations[0];
      await finishSelection(
        detail,
        location.detail_id,
        location.id,
        location.name
      );
    } else if (detail.locations && detail.locations.length > 1) {
      // Show location selection
      setSelection(prev => ({
        ...prev,
        detail
      }));
      setStep('location');
    } else {
      message.warning('Нет доступных локаций для выбранной детализации');
    }
  };

  const handleLocationSelect = async (locationIndex: number) => {
    console.log('🚀 [CostCascadeSelector] Location selected:', locationIndex);
    
    const detail = selection.detail;
    if (!detail || !detail.locations) return;
    
    const location = detail.locations[locationIndex];
    if (!location) return;
    
    await finishSelection(
      detail,
      location.detail_id,
      location.id,
      location.name
    );
  };

  const finishSelection = async (
    detail: CostDetail,
    detailId: string,
    locationId: string,
    locationName: string
  ) => {
    console.log('🚀 [CostCascadeSelector] Finishing selection');
    
    if (!selection.category) {
      message.error('Категория не выбрана');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: costNodeId, error } = await findCostNodeByCombination(
        selection.category.id,
        detailId,
        locationId
      );
      
      // The API now always returns a value (either the found ID or detail_id as fallback)
      const finalCostNodeId = costNodeId || detailId;
      const newDisplayValue = `${selection.category.name} → ${detail.name} → ${locationName}`;
      
      if (!costNodeId) {
        console.log('⚠️ [CostCascadeSelector] Using detail_id as fallback');
      } else {
        console.log('✅ [CostCascadeSelector] Using cost_node_id:', costNodeId);
      }
      
      setSelection(prev => ({
        ...prev,
        detail,
        detailId,
        locationId,
        locationName
      }));
      
      setDisplayValue(newDisplayValue);
      setIsOpen(false);
      
      // Call onChange with the final ID (real or fallback) and display value
      if (onChange) {
        onChange(finalCostNodeId, newDisplayValue);
      }
      
      console.log('✅ [CostCascadeSelector] Selection completed:', {
        finalCostNodeId,
        displayValue: newDisplayValue
      });
      
      message.success('Категория затрат выбрана');
    } catch (err: any) {
      console.error('❌ [CostCascadeSelector] Error finishing selection:', err);
      message.error('Ошибка выбора категории затрат');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    console.log('🚀 [CostCascadeSelector] Resetting selection');
    
    setStep('category');
    setSelection({
      category: null,
      detail: null,
      locationId: null,
      locationName: null,
      detailId: null
    });
    setDetails([]);
    setDisplayValue('');
    setSearchTerm('');
    setSearchResults([]);
    
    if (onChange) {
      onChange(null, '');
    }
  };
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      console.log('🔍 [CostCascadeSelector] Searching for:', term);
      setSearchLoading(true);
      
      try {
        const { data, error } = await searchCostNodes(term, 30);
        
        if (error) {
          console.error('❌ [CostCascadeSelector] Search error:', error);
          message.error('Ошибка поиска');
          return;
        }
        
        setSearchResults(data || []);
        console.log('✅ [CostCascadeSelector] Search results:', data?.length);
      } catch (err) {
        console.error('❌ [CostCascadeSelector] Search exception:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };
  
  // Handle search result selection
  const handleSearchResultSelect = (result: CostNodeSearchResult) => {
    console.log('🚀 [CostCascadeSelector] Selected search result:', result);
    
    setDisplayValue(result.display_name);
    setSearchTerm('');
    setSearchResults([]);
    setIsOpen(false);
    
    if (onChange) {
      onChange(result.cost_node_id, result.display_name);
    }
    
    message.success('Категория затрат выбрана');
  };

  const renderDropdown = () => {
    // Mode switcher if search is allowed
    const modeSwitcher = allowSearch ? (
      <div style={{ 
        padding: '8px 12px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        position: 'sticky',
        top: 0,
        zIndex: 2
      }}>
        <Space>
          <Switch
            size="small"
            checked={searchMode}
            onChange={(checked) => {
              setSearchMode(checked);
              setSearchTerm('');
              setSearchResults([]);
            }}
            checkedChildren={<SearchOutlined />}
            unCheckedChildren={<AppstoreOutlined />}
          />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {searchMode ? 'Режим поиска' : 'Каскадный выбор'}
          </span>
        </Space>
      </div>
    ) : null;
    
    if (loading && !searchMode) {
      return (
        <>
          {modeSwitcher}
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        </>
      );
    }
    
    // Search mode
    if (searchMode) {
      return (
        <>
          {modeSwitcher}
          <div style={{ padding: '8px' }}>
            <Input
              autoFocus
              placeholder="Введите для поиска (мин. 2 символа)"
              value={searchTerm}
              onChange={handleSearchChange}
              prefix={<SearchOutlined />}
              style={{ marginBottom: '8px' }}
            />
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Spin size="small" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div
                    key={result.cost_node_id}
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
                      {result.detail_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
                      {result.category_name} → {result.location_name}
                    </div>
                  </div>
                ))
              ) : searchTerm.length >= 2 ? (
                <Empty 
                  description="Ничего не найдено" 
                  style={{ padding: '20px' }}
                />
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c', fontSize: '12px' }}>
                  Введите минимум 2 символа для поиска
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    // Cascade mode
    if (step === 'category') {
      return (
        <>
          {modeSwitcher}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {categories.length > 0 ? (
            categories.map(category => (
              <div
                key={category.id}
                className="cost-selector-item"
                onClick={() => handleCategorySelect(category.id)}
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
                  {category.code && (
                    <Tag color="blue" style={{ marginLeft: '8px' }}>{category.code}</Tag>
                  )}
                </Space>
              </div>
            ))
          ) : (
            <Empty 
              description="Нет доступных категорий" 
              style={{ padding: '20px' }}
            />
          )}
          </div>
        </>
      );
    }

    if (step === 'detail') {
      return (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
          >
            <Space>
              <a onClick={() => setStep('category')}>← Назад</a>
              <span style={{ color: '#8c8c8c' }}>
                {selection.category?.name}
              </span>
            </Space>
          </div>
          
          {details.length > 0 ? (
            details.map((detail, index) => (
              <div
                key={index}
                className="cost-selector-item"
                onClick={() => handleDetailSelect(index)}
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
                  {detail.unit && (
                    <Tag color="green" style={{ marginLeft: '8px' }}>{detail.unit}</Tag>
                  )}
                  {detail.has_single_location ? (
                    <Tag color="orange">
                      {detail.location_name}
                    </Tag>
                  ) : (
                    <Tag>
                      {detail.locations?.length || 0} локаций
                    </Tag>
                  )}
                </Space>
              </div>
            ))
          ) : (
            <Empty 
              description="Нет доступной детализации" 
              style={{ padding: '20px' }}
            />
          )}
        </div>
      );
    }

    if (step === 'location') {
      const locations = selection.detail?.locations || [];
      
      return (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
          >
            <Space>
              <a onClick={() => setStep('detail')}>← Назад</a>
              <span style={{ color: '#8c8c8c' }}>
                {selection.category?.name} → {selection.detail?.name}
              </span>
            </Space>
          </div>
          
          {locations.length > 0 ? (
            locations.map((location, index) => (
              <div
                key={location.id}
                className="cost-selector-item"
                onClick={() => handleLocationSelect(index)}
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
                  <span>{location.name}</span>
                  {location.unit_cost && (
                    <Tag color="gold" style={{ marginLeft: '8px' }}>
                      {location.unit_cost.toLocaleString('ru-RU')} ₽
                    </Tag>
                  )}
                </Space>
              </div>
            ))
          ) : (
            <Empty 
              description="Нет доступных локаций" 
              style={{ padding: '20px' }}
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Select
      value={displayValue || undefined}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: '100%', ...style }}
      className={className}
      open={isOpen}
      onDropdownVisibleChange={setIsOpen}
      allowClear={true}
      onClear={handleReset}
      dropdownRender={() => renderDropdown()}
      dropdownStyle={{ padding: 0 }}
    />
  );
};

export default CostCascadeSelector;