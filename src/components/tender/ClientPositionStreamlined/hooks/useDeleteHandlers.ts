import { useCallback, useState } from 'react';
import { message } from 'antd';
import { boqApi } from '../../../../lib/supabase/api';

interface UseDeleteHandlersProps {
  position: any;
  onUpdate: () => void;
}

export const useDeleteHandlers = ({ position, onUpdate }: UseDeleteHandlersProps) => {
  const [loading, setLoading] = useState(false);

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

  const handleDeleteAllItems = useCallback(async () => {
    console.log('🗑️ Deleting all BOQ items in position:', position.id);
    setLoading(true);
    try {
      const items = position.boq_items || [];
      if (items.length === 0) {
        message.info('Нет элементов для удаления');
        return;
      }

      // Delete all items in a single query to avoid race conditions with triggers
      console.log('🔥 Using deleteByPosition for atomic deletion');
      const result = await boqApi.deleteByPosition(position.id);

      if (result.error) {
        console.error('❌ Failed to delete items:', result.error);
        message.error(`Ошибка удаления элементов: ${result.error}`);
      } else {
        console.log(`✅ All BOQ items deleted successfully: ${result.data?.count} items`);
        message.success(`Удалено ${result.data?.count || items.length} элементов`);
      }

      onUpdate();
    } catch (error) {
      console.error('❌ Delete all items error:', error);
      message.error('Ошибка удаления элементов');
    } finally {
      setLoading(false);
    }
  }, [position.id, position.boq_items, onUpdate]);

  return {
    handleDeleteItem,
    handleDeleteAllItems,
    deleteLoading: loading
  };
};