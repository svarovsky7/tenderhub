import React, { useState, useCallback } from 'react';
import { Typography, Button, Upload, Table, Space, message, Card } from 'antd';
import { PlusOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

// Components
import {
  TenderStats,
  TenderFilters,
  TenderTable,
  CreateTenderModal,
  EditTenderModal,
  DeleteTenderModal
} from './components';

// Hooks
import { useTenderFilters, useTenders, useTenderActions } from './hooks';
import type { TenderExcelItem, TenderWithSummary } from './types';

const { Title, Text } = Typography;

const TendersPage: React.FC = () => {
  console.log('🚀 TendersPage component rendered');

  const navigate = useNavigate();
  const [excelItems, setExcelItems] = useState<TenderExcelItem[]>([]);

  const excelColumns: ColumnsType<TenderExcelItem> = [
    { title: '№', dataIndex: 'number', key: 'number', width: 80 },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TenderExcelItem) => (
        <span style={{ paddingLeft: `${(record.number.split('.').length - 1) * 16}px` }}>
          {text}
        </span>
      )
    },
    { title: 'Ед. изм.', dataIndex: 'unit', key: 'unit', width: 100 },
    { title: 'Количество', dataIndex: 'quantity', key: 'quantity', width: 120 },
    { title: 'Примечание', dataIndex: 'note', key: 'note' }
  ];

  const handleExcelFile = useCallback(async (file: File) => {
    console.log('📥 handleExcelFile called with:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const startTime = performance.now();
    console.log('⏱️ Starting Excel parsing...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, { header: 1 });
      console.log('📄 Total rows read:', rows.length);

      const items = rows
        .filter(row => row[2])
        .map(row => ({
          number: String(row[0] ?? ''),
          name: String(row[1] ?? ''),
          unit: String(row[2] ?? ''),
          quantity: String(row[3] ?? ''),
          note: String(row[4] ?? '')
        }));

      setExcelItems(prev => {
        console.log('🔄 Excel items state updated:', {
          oldCount: prev.length,
          newCount: items.length
        });
        return items;
      });

      try {
        console.log('💾 Saving Excel items to localStorage...');
        localStorage.setItem('excelItems', JSON.stringify(items));
        console.log('✅ Excel items saved to localStorage');
      } catch (storageError) {
        console.error('💥 Failed to save Excel items to localStorage:', storageError);
      }

      const endTime = performance.now();
      console.log('⏱️ Excel parsing completed in:', `${endTime - startTime}ms`);

      console.log('📨 Navigating to /boq to display imported items');
      navigate('/boq');
    } catch (error) {
      console.error('💥 Error parsing Excel file:', error);
      message.error('Ошибка при чтении файла');
    }
  }, [navigate]);

  // Initialize filters hook with callback to reset pagination
  const resetPaginationCallback = () => {
    // This will be handled automatically by the useTenders hook when filters change
  };

  const {
    filters,
    handleSearch,
    handleStatusFilter,
    handleDateFilter,
    handleFiltersChange
  } = useTenderFilters(resetPaginationCallback);

  // Initialize tenders data hook
  const {
    tenders,
    loading,
    pagination,
    stats,
    loadTenders,
    handleTableChange
  } = useTenders(filters, {
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} тендеров`
  });

  // Initialize actions hook
  const {
    // Modal states
    createModalVisible,
    editModalVisible,
    deleteModalVisible,
    editingTender,
    tenderToDelete,
    actionLoading,
    deleteLoading,
    
    // Modal handlers
    showCreateModal,
    hideCreateModal,
    showEditModal,
    hideEditModal,
    showDeleteModal,
    hideDeleteModal,
    
    // CRUD operations
    handleCreateTender,
    handleEditTender,
    handleDeleteTender,
    handleViewTender,
    handleExcelUpload
  } = useTenderActions(loadTenders);

  // Handle delete tender action from table
  const handleDeleteTenderFromTable = (tenderId: string) => {
    console.log('🗑️ Delete tender requested from table:', tenderId);
    const tender = tenders.find(t => t.id === tenderId);
    if (tender) {
      console.log('🎯 Found tender to delete:', tender);
      showDeleteModal(tender);
    } else {
      console.error('❌ Tender not found for deletion:', tenderId);
    }
  };

  // Handle edit tender action from table
  const handleEditTenderFromTable = (tender: TenderWithSummary) => {
    console.log('✏️ Edit tender requested from table:', tender.id);
    showEditModal(tender);
  };

  console.log('📊 Current page state:', {
    tendersCount: tenders.length,
    loading,
    stats,
    filters
  });

  return (
    <div className="w-full min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-none">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Title level={2} className="mb-2">
                <FolderOpenOutlined className="mr-2" />
                Управление тендерами
              </Title>
              <Text type="secondary">
                Создавайте, управляйте и отслеживайте тендерные проекты
              </Text>
            </div>
            <Space>
              <Upload
                showUploadList={false}
                accept=".xlsx,.xls"
                beforeUpload={(file) => {
                  console.log('📄 File chosen for Excel parsing:', {
                    name: file.name,
                    size: file.size
                  });
                  handleExcelFile(file);
                  return false;
                }}
              >
                <Button
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    console.log('🖱️ Excel upload button clicked');
                  }}
                >
                  Загрузить
                </Button>
              </Upload>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => {
                  console.log('🖱️ Create tender button clicked');
                  showCreateModal();
                }}
              >
                Новый тендер
              </Button>
            </Space>
          </div>

          {/* Statistics */}
          <TenderStats stats={stats} loading={loading} />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-none">
        {/* Filters */}
        <TenderFilters
          filters={filters}
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          onDateFilter={handleDateFilter}
          onFiltersChange={handleFiltersChange}
        />

        {/* Table */}
        <TenderTable
          tenders={tenders}
          loading={loading}
          pagination={pagination}
          onTableChange={handleTableChange}
          onViewTender={handleViewTender}
          onEditTender={handleEditTenderFromTable}
          onDeleteTender={handleDeleteTenderFromTable}
          onExcelUpload={handleExcelUpload}
        />

        {excelItems.length > 0 && (
          <Card title="Импортированные позиции" className="mt-8">
            <Table
              dataSource={excelItems}
              columns={excelColumns}
              rowKey={(record) => record.number}
              pagination={false}
            />
          </Card>
        )}

        {/* Modals */}
        <CreateTenderModal
          visible={createModalVisible}
          loading={actionLoading}
          onCancel={hideCreateModal}
          onSubmit={handleCreateTender}
        />

        <EditTenderModal
          visible={editModalVisible}
          loading={actionLoading}
          editingTender={editingTender}
          onCancel={hideEditModal}
          onSubmit={handleEditTender}
        />

        <DeleteTenderModal
          visible={deleteModalVisible}
          loading={deleteLoading}
          tenderToDelete={tenderToDelete}
          onCancel={hideDeleteModal}
          onConfirm={handleDeleteTender}
        />
      </div>
    </div>
  );
};

export default TendersPage;