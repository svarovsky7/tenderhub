import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BOQItemWithLibrary } from '../../lib/supabase/types';
import { debugLog } from '../../utils/debug-logger';

interface VirtualBOQTableProps {
  dataSource: BOQItemWithLibrary[];
  columns: ColumnsType<BOQItemWithLibrary>;
  height: number;
  rowHeight?: number;
  summary?: (pageData: BOQItemWithLibrary[]) => React.ReactNode;
  loading?: boolean;
}

const VirtualBOQTable: React.FC<VirtualBOQTableProps> = ({
  dataSource,
  columns,
  height,
  rowHeight = 54,
  summary,
  loading = false
}) => {
  debugLog.log('🚀 VirtualBOQTable rendering with', dataSource.length, 'items');

  // Calculate the visible range for summary calculation
  const summaryNode = useMemo(() => {
    if (summary && dataSource.length > 0) {
      return summary(dataSource);
    }
    return null;
  }, [dataSource, summary]);

  // Row renderer for react-window
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = dataSource[index];
    if (!record) return null;

    return (
      <div style={style} className="virtual-table-row">
        <Table
          dataSource={[record]}
          columns={columns}
          pagination={false}
          showHeader={false}
          size="small"
          rowKey="id"
        />
      </div>
    );
  }, [dataSource, columns]);

  // If data is small enough, use regular table
  if (dataSource.length < 50) {
    debugLog.log('📊 Using regular table for', dataSource.length, 'items');
    return (
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        rowKey="id"
        scroll={{ x: true, y: height }}
        summary={() => summaryNode}
        loading={loading}
      />
    );
  }

  debugLog.log('📊 Using virtual table for', dataSource.length, 'items');

  return (
    <div className="virtual-boq-table">
      {/* Header */}
      <Table
        dataSource={[]}
        columns={columns}
        pagination={false}
        size="small"
        showHeader={true}
        style={{ marginBottom: 0 }}
      />

      {/* Virtual body */}
      <List
        height={height - 100} // Account for header and summary
        itemCount={dataSource.length}
        itemSize={rowHeight}
        width="100%"
      >
        {Row}
      </List>

      {/* Summary */}
      {summaryNode && (
        <div className="virtual-table-summary" style={{ borderTop: '1px solid #f0f0f0', padding: '8px 0' }}>
          {summaryNode}
        </div>
      )}
    </div>
  );
};

export default React.memo(VirtualBOQTable);