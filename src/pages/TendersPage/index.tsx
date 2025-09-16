import React from 'react';
import { Typography, Button, message } from 'antd';
import { PlusOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { exportTendersToExcel } from '../../utils/excel-templates';

// Components
import {
  TenderStats,
  TenderFilters,
  TenderTable,
  CreateTenderModal,
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
    handleFiltersChange
  } = useTenderFilters(resetPaginationCallback);

  // Initialize tenders data hook
  const {
    tenders,
    loading,
    stats,
    loadTenders
  } = useTenders(filters);

  // Initialize actions hook
  const {
    // Modal states
    createModalVisible,
    deleteModalVisible,
    tenderToDelete,
    actionLoading,
    deleteLoading,
    
    // Modal handlers
    showCreateModal,
    hideCreateModal,
    showDeleteModal,
    hideDeleteModal,
    
    // CRUD operations
    handleCreateTender,
    handleEditTender,
    handleDeleteTender,
    handleViewTender,
    handleExcelUpload,
    handleUpdateBOQCurrencyRates
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

  // Handle edit tender action from table - now handled directly in table with inline editing
  const handleEditTenderFromTable = async (updates: any) => {
    console.log('✏️ Edit tender updates from table:', updates);
    await handleEditTender(updates);
  };

  // Handle export all tenders to Excel
  const handleExportAllTenders = async () => {
    console.log('📊 Export all tenders initiated');

    try {
      if (tenders.length === 0) {
        message.warning('Нет тендеров для экспорта');
        return;
      }

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU').replace(/\./g, '-');
      const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const fileName = `Тендеры_${dateStr}_${timeStr}.xlsx`;

      console.log('📊 Exporting', tenders.length, 'tenders to Excel file:', fileName);

      // Show loading message
      const hideLoading = message.loading('Экспорт тендеров в Excel...', 0);

      try {
        // Export tenders to Excel
        exportTendersToExcel(tenders, fileName);

        message.success(`Экспорт завершен! Файл: ${fileName}`);
        console.log('✅ Export completed successfully');
      } finally {
        hideLoading();
      }

    } catch (error) {
      console.error('❌ Export failed:', error);
      message.error('Ошибка экспорта тендеров');
    }
  };

  console.log('📊 Current page state:', {
    tendersCount: tenders.length,
    loading,
    stats,
    filters
  });

  return (
    <>
      <style>
        {`
          .tenders-page-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0d9488 100%);
            border-radius: 16px;
            margin-bottom: 24px;
            padding: 32px;
            color: white;
            position: relative;
            overflow: hidden;
          }
          .tenders-page-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 30s linear infinite;
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .tenders-action-buttons {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .tenders-action-btn {
            height: 42px;
            padding: 0 24px;
            border-radius: 8px;
            font-size: 15px;
            transition: all 0.3s ease;
          }
          .tenders-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          .tenders-stats-container {
            margin-top: 24px;
          }
          .tenders-stats-container .ant-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }
          .tenders-stats-container .ant-statistic-title {
            color: rgba(0, 0, 0, 0.65);
            font-weight: 500;
          }
          .tenders-stats-container .ant-statistic-content {
            color: rgba(0, 0, 0, 0.85);
          }
        `}
      </style>
      <div className="w-full min-h-full bg-gray-50">
        <div className="p-6">
          {/* Beautiful Gradient Header */}
          <div className="tenders-page-header">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <FolderOpenOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontSize: 28 }}>
                    Управление тендерами
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                    Создание, отслеживание и анализ тендерных предложений
                  </Text>
                </div>
              </div>
              <div className="tenders-action-buttons">
                <Button
                  className="tenders-action-btn"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1890ff',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    fontWeight: 600
                  }}
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={showCreateModal}
                >
                  Новый тендер
                </Button>
              </div>
            </div>

            {/* Statistics in Header */}
            <div className="tenders-stats-container">
              <TenderStats stats={stats} loading={loading} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-none">
          {/* Filters */}
          <TenderFilters
            filters={filters}
            onSearch={handleSearch}
            onFiltersChange={handleFiltersChange}
            onExportAll={handleExportAllTenders}
          />

          {/* Table */}
          <TenderTable
            tenders={tenders}
            loading={loading}
            onViewTender={handleViewTender}
            onEditTender={handleEditTenderFromTable}
            onDeleteTender={handleDeleteTenderFromTable}
            onExcelUpload={handleExcelUpload}
            onUpdateBOQCurrencyRates={handleUpdateBOQCurrencyRates}
          />

          {/* Modals */}
          <CreateTenderModal
            visible={createModalVisible}
            loading={actionLoading}
            onCancel={hideCreateModal}
            onSubmit={handleCreateTender}
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
    </>
  );
};

export default TendersPage;