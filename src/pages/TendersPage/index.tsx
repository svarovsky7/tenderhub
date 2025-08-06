import React from 'react';
import { Typography, Button } from 'antd';
import { PlusOutlined, FolderOpenOutlined } from '@ant-design/icons';

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

const { Title, Text } = Typography;

const TendersPage: React.FC = () => {
  console.log('🚀 TendersPage component rendered');

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
  const handleEditTenderFromTable = (tender: any) => {
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
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={showCreateModal}
            >
              Новый тендер
            </Button>
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