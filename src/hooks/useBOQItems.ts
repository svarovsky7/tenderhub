import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { boqApi, clientPositionsApi } from '../lib/supabase/api';
import type { BOQItem, BOQItemInsert, ClientPosition } from '../lib/supabase/types';

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  total_position_cost?: number;
}

export const useBOQItems = (tenderId: string) => {
  const queryClient = useQueryClient();
  const [loadedPositionItems, setLoadedPositionItems] = useState<Record<string, BOQItem[]>>({});
  const [loadingPositionItems, setLoadingPositionItems] = useState<Record<string, boolean>>({});

  // Load BOQ items for a specific position (lazy loading)
  const loadPositionItems = useCallback(async (positionId: string) => {
    // Skip if already loaded or loading
    if (loadedPositionItems[positionId] || loadingPositionItems[positionId]) {
      return;
    }

    setLoadingPositionItems(prev => ({ ...prev, [positionId]: true }));

    try {
      console.log('🚀 Loading BOQ items for position:', positionId);
      const { data: items, error } = await boqApi.queries.getByPosition(positionId);

      if (error) throw error;

      console.log('✅ Loaded BOQ items:', items?.length || 0);

      // Update state
      setLoadedPositionItems(prev => ({ ...prev, [positionId]: items || [] }));

      // Update the position in React Query cache
      queryClient.setQueryData(['positions', tenderId], (oldData: any) => {
        if (!oldData?.positions) return oldData;

        return {
          ...oldData,
          positions: oldData.positions.map((pos: PositionWithItems) => {
            if (pos.id === positionId) {
              return { ...pos, boq_items: items || [] };
            }
            return pos;
          })
        };
      });
    } catch (error) {
      console.error('❌ Error loading BOQ items:', error);
      message.error('Ошибка загрузки позиций БОЗ');
    } finally {
      setLoadingPositionItems(prev => ({ ...prev, [positionId]: false }));
    }
  }, [loadedPositionItems, loadingPositionItems, queryClient, tenderId]);

  // Add new BOQ item
  const addBOQItem = useCallback(async (
    positionId: string,
    itemData: Partial<BOQItemInsert>
  ): Promise<BOQItem | null> => {
    try {
      console.log('🚀 Adding BOQ item:', itemData);

      const newItem: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: positionId,
        ...itemData
      };

      const { data: createdItem, error } = await boqApi.crud.create(newItem);

      if (error) throw error;
      if (!createdItem) throw new Error('Failed to create BOQ item');

      console.log('✅ BOQ item created:', createdItem);

      // Update loaded items
      setLoadedPositionItems(prev => ({
        ...prev,
        [positionId]: [...(prev[positionId] || []), createdItem]
      }));

      // Refresh position in cache
      queryClient.invalidateQueries({ queryKey: ['positions', tenderId] });

      return createdItem;
    } catch (error) {
      console.error('❌ Error adding BOQ item:', error);
      message.error('Ошибка добавления позиции');
      return null;
    }
  }, [tenderId, queryClient]);

  // Update BOQ item
  const updateBOQItem = useCallback(async (
    itemId: string,
    updates: Partial<BOQItem>
  ): Promise<boolean> => {
    try {
      console.log('🚀 Updating BOQ item:', itemId, updates);

      const { error } = await boqApi.crud.update(itemId, updates);

      if (error) throw error;

      console.log('✅ BOQ item updated');

      // Update loaded items
      setLoadedPositionItems(prev => {
        const newItems = { ...prev };
        for (const positionId in newItems) {
          newItems[positionId] = newItems[positionId].map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          );
        }
        return newItems;
      });

      // Refresh position in cache
      queryClient.invalidateQueries({ queryKey: ['positions', tenderId] });

      return true;
    } catch (error) {
      console.error('❌ Error updating BOQ item:', error);
      message.error('Ошибка обновления позиции');
      return false;
    }
  }, [tenderId, queryClient]);

  // Delete BOQ item
  const deleteBOQItem = useCallback(async (
    itemId: string,
    positionId: string
  ): Promise<boolean> => {
    try {
      console.log('🚀 Deleting BOQ item:', itemId);

      const { error } = await boqApi.crud.delete(itemId);

      if (error) throw error;

      console.log('✅ BOQ item deleted');

      // Update loaded items
      setLoadedPositionItems(prev => ({
        ...prev,
        [positionId]: (prev[positionId] || []).filter(item => item.id !== itemId)
      }));

      // Refresh position in cache
      queryClient.invalidateQueries({ queryKey: ['positions', tenderId] });

      message.success('Позиция удалена');
      return true;
    } catch (error) {
      console.error('❌ Error deleting BOQ item:', error);
      message.error('Ошибка удаления позиции');
      return false;
    }
  }, [tenderId, queryClient]);

  // Calculate position total
  const calculatePositionTotal = useCallback((items: BOQItem[]): number => {
    return items.reduce((sum, item) => {
      const priceInRub = item.unit_rate || 0;
      const deliveryAmount = item.delivery_amount || 0;
      return sum + (priceInRub + deliveryAmount) * item.quantity;
    }, 0);
  }, []);

  // Update position totals in database
  const updatePositionTotals = useCallback(async (
    positionId: string,
    items: BOQItem[]
  ): Promise<boolean> => {
    try {
      const total = calculatePositionTotal(items);

      console.log('🚀 Updating position totals:', positionId, total);

      const { error } = await clientPositionsApi.update(positionId, {
        cost: total,
        total_position_cost: total
      });

      if (error) throw error;

      console.log('✅ Position totals updated');
      return true;
    } catch (error) {
      console.error('❌ Error updating position totals:', error);
      return false;
    }
  }, [calculatePositionTotal]);

  return {
    loadedPositionItems,
    loadingPositionItems,
    loadPositionItems,
    addBOQItem,
    updateBOQItem,
    deleteBOQItem,
    calculatePositionTotal,
    updatePositionTotals
  };
};