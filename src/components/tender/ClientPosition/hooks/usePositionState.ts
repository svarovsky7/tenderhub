import { useState, useCallback, useMemo } from 'react';
import type { ClientPositionWithDetails, BOQItemWithLibrary } from '../../../../lib/supabase/types';

export interface PositionState {
  loading: boolean;
  editingItem: string | null;
  quickAddMode: boolean;
  linkingModalVisible: boolean;
  selectedWorkId: string | null;
  linkingMaterialId: string | null;
  linkMaterialModalVisible: boolean;
  editingMaterialId: string | null;
  editingWorkId: string | null;
  refreshKey: number;
  localWorks: BOQItemWithLibrary[];
  localBOQItems: any[];
  tempManualVolume: number | null;
  tempManualNote: string;
  selectedCurrency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  editSelectedCurrency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  tempWorkName: string;
  tempUnit: string;
  tenderMarkup: any;
  showAdditionalWorkModal: boolean;
  templateAddMode: boolean;
  templateOptions: { value: string; label: string }[];
  loadingTemplates: boolean;
  selectedTemplateName: string;
}

export function usePositionState(position: ClientPositionWithDetails) {
  // Core UI state
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [linkingModalVisible, setLinkingModalVisible] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [linkingMaterialId, setLinkingMaterialId] = useState<string | null>(null);
  const [linkMaterialModalVisible, setLinkMaterialModalVisible] = useState(false);
  const [showAdditionalWorkModal, setShowAdditionalWorkModal] = useState(false);
  const [templateAddMode, setTemplateAddMode] = useState(false);

  // Editing states
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);

  // Data states
  const [localWorks, setLocalWorks] = useState<BOQItemWithLibrary[]>([]);
  const [localBOQItems, setLocalBOQItems] = useState<any[]>(position.boq_items || []);
  const [tenderMarkup, setTenderMarkup] = useState<any>(null);

  // Temporary values
  const [tempManualVolume, setTempManualVolume] = useState<number | null>(position.manual_volume ?? null);
  const [tempManualNote, setTempManualNote] = useState<string>(position.manual_note ?? '');
  const [tempWorkName, setTempWorkName] = useState<string>(position.work_name ?? '');
  const [tempUnit, setTempUnit] = useState<string>(position.unit ?? '');

  // Currency states
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');

  // Template states
  const [templateOptions, setTemplateOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');

  // Computed properties
  const totalItems = useMemo(() => position.boq_items?.length || 0, [position.boq_items]);
  const materialsCount = useMemo(
    () => position.boq_items?.filter(item =>
      item.item_type === 'material' || item.item_type === 'sub_material'
    ).length || 0,
    [position.boq_items]
  );
  const worksCount = useMemo(
    () => position.boq_items?.filter(item =>
      item.item_type === 'work' || item.item_type === 'sub_work'
    ).length || 0,
    [position.boq_items]
  );
  const totalCost = position.total_position_cost || 0;

  // Helper functions
  const resetEditingStates = useCallback(() => {
    setEditingMaterialId(null);
    setEditingWorkId(null);
    setEditingItem(null);
  }, []);

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    // States
    loading,
    setLoading,
    editingItem,
    setEditingItem,
    quickAddMode,
    setQuickAddMode,
    linkingModalVisible,
    setLinkingModalVisible,
    selectedWorkId,
    setSelectedWorkId,
    linkingMaterialId,
    setLinkingMaterialId,
    linkMaterialModalVisible,
    setLinkMaterialModalVisible,
    editingMaterialId,
    setEditingMaterialId,
    editingWorkId,
    setEditingWorkId,
    refreshKey,
    setRefreshKey,
    localWorks,
    setLocalWorks,
    localBOQItems,
    setLocalBOQItems,
    tempManualVolume,
    setTempManualVolume,
    tempManualNote,
    setTempManualNote,
    selectedCurrency,
    setSelectedCurrency,
    editSelectedCurrency,
    setEditSelectedCurrency,
    tempWorkName,
    setTempWorkName,
    tempUnit,
    setTempUnit,
    tenderMarkup,
    setTenderMarkup,
    showAdditionalWorkModal,
    setShowAdditionalWorkModal,
    templateAddMode,
    setTemplateAddMode,
    templateOptions,
    setTemplateOptions,
    loadingTemplates,
    setLoadingTemplates,
    selectedTemplateName,
    setSelectedTemplateName,

    // Computed
    totalItems,
    materialsCount,
    worksCount,
    totalCost,

    // Helpers
    resetEditingStates,
    refreshData
  };
}