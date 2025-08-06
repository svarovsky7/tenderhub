import React from 'react';
import { Card, Row, Col, Input, Select, DatePicker, Button, Space } from 'antd';
import { FilterOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TenderFiltersProps } from '../types';

const { RangePicker } = DatePicker;

const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onSearch,
  // onStatusFilter removed as status field was removed from schema
  onDateFilter,
  onFiltersChange
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

  // Note: status filter handlers removed as status field was removed from schema

  const handleDateChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    console.log('📅 Date filter changed:', dates);
    onDateFilter(dates);
  };

  return (
    <Card className="mb-6">
      <Row gutter={16} align="middle">
        <Col span={10}>
          <Input.Search
            placeholder="Поиск по названию, номеру или клиенту..."
            value={filters.search}
            onChange={handleSearchChange}
            onSearch={handleSearchSubmit}
            allowClear
          />
        </Col>
        {/* Note: status filter removed as status field was removed from schema */}
        <Col span={6}>
          <RangePicker
            placeholder={['Дата от', 'Дата до']}
            onChange={handleDateChange}
            className="w-full"
            value={filters.date_from && filters.date_to ? [
              dayjs(filters.date_from),
              dayjs(filters.date_to)
            ] : null}
          />
        </Col>
        <Col span={4}>
          <Space>
            <Button icon={<FilterOutlined />}>
              Фильтры
            </Button>
            <Button icon={<ExportOutlined />}>
              Экспорт
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default TenderFilters;