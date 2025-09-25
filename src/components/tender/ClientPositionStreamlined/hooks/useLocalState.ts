import { useState, useEffect, useMemo } from 'react';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';
import { calculateBOQItemsTotal } from '../utils/calculateTotal';

interface UseLocalStateProps {
  position: any;
  isExpanded?: boolean;
}

/**
 * Хук для управления локальным состоянием компонента ClientPositionCardStreamlined
 */
export const useLocalState = ({ position, isExpanded = false }: UseLocalStateProps) => {
  // Local state
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [linkingMaterialId, setLinkingMaterialId] = useState<string | null>(null);
  const [linkMaterialModalVisible, setLinkMaterialModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localWorks, setLocalWorks] = useState<BOQItemWithLibrary[]>([]);
  const [tempManualVolume, setTempManualVolume] = useState<number | null>(position.manual_volume ?? null);
  const [tempManualNote, setTempManualNote] = useState<string>(position.manual_note ?? '');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [tempWorkName, setTempWorkName] = useState<string>(position.work_name ?? '');
  const [tempUnit, setTempUnit] = useState<string>(position.unit ?? '');
  const [showAdditionalWorkModal, setShowAdditionalWorkModal] = useState(false);

  // Computed properties
  const totalItems = position.boq_items?.length || 0;
  const materialsCount = position.boq_items?.filter(
    item => item.item_type === 'material' || item.item_type === 'sub_material'
  ).length || 0;
  const worksCount = position.boq_items?.filter(
    item => item.item_type === 'work' || item.item_type === 'sub_work'
  ).length || 0;

  // Dynamic total cost calculation using shared function
  const totalCost = useMemo(() => {
    // If position is expanded and has boq_items - calculate dynamically
    if (isExpanded && position.boq_items?.length > 0) {
      // Use the shared calculation function that matches table footer logic
      const dynamicTotal = calculateBOQItemsTotal(position.boq_items, position.boq_items);
      console.log('💰 Dynamic total calculation for expanded position:', {
        position_name: position.work_name,
        items_count: position.boq_items.length,
        dynamic_total: dynamicTotal,
        db_total: position.total_position_cost,
        difference: dynamicTotal - (position.total_position_cost || 0)
      });
      return dynamicTotal;
    }
    // Otherwise use value from DB
    return position.total_position_cost || 0;
  }, [isExpanded, position.boq_items, position.total_position_cost, position.work_name]);

  // Sync state when position changes
  useEffect(() => {
    setTempWorkName(position.work_name ?? '');
    setTempManualVolume(position.manual_volume ?? null);
    setTempManualNote(position.manual_note ?? '');
    setTempUnit(position.unit ?? '');
  }, [position.work_name, position.manual_volume, position.manual_note, position.unit]);

  // Create stable dependency for position items
  const positionItemsKey = useMemo(() => {
    if (!position.boq_items) return '';
    return position.boq_items.map(item => `${item.id}-${item.item_type}`).sort().join(',');
  }, [position.boq_items]);

  // Update local works when position changes
  useEffect(() => {
    if (!position.boq_items) {
      setLocalWorks([]);
      return;
    }

    const updatedWorks = position.boq_items.filter(item =>
      item.item_type === 'work' || item.item_type === 'sub_work'
    ) || [];

    // Debug for ДОП работы
    if (position.is_additional) {
      console.log('🔧 ДОП: Updating available works:', {
        position_name: position.work_name,
        total_items: position.boq_items.length,
        works_found: updatedWorks.length,
        works: updatedWorks.map(w => ({ id: w.id, type: w.item_type, desc: w.description }))
      });
    }

    // Use functional update to prevent infinite loops
    setLocalWorks(prevWorks => {
      // Only update if the works list actually changed
      const prevIds = prevWorks.map(w => w.id).sort().join(',');
      const newIds = updatedWorks.map(w => w.id).sort().join(',');

      if (prevIds !== newIds) {
        return updatedWorks;
      }
      return prevWorks;
    });
  }, [positionItemsKey, position.is_additional, position.work_name, position.boq_items]);

  // Update temp manual volume when position changes
  useEffect(() => {
    setTempManualVolume(position.manual_volume ?? null);
  }, [position.manual_volume]);

  // Update temp manual note when position changes
  useEffect(() => {
    setTempManualNote(position.manual_note ?? '');
  }, [position.manual_note]);

  return {
    // State
    loading,
    setLoading,
    editingItem,
    setEditingItem,
    linkingMaterialId,
    setLinkingMaterialId,
    linkMaterialModalVisible,
    setLinkMaterialModalVisible,
    refreshKey,
    setRefreshKey,
    localWorks,
    setLocalWorks,
    tempManualVolume,
    setTempManualVolume,
    tempManualNote,
    setTempManualNote,
    editSelectedCurrency,
    setEditSelectedCurrency,
    tempWorkName,
    setTempWorkName,
    tempUnit,
    setTempUnit,
    showAdditionalWorkModal,
    setShowAdditionalWorkModal,

    // Computed
    totalItems,
    materialsCount,
    worksCount,
    totalCost,
    positionItemsKey,

    // Alias for works
    works: localWorks
  };
};