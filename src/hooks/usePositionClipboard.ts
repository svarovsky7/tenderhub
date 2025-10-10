import { useState, useCallback } from 'react';
import { message } from 'antd';
import { boqApi, workMaterialLinksApi } from '../lib/supabase/api';
import { boqBulkApi } from '../lib/supabase/api/boq/bulk';
import type { BOQItemWithLibrary } from '../lib/supabase/types';
import type { WorkMaterialLink } from '../lib/supabase/api/work-material-links';

interface PositionClipboardData {
  items: BOQItemWithLibrary[];
  links: WorkMaterialLink[];
  sourcePositionId: string;
  itemsCount: number;
  linksCount: number;
}

interface UsePositionClipboardProps {
  tenderId: string;
  onUpdate: (positionId: string) => Promise<void>; // Accepts position ID for optimized updates
}

/**
 * Custom hook для управления буфером обмена позиций
 * Позволяет копировать содержимое одной позиции и вставлять в другую
 */
export const usePositionClipboard = ({ tenderId, onUpdate }: UsePositionClipboardProps) => {
  const [clipboardData, setClipboardData] = useState<PositionClipboardData | null>(null);
  const [loadingPositions, setLoadingPositions] = useState<Set<string>>(new Set());

  /**
   * Копировать содержимое позиции в буфер обмена
   */
  const handleCopy = useCallback(async (positionId: string) => {
    console.log('🚀 [usePositionClipboard] Starting copy for position:', positionId);
    setLoadingPositions(prev => new Set(prev).add(positionId));

    try {
      // 1. Загрузить все BOQ items для позиции
      console.log('📡 Loading BOQ items...');
      const { data: items, error: itemsError } = await boqApi.getByPosition(positionId);

      if (itemsError) {
        console.error('❌ Failed to load BOQ items:', itemsError);
        message.error(`Ошибка загрузки элементов: ${itemsError}`);
        return;
      }

      if (!items || items.length === 0) {
        console.log('📭 No items found in position');
        message.warning('Позиция не содержит элементов для копирования');
        return;
      }

      console.log(`✅ Loaded ${items.length} BOQ items`);

      // 2. Загрузить все work_material_links для позиции
      console.log('📡 Loading work-material links...');
      const { data: links, error: linksError } = await workMaterialLinksApi.getLinksByPosition(positionId);

      if (linksError) {
        console.error('❌ Failed to load links:', linksError);
        message.error(`Ошибка загрузки связей: ${linksError}`);
        return;
      }

      const linksArray = links || [];
      console.log(`✅ Loaded ${linksArray.length} work-material links`);

      // 3. Сохранить в clipboard state
      const clipboardContent: PositionClipboardData = {
        items,
        links: linksArray,
        sourcePositionId: positionId,
        itemsCount: items.length,
        linksCount: linksArray.length
      };

      setClipboardData(clipboardContent);

      console.log('✅ Content copied to clipboard:', {
        items: items.length,
        links: linksArray.length,
        sourcePositionId: positionId
      });

      message.success(
        `Скопировано: ${items.length} элементов${linksArray.length > 0 ? `, ${linksArray.length} связей` : ''}`
      );
    } catch (error) {
      console.error('💥 Exception in handleCopy:', error);
      message.error('Ошибка при копировании содержимого позиции');
    } finally {
      setLoadingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionId);
        return newSet;
      });
    }
  }, []); // Empty deps - doesn't depend on any props

  /**
   * Вставить содержимое из буфера обмена в целевую позицию
   */
  const handlePaste = useCallback(async (targetPositionId: string) => {
    console.log('🚀 [usePositionClipboard] Starting paste to position:', targetPositionId);

    if (!clipboardData) {
      console.error('❌ No clipboard data available');
      message.warning('Буфер обмена пуст. Сначала скопируйте содержимое позиции.');
      return;
    }

    // Предотвращаем вставку в ту же позицию
    if (targetPositionId === clipboardData.sourcePositionId) {
      console.log('⚠️ Attempting to paste into source position');
      message.warning('Нельзя вставить содержимое в ту же позицию');
      return;
    }

    setLoadingPositions(prev => new Set(prev).add(targetPositionId));

    try {
      console.log('📦 Preparing items for paste:', {
        sourcePosition: clipboardData.sourcePositionId,
        targetPosition: targetPositionId,
        itemsCount: clipboardData.itemsCount,
        linksCount: clipboardData.linksCount
      });

      // 1. Подготовить items для вставки (убрать id, item_number, sub_number и вычисляемые поля)
      const itemsToPaste = clipboardData.items.map(item => {
        const {
          id,
          item_number,
          sub_number,
          client_position_id,
          created_at,
          updated_at,
          imported_at,
          cost_category_display, // Вычисляемое поле - убираем
          cost_node_display, // Вычисляемое поле - убираем
          ...rest
        } = item;

        return {
          ...rest,
          client_position_id: targetPositionId,
          tender_id: tenderId,
          // sort_order сохраняем для поддержания порядка!
        };
      });

      console.log('📋 First prepared item:', itemsToPaste[0]);

      // 2. Создать mapping: индекс массива → старый ID (для восстановления links)
      // Используем индекс вместо sort_order, так как sort_order перезаписывается при вставке
      const indexToOldId = new Map(
        clipboardData.items.map((item, index) => [index, item.id])
      );

      console.log('🗺️ Created index → oldId mapping:', indexToOldId.size, 'entries');

      // 3. Вставить items через bulkCreateInPosition
      console.log('💾 Inserting items via bulkCreateInPosition...');
      const { data: insertedCount, error: insertError } = await boqBulkApi.bulkCreateInPosition(
        targetPositionId,
        itemsToPaste
      );

      if (insertError) {
        console.error('❌ Failed to insert items:', insertError);
        message.error(`Ошибка вставки элементов: ${insertError}`);
        return;
      }

      console.log(`✅ Inserted ${insertedCount} items`);

      // 4. Загрузить ТОЛЬКО вставленные items для получения их новых ID
      // При повторной вставке в позиции будут старые + новые items
      // Используем created_at для получения только последних вставленных
      console.log('📡 Loading inserted items to get new IDs...');
      const { data: allItems, error: loadError } = await boqApi.getByPosition(targetPositionId);

      if (loadError || !allItems) {
        console.error('❌ Failed to load inserted items:', loadError);
        message.error('Ошибка загрузки вставленных элементов');
        return;
      }

      // Сортируем по created_at DESC и берем только последние вставленные
      const newItems = allItems
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, insertedCount);

      console.log('📋 Filtered to last inserted items:', {
        totalItems: allItems.length,
        insertedCount,
        newItemsCount: newItems.length
      });

      // Сортируем newItems по sub_number, чтобы индексы совпадали с порядком вставки
      newItems.sort((a, b) => a.sub_number - b.sub_number);

      console.log('📋 Sorted new items by sub_number:', {
        firstSubNumber: newItems[0]?.sub_number,
        lastSubNumber: newItems[newItems.length - 1]?.sub_number
      });

      // 5. Создать mapping: старый ID → новый ID (через индекс массива)
      const oldIdToNewId = new Map<string, string>();

      newItems.forEach((newItem, index) => {
        const oldId = indexToOldId.get(index);
        if (oldId) {
          oldIdToNewId.set(oldId, newItem.id);
          console.log(`🔗 Mapping: index ${index}, oldId ${oldId.substring(0, 8)}... → newId ${newItem.id.substring(0, 8)}...`);
        }
      });

      console.log('🗺️ Created oldId → newId mapping:', oldIdToNewId.size, 'entries');

      // 6. Создать links с обновленными ID (без удаления существующих) - ПАРАЛЛЕЛЬНО
      if (clipboardData.links.length > 0) {
        console.log(`🔗 Creating ${clipboardData.links.length} work-material links in parallel...`);

        // Подготовить промисы для всех links
        const linkPromises = clipboardData.links.map(async (link) => {
          const {
            id,
            created_at,
            updated_at,
            work_boq_item_id,
            material_boq_item_id,
            sub_work_boq_item_id,
            sub_material_boq_item_id,
            ...linkData
          } = link;

          // Обновляем ID работы и материала на новые
          const newWorkId = work_boq_item_id ? oldIdToNewId.get(work_boq_item_id) : null;
          const newMaterialId = material_boq_item_id ? oldIdToNewId.get(material_boq_item_id) : null;
          const newSubWorkId = sub_work_boq_item_id ? oldIdToNewId.get(sub_work_boq_item_id) : null;
          const newSubMaterialId = sub_material_boq_item_id ? oldIdToNewId.get(sub_material_boq_item_id) : null;

          // Пропускаем если не нашли соответствующие ID
          if (
            (work_boq_item_id && !newWorkId) ||
            (material_boq_item_id && !newMaterialId) ||
            (sub_work_boq_item_id && !newSubWorkId) ||
            (sub_material_boq_item_id && !newSubMaterialId)
          ) {
            console.warn('⚠️ Skipping link - could not find new ID for work or material:', {
              oldWorkId: work_boq_item_id,
              oldMaterialId: material_boq_item_id,
              oldSubWorkId: sub_work_boq_item_id,
              oldSubMaterialId: sub_material_boq_item_id,
              newWorkId,
              newMaterialId,
              newSubWorkId,
              newSubMaterialId
            });
            return { success: false, error: 'Missing ID mapping' };
          }

          const newLink: WorkMaterialLink = {
            ...linkData,
            client_position_id: targetPositionId,
            work_boq_item_id: newWorkId || undefined,
            material_boq_item_id: newMaterialId || undefined,
            sub_work_boq_item_id: newSubWorkId || undefined,
            sub_material_boq_item_id: newSubMaterialId || undefined,
          };

          try {
            const { error: linkError } = await workMaterialLinksApi.createLink(newLink);
            if (linkError) {
              console.error('❌ Failed to create link:', linkError, newLink);
              return { success: false, error: linkError };
            }
            return { success: true };
          } catch (error) {
            console.error('💥 Exception creating link:', error);
            return { success: false, error };
          }
        });

        // Выполнить все промисы параллельно
        const results = await Promise.all(linkPromises);

        // Подсчитать результаты
        const successfulLinksCount = results.filter(r => r.success).length;
        const failedLinksCount = results.filter(r => !r.success).length;

        console.log(`✅ Created ${successfulLinksCount} links, failed: ${failedLinksCount}`);
      }

      console.log('✅ Paste operation completed successfully');
      message.success(
        `Вставлено: ${insertedCount} элементов${clipboardData.links.length > 0 ? `, ${clipboardData.links.length} связей` : ''}`
      );

      // Сбросить loading ПЕРЕД обновлением позиции, чтобы избежать бесконечной загрузки
      setLoadingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetPositionId);
        return newSet;
      });

      // 8. Обновить целевую позицию для отображения изменений
      console.log('🔄 Refreshing target position...');
      await onUpdate(targetPositionId);
    } catch (error) {
      console.error('💥 Exception in handlePaste:', error);
      message.error('Ошибка при вставке содержимого позиции');
      setLoadingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetPositionId);
        return newSet;
      });
    }
  }, [clipboardData, tenderId, onUpdate]); // Include all dependencies

  /**
   * Очистить буфер обмена
   */
  const clearClipboard = useCallback(() => {
    console.log('🗑️ [usePositionClipboard] Clearing clipboard');
    setClipboardData(null);
  }, []);

  // Helper function to check if a specific position is loading
  const isPositionLoading = useCallback((positionId: string) => {
    return loadingPositions.has(positionId);
  }, [loadingPositions]);

  return {
    clipboardData,
    hasCopiedData: clipboardData !== null,
    copiedItemsCount: clipboardData?.itemsCount || 0,
    copiedLinksCount: clipboardData?.linksCount || 0,
    copiedFromPositionId: clipboardData?.sourcePositionId || null,
    isPositionLoading,
    handleCopy,
    handlePaste,
    clearClipboard
  };
};
