import React from 'react';
import { Modal, Button } from 'antd';
import { statusLabels } from '../types';
import type { DeleteTenderModalProps } from '../types';

const DeleteTenderModal: React.FC<DeleteTenderModalProps> = ({
  visible,
  loading,
  tenderToDelete,
  onCancel,
  onConfirm
}) => {
  console.log('🚀 DeleteTenderModal component rendered');
  console.log('👁️ Modal visible:', visible);
  console.log('⏳ Loading state:', loading);
  console.log('🗑️ Tender to delete:', tenderToDelete);

  const handleConfirm = async () => {
    console.log('✅ User confirmed deletion for tender:', tenderToDelete?.id);
    await onConfirm();
  };

  const handleCancel = () => {
    console.log('❌ User cancelled deletion for tender:', tenderToDelete?.id);
    onCancel();
  };

  return (
    <Modal
      title="Удалить тендер?"
      open={visible}
      onCancel={handleCancel}
      centered
      maskClosable={false}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Отмена
        </Button>,
        <Button 
          key="delete" 
          type="primary" 
          danger 
          onClick={handleConfirm}
          loading={loading}
        >
          Удалить
        </Button>
      ]}
    >
      <p>
        Это действие нельзя отменить. Все данные тендера{' '}
        <strong>"{tenderToDelete?.title || 'без названия'}"</strong>{' '}
        будут удалены.
      </p>
      {tenderToDelete && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <p><strong>Клиент:</strong> {tenderToDelete.client_name}</p>
          <p><strong>Номер:</strong> {tenderToDelete.tender_number}</p>
          <p><strong>Статус:</strong> {statusLabels[tenderToDelete.status]}</p>
        </div>
      )}
    </Modal>
  );
};

export default DeleteTenderModal;