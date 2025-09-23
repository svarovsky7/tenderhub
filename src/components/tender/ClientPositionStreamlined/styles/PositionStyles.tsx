// Styles for ClientPositionStreamlined components
// Extracted for modularization and reusability

export const tableStyles = `
  .custom-table .ant-table-tbody > tr > td {
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
    padding: 8px 6px;
  }
  .custom-table .ant-table-thead > tr > th {
    background-color: #fafafa;
    font-weight: 600;
    border-bottom: 2px solid #e8e8e8;
    padding: 8px 6px;
    font-size: 12px;
  }
  .custom-table .ant-table-container {
    border-radius: 6px;
  }
  .custom-table .ant-table {
    font-size: 13px;
  }
  .custom-table .ant-table-tbody > tr {
    transition: background-color 0.2s ease;
  }
  .custom-table .ant-table-tbody > tr > td {
    transition: background-color 0.2s ease;
  }
  /* Hover effects for different row types */
  .custom-table .ant-table-tbody > tr.bg-orange-100\\/90:hover > td {
    background-color: #fed7aa !important; /* Fully saturated orange for work */
  }
  .custom-table .ant-table-tbody > tr.bg-purple-100:hover > td {
    background-color: #e9d5ff !important; /* Darker purple for sub-work */
  }
  .custom-table .ant-table-tbody > tr.bg-blue-100:hover > td {
    background-color: #bfdbfe !important; /* Darker blue for material */
  }
  .custom-table .ant-table-tbody > tr.bg-blue-100\\/60:hover > td {
    background-color: #dbeafe !important; /* Darker blue for unlinked material */
  }
  .custom-table .ant-table-tbody > tr.bg-green-100\\/80:hover > td {
    background-color: #bbf7d0 !important; /* Darker green for sub-material */
  }
  .custom-table .ant-table-tbody > tr:hover {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .custom-table .ant-input-number {
    border: none !important;
    box-shadow: none !important;
  }
  .custom-table .ant-input {
    border: none !important;
    box-shadow: none !important;
  }
  .custom-table .ant-input-number:hover,
  .custom-table .ant-input:hover {
    background-color: #f9f9f9;
  }
  .custom-table .ant-input-number:focus,
  .custom-table .ant-input:focus {
    background-color: #ffffff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
  }
  @media (max-width: 768px) {
    .custom-table .ant-table-tbody > tr > td {
      padding: 6px 3px;
      font-size: 11px;
    }
    .custom-table .ant-table-thead > tr > th {
      padding: 6px 3px;
      font-size: 11px;
    }
    .custom-table {
      font-size: 11px;
    }
  }
  @media (max-width: 1024px) {
    .custom-table .ant-table-tbody > tr > td {
      padding: 6px 4px;
      font-size: 12px;
    }
    .custom-table .ant-table-thead > tr > th {
      padding: 6px 4px;
      font-size: 11px;
    }
  }
`;

// Row className function for table row highlighting based on item type
// CRITICAL: This function must be preserved for proper row coloring
export const getRowClassName = (record: any) => {
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

// Card styles based on position state
export const getCardStyles = (isExpanded: boolean, positionColors: any) => ({
  className: `hover:shadow-md transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-200 shadow-lg' : ''} overflow-hidden w-full`,
  bodyStyle: { padding: 0 },
  style: {
    borderRadius: '8px',
    borderTop: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
    borderRight: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
    borderBottom: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
    borderLeft: `4px solid ${positionColors.border}`,
    width: '100%',
    background: positionColors.background,
    color: positionColors.text
  }
});

// Header styles for position card
export const headerStyles = {
  cursor: (canAddItems: boolean) => canAddItems ? 'pointer' : 'default',
  hoverBg: 'hover:bg-gray-50',
  transitionDuration: 'transition-colors duration-200'
};