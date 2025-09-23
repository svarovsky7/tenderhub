import { useCallback } from 'react';
import { message } from 'antd';
import { boqApi, clientPositionsApi } from '../../../../lib/supabase/api';

interface UseItemOperationsProps {
  position: any;
  onUpdate: () => void;
  setLoading: (loading: boolean) => void;
}

export const useItemOperations = ({
  position,
  onUpdate,
  setLoading
}: UseItemOperationsProps) => {

  // Handle manual volume change
  const handleManualVolumeChange = useCallback(async (value: number | null) => {
    console.log('✏️ handleManualVolumeChange called:', { positionId: position.id, value });

    try {
      const result = await clientPositionsApi.update(position.id, { manual_volume: value });

      if (result.error) {
        console.error('❌ Manual volume update failed:', result.error);
        message.error('Ошибка сохранения количества ГП');
      } else {
        console.log('✅ Manual volume updated successfully');
        message.success('Количество ГП обновлено');
        onUpdate();
      }
    } catch (error) {
      console.error('💥 Manual volume update exception:', error);
      message.error('Ошибка сохранения количества ГП');
    }
  }, [position.id, onUpdate]);

  // Handle manual note change
  const handleManualNoteChange = useCallback(async (value: string) => {
    console.log('✏️ handleManualNoteChange called:', { positionId: position.id, value });

    try {
      const result = await clientPositionsApi.update(position.id, { manual_note: value || null });

      if (result.error) {
        console.error('❌ Manual note update failed:', result.error);
        message.error('Ошибка сохранения примечания ГП');
      } else {
        console.log('✅ Manual note updated successfully');
        message.success('Примечание ГП обновлено');
        onUpdate();
      }
    } catch (error) {
      console.error('💥 Manual note update exception:', error);
      message.error('Ошибка сохранения примечания ГП');
    }
  }, [position.id, onUpdate]);

  // Delete BOQ item
  const handleDeleteItem = useCallback(async (itemId: string) => {
    console.log('🗑️ Deleting BOQ item:', itemId);
    try {
      const result = await boqApi.delete(itemId);
      if (result.error) {
        throw new Error(result.error);
      }
      console.log('✅ BOQ item deleted successfully');
      message.success('Элемент удален');
      onUpdate();
    } catch (error) {
      console.error('❌ Delete item error:', error);
      message.error('Ошибка удаления элемента');
    }
  }, [onUpdate]);

  // Delete all BOQ items in position
  const handleDeleteAllItems = useCallback(async () => {
    console.log('🗑️ Deleting all BOQ items in position:', position.id);
    setLoading(true);
    try {
      const items = position.boq_items || [];
      if (items.length === 0) {
        message.info('Нет элементов для удаления');
        return;
      }

      // Delete all items
      const deletePromises = items.map((item: any) => boqApi.delete(item.id));
      const results = await Promise.all(deletePromises);

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('❌ Some items failed to delete:', errors);
        message.error(`Ошибка удаления ${errors.length} элементов`);
      } else {
        console.log('✅ All BOQ items deleted successfully');
        message.success(`Удалено ${items.length} элементов`);
      }

      onUpdate();
    } catch (error) {
      console.error('❌ Delete all items error:', error);
      message.error('Ошибка удаления элементов');
    } finally {
      setLoading(false);
    }
  }, [position.id, position.boq_items, onUpdate, setLoading]);

  return {
    handleManualVolumeChange,
    handleManualNoteChange,
    handleDeleteItem,
    handleDeleteAllItems
  };
};