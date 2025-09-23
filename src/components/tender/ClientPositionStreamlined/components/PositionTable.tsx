import React from 'react';
import { Table } from 'antd';
import type { BOQItem } from '../../../../lib/supabase/types';

// CRITICAL: This function MUST be preserved for row highlighting
export const getRowClassName = (record: BOQItem) => {
  switch(record.item_type) {
    case 'work':
      return 'bg-orange-100/90 hover:bg-orange-100 font-medium transition-colors';
    case 'sub_work':
      return 'bg-purple-100 hover:bg-purple-200 font-medium transition-colors';
    case 'material':
      return record.work_link
        ? 'bg-blue-100 hover:bg-blue-200 transition-colors'
        : 'bg-blue-100/60 hover:bg-blue-200/80 transition-colors';
    case 'sub_material':
      return 'bg-green-100/80 hover:bg-green-200 transition-colors';
    default:
      return '';
  }
};

interface PositionTableProps {
  dataSource: BOQItem[];
  columns: any[];
  loading?: boolean;
  scroll?: { x?: number; y?: number };
  rowKey: string | ((record: BOQItem) => string);
  onRow?: (record: BOQItem) => any;
  pagination?: any;
}

const PositionTable: React.FC<PositionTableProps> = ({
  dataSource,
  columns,
  loading = false,
  scroll = { x: 1200, y: 400 },
  rowKey,
  onRow,
  pagination = false
}) => {
  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={loading}
      pagination={pagination}
      size="small"
      scroll={scroll}
      className="custom-table boq-items-table"
      rowClassName={getRowClassName} // Using the critical function here
      rowKey={rowKey}
      onRow={onRow}
    />
  );
};

export default React.memo(PositionTable);