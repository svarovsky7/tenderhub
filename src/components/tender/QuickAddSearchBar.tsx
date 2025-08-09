import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface QuickAddSearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

const QuickAddSearchBar: React.FC<QuickAddSearchBarProps> = ({
  placeholder = 'Быстрый поиск...',
  onSearch,
}) => {
  console.log('🚀 QuickAddSearchBar rendered');
  
  const handleSearch = (value: string) => {
    console.log('🔍 Search triggered with value:', value);
    onSearch?.(value);
  };

  return (
    <Input
      placeholder={placeholder}
      prefix={<SearchOutlined />}
      onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
      allowClear
    />
  );
};

export default QuickAddSearchBar;