import { useState, useEffect } from 'react';
import { Form } from 'antd';
import type { ClientPosition, ClientPositionType, BOQItem } from '../../../../lib/supabase/types';
import {
  canContainBOQItems,
  isStructuralPosition,
  POSITION_ICONS,
  POSITION_LABELS
} from '../../../../utils/clientPositionHierarchy';

interface BOQItemWithLibrary extends BOQItem {
  libraryWorkId?: string | null;
  libraryMaterialId?: string | null;
}

export interface UsePositionStateProps {
  position: ClientPosition & {
    boq_items?: BOQItem[];
    total_position_cost?: number;
  };
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

export interface UsePositionStateReturn {
  // Core state
  loading: boolean;
  setLoading: (loading: boolean) => void;
  editingItem: string | null;
  setEditingItem: (id: string | null) => void;
  quickAddMode: boolean;
  setQuickAddMode: (mode: boolean) => void;

  // Linking state
  linkingModalVisible: boolean;
  setLinkingModalVisible: (visible: boolean) => void;
  selectedWorkId: string | null;
  setSelectedWorkId: (id: string | null) => void;
  linkingMaterialId: string | null;
  setLinkingMaterialId: (id: string | null) => void;
  linkMaterialModalVisible: boolean;
  setLinkMaterialModalVisible: (visible: boolean) => void;
  editingMaterialId: string | null;
  setEditingMaterialId: (id: string | null) => void;
  editingWorkId: string | null;
  setEditingWorkId: (id: string | null) => void;

  // Other state
  refreshKey: number;
  setRefreshKey: (key: number) => void;
  localWorks: BOQItemWithLibrary[];
  setLocalWorks: (works: BOQItemWithLibrary[]) => void;
  localBOQItems: any[];
  setLocalBOQItems: (items: any[]) => void;

  // Manual fields
  tempManualVolume: number | null;
  setTempManualVolume: (volume: number | null) => void;
  tempManualNote: string;
  setTempManualNote: (note: string) => void;
  tempWorkName: string;
  setTempWorkName: (name: string) => void;
  tempUnit: string;
  setTempUnit: (unit: string) => void;

