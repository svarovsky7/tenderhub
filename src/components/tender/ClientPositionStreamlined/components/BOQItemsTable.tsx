import React from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { WorkEditRow } from './EditRows/WorkEditRow';
import { MaterialEditRow } from './EditRows/MaterialEditRow';
import type { FormInstance } from 'antd/es/form';

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
 * Компонент таблицы для отображения элементов BOQ с поддержкой inline редактирования
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
          switch(record.item_type) {
            case 'work':
              return 'bg-orange-100/90 hover:bg-orange-100 font-medium transition-colors';
            case 'sub_work':
              return 'bg-purple-100 hover:bg-purple-200 font-medium transition-colors';
            case 'material':
              return record.work_link ? 'bg-blue-100 hover:bg-blue-200 transition-colors' : 'bg-blue-100/60 hover:bg-blue-200/80 transition-colors';
            case 'sub_material':
              return 'bg-green-100/80 hover:bg-green-200 transition-colors';
            default:
              return '';
          }
        }}
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
        onRow={(record) => ({
          'data-row-key': record.id,
        })}
        summary={(pageData) => {
          const total = pageData.reduce((sum, item) => {
            let quantity = item.quantity || 0;
            const unitRate = item.unit_rate || 0;

            // For linked materials, calculate quantity based on work volume and coefficients
            if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
              // Find the linked work
              const work = position.boq_items?.find(boqItem => {
                if (item.work_link.work_boq_item_id &&
                    boqItem.id === item.work_link.work_boq_item_id &&
                    boqItem.item_type === 'work') {
                  return true;
                }
                if (item.work_link.sub_work_boq_item_id &&
                    boqItem.id === item.work_link.sub_work_boq_item_id &&
                    boqItem.item_type === 'sub_work') {
                  return true;
                }
                return false;
              });

              if (work) {
                // Get coefficients from BOQ item first, then from work_link
                const consumptionCoef = item.consumption_coefficient ||
                                       item.work_link.material_quantity_per_work || 1;
                const conversionCoef = item.conversion_coefficient ||
                                      item.work_link.usage_coefficient || 1;
                const workQuantity = work.quantity || 0;
                quantity = workQuantity * consumptionCoef * conversionCoef;
              }
            }

            // Apply currency conversion if needed
            const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate
              ? item.currency_rate
              : 1;
            let itemTotal = quantity * unitRate * currencyMultiplier;

            // Add delivery cost for materials
            if (item.item_type === 'material' || item.item_type === 'sub_material') {
              const deliveryType = item.delivery_price_type;
              const deliveryAmount = item.delivery_amount || 0;

              if (deliveryType === 'amount') {
                // Fixed amount per unit (already in RUB)
                itemTotal += deliveryAmount * quantity;
              } else if (deliveryType === 'not_included') {
                // 3% of base cost
                itemTotal += itemTotal * 0.03;
              }
            }

            return sum + itemTotal;
          }, 0);

          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: '#f8f9fa' }}>
                <Table.Summary.Cell index={0} colSpan={8} align="right">
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <div className="whitespace-nowrap">
                    <Typography.Text strong className="text-lg text-green-700">
                      {Math.round(total).toLocaleString('ru-RU')} ₽
                    </Typography.Text>
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