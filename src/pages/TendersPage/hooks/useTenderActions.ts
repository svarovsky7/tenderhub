import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { tendersApi, boqApi } from '../../../lib/supabase/api';
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
  handleUpdateBOQCurrencyRates: (tenderId: string) => Promise<void>;
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
        version: values.version ?? 1,
        area_sp: values.area_sp ?? null,
        area_client: values.area_client ?? null
        // Note: status and estimated_value fields removed from schema
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

  const handleEditTender = useCallback(async (values: TenderUpdate & { id?: string }) => {
    console.log('🚀 handleEditTender called with values:', values);
    console.log('🔍 Link fields check:');
    console.log('  upload_folder:', values.upload_folder);
    console.log('  bsm_link:', values.bsm_link);
    console.log('  tz_clarification_link:', values.tz_clarification_link);
    console.log('  qa_form_link:', values.qa_form_link);

    // Support both modal editing (with editingTender) and inline editing (with id in values)
    const tenderId = values.id || editingTender?.id;
    
    if (!tenderId) {
      console.error('❌ No tender ID provided for editing');
      return;
    }

    setActionLoading(true);

    try {
      // Build updates object with only defined values to avoid overwriting other fields
      const updates: TenderUpdate = {};
      
      // Only add fields that are explicitly defined (not undefined)
      if (values.title !== undefined) updates.title = values.title;
      if (values.description !== undefined) updates.description = values.description;
      if (values.client_name !== undefined) updates.client_name = values.client_name;
      if (values.tender_number !== undefined) updates.tender_number = values.tender_number;
      if (values.submission_deadline !== undefined) {
        updates.submission_deadline = values.submission_deadline ? 
          dayjs(values.submission_deadline).format('YYYY-MM-DD HH:mm:ss') : null;
      }
      if (values.version !== undefined) updates.version = values.version;
      
      // Handle area fields - only update if explicitly provided
      if ('area_sp' in values) {
        updates.area_sp = values.area_sp ?? null;
      }
      if ('area_client' in values) {
        updates.area_client = values.area_client ?? null;
      }
      
      // Handle currency rate fields
      if ('usd_rate' in values) {
        updates.usd_rate = values.usd_rate ?? null;
      }
      if ('eur_rate' in values) {
        updates.eur_rate = values.eur_rate ?? null;
      }
      if ('cny_rate' in values) {
        updates.cny_rate = values.cny_rate ?? null;
      }

      // Handle new link fields
      if ('upload_folder' in values) {
        updates.upload_folder = values.upload_folder ?? null;
      }
      if ('bsm_link' in values) {
        updates.bsm_link = values.bsm_link ?? null;
      }
      if ('tz_clarification_link' in values) {
        updates.tz_clarification_link = values.tz_clarification_link ?? null;
      }
      if ('qa_form_link' in values) {
        updates.qa_form_link = values.qa_form_link ?? null;
      }

      console.log('📡 Calling tendersApi.update with:');
      console.log('  Tender ID:', tenderId);
      console.log('  Updates object:', JSON.stringify(updates, null, 2));
      console.log('  Link fields in updates:');
      console.log('    upload_folder:', updates.upload_folder);
      console.log('    bsm_link:', updates.bsm_link);
      console.log('    tz_clarification_link:', updates.tz_clarification_link);
      console.log('    qa_form_link:', updates.qa_form_link);

      const result = await tendersApi.update(tenderId, updates);
      
      console.log('📦 Update result:', result);
      
      if (result.error) {
        console.error('❌ Update failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Tender updated successfully');
      message.success('Тендер обновлен');
      
      // Check if any currency rates were updated and trigger BOQ update
      // For inline editing (editingTender is null), we check if currency rate fields are in the updates
      // For modal editing, we also compare with previous values
      const currencyRatesUpdated = 
        'usd_rate' in values || 
        'eur_rate' in values || 
        'cny_rate' in values;
      
      if (currencyRatesUpdated) {
        console.log('💱 Currency rates changed, updating BOQ items...');
        console.log('📊 Currency rate values:', {
          usd_rate: values.usd_rate,
          eur_rate: values.eur_rate, 
          cny_rate: values.cny_rate,
          tenderId
        });
        try {
          // Передаем новые курсы валют, если они были обновлены
          const currencyOptions = {
            usd_rate: 'usd_rate' in values ? values.usd_rate : undefined,
            eur_rate: 'eur_rate' in values ? values.eur_rate : undefined,
            cny_rate: 'cny_rate' in values ? values.cny_rate : undefined
          };
          
          const boqUpdateResult = await boqApi.updateCurrencyRatesForTender(tenderId, currencyOptions);
          if (boqUpdateResult.error) {
            console.error('❌ Failed to update BOQ currency rates:', boqUpdateResult.error);
            message.warning(`Тендер обновлен, но не удалось обновить курсы в позициях: ${boqUpdateResult.error}`);
          } else if (boqUpdateResult.data) {
            const { updated_items_count } = boqUpdateResult.data;
            if (updated_items_count > 0) {
              console.log('✅ BOQ currency rates updated:', updated_items_count);
              message.success(`Тендер обновлен. Курсы валют обновлены в ${updated_items_count} позициях BOQ`);
            } else {
              console.log('ℹ️ No BOQ items required currency rate updates');
            }
          }
        } catch (error) {
          console.error('💥 Exception updating BOQ currency rates:', error);
          message.warning('Тендер обновлен, но произошла ошибка при обновлении курсов в позициях');
        }
      }
      
      // Only hide modal if we were using modal editing
      if (editingTender) {
        hideEditModal();
      }

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

  const handleUpdateBOQCurrencyRates = useCallback(async (tenderId: string) => {
    console.log('🚀 handleUpdateBOQCurrencyRates called for tender:', tenderId);
    
    if (!tenderId) {
      console.error('❌ No tender ID provided for BOQ currency update');
      message.error('Не указан ID тендера для обновления курсов');
      return;
    }

    setActionLoading(true);
    
    try {
      console.log('💱 Manually updating BOQ currency rates...');
      const result = await boqApi.updateCurrencyRatesForTender(tenderId);
      
      console.log('📦 BOQ currency update result:', result);
      
      if (result.error) {
        console.error('❌ Failed to update BOQ currency rates:', result.error);
        message.error(`Ошибка обновления курсов валют: ${result.error}`);
        return;
      }

      if (result.data) {
        const { 
          updated_items_count,
          updated_usd_items,
          updated_eur_items,
          updated_cny_items 
        } = result.data;
        
        console.log('✅ BOQ currency rates updated successfully:', result.data);
        
        if (updated_items_count > 0) {
          const details = [];
          if (updated_usd_items > 0) details.push(`USD: ${updated_usd_items}`);
          if (updated_eur_items > 0) details.push(`EUR: ${updated_eur_items}`);
          if (updated_cny_items > 0) details.push(`CNY: ${updated_cny_items}`);
          
          const detailsText = details.length > 0 ? ` (${details.join(', ')})` : '';
          
          message.success(`Курсы валют обновлены в ${updated_items_count} позициях BOQ${detailsText}`);
        } else {
          message.info('Нет позиций BOQ, требующих обновления курсов валют');
        }
      }

      if (onDataChange) {
        console.log('🔄 Refreshing data after currency update...');
        await onDataChange();
      }
      
    } catch (error) {
      console.error('💥 Exception in handleUpdateBOQCurrencyRates:', error);
      message.error('Произошла ошибка при обновлении курсов валют в позициях BOQ');
    } finally {
      setActionLoading(false);
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
    handleExcelUpload,
    handleUpdateBOQCurrencyRates
  };
};