  // Currency state
  selectedCurrency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  setSelectedCurrency: (currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => void;
  editSelectedCurrency: 'RUB' | 'USD' | 'EUR' | 'CNY';
  setEditSelectedCurrency: (currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => void;

  // Tender markup
  tenderMarkup: any;
  setTenderMarkup: (markup: any) => void;

  // Template state
  templateAddMode: boolean;
  setTemplateAddMode: (mode: boolean) => void;
  templateOptions: { value: string; label: string }[];
  setTemplateOptions: (options: { value: string; label: string }[]) => void;
  loadingTemplates: boolean;
  setLoadingTemplates: (loading: boolean) => void;
  selectedTemplateName: string;
  setSelectedTemplateName: (name: string) => void;

  // Additional modal state
  showAdditionalWorkModal: boolean;
  setShowAdditionalWorkModal: (show: boolean) => void;

  // Forms
  form: any;
  quickAddForm: any;
  editForm: any;
  workEditForm: any;
  templateAddForm: any;

  // Computed properties
  totalItems: number;
  materialsCount: number;
  worksCount: number;
  totalCost: number;

  // Position hierarchy properties
  positionType: ClientPositionType;
  hierarchyLevel: number;
  canAddItems: boolean;
  isStructural: boolean;
  positionIcon: any;
  positionLabel: string;
}

export const usePositionState = ({ position, tender }: UsePositionStateProps): UsePositionStateReturn => {
  // Core state
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [quickAddMode, setQuickAddMode] = useState(false);

  // Linking state
  const [linkingModalVisible, setLinkingModalVisible] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [linkingMaterialId, setLinkingMaterialId] = useState<string | null>(null);
  const [linkMaterialModalVisible, setLinkMaterialModalVisible] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);

  // Other state
  const [refreshKey, setRefreshKey] = useState(0);
  const [localWorks, setLocalWorks] = useState<BOQItemWithLibrary[]>([]);
  const [localBOQItems, setLocalBOQItems] = useState<any[]>(position.boq_items || []);

  // Manual fields
  const [tempManualVolume, setTempManualVolume] = useState<number | null>(position.manual_volume ?? null);
  const [tempManualNote, setTempManualNote] = useState<string>(position.manual_note ?? '');
  const [tempWorkName, setTempWorkName] = useState<string>(position.work_name ?? '');
  const [tempUnit, setTempUnit] = useState<string>(position.unit ?? '');

  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');

  // Tender markup
  const [tenderMarkup, setTenderMarkup] = useState<any>(null);

  // Template state
  const [templateAddMode, setTemplateAddMode] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');

  // Additional modal state
  const [showAdditionalWorkModal, setShowAdditionalWorkModal] = useState(false);

  // Forms
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [workEditForm] = Form.useForm();
  const [templateAddForm] = Form.useForm();

  // Computed properties
  const totalItems = position.boq_items?.length || 0;
  const materialsCount = position.boq_items?.filter(item =>
    item.item_type === 'material' || item.item_type === 'sub_material'
  ).length || 0;
  const worksCount = position.boq_items?.filter(item =>
    item.item_type === 'work' || item.item_type === 'sub_work'
  ).length || 0;
  const totalCost = position.total_position_cost || 0;

  // Position hierarchy properties
  const positionType: ClientPositionType = position.position_type || 'executable';
  const hierarchyLevel = position.hierarchy_level || 6;
  const canAddItems = canContainBOQItems(position.position_type);
  const isStructural = isStructuralPosition(positionType);
  const positionIcon = POSITION_ICONS[positionType];
  const positionLabel = POSITION_LABELS[positionType];

  // Sync state when position changes
  useEffect(() => {
    setTempWorkName(position.work_name ?? '');
    setTempManualVolume(position.manual_volume ?? null);
    setTempManualNote(position.manual_note ?? '');
    setTempUnit(position.unit ?? '');
    setLocalBOQItems(position.boq_items || []);
  }, [position.work_name, position.manual_volume, position.manual_note, position.unit, position.boq_items]);

  // Update temp fields when position changes
  useEffect(() => {
    setTempManualVolume(position.manual_volume ?? null);
  }, [position.manual_volume]);

  useEffect(() => {
    setTempManualNote(position.manual_note ?? '');
  }, [position.manual_note]);

  return {
    // Core state
    loading,
    setLoading,
    editingItem,
    setEditingItem,
    quickAddMode,
    setQuickAddMode,

    // Linking state
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

    // Other state
    refreshKey,
    setRefreshKey,
    localWorks,
    setLocalWorks,
    localBOQItems,
    setLocalBOQItems,

    // Manual fields
    tempManualVolume,
    setTempManualVolume,
    tempManualNote,
    setTempManualNote,
    tempWorkName,
    setTempWorkName,
    tempUnit,
    setTempUnit,

    // Currency state
    selectedCurrency,
    setSelectedCurrency,
    editSelectedCurrency,
    setEditSelectedCurrency,

    // Tender markup
    tenderMarkup,
    setTenderMarkup,

    // Template state
    templateAddMode,
    setTemplateAddMode,
    templateOptions,
    setTemplateOptions,
    loadingTemplates,
    setLoadingTemplates,
    selectedTemplateName,
    setSelectedTemplateName,

    // Additional modal state
    showAdditionalWorkModal,
    setShowAdditionalWorkModal,

    // Forms
    form,
    quickAddForm,
    editForm,
    workEditForm,
    templateAddForm,

    // Computed properties
    totalItems,
    materialsCount,
    worksCount,
    totalCost,

    // Position hierarchy properties
    positionType,
    hierarchyLevel,
    canAddItems,
    isStructural,
    positionIcon,
    positionLabel
  };
};