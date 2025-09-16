import React, { useState, useCallback } from 'react';
import { Modal, List, Radio, Empty, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { BOQItem } from '../../lib/supabase/types';

interface MaterialMoveModalProps {
  visible: boolean;
  materialId: string | null;
  materialName: string;
  currentWorkId: string | null;
  currentWorkName: string;
  isLinkedMaterial: boolean;
  linkId?: string;
  availableWorks: BOQItem[];
  onMove: (targetWorkId: string) => Promise<void>;
  onCancel: () => void;
}

export const MaterialMoveModal: React.FC<MaterialMoveModalProps> = ({
  visible,
  materialId,
  materialName,
  currentWorkId,
  currentWorkName,
  isLinkedMaterial,
  linkId,
  availableWorks,
  onMove,
  onCancel
}) => {
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMove = useCallback(async () => {
    if (!selectedWorkId) {
      message.warning('Выберите работу для перемещения');
      return;
    }

    setLoading(true);
    try {
      await onMove(selectedWorkId);
      onCancel(); // Close modal on success
    } catch (error) {
      console.error('❌ Error moving material:', error);
      message.error('Ошибка перемещения материала');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkId, onMove, onCancel]);

  // Filter out current work from available works
  const targetWorks = availableWorks.filter(
    work => work.work_id !== currentWorkId && work.item_type === 'work'
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SwapOutlined className="text-blue-500" />
          <span>Перемещение материала</span>
        </div>
      }
      open={visible}
      onOk={handleMove}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Переместить"
      cancelText="Отмена"
      width={600}
      okButtonProps={{ disabled: !selectedWorkId }}
    >
      <div className="space-y-4">
        {/* Current location info */}
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Текущее расположение:</div>
          <div className="font-medium">{materialName}</div>
          {isLinkedMaterial && (
            <div className="text-sm text-gray-500 mt-1">
              Привязан к работе: {currentWorkName}
            </div>
          )}
        </div>

        {/* Target work selection */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Переместить в работу:
          </div>

          {targetWorks.length > 0 ? (
            <Radio.Group
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="w-full"
            >
              <List
                dataSource={targetWorks}
                size="small"
                className="max-h-64 overflow-y-auto"
                renderItem={(work) => (
                  <List.Item className="!py-2">
                    <Radio value={work.work_id} className="w-full">
                      <div className="flex justify-between items-center w-full">
                        <span className="flex-1">{work.description}</span>
                        <span className="text-sm text-gray-500">
                          {work.quantity} {work.unit}
                        </span>
                      </div>
                    </Radio>
                  </List.Item>
                )}
              />
            </Radio.Group>
          ) : (
            <Empty
              description="Нет доступных работ для перемещения"
              className="py-8"
            />
          )}
        </div>

        {/* Warning for linked materials */}
        {isLinkedMaterial && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-sm text-yellow-800">
              <strong>Внимание:</strong> Материал привязан к текущей работе.
              При перемещении связь будет обновлена.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};