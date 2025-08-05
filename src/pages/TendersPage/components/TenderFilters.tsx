import React from 'react';
import { Card, Row, Col, Input, Select, DatePicker, Button, Space } from 'antd';
import { FilterOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TenderFiltersProps } from '../types';

const { RangePicker } = DatePicker;

const TenderFilters: React.FC<TenderFiltersProps> = ({
  filters,
  onSearch,
  onStatusFilter,
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

  const handleStatusChange = (status: string[]) => {
    console.log('🏷️ Status filter changed:', status);
    onStatusFilter(status as any[]);
  };

  const handleDateChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    console.log('📅 Date filter changed:', dates);
    onDateFilter(dates);
  };

  return (
    <Card className="mb-6">
      <Row gutter={16} align="middle">
        <Col span={8}>
          <Input.Search
            placeholder="Поиск по названию, номеру или клиенту..."
            value={filters.search}
            onChange={handleSearchChange}
            onSearch={handleSearchSubmit}
            allowClear
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="Статус тендера"
            value={filters.status}
            onChange={handleStatusChange}
            mode="multiple"
            allowClear
            className="w-full"
          >
            <Select.Option value="draft">Черновик</Select.Option>
            <Select.Option value="active">Активный</Select.Option>
            <Select.Option value="submitted">Подан</Select.Option>
            <Select.Option value="awarded">Выигран</Select.Option>
            <Select.Option value="closed">Закрыт</Select.Option>
          </Select>
        </Col>
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