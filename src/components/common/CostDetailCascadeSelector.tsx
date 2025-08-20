import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Dropdown, Spin, message, Tag, Space, Empty, Input, Divider, Button, Typography } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  detailVariants?: DetailCostCategory[]; // All details with the same name but different locations
}

const CostDetailCascadeSelectorComponent: React.FC<CostDetailCascadeSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Выберите категорию затрат',
  disabled = false,
  style,
  className
}) => {
  console.log('🚀 [CostDetailCascadeSelector] Rendering with value:', value);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'category' | 'detail' | 'location'>('category');
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

  // Get query client to check cache
  const queryClient = useQueryClient();
  
  // Check if data exists in cache
  const cachedCategories = queryClient.getQueryData(['costCategoriesWithDetails']);
  const cachedLocations = queryClient.getQueryData(['costLocations']);

  // Use React Query for caching categories and locations
  const { data: categoriesWithDetails = [], isLoading: catLoading, error: catError } = useQuery({
    queryKey: ['costCategoriesWithDetails'],
    queryFn: async () => {
      console.log('🚀 [CostDetailCascadeSelector] Loading categories via React Query');
      const { data, error } = await getCategoriesWithDetails();
      if (error) {
        console.error('❌ Error loading categories:', error);
        throw error;
      }
      console.log('✅ Categories loaded via React Query:', data?.length);
      return data || [];
    },
    enabled: !cachedCategories, // Only load if not in cache
    staleTime: Infinity, // Never stale for static data
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: cachedCategories as any[] | undefined
  });

  const { data: locations = [], isLoading: locLoading, error: locError } = useQuery({
    queryKey: ['costLocations'],
    queryFn: async () => {
      console.log('🚀 [CostDetailCascadeSelector] Loading locations via React Query');
      const { data, error } = await getLocations();
      if (error) {
        console.error('❌ Error loading locations:', error);
        throw error;
      }
      console.log('✅ Locations loaded via React Query:', data?.length);
      return data || [];
    },
    enabled: !cachedLocations, // Only load if not in cache
    staleTime: Infinity, // Never stale for static data
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: cachedLocations as Location[] | undefined
  });

  const loading = catLoading || locLoading;

  // Show error messages if loading failed
  useEffect(() => {
    if (catError) {
      message.error('Ошибка загрузки категорий');
    }
    if (locError) {
      message.error('Ошибка загрузки локаций');
    }
  }, [catError, locError]);

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
      location: null,
      detailVariants: undefined
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
      location: null,
      detailVariants: undefined
    });
    setStep('detail');
  };
  
  const handleDetailSelect = (detail: DetailCostCategory) => {
    console.log('🚀 [CostDetailCascadeSelector] Detail selected:', detail.name);
    console.log('🔍 Detail has location:', detail.location);
    
    // If detail has a linked location, complete selection immediately
    if (detail.location) {
      const { category } = selection;
      if (!category) return;
      
      const locationName = [detail.location.city, detail.location.region, detail.location.country]
        .filter(Boolean)
        .join(', ') || 'Локация не указана';
      
      const newDisplayValue = `${category.name} → ${detail.name} → ${locationName}`;
      
      setDisplayValue(newDisplayValue);
      setInputValue(newDisplayValue);
      setSelection({ ...selection, detail, location: detail.location });
      setIsOpen(false);
      setStep('category');
      
      if (onChange) {
        onChange(detail.id, newDisplayValue);
      }
      
      console.log('✅ Selection completed with linked location:', {
        detailCategoryId: detail.id,
        displayValue: newDisplayValue
      });
      
      message.success('Категория затрат выбрана');
    } else {
      // If no linked location, proceed to location selection step
      setSelection({
        ...selection,
        detail
      });
      setStep('location');
    }
  };
  
  const handleLocationSelect = (location: Location, specificDetail?: DetailCostCategory) => {
    console.log('🚀 [CostDetailCascadeSelector] Location selected:', location);
    
    const { detail, category } = selection;
    if (!category) return;
    
    // Use specific detail if provided (for multiple variants case)
    const selectedDetailCategory = specificDetail || detail;
    
    if (selectedDetailCategory && selectedDetailCategory.id) {
      const locationName = [location.city, location.region, location.country]
        .filter(Boolean)
        .join(', ') || 'Локация не указана';
      
      const newDisplayValue = `${category.name} → ${selectedDetailCategory.name} → ${locationName}`;
      
      setDisplayValue(newDisplayValue);
      setInputValue(newDisplayValue);
      setSelection({ ...selection, location, detail: selectedDetailCategory });
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
      
      // Group details by name to avoid duplicates
      const groupedDetails = categoryDetails.reduce((acc: { [key: string]: DetailCostCategory[] }, detail) => {
        const name = detail.name;
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(detail);
        return acc;
      }, {});
      
      const uniqueDetailNames = Object.keys(groupedDetails).sort();
      
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
          {uniqueDetailNames.length > 0 ? (
            uniqueDetailNames.map((detailName) => {
              const details = groupedDetails[detailName];
              const firstDetail = details[0];
              const hasMultipleLocations = details.length > 1;
              
              return (
                <div
                  key={detailName}
                  className="cost-selector-item"
                  onClick={() => {
                    // Store all details for this name
                    setSelection({
                      ...selection,
                      detail: firstDetail,
                      // Store all details with same name for location step
                      detailVariants: details
                    } as any);
                    
                    if (details.length === 1 && firstDetail.location) {
                      // Single detail with linked location - complete immediately
                      handleDetailSelect(firstDetail);
                    } else {
                      // Multiple locations or no linked location - proceed to location step
                      setStep('location');
                    }
                  }}
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
                    <span>{detailName}</span>
                    {hasMultipleLocations && (
                      <Tag color="orange" style={{ fontSize: '11px' }}>
                        {details.length} локации
                      </Tag>
                    )}
                    {firstDetail.unit_cost && (
                      <Tag color="green">{firstDetail.unit_cost.toLocaleString('ru-RU')} ₽</Tag>
                    )}
                  </Space>
                </div>
              );
            })
          ) : (
            <Empty description="Нет детализации для этой категории" style={{ padding: '20px' }} />
          )}
        </div>
      );
    }
    
    // Location selection
    if (step === 'location' && selection.detail) {
      // Get locations to show based on detail variants
      let locationsToShow: Location[] = [];
      
      if ((selection as any).detailVariants) {
        // If we have multiple details with same name, show their locations
        const detailVariants = (selection as any).detailVariants as DetailCostCategory[];
        locationsToShow = detailVariants
          .map(d => d.location)
          .filter((loc): loc is Location => loc !== null && loc !== undefined);
        
        // If no linked locations, show all available locations
        if (locationsToShow.length === 0) {
          locationsToShow = locations;
        }
      } else if (selection.detail.location) {
        // Single detail with linked location
        locationsToShow = [selection.detail.location];
      } else {
        // Single detail without linked location - show all
        locationsToShow = locations;
      }
      
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
              <Text style={{ fontWeight: 500 }}>
                {locationsToShow.length === 1 ? 'Локация для этой детализации' : 'Выберите локацию'}
              </Text>
            </Space>
          </div>
          <div style={{ padding: '4px 12px', background: '#f9f9f9', borderBottom: '1px solid #f0f0f0' }}>
            <Space>
              <Tag color="blue">{selection.category?.name}</Tag>
              <ArrowRightOutlined style={{ fontSize: '10px', color: '#8c8c8c' }} />
              <Tag color="green">{selection.detail.name}</Tag>
            </Space>
          </div>
          {locationsToShow.map((location) => {
            const locationName = [location.city, location.region, location.country]
              .filter(Boolean)
              .join(', ') || 'Локация не указана';
            
            return (
              <div
                key={location.id}
                className="cost-selector-item"
                onClick={() => {
                  // Find the correct detail for this location
                  const detailVariants = (selection as any).detailVariants as DetailCostCategory[] | undefined;
                  if (detailVariants) {
                    const correctDetail = detailVariants.find(d => d.location_id === location.id);
                    if (correctDetail) {
                      handleLocationSelect(location, correctDetail);
                    } else {
                      handleLocationSelect(location);
                    }
                  } else {
                    handleLocationSelect(location);
                  }
                }}
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

// Memoize component to prevent unnecessary re-renders
const CostDetailCascadeSelector = memo(CostDetailCascadeSelectorComponent, (prevProps, nextProps) => {
  // Only re-render if value or disabled state changes
  return prevProps.value === nextProps.value && 
         prevProps.disabled === nextProps.disabled &&
         prevProps.placeholder === nextProps.placeholder;
});

export default CostDetailCascadeSelector;