import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { tendersApi } from '../../../lib/supabase/api';
import type { TenderWithSummary, TenderInsert, TenderUpdate } from '../types';

interface UseTenderActionsReturn {
  // Modal states
  createModalVisible: boolean;
  editModalVisible: boolean;
  deleteModalVisible: boolean;
  editingTender: TenderWithSummary | null;
  tenderToDelete: TenderWithSummary | null;
  actionLoading: boolean;
  deleteLoading: boolean;

  // Modal handlers
  showCreateModal: () => void;
  hideCreateModal: () => void;
  showEditModal: (tender: TenderWithSummary) => void;
  hideEditModal: () => void;
  showDeleteModal: (tender: TenderWithSummary) => void;
  hideDeleteModal: () => void;

  // CRUD operations
  handleCreateTender: (values: TenderInsert) => Promise<void>;
  handleEditTender: (values: TenderUpdate) => Promise<void>;
  handleDeleteTender: () => Promise<void>;
  handleViewTender: (tender: TenderWithSummary) => void;
  handleExcelUpload: (tenderId: string, file: File) => Promise<void>;
}

export const useTenderActions = (
  onDataChange?: () => Promise<void>
): UseTenderActionsReturn => {
  console.log('🚀 useTenderActions hook initialized');

  const navigate = useNavigate();

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingTender, setEditingTender] = useState<TenderWithSummary | null>(null);
  const [tenderToDelete, setTenderToDelete] = useState<TenderWithSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal show/hide handlers
  const showCreateModal = useCallback(() => {
    console.log('📝 Showing create modal');
    setCreateModalVisible(true);
  }, []);

  const hideCreateModal = useCallback(() => {
    console.log('❌ Hiding create modal');
    setCreateModalVisible(false);
  }, []);

  const showEditModal = useCallback((tender: TenderWithSummary) => {
    console.log('✏️ Showing edit modal for tender:', tender.id);
    setEditingTender(tender);
    setEditModalVisible(true);
  }, []);

  const hideEditModal = useCallback(() => {
    console.log('❌ Hiding edit modal');
    setEditModalVisible(false);
    setEditingTender(null);
  }, []);

  const showDeleteModal = useCallback((tender: TenderWithSummary) => {
    console.log('🗑️ Showing delete modal for tender:', tender.id);
    setTenderToDelete(tender);
    setDeleteModalVisible(true);
  }, []);

  const hideDeleteModal = useCallback(() => {
    console.log('❌ Hiding delete modal');
    setDeleteModalVisible(false);
    setTenderToDelete(null);
  }, []);

  // CRUD operations
  const handleCreateTender = useCallback(async (values: TenderInsert) => {
    console.log('🚀 handleCreateTender called with values:', values);
    setActionLoading(true);

    try {
      const tenderData: TenderInsert = {
        title: values.title,
        description: values.description,
        client_name: values.client_name,
        tender_number: values.tender_number,
        submission_deadline: values.submission_deadline ? dayjs(values.submission_deadline).format('YYYY-MM-DD HH:mm:ss') : undefined,
        estimated_value: values.estimated_value,
        status: values.status || 'draft'
      };

      console.log('📡 Calling tendersApi.create...');
      const result = await tendersApi.create(tenderData);
      
      console.log('📦 Create result:', result);
      
      if (result.error) {
        console.error('❌ Create failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Tender created successfully');
      message.success('Тендер создан успешно');
      hideCreateModal();
      
      if (onDataChange) {
        console.log('🔄 Refreshing data...');
        await onDataChange();
      }
    } catch (error) {
      console.error('💥 Create tender error:', error);
      message.error('Ошибка создания тендера');
    } finally {
      setActionLoading(false);
    }
  }, [hideCreateModal, onDataChange]);

  const handleEditTender = useCallback(async (values: TenderUpdate) => {
    console.log('🚀 handleEditTender called with values:', values);
    
    if (!editingTender) {
      console.error('❌ No tender being edited');
      return;
    }

    setActionLoading(true);

    try {
      const updates: TenderUpdate = {
        title: values.title,
        description: values.description,
        client_name: values.client_name,
        tender_number: values.tender_number,
        submission_deadline: values.submission_deadline ? dayjs(values.submission_deadline).format('YYYY-MM-DD HH:mm:ss') : undefined,
        estimated_value: values.estimated_value,
        status: values.status
      };

      console.log('📡 Calling tendersApi.update...');
      const result = await tendersApi.update(editingTender.id!, updates);
      
      console.log('📦 Update result:', result);
      
      if (result.error) {
        console.error('❌ Update failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Tender updated successfully');
      message.success('Тендер обновлен');
      hideEditModal();

      if (onDataChange) {
        console.log('🔄 Refreshing data...');
        await onDataChange();
      }
    } catch (error) {
      console.error('💥 Update tender error:', error);
      message.error('Ошибка обновления тендера');
    } finally {
      setActionLoading(false);
    }
  }, [editingTender, hideEditModal, onDataChange]);

  const handleDeleteTender = useCallback(async () => {
    console.log('🚀 handleDeleteTender called');
    
    if (!tenderToDelete) {
      console.error('❌ No tender to delete');
      return;
    }

    console.log('✅ User confirmed deletion for tender:', tenderToDelete.id);
    setDeleteLoading(true);
    
    try {
      console.log('📡 Calling tendersApi.delete...');
      const result = await tendersApi.delete(tenderToDelete.id!);
      
      console.log('📦 Delete API result:', result);
      
      if (result.error) {
        console.error('❌ API returned error:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Delete successful, showing success message');
      message.success(`Тендер "${tenderToDelete.title}" удален`);
      
      hideDeleteModal();

      if (onDataChange) {
        console.log('🔄 Refreshing data...');
        await onDataChange();
      }
      
    } catch (error) {
      console.error('💥 Delete tender error:', error);
      console.error('💥 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        tenderId: tenderToDelete.id,
        tenderTitle: tenderToDelete.title
      });
      
      message.error(`Ошибка удаления тендера: ${error instanceof Error ? error.message : 'Неожиданная ошибка'}`);
    } finally {
      setDeleteLoading(false);
    }
  }, [tenderToDelete, hideDeleteModal, onDataChange]);

  const handleViewTender = useCallback((tender: TenderWithSummary) => {
    console.log('👁️ Navigating to BOQ management page for tender:', tender.id);
    navigate(`/boq?tender=${tender.id}`);
  }, [navigate]);

  const handleExcelUpload = useCallback(async (tenderId: string, file: File) => {
    console.log('📤 Excel upload requested for tender:', tenderId);
    console.log('📁 File info:', { name: file.name, size: file.size, type: file.type });
    
    // The actual upload is handled by the ExcelUpload component
    // This callback can be used for additional processing if needed
    
    if (onDataChange) {
      console.log('🔄 Refreshing data after upload...');
      await onDataChange();
    }
  }, [onDataChange]);

  return {
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
  };
};