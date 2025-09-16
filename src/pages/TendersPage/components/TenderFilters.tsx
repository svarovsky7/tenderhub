import React from 'react';
import { Card, Row, Col, Input, Button } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import type { TenderFiltersProps } from '../types';

interface TenderFiltersExtendedProps extends TenderFiltersProps {
  onExportAll?: () => void;
}

const TenderFilters: React.FC<TenderFiltersExtendedProps> = ({
  filters,
  onSearch,
  onFiltersChange,
  onExportAll
}) => {
  console.log('🚀 TenderFilters component rendered');
  console.log('📋 Current filters:', filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 Search input changed:', e.target.value);
    onFiltersChange({ search: e.target.value });
  };

  const handleSearchSubmit = (value: string) => {
    console.log('🔍 Search submitted with value:', value);
    onSearch(value);
  };

  const handleExportAll = () => {
    console.log('📊 Export all tenders requested');
    onExportAll?.();
  };

  return (
    <Card className="mb-6">
      <Row gutter={16} align="middle">
        <Col span={18}>
          <Input.Search
            placeholder="Поиск по названию, номеру, клиенту или версии..."
            value={filters.search}
            onChange={handleSearchChange}
            onSearch={handleSearchSubmit}
            allowClear
          />
        </Col>
        <Col span={6}>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExportAll}
            className="w-full"
          >
            Экспорт всех тендеров
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

export default TenderFilters;