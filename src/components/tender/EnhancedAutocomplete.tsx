import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Input, 
  List, 
  Avatar, 
  Typography, 
  Badge, 
  Skeleton, 
  Empty,
  Tag,
  Tooltip
} from 'antd';
import { 
  SearchOutlined, 
  BuildOutlined, 
  ToolOutlined, 
  StarOutlined,
  ClockCircleOutlined,
  FireOutlined
} from '@ant-design/icons';
import type { Material, Work } from '../../lib/supabase/types';
import styles from '../../styles/EnhancedQuickAddCard.module.css';

const { Search } = Input;
const { Text } = Typography;

interface EnhancedAutocompleteProps {
  type: 'work' | 'material';
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: Material | Work) => void;
  suggestions: (Material | Work)[];
  loading: boolean;
  placeholder?: string;
  className?: string;
}

interface SuggestionItemProps {
  item: Material | Work;
  type: 'work' | 'material';
  onSelect: (item: Material | Work) => void;
  index: number;
}

const SuggestionItem: React.FC<SuggestionItemProps> = React.memo(({ 
  item, 
  type, 
  onSelect, 
  index 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isWork = type === 'work';
  
  // Simulate item popularity/usage stats
  const popularity = Math.floor(Math.random() * 100);
  const isPopular = popularity > 70;
  const isNew = Math.random() > 0.8;
  
  const handleClick = useCallback(() => {
    console.log('🎯 Suggestion selected:', item);
    onSelect(item);
  }, [item, onSelect]);

  return (
    <div
      className={`${styles.suggestionItem} group`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      <Avatar
        size={48}
        icon={isWork ? <BuildOutlined /> : <ToolOutlined />}
        className={isWork ? styles.suggestionAvatar : styles.materialSuggestionAvatar}
        style={{
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.2s ease'
        }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Text strong className="text-gray-800 truncate">
            {item.name}
          </Text>
          {isPopular && (
            <Tooltip title="Популярный выбор">
              <FireOutlined className="text-orange-500 text-xs" />
            </Tooltip>
          )}
          {isNew && (
            <Tag color="green" size="small" icon={<StarOutlined />}>
              Новый
            </Tag>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Text type="secondary">Ед. изм:</Text>
            <Badge count={item.unit} showZero style={{ backgroundColor: '#52c41a' }} />
          </span>
          
          {(item as Material).category && (
            <span className="flex items-center gap-1">
              <Text type="secondary">Категория:</Text>
              <Text className="text-blue-600">{(item as Material).category}</Text>
            </span>
          )}
          
          {(item as Work).work_type && (
            <span className="flex items-center gap-1">
              <Text type="secondary">Тип:</Text>
              <Text className="text-purple-600">{(item as Work).work_type}</Text>
            </span>
          )}
        </div>
        
        {/* Preview info */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <ClockCircleOutlined />
            Добавлен: {new Date(item.created_at).toLocaleDateString('ru-RU')}
          </span>
          <span>Популярность: {popularity}%</span>
        </div>
      </div>
      
      {/* Hover indicator */}
      <div 
        className="w-1 h-12 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full transition-all duration-200"
        style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scaleY(1)' : 'scaleY(0)'
        }}
      />
    </div>
  );
});

SuggestionItem.displayName = 'SuggestionItem';

const EnhancedAutocomplete: React.FC<EnhancedAutocompleteProps> = React.memo(({
  type,
  value,
  onChange,
  onSelect,
  suggestions,
  loading,
  placeholder,
  className
}) => {
  console.log('🚀 EnhancedAutocomplete rendered', { type, suggestionsCount: suggestions.length });
  
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isWork = type === 'work';

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show suggestions when we have data and input is focused
  useEffect(() => {
    setShowSuggestions(focused && (suggestions.length > 0 || loading));
  }, [focused, suggestions.length, loading]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🔍 Search value changed:', newValue);
    onChange(newValue);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    console.log('🎯 Autocomplete focused');
    setFocused(true);
  }, []);

  const handleSelect = useCallback((item: Material | Work) => {
    console.log('✅ Item selected from autocomplete:', item);
    onSelect(item);
    setShowSuggestions(false);
    setFocused(false);
  }, [onSelect]);

  const renderSuggestions = () => {
    if (loading) {
      return (
        <div className={styles.suggestionsContainer}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.suggestionItem}>
              <Skeleton avatar active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <div className={styles.suggestionsContainer}>
          <div className="p-8 text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-gray-500">
                  {value.trim() ? 'Ничего не найдено' : 'Начните вводить для поиска'}
                </span>
              }
            />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.suggestionsContainer}>
        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
          <Text className="text-sm font-medium text-gray-600">
            {isWork ? 'Найденные работы' : 'Найденные материалы'} ({suggestions.length})
          </Text>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {suggestions.map((item, index) => (
            <SuggestionItem
              key={item.id}
              item={item}
              type={type}
              onSelect={handleSelect}
              index={index}
            />
          ))}
        </div>
        
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <Text className="text-xs text-gray-400 text-center block">
            💡 Нажмите на элемент для быстрого выбора
          </Text>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`${styles.searchContainer} ${className || ''}`}>
      <Search
        placeholder={placeholder || `Поиск ${isWork ? 'работ' : 'материалов'}...`}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        loading={loading}
        size="large"
        className={`${styles.searchInput} ${focused ? 'ring-2 ring-blue-200' : ''}`}
        prefix={
          <SearchOutlined 
            className={`transition-colors duration-200 ${
              focused ? 'text-blue-500' : 'text-gray-400'
            }`} 
          />
        }
        suffix={
          suggestions.length > 0 && !loading && (
            <Badge 
              count={suggestions.length} 
              size="small"
              style={{ 
                backgroundColor: isWork ? '#667eea' : '#11998e',
                marginRight: 8
              }}
            />
          )
        }
        style={{
          background: focused 
            ? 'rgba(255, 255, 255, 0.98)' 
            : 'rgba(255, 255, 255, 0.9)'
        }}
      />
      
      {showSuggestions && renderSuggestions()}
    </div>
  );
});

EnhancedAutocomplete.displayName = 'EnhancedAutocomplete';

export default EnhancedAutocomplete;