import React from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { calculateBOQItemsTotal } from '../utils/calculateTotal';
import { WorkEditRow } from './EditRows/WorkEditRow';
import { MaterialEditRow } from './EditRows/MaterialEditRow';
import type { FormInstance } from 'antd/es/form';
import { useTheme } from '../../../../contexts/ThemeContext';

interface BOQItemsTableProps {
  refreshKey: number;
  columns: ColumnsType<any>;
  sortedBOQItems: any[];
  position: any;
  editingMaterialId: string | null;
  editingWorkId: string | null;
  editForm: FormInstance;
  workEditForm: FormInstance;
  handleSaveInlineEdit: () => void;
  handleCancelInlineEdit: () => void;
  handleWorkSelectionChange: (workId: string | null) => void;
  handleCoefficientChange: (field: string, value: number | null) => void;
  handleSaveWorkEdit: () => void;
  handleCancelWorkEdit: () => void;
  tenderMarkup: any;
  tender?: any;
  works: any[];
  loading: boolean;
}

/**
 * Компонент таблицы для отображения элементов BOQ с поддержкой inline редактирования и тёмной темы
 */
export const BOQItemsTable: React.FC<BOQItemsTableProps> = ({
  refreshKey,
  columns,
  sortedBOQItems,
  position,
  editingMaterialId,
  editingWorkId,
  editForm,
  workEditForm,
  handleSaveInlineEdit,
  handleCancelInlineEdit,
  handleWorkSelectionChange,
  handleCoefficientChange,
  handleSaveWorkEdit,
  handleCancelWorkEdit,
  tenderMarkup,
  tender,
  works,
  loading
}) => {
  const { theme } = useTheme();

  // Get row background color based on item type and theme
  const getRowBackgroundColor = (itemType: string, workLink?: boolean) => {
    const isDark = theme === 'dark';

    switch(itemType) {
      case 'work':
        return isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 237, 213, 0.9)'; // Orange
      case 'sub_work':
        return isDark ? 'rgba(156, 39, 176, 0.15)' : 'rgba(243, 229, 245, 1)'; // Purple
      case 'material':
        return workLink
          ? (isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(225, 245, 254, 1)') // Blue
          : (isDark ? 'rgba(33, 150, 243, 0.1)' : 'rgba(225, 245, 254, 0.6)'); // Blue lighter
      case 'sub_material':
        return isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(232, 245, 233, 0.8)'; // Green
      default:
        return 'transparent';
    }
  };

  const getRowHoverColor = (itemType: string, workLink?: boolean) => {
    const isDark = theme === 'dark';

    switch(itemType) {
      case 'work':
        return isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 224, 178, 1)'; // Darker orange on hover
      case 'sub_work':
        return isDark ? 'rgba(156, 39, 176, 0.2)' : 'rgba(225, 190, 231, 1)'; // Already darker purple
      case 'material':
        return workLink
          ? (isDark ? 'rgba(33, 150, 243, 0.2)' : 'rgba(179, 229, 252, 1)') // Darker blue on hover
          : (isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(179, 229, 252, 0.75)'); // Darker blue on hover
      case 'sub_material':
        return isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(200, 230, 201, 1)'; // Already darker green
      default:
        return 'transparent';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ width: '100%', minWidth: '1200px' }}>
      <Table
        key={refreshKey}
        columns={columns}
        dataSource={sortedBOQItems}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 1200, y: 400 }}
        className="custom-table boq-items-table"
        rowClassName={(record) => {
          const isFontMedium = record.item_type === 'work' || record.item_type === 'sub_work';
          return isFontMedium ? 'font-medium transition-colors' : 'transition-colors';
        }}
        onRow={(record) => ({
          'data-row-key': record.id,
          style: {
            backgroundColor: getRowBackgroundColor(record.item_type, record.work_link),
            transition: 'background-color 0.2s ease',
          },
          onMouseEnter: (e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = getRowHoverColor(record.item_type, record.work_link);
          },
          onMouseLeave: (e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = getRowBackgroundColor(record.item_type, record.work_link);
          },
        })}
        components={{
          body: {
            row: ({ children, ...props }: any) => {
              const record = props['data-row-key'] ?
                sortedBOQItems.find(item => item.id === props['data-row-key']) :
                null;

              // If this is the material or sub-material being edited, show the edit form
              if (record && editingMaterialId === record.id && (record.item_type === 'material' || record.item_type === 'sub_material')) {
                return (
                  <MaterialEditRow
                    item={record}
                    editForm={editForm}
                    handleSaveInlineEdit={handleSaveInlineEdit}
                    handleCancelInlineEdit={handleCancelInlineEdit}
                    handleWorkSelectionChange={handleWorkSelectionChange}
                    handleCoefficientChange={handleCoefficientChange}
                    tenderMarkup={tenderMarkup}
                    tender={tender}
                    works={works}
                    loading={loading}
                  />
                );
              }

              // If this is the work or sub-work being edited, show the edit form
              if (record && editingWorkId === record.id && (record.item_type === 'work' || record.item_type === 'sub_work')) {
                return (
                  <WorkEditRow
                    item={record}
                    workEditForm={workEditForm}
                    handleSaveWorkEdit={handleSaveWorkEdit}
                    handleCancelWorkEdit={handleCancelWorkEdit}
                    tenderMarkup={tenderMarkup}
                    tender={tender}
                  />
                );
              }

              // Otherwise show normal row
              return <tr {...props}>{children}</tr>;
            }
          }
        }}
        summary={(pageData) => {
          // Use the shared calculation function with position.boq_items for lookup
          const total = calculateBOQItemsTotal(pageData, position.boq_items);

          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f8f9fa' }}>
                <Table.Summary.Cell index={0} colSpan={8} align="right">
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <div className="whitespace-nowrap">
                    <strong className="text-lg table-sum-green" style={{ color: theme === 'dark' ? '#73d13d' : '#52c41a', fontWeight: 600 }}>
                      {Math.round(total).toLocaleString('ru-RU')} ₽
                    </strong>
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} />
                <Table.Summary.Cell index={10} />
                <Table.Summary.Cell index={11} />
                <Table.Summary.Cell index={12} />
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </div>
  );
};