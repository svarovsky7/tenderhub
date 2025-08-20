import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dropdown, Spin, message, Empty, Input } from 'antd';
import { 
  SearchOutlined,
  CloseCircleFilled
} from '@ant-design/icons';
import {
  searchDetailCategories,
  getDetailCategoryDisplay,
  type DetailCategorySearchResult
} from '../../lib/supabase/api/construction-costs';
import { debounce } from 'lodash';

interface CostDetailSelectorProps {
  value?: string | null;
  onChange?: (value: string | null, displayValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const CostDetailSelector: React.FC<CostDetailSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Выберите категорию затрат',
  disabled = false,
  style,
  className
}) => {
  console.log('🚀 [CostDetailSelector] Rendering with value:', value);

  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DetailCategorySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Refs for handling blur
  const inputRef = useRef<any>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout>();

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
    console.log('🚀 [CostDetailSelector] Loading display value for:', detailCategoryId);
    
    try {
      const { data, error } = await getDetailCategoryDisplay(detailCategoryId);
      
      if (error) {
        console.error('❌ [CostDetailSelector] Error loading display value:', error);
        return;
      }
      
      if (data) {
        setDisplayValue(data);
        console.log('✅ [CostDetailSelector] Display value loaded:', data);
      }
    } catch (err: any) {
      console.error('❌ [CostDetailSelector] Error loading display value:', err);
    }
  };

  const handleReset = useCallback(() => {
    console.log('🚀 [CostDetailSelector] Resetting selection');
    
    setDisplayValue('');
    setInputValue('');
    setSearchTerm('');
    setSearchResults([]);
    
    if (onChange) {
      onChange(null, '');
    }
  }, [onChange]);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      
      console.log('🔍 [CostDetailSelector] Searching for:', term);
      setSearchLoading(true);
      
      try {
        const { data, error } = await searchDetailCategories(term, 30);
        
        if (error) {
          console.error('❌ [CostDetailSelector] Search error:', error);
          message.error('Ошибка поиска');
          return;
        }
        
        setSearchResults(data || []);
        console.log('✅ [CostDetailSelector] Search results:', data?.length);
      } catch (err) {
        console.error('❌ [CostDetailSelector] Search exception:', err);
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
  
  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
    // Clear blur timeout if exists
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };
  
  // Handle input blur
  const handleInputBlur = () => {
    // Delay closing to allow clicking on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      // Reset input to display value if no search and different
      if (!searchTerm && displayValue && inputValue !== displayValue) {
        setInputValue(displayValue);
      }
    }, 200);
  };
  
  // Handle search result selection
  const handleSearchResultSelect = async (result: DetailCategorySearchResult) => {
    console.log('🚀 [CostDetailSelector] Selected search result:', result);
    
    // Clear blur timeout to prevent closing
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
    
    console.log('✅ [CostDetailSelector] Selection completed:', {
      detailCategoryId: result.id,
      displayValue: result.display_name
    });
    
    message.success('Категория затрат выбрана');
  };

  const renderDropdown = () => {
    // If searching (has text input)
    if (searchTerm.trim().length >= 2) {
      return (
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
      );
    }

    // Show placeholder when not searching
    if (searchTerm.trim().length < 2 && searchTerm.length > 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>
          Введите минимум 2 символа для поиска
        </div>
      );
    }

    return null;
  };

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
            // Prevent blur when clicking inside dropdown
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

export default CostDetailSelector;