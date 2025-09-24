import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// Import extracted components
import { WorkEditRow } from './ClientPositionStreamlined/components/EditRows/WorkEditRow';
import { MaterialEditRow } from './ClientPositionStreamlined/components/EditRows/MaterialEditRow';
import { QuickAddRow } from './ClientPositionStreamlined/components/QuickAdd/QuickAddRow';
import { TemplateAddForm } from './ClientPositionStreamlined/components/Template/TemplateAddForm';

// Import extracted hooks
import { usePositionActions } from './ClientPositionStreamlined/hooks/usePositionActions';
import { useDeleteHandlers } from './ClientPositionStreamlined/hooks/useDeleteHandlers';
import { useMaterialEdit } from './ClientPositionStreamlined/hooks/useMaterialEdit';
import { useWorkEdit } from './ClientPositionStreamlined/hooks/useWorkEdit';
import { useLinkingHandlers } from './ClientPositionStreamlined/hooks/useLinkingHandlers';
import { useQuickAdd } from './ClientPositionStreamlined/hooks/useQuickAdd';
import { useMediaQueryFix } from './ClientPositionStreamlined/hooks/useMediaQueryFix';
import { useSortedBOQItems } from './ClientPositionStreamlined/hooks/useSortedBOQItems';
import { useCommercialCost } from './ClientPositionStreamlined/hooks/useCommercialCost';
import {
  Card,
  Typography,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Empty,
  Table,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  InputNumber,
  ConfigProvider,
  AutoComplete
} from 'antd';
import {
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckOutlined,
  BuildOutlined,
  ToolOutlined,
  LinkOutlined,
  ClearOutlined,
  FormOutlined,
  TableOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getActiveTenderMarkup } from '../../lib/supabase/api/tender-markup';
import { boqApi } from '../../lib/supabase/api';
import MaterialLinkingModal from './MaterialLinkingModal';
import AdditionalWorkModal from './AdditionalWorkModal';
import { DecimalInput } from '../common';
import CostDetailCascadeSelector from '../common/CostDetailCascadeSelector';
import CostCategoryDisplay from './CostCategoryDisplay';
import type {
  BOQItemWithLibrary,
  ClientPositionType
} from '../../lib/supabase/types';
import {
  canContainBOQItems,
  getVisualIndent,
  getIndentByLevel,
  getPositionCSSClass,
  getPositionColors,
  getFontWeight,
  getTextSize,
  getTagColor,
  isStructuralPosition,
  POSITION_ICONS,
  POSITION_LABELS
} from '../../utils/clientPositionHierarchy';
import { formatCurrency } from '../../utils/formatters';
import { getCurrencySymbol } from '../../utils/currencyConverter';

const { Title, Text } = Typography;

interface ClientPositionCardStreamlinedProps {
  position: any;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
  tenderId: string;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}


const ClientPositionCardStreamlined: React.FC<ClientPositionCardStreamlinedProps> = ({
  position,
  isExpanded,
  onToggle,
  onUpdate,
  tenderId,
  tender
}) => {
  // Log tender prop when component renders
  console.log('🎯 RAW TENDER PROP:', tender);
  console.log('🔍 [ClientPositionCardStreamlined] Tender prop received:', {
    tender,
    tender_type: typeof tender,
    is_null: tender === null,
    is_undefined: tender === undefined,
    usd_rate: tender?.usd_rate,
    usd_rate_type: typeof tender?.usd_rate,
    eur_rate: tender?.eur_rate,
    eur_rate_type: typeof tender?.eur_rate,
    cny_rate: tender?.cny_rate,
    cny_rate_type: typeof tender?.cny_rate,
    tender_keys: tender ? Object.keys(tender) : null,
    tender_entries: tender ? Object.entries(tender) : null,
    position_id: position.id,
    raw_tender: JSON.stringify(tender)
  });
  console.log('🎯 [ClientPositionCardStreamlined] Render with tender:', {
    positionId: position.id,
    positionNumber: position.position_number,
    tenderExists: !!tender,
    tender: tender,
    tenderId: tenderId
  });
  console.log('📦 Position props received:', {
    id: position.id,
    manual_volume: position.manual_volume,
    manual_note: position.manual_note,
    work_name: position.work_name?.substring(0, 30),
    is_additional: position.is_additional,
    position_type: position.position_type,
    boq_items_count: position.boq_items?.length || 0,
    has_linked_materials: position.boq_items?.some(item => item.work_link) || false
  });
  
  // Debug tender currency data
  console.log('💱 Tender currency data:', {
    tenderId,
    tender,
    hasRates: tender ? !!(tender.usd_rate || tender.eur_rate || tender.cny_rate) : false,
    usd_rate: tender?.usd_rate,
    eur_rate: tender?.eur_rate,
    cny_rate: tender?.cny_rate
  });
  
  // Forms
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [workEditForm] = Form.useForm();
  const [templateAddForm] = Form.useForm();

  // Local state
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [linkingMaterialId, setLinkingMaterialId] = useState<string | null>(null);
  const [linkMaterialModalVisible, setLinkMaterialModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localWorks, setLocalWorks] = useState<BOQItemWithLibrary[]>([]);
  const [localBOQItems, setLocalBOQItems] = useState<any[]>(position.boq_items || []);
  const [tempManualVolume, setTempManualVolume] = useState<number | null>(position.manual_volume ?? null);
  const [tempManualNote, setTempManualNote] = useState<string>(position.manual_note ?? '');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [tempWorkName, setTempWorkName] = useState<string>(position.work_name ?? '');
  const [tempUnit, setTempUnit] = useState<string>(position.unit ?? '');
  const [tenderMarkup, setTenderMarkup] = useState<any>(null);
  const [showAdditionalWorkModal, setShowAdditionalWorkModal] = useState(false);

  // Computed properties
  const totalItems = position.boq_items?.length || 0;
  const materialsCount = position.boq_items?.filter(item => item.item_type === 'material' || item.item_type === 'sub_material').length || 0;
  const worksCount = position.boq_items?.filter(item => item.item_type === 'work' || item.item_type === 'sub_work').length || 0;
  const totalCost = position.total_position_cost || 0;

  // Custom hooks for extracted functionality
  const { handleManualVolumeChange, handleManualNoteChange } = usePositionActions({
    positionId: position.id,
    onUpdate
  });

  const { handleDeleteItem, handleDeleteAllItems, deleteLoading } = useDeleteHandlers({
    position,
    onUpdate
  });

  const {
    editingMaterialId,
    handleEditMaterial,
    handleSaveInlineEdit,
    handleCancelInlineEdit,
    handleWorkSelectionChange,
    handleCoefficientChange,
    materialEditLoading
  } = useMaterialEdit({
    position,
    localWorks,
    setLocalWorks,
    localBOQItems,
    setLocalBOQItems,
    editForm,
    setRefreshKey,
    onUpdate,
    tender
  });

  const {
    editingWorkId,
    handleEditWork,
    handleSaveWorkEdit,
    handleCancelWorkEdit,
    workEditLoading
  } = useWorkEdit({
    position,
    localBOQItems,
    setLocalBOQItems,
    workEditForm,
    setRefreshKey,
    onUpdate,
    tender
  });

  const {
    linkingModalVisible,
    setLinkingModalVisible,
    selectedWorkId,
    setSelectedWorkId,
    templateAddMode,
    setTemplateAddMode,
    selectedTemplateName,
    setSelectedTemplateName,
    templateOptions,
    setTemplateOptions,
    loadingTemplates,
    handleLinkMaterials,
    handleMaterialsLinked,
    loadTemplates,
    handleTemplateAdd,
    linkingLoading
  } = useLinkingHandlers({
    position,
    tenderId,
    templateAddForm,
    onUpdate
  });

  const {
    quickAddMode,
    setQuickAddMode,
    selectedCurrency,
    setSelectedCurrency,
    handleCurrencyChange,
    handleQuickAdd,
    quickAddLoading
  } = useQuickAdd({
    position,
    tenderId,
    works: localWorks,
    setLocalWorks,
    quickAddForm,
    onUpdate,
    tender
  });

  // Используем хук для расчета коммерческой стоимости
  const { calculateCommercialCost, saveCommercialFields, commercialCosts } = useCommercialCost({
    position,
    tenderMarkup
  });

  // Position hierarchy properties
  const positionType: ClientPositionType = position.position_type || 'executable';
  const hierarchyLevel = position.hierarchy_level || 6;
  const canAddItems = canContainBOQItems(position.position_type); // Pass raw value to check null/undefined
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
  
  // Debug logging (commented to reduce console spam)
  // console.log('🔍 Position click check:', {
  //   id: position.id,
  //   position_type: position.position_type,
  //   positionType,
  //   canAddItems,
  //   title: position.title
  // });
  const visualIndent = getIndentByLevel(hierarchyLevel);
  const positionColors = useMemo(() => getPositionColors(positionType), [positionType]);
  const fontWeight = useMemo(() => getFontWeight(positionType), [positionType]);
  const textSize = useMemo(() => getTextSize(positionType), [positionType]);
  const tagColor = useMemo(() => getTagColor(positionType), [positionType]);
  
  // Commercial cost functions are now provided by useCommercialCost hook
  
  // Auto-save commercial fields when values change
  useEffect(() => {
    if (!position.boq_items || !tenderMarkup) return;
    
    const savePromises = position.boq_items.map(async (item) => {
      const commercialCost = calculateCommercialCost(item);
      
      // Calculate base cost properly based on item type - same logic as in calculateCommercialCost
      // Include currency conversion if not RUB
      const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate 
        ? item.currency_rate 
        : 1;
      let baseCost = (item.quantity || 0) * (item.unit_rate || 0) * currencyMultiplier;
      
      // Add delivery only for materials with appropriate delivery type
      if ((item.item_type === 'material' || item.item_type === 'sub_material')) {
        const deliveryType = item.delivery_price_type || 'included';
        const deliveryAmount = item.delivery_amount || 0;
        
        if (deliveryType === 'amount') {
          // Fixed amount per unit (already in RUB)
          baseCost = baseCost + (deliveryAmount * (item.quantity || 0));
        } else if (deliveryType === 'not_included') {
          // 3% of base cost
          baseCost = baseCost + (baseCost * 0.03);
        }
      }
      
      console.log('💾 Saving commercial fields:', {
        itemId: item.id,
        itemType: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unitRate: item.unit_rate,
        deliveryAmount: item.delivery_amount,
        deliveryType: item.delivery_price_type,
        baseCost: baseCost,
        commercialCost: commercialCost,
        coefficient: baseCost > 0 ? (commercialCost / baseCost).toFixed(3) : 'N/A'
      });
      
      if (commercialCost > 0 && baseCost > 0) {
        await saveCommercialFields(item.id, commercialCost, baseCost);
      }
    });
    
    Promise.allSettled(savePromises);
  }, [position.boq_items, tenderMarkup, calculateCommercialCost, saveCommercialFields]);
  // Commercial costs are already calculated by useCommercialCost hook
  
  
  // Create stable dependency for position items
  const positionItemsKey = useMemo(() => {
    if (!position.boq_items) return '';
    return position.boq_items.map(item => `${item.id}-${item.item_type}`).sort().join(',');
  }, [position.boq_items]);
  
  // Update local works when position changes (include both work and sub_work)
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
        // console.log('🔧 Updated available works for linking:', updatedWorks.length, updatedWorks.map(w => ({ id: w.id, desc: w.description })));
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
  
  // Load tender markup on component mount
  useEffect(() => {
    const loadMarkup = async () => {
      try {
        const markup = await getActiveTenderMarkup(tenderId);
        console.log('📊 Raw markup response:', markup);
        
        // Handle both array and object responses
        const markupData = Array.isArray(markup) ? markup[0] : markup;
        
        if (markupData) {
          setTenderMarkup(markupData);
          console.log('📊 Loaded tender markup:', markupData);
        }
      } catch (error) {
        console.error('❌ Failed to load tender markup:', error);
      }
    };
    
    loadMarkup();
  }, [tenderId]);
  
  const works = localWorks;
  // console.log('🔧 Current works for linking:', works.length, works.map(w => ({ id: w.id, desc: w.description })));

  // Используем хук для сортировки элементов BOQ
  const sortedBOQItems = useSortedBOQItems({
    localBOQItems,
    position
  });

  // Используем хук для предотвращения проблем с MediaQuery
  useMediaQueryFix();

  // Optimized table columns with improved responsive widths and no horizontal scroll
  const columns: ColumnsType<BOQItemWithLibrary> = [
    // Removed № column as requested
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type', 
      width: 85,
      render: (type, record) => {
        switch(type) {
          case 'work':
            return (
              <div className="flex justify-center">
                <Tag icon={<BuildOutlined />} color="orange" className="text-xs">Работа</Tag>
              </div>
            );
          case 'sub_work':
            return (
              <div className="flex justify-center">
                <Tag icon={<BuildOutlined />} color="purple" className="text-xs">Суб-раб</Tag>
              </div>
            );
          case 'material':
            // Check material type from material_type field (default to main if not specified)
            const isMainMaterial = record.material_type !== 'auxiliary';
            
            return (
              <div className="flex flex-col gap-0.5 items-center">
                <Tag icon={<ToolOutlined />} color="blue" className="text-xs">Материал</Tag>
                <Tag 
                  color={isMainMaterial ? "cyan" : "gold"} 
                  className="text-xs"
                  style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
                >
                  {isMainMaterial ? (
                    <>📦 Основной</>
                  ) : (
                    <>🔧 Вспомог.</>
                  )}
                </Tag>
              </div>
            );
          case 'sub_material':
            // Check sub-material type from material_type field (default to main if not specified)
            const isMainSubMaterial = record.material_type !== 'auxiliary';
            
            return (
              <div className="flex flex-col gap-0.5 items-center">
                <Tag icon={<ToolOutlined />} color="green" className="text-xs">Суб-мат</Tag>
                <Tag 
                  color={isMainSubMaterial ? "cyan" : "gold"} 
                  className="text-xs"
                  style={{ fontSize: '10px', padding: '0 4px', height: '18px', lineHeight: '18px' }}
                >
                  {isMainSubMaterial ? (
                    <>📦 Основной</>
                  ) : (
                    <>🔧 Вспомог.</>
                  )}
                </Tag>
              </div>
            );
          default:
            return <Tag className="text-xs">{type}</Tag>;
        }
      }
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      width: 240,
      ellipsis: { showTitle: false },
      render: (text, record) => {
        // Find if material/sub-material is linked to a work
        let linkedWork = null;
        if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
          // Check both work_boq_item_id and sub_work_boq_item_id
          linkedWork = position.boq_items?.find(item => {
            if (record.work_link.work_boq_item_id && item.id === record.work_link.work_boq_item_id && item.item_type === 'work') {
              return true;
            }
            if (record.work_link.sub_work_boq_item_id && item.id === record.work_link.sub_work_boq_item_id && item.item_type === 'sub_work') {
              return true;
            }
            return false;
          });
          
          // Debug for additional works
          if (position.is_additional && !linkedWork && record.work_link) {
            console.log('⚠️ Material has work_link but work not found in ДОП:', {
              material: record.description,
              work_link: record.work_link,
              available_works: position.boq_items?.filter(i => i.item_type === 'work').map(w => ({ id: w.id, name: w.description }))
            });
          }
        }
        
        // Add visual indentation for linked materials and sub-materials
        const isLinkedMaterial = (record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link;
        
        return (
          <Tooltip title={text} placement="topLeft">
            <div className={isLinkedMaterial ? 'pl-6' : ''}>
              <div className="py-1 text-sm">{text}</div>
              {isLinkedMaterial && linkedWork && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  <LinkOutlined className="mr-1" />
                  {linkedWork.description}
                </div>
              )}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: (
        <Tooltip title="Коэффициент перевода единиц измерения">
          <span className="cursor-help text-xs">К.пер</span>
        </Tooltip>
      ),
      key: 'conversion_coef',
      width: 60,
      align: 'center',
      render: (_, record) => {
        if (record.item_type === 'material' || record.item_type === 'sub_material') {
          // Get coefficient from BOQ item first, then from work_link
          const coef = record.conversion_coefficient || 
                      record.work_link?.usage_coefficient || 1;
          return (
            <div className={`text-center py-1 font-medium text-sm ${coef !== 1 ? 'text-green-600' : 'text-gray-400'}`}>
              {coef}
            </div>
          );
        }
        return <div className="text-center text-gray-300 text-sm">—</div>;
      }
    },
    {
      title: (
        <Tooltip title="Коэффициент расхода материала на единицу работы">
          <span className="cursor-help text-xs">К.расх</span>
        </Tooltip>
      ),
      key: 'consumption_coef',
      width: 60,
      align: 'center',
      render: (_, record) => {
        if (record.item_type === 'material' || record.item_type === 'sub_material') {
          // Get coefficient from BOQ item first, then from work_link
          const coef = record.consumption_coefficient || 
                      record.work_link?.material_quantity_per_work || 1;
          return (
            <div className={`text-center py-1 font-medium text-sm ${coef !== 1 ? 'text-orange-600' : 'text-gray-400'}`}>
              {coef}
            </div>
          );
        }
        return <div className="text-center text-gray-300 text-sm">—</div>;
      }
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 85,
      align: 'center',
      render: (value, record) => {
        // For materials linked to works (including sub-materials linked to sub-works)
        if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
          // For regular materials, check work_boq_item_id
          // For sub-materials, check sub_work_boq_item_id
          const work = position.boq_items?.find(item => {
            if (record.work_link.work_boq_item_id && 
                item.id === record.work_link.work_boq_item_id && 
                item.item_type === 'work') {
              return true;
            }
            if (record.work_link.sub_work_boq_item_id && 
                item.id === record.work_link.sub_work_boq_item_id && 
                item.item_type === 'sub_work') {
              return true;
            }
            return false;
          });
          
          if (work) {
            // Get coefficients from BOQ item first, then from work_link
            const consumptionCoef = record.consumption_coefficient || 
                                   record.work_link.material_quantity_per_work || 1;
            const conversionCoef = record.conversion_coefficient || 
                                  record.work_link.usage_coefficient || 1;
            const workQuantity = work.quantity || 0;
            const calculatedQuantity = workQuantity * consumptionCoef * conversionCoef;
            
            return (
              <Tooltip title={`${workQuantity} × ${consumptionCoef} × ${conversionCoef}`}>
                <div className="text-center py-1">
                  <div className="font-medium text-blue-600 text-sm">
                    {calculatedQuantity.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3
                    })}
                  </div>
                </div>
              </Tooltip>
            );
          }
        }
        
        // For unlinked materials and sub-materials, show tooltip with calculation formula
        if ((record.item_type === 'material' || record.item_type === 'sub_material') && !record.work_link) {
          const consumptionCoef = record.consumption_coefficient || 1;
          
          // Check if coefficients are applied (consumption > 1, conversion is always 1 for unlinked)
          const hasCoefficients = consumptionCoef > 1;
          
          if (hasCoefficients && record.base_quantity !== null && record.base_quantity !== undefined) {
            // Show base quantity and coefficient in tooltip
            return (
              <Tooltip title={`Базовое: ${record.base_quantity.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} × Коэф: ${consumptionCoef} = ${value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`}>
                <div className="text-center py-1">
                  <div className="font-medium text-green-600 text-sm">
                    {value?.toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3
                    })}
                  </div>
                </div>
              </Tooltip>
            );
          }
        }
        
        return (
          <div className="text-center py-1 text-sm">
            {value?.toLocaleString('ru-RU', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })}
          </div>
        );
      }
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      align: 'center',
      render: (text) => (
        <div className="text-center py-1 text-sm">{text}</div>
      )
    },
    {
      title: 'Цена',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 85,
      align: 'center',
      render: (value, record) => {
        const currencySymbols = {
          'RUB': '₽',
          'USD': '$',
          'EUR': '€',
          'CNY': '¥'
        };

        // Определяем какой символ валюты показывать
        const displayCurrency = record.currency_type || 'RUB';
        const displaySymbol = currencySymbols[displayCurrency] || displayCurrency;
        
        const priceDisplay = (
          <div className="text-center py-1 text-sm">
            {value?.toLocaleString('ru-RU', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })} {displaySymbol}
          </div>
        );

        // Показываем подсказку только для элементов с валютной ценой
        if (record.currency_type && record.currency_type !== 'RUB' && record.currency_rate) {
          const currencySymbol = currencySymbols[record.currency_type] || record.currency_type;
          const priceInRubles = value * record.currency_rate;
          const tooltipContent = `${value?.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} ${currencySymbol} × ${record.currency_rate} = ${priceInRubles?.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} ₽`;

          return (
            <Tooltip title={tooltipContent}>
              {priceDisplay}
            </Tooltip>
          );
        }

        return priceDisplay;
      }
    },
    {
      title: 'Доставка',
      key: 'delivery',
      width: 100,
      align: 'center',
      render: (_, record) => {
        // Показываем доставку только для материалов и субматериалов
        if (record.item_type === 'material' || record.item_type === 'sub_material') {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;
          
          if (deliveryType === 'included') {
            return (
              <Tag color="green" className="text-xs">
                Включена
              </Tag>
            );
          } else if (deliveryType === 'not_included') {
            const unitRate = record.unit_rate || 0;
            const deliveryPerUnit = deliveryAmount; // Используем значение из БД
            return (
              <Tooltip title={`Доставка: ${deliveryPerUnit.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽ за единицу (3% от цены ${unitRate.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽)`}>
                <Tag color="orange" className="text-xs">
                  Не включена (3%)
                </Tag>
              </Tooltip>
            );
          } else if (deliveryType === 'amount') {
            return (
              <Tooltip title="Фиксированная сумма доставки">
                <Tag color="blue" className="text-xs">
                  {deliveryAmount.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </Tag>
              </Tooltip>
            );
          }
        }
        return <div className="text-xs text-gray-400 text-center">—</div>;
      }
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 110,
      align: 'center',
      render: (_, record) => {
        // Получаем дополнительные данные для расчета
        let quantity = record.quantity || 0;
        const unitRate = record.unit_rate || 0;
        
        // For linked materials, calculate quantity based on work volume and coefficients
        if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
          // Find the linked work (could be work or sub_work)
          const work = position.boq_items?.find(item => {
            if (record.work_link.work_boq_item_id && 
                item.id === record.work_link.work_boq_item_id && 
                item.item_type === 'work') {
              return true;
            }
            if (record.work_link.sub_work_boq_item_id && 
                item.id === record.work_link.sub_work_boq_item_id && 
                item.item_type === 'sub_work') {
              return true;
            }
            return false;
          });
          
          if (work) {
            // Get coefficients from BOQ item first, then from work_link
            const consumptionCoef = record.consumption_coefficient || 
                                   record.work_link.material_quantity_per_work || 1;
            const conversionCoef = record.conversion_coefficient || 
                                  record.work_link.usage_coefficient || 1;
            const workQuantity = work.quantity || 0;
            quantity = workQuantity * consumptionCoef * conversionCoef;
          }
        }
        
        // Calculate total based on current quantity and unit rate
        // Include currency conversion if not RUB
        const currencyMultiplier = record.currency_type && record.currency_type !== 'RUB' && record.currency_rate 
          ? record.currency_rate 
          : 1;
        const baseTotal = quantity * unitRate * currencyMultiplier;
        let total = baseTotal;
        
        // Add delivery costs for materials
        if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;
          
          if (deliveryType === 'amount') {
            // Fixed amount per unit (already in RUB)
            total = baseTotal + (deliveryAmount * quantity);
          } else if (deliveryType === 'not_included') {
            // 3% of base cost
            total = baseTotal + (baseTotal * 0.03);
          }
        }
        
        // Create tooltip content for all items
        let tooltipContent = null;
        
        // Get currency symbol
        const currencySymbols = {
          'RUB': '₽',
          'USD': '$',
          'EUR': '€',
          'CNY': '¥'
        };
        const currencySymbol = currencySymbols[record.currency_type || 'RUB'] || record.currency_type || '₽';
        
        // Build calculation formula parts
        const formulaParts = [];
        
        // Get unit of measurement
        const unit = record.unit || '';
        
        // Basic formula: quantity × unit_rate
        formulaParts.push(`${quantity.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3
        })} ${unit} × ${unitRate.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })} ${currencySymbol}`);
        
        // Add currency conversion if not RUB
        if (record.currency_type && record.currency_type !== 'RUB' && record.currency_rate) {
          formulaParts.push(`× ${record.currency_rate}`);
        }
        
        // Calculate base total for display
        const baseFormula = formulaParts.join(' ');
        const baseTotalForDisplay = `${baseTotal.toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })} ₽`;
        
        // For materials with delivery, create detailed tooltip
        if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;
          
          if (deliveryType === 'amount' && deliveryAmount > 0) {
            const deliveryTotal = deliveryAmount * quantity;
            tooltipContent = (
              <div>
                <div>{baseFormula} = {baseTotalForDisplay}</div>
                <div>Доставка: {quantity.toLocaleString('ru-RU')} {unit} × {deliveryAmount.toLocaleString('ru-RU')} ₽ = {deliveryTotal.toLocaleString('ru-RU')} ₽</div>
                <div className="border-t pt-1 mt-1">
                  <strong>Итого: {total.toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            );
          } else if (deliveryType === 'not_included') {
            const deliveryTotal = baseTotal * 0.03;
            tooltipContent = (
              <div>
                <div>{baseFormula} = {baseTotalForDisplay}</div>
                <div>Доставка (3%): {deliveryTotal.toLocaleString('ru-RU')} ₽</div>
                <div className="border-t pt-1 mt-1">
                  <strong>Итого: {total.toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            );
          } else {
            // Included delivery or no delivery - show simple formula
            tooltipContent = `${baseFormula} = ${baseTotalForDisplay}`;
          }
        } else {
          // For works and sub-works - show simple formula
          tooltipContent = `${baseFormula} = ${baseTotalForDisplay}`;
        }
        
        const totalElement = (
          <div className="whitespace-nowrap text-center">
            <Text strong className="text-green-600 text-sm">
              {Math.round(total).toLocaleString('ru-RU')} ₽
            </Text>
          </div>
        );
        
        return tooltipContent ? (
          <Tooltip title={tooltipContent} placement="left">
            {totalElement}
          </Tooltip>
        ) : totalElement;
      }
    },
    {
      title: 'Категория затрат',
      dataIndex: 'detail_cost_category_id',
      key: 'detail_cost_category_id',
      width: 140,
      align: 'center',
      render: (detailCategoryId) => (
        <CostCategoryDisplay detailCategoryId={detailCategoryId} />
      )
    },
    {
      title: 'Ссылка на КП',
      dataIndex: 'quote_link',
      key: 'quote_link',
      width: 150,
      align: 'center',
      render: (value) => {
        if (!value) return <div className="text-center">-</div>;
        // Если ссылка начинается с http, делаем её кликабельной
        if (value.startsWith('http')) {
          return (
            <div className="text-center">
              <a 
                href={value} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                {value}
              </a>
            </div>
          );
        }
        // Иначе просто показываем текст полностью
        return (
          <div className="text-center">
            <span className="text-xs">
              {value}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Примечание',
      dataIndex: 'note',
      key: 'note',
      width: 160,
      align: 'center',
      render: (value) => {
        if (!value) return <div className="text-center">-</div>;
        // Показываем текст полностью, с переносом строк если нужно
        return (
          <div className="text-center">
            <span className="text-xs whitespace-pre-wrap">
              {value}
            </span>
          </div>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <div className="whitespace-nowrap">
          <Space size="small">
            {(record.item_type === 'material' || record.item_type === 'sub_material') && (
              <Tooltip title={record.item_type === 'sub_material' ? "Редактировать суб-материал / Связать с работой" : "Редактировать материал / Связать с работой"}>
                <Button
                  type="text"
                  size="small"
                  icon={<FormOutlined />}
                  onClick={() => handleEditMaterial(record)}
                  className="text-xs"
                />
              </Tooltip>
            )}
            {(record.item_type === 'work' || record.item_type === 'sub_work') && (
              <Tooltip title={record.item_type === 'sub_work' ? "Редактировать суб-работу" : "Редактировать работу"}>
                <Button
                  type="text"
                  size="small"
                  icon={<FormOutlined />}
                  onClick={() => handleEditWork(record)}
                  className="text-xs"
                />
              </Tooltip>
            )}
            <Popconfirm
              title="Удалить элемент?"
              onConfirm={() => handleDeleteItem(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                className="text-xs"
              />
            </Popconfirm>
          </Space>
        </div>
      )
    }
  ];


  // Work Edit Row (inline editing) - With column headers

  // Material Edit Row (inline editing) - Compact two-row layout

  return (
    <>
      {/* Component Styles */}
      <style jsx>{`
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f0f0f0;
          vertical-align: middle;
          padding: 8px 6px;
        }
        .custom-table .ant-table-thead > tr > th {
          background-color: #fafafa;
          font-weight: 600;
          border-bottom: 2px solid #e8e8e8;
          padding: 8px 6px;
          font-size: 12px;
        }
        .custom-table .ant-table-container {
          border-radius: 6px;
        }
        .custom-table .ant-table {
          font-size: 13px;
        }
        .custom-table .ant-table-tbody > tr {
          transition: background-color 0.2s ease;
        }
        .custom-table .ant-table-tbody > tr > td {
          transition: background-color 0.2s ease;
        }
        /* Hover effects for different row types */
        .custom-table .ant-table-tbody > tr.bg-orange-100\\/90:hover > td {
          background-color: #fed7aa !important; /* Fully saturated orange for work */
        }
        .custom-table .ant-table-tbody > tr.bg-purple-100:hover > td {
          background-color: #e9d5ff !important; /* Darker purple for sub-work */
        }
        .custom-table .ant-table-tbody > tr.bg-blue-100:hover > td {
          background-color: #bfdbfe !important; /* Darker blue for material */
        }
        .custom-table .ant-table-tbody > tr.bg-blue-100\\/60:hover > td {
          background-color: #dbeafe !important; /* Darker blue for unlinked material */
        }
        .custom-table .ant-table-tbody > tr.bg-green-100\\/80:hover > td {
          background-color: #bbf7d0 !important; /* Darker green for sub-material */
        }
        .custom-table .ant-table-tbody > tr:hover {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .custom-table .ant-input-number {
          border: none !important;
          box-shadow: none !important;
        }
        .custom-table .ant-input {
          border: none !important;
          box-shadow: none !important;
        }
        .custom-table .ant-input-number:hover,
        .custom-table .ant-input:hover {
          background-color: #f9f9f9;
        }
        .custom-table .ant-input-number:focus,
        .custom-table .ant-input:focus {
          background-color: #ffffff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
        }
        @media (max-width: 768px) {
          .custom-table .ant-table-tbody > tr > td {
            padding: 6px 3px;
            font-size: 11px;
          }
          .custom-table .ant-table-thead > tr > th {
            padding: 6px 3px;
            font-size: 11px;
          }
          .custom-table {
            font-size: 11px;
          }
        }
        @media (max-width: 1024px) {
          .custom-table .ant-table-tbody > tr > td {
            padding: 6px 4px;
            font-size: 12px;
          }
          .custom-table .ant-table-thead > tr > th {
            padding: 6px 4px;
            font-size: 11px;
          }
        }
      `}</style>
      <Card
        className={`hover:shadow-md transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-200 shadow-lg' : ''} overflow-hidden w-full`}
        bodyStyle={{ padding: 0 }}
        style={{ 
          borderRadius: '8px',
          borderTop: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
          borderRight: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
          borderBottom: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
          borderLeft: `4px solid ${positionColors.border}`,
          width: '100%',
          background: positionColors.background,
          color: positionColors.text
        }}
      >
        {/* Header with compact responsive layout */}
        <div 
          className={`px-4 py-2 border-b transition-colors duration-200 ${
            canAddItems 
              ? 'cursor-pointer hover:bg-gray-50' 
              : 'cursor-default'
          }`}
          onClick={canAddItems ? onToggle : undefined}
        >
          <Row gutter={[12, 4]} align="middle" className="w-full">
            {/* Icon and Position Number */}
            <Col xs={24} sm={6} md={4} lg={1}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Tag color={tagColor} className="font-mono">
                    <span style={{ marginRight: '4px' }}>{positionIcon}</span>
                    {position.position_number}
                  </Tag>
                  {isStructural && (
                    <Tooltip title="Структурный элемент - нельзя расценивать">
                      <Tag color="gray" size="small" className="text-xs mt-1 cursor-help">
                        {positionLabel}
                      </Tag>
                    </Tooltip>
                  )}
                </div>
              </div>
            </Col>
            
            {/* Work Name */}
            <Col xs={24} sm={18} md={14} lg={14}>
              <div style={{ paddingLeft: `${visualIndent}px` }}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  {/* Редактируемое название для ДОП работ */}
                  {position.is_additional ? (
                    <div className="flex items-center gap-2 flex-1">
                      <span style={{ color: '#666', fontSize: '0.9em' }}>{position.item_no}</span>
                      <Tag color="orange" style={{ marginRight: 0 }}>
                        ДОП
                      </Tag>
                      {isExpanded ? (
                        <Input
                          value={tempWorkName.replace(/^ДОП:\s*/, '')} // Убираем префикс "ДОП: " при отображении
                          onChange={(e) => {
                            // Сохраняем без префикса, он добавится при сохранении если нужно
                            const newValue = e.target.value;
                            setTempWorkName(newValue.startsWith('ДОП:') ? newValue : `ДОП: ${newValue}`);
                          }}
                          onBlur={async () => {
                            const displayName = tempWorkName.replace(/^ДОП:\s*/, '');
                            if (!displayName.trim()) {
                              message.warning('Название не может быть пустым');
                              setTempWorkName(position.work_name); // Restore original value
                              return;
                            }
                            
                            // Убеждаемся, что в БД сохраняется с префиксом "ДОП: "
                            const nameToSave = tempWorkName.startsWith('ДОП:') ? tempWorkName : `ДОП: ${tempWorkName}`;
                            
                            if (nameToSave === position.work_name) {
                              return; // No changes
                            }
                            
                            console.log('📝 Updating additional work name:', {
                              id: position.id,
                              oldName: position.work_name,
                              newName: nameToSave
                            });
                            
                            setLoading(true);
                            try {
                              const result = await clientPositionsApi.update(position.id, {
                                work_name: nameToSave
                              });
                              
                              if (result.error) {
                                message.error(result.error);
                                setTempWorkName(position.work_name); // Restore on error
                              } else {
                                message.success('Название ДОП работы обновлено');
                                onUpdate();
                              }
                            } catch (error) {
                              console.error('💥 Error updating additional work name:', error);
                              message.error('Ошибка при обновлении названия');
                              setTempWorkName(position.work_name); // Restore on error
                            } finally {
                              setLoading(false);
                            }
                          }}
                          onPressEnter={(e) => e.currentTarget.blur()}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1"
                          disabled={loading}
                          style={{
                            fontWeight: fontWeight === 'bold' ? '700' : 
                                       fontWeight === 'semibold' ? '600' : 
                                       fontWeight === 'medium' ? '500' : '400',
                            color: positionColors.text,
                            fontSize: textSize === 'text-base' ? '16px' : 
                                     textSize === 'text-lg' ? '18px' : '14px'
                          }}
                        />
                      ) : (
                        <Text 
                          className="flex-1"
                          style={{
                            fontWeight: fontWeight === 'bold' ? '700' : 
                                       fontWeight === 'semibold' ? '600' : 
                                       fontWeight === 'medium' ? '500' : '400',
                            color: positionColors.text,
                            fontSize: textSize === 'text-base' ? '16px' : 
                                     textSize === 'text-lg' ? '18px' : '14px'
                          }}
                        >
                          {tempWorkName.replace(/^ДОП:\s*/, '')}
                        </Text>
                      )}
                    </div>
                  ) : (
                    <Title 
                      level={5} 
                      className={`mb-0 ${textSize} flex-1 min-w-0`}
                      ellipsis={{ tooltip: position.work_name }}
                      style={{ 
                        fontWeight: fontWeight === 'bold' ? '700' : 
                                   fontWeight === 'semibold' ? '600' : 
                                   fontWeight === 'medium' ? '500' : '400',
                        color: positionColors.text,
                        lineHeight: '1.3',
                        margin: 0
                      }}
                    >
                      <span style={{ marginRight: '8px', color: '#666', fontSize: '0.9em' }}>{position.item_no}</span>
                      {position.work_name}
                      {position.is_orphaned && (
                        <Tooltip title="Независимая ДОП работа (исходная позиция удалена)">
                          <Tag color="warning" style={{ marginLeft: '8px', fontSize: '0.8em' }}>
                            Независимая
                          </Tag>
                        </Tooltip>
                      )}
                    </Title>
                  )}
                </div>
              </div>
            </Col>
            
            {/* Client and GP data - four rows */}
            <Col xs={24} sm={24} md={8} lg={6}>
              <div className="flex flex-col gap-2">
                {/* First row - Client note - only for non-ДОП positions */}
                {!position.is_additional && position.client_note && (
                  <div className="flex flex-col gap-1">
                    <Text className="text-sm text-gray-500 font-semibold">Примечание Заказчика:</Text>
                    <Text className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                      <strong>{position.client_note}</strong>
                    </Text>
                  </div>
                )}
                
                {/* Second row - GP Note - editable only when expanded for ДОП, conditional for others */}
                {position.is_additional ? (
                  // For ДОП positions - show editable field only when expanded
                  isExpanded ? (
                    <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      <Text className="text-sm text-gray-500 whitespace-nowrap font-semibold">Примечание ГП:</Text>
                      <Input
                        size="small"
                        value={tempManualNote ?? undefined}
                        placeholder="Примечание"
                        className="flex-1"
                        disabled={loading}
                        style={{ fontSize: '13px', width: '100%' }}
                        onChange={(e) => setTempManualNote(e.target.value)}
                        onBlur={() => {
                          if (tempManualNote !== position.manual_note) {
                            handleManualNoteChange(tempManualNote);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    position.manual_note && (
                      <div className="flex items-center gap-1">
                        <Text className="text-sm text-gray-500 font-semibold">Примечание ГП:</Text>
                        <Text className="text-sm text-green-600 flex-1" ellipsis={{ tooltip: position.manual_note }}>
                          <strong>{position.manual_note}</strong>
                        </Text>
                      </div>
                    )
                  )
                ) : (
                  // For regular positions - existing logic
                  (canAddItems ? (
                    isExpanded ? (
                      <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                        <Text className="text-sm text-gray-500 whitespace-nowrap font-semibold">Примечание ГП:</Text>
                        <Input
                          size="middle"
                          value={tempManualNote ?? undefined}
                          placeholder="Примечание"
                          className="flex-1"
                          style={{ fontSize: '14px', width: '100%' }}
                          onChange={(e) => setTempManualNote(e.target.value)}
                          onBlur={() => {
                            if (tempManualNote !== position.manual_note) {
                              handleManualNoteChange(tempManualNote);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      position.manual_note && (
                        <div className="flex items-center gap-1">
                          <Text className="text-sm text-gray-500 font-semibold">Примечание ГП:</Text>
                          <Text className="text-sm text-green-600 flex-1" ellipsis={{ tooltip: position.manual_note }}>
                            <strong>{position.manual_note}</strong>
                          </Text>
                        </div>
                      )
                    )
                  ) : (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Text className="text-sm text-gray-500 whitespace-nowrap font-semibold">Примечание ГП:</Text>
                      <Input
                        size="middle"
                        value={tempManualNote ?? undefined}
                        placeholder="Примечание"
                        className="flex-1"
                        style={{ fontSize: '14px' }}
                        onChange={(e) => setTempManualNote(e.target.value)}
                        onBlur={() => {
                          if (tempManualNote !== position.manual_note) {
                            handleManualNoteChange(tempManualNote);
                          }
                        }}
                      />
                    </div>
                  ))
                )}
                
                {/* Third row - Client Quantity/Unit - for all non-ДОП positions */}
                {!position.is_additional && (position.volume || position.unit) && (
                  <div className="flex items-center gap-1">
                    {position.volume ? (
                      <>
                        <Text className="text-sm text-gray-500 font-semibold">Кол-во Заказчика:</Text>
                        <Text className="text-sm text-gray-600">
                          <strong>{position.volume}</strong>
                        </Text>
                        {position.unit && (
                          <Text className="text-sm text-gray-600 ml-1">
                            <strong>{position.unit}</strong>
                          </Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Text className="text-sm text-gray-500 font-semibold">Ед. изм. Заказчика:</Text>
                        <Text className="text-sm text-gray-600">
                          <strong>{position.unit}</strong>
                        </Text>
                      </>
                    )}
                  </div>
                )}
                
                {/* Fourth row - GP Quantity - editable for ДОП positions only when expanded, for others when expanded */}
                {position.is_additional ? (
                  // For ДОП positions - show editable fields only when expanded
                  isExpanded ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Text className="text-sm text-gray-500 font-semibold whitespace-nowrap">Объем ГП:</Text>
                      <InputNumber
                        size="small"
                        min={0}
                        value={tempManualVolume ?? undefined}
                        placeholder="0"
                        className="w-20"
                        disabled={loading}
                        onChange={(value) => setTempManualVolume(value)}
                        onBlur={() => {
                          if (tempManualVolume !== position.manual_volume) {
                            handleManualVolumeChange(tempManualVolume);
                          }
                        }}
                        style={{ fontSize: '13px' }}
                      />
                      <Select
                        size="small"
                        value={tempUnit || 'компл.'}
                        onChange={async (value) => {
                          setTempUnit(value);
                          console.log('📝 Updating additional work unit:', {
                            id: position.id,
                            oldUnit: position.unit,
                            newUnit: value
                          });
                          
                          setLoading(true);
                          try {
                            const result = await clientPositionsApi.update(position.id, {
                              unit: value
                            });
                            
                            if (result.error) {
                              message.error(result.error);
                              setTempUnit(position.unit); // Restore on error
                            } else {
                              message.success('Единица измерения обновлена');
                              onUpdate();
                            }
                          } catch (error) {
                            console.error('💥 Error updating unit:', error);
                            message.error('Ошибка при обновлении единицы');
                            setTempUnit(position.unit); // Restore on error
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="w-24"
                        style={{ fontSize: '13px' }}
                      >
                        <Select.Option value="компл.">компл.</Select.Option>
                        <Select.Option value="шт">шт</Select.Option>
                        <Select.Option value="м²">м²</Select.Option>
                        <Select.Option value="м³">м³</Select.Option>
                        <Select.Option value="м.п.">м.п.</Select.Option>
                        <Select.Option value="т">т</Select.Option>
                        <Select.Option value="кг">кг</Select.Option>
                        <Select.Option value="л">л</Select.Option>
                      </Select>
                    </div>
                  ) : (
                    (position.manual_volume || position.unit) && (
                      <div className="flex items-center gap-1">
                        <Text className="text-sm text-gray-500 font-semibold">Объем ГП:</Text>
                        {position.manual_volume && (
                          <Text className="text-sm text-green-600">
                            <strong>{position.manual_volume}</strong>
                          </Text>
                        )}
                        {position.unit && (
                          <Text className="text-sm text-green-600 ml-1">
                            <strong>{position.unit}</strong>
                          </Text>
                        )}
                      </div>
                    )
                  )
                ) : (
                  // For regular positions - show based on expanded state
                  canAddItems && (
                    isExpanded ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Text className="text-sm text-gray-500 font-semibold">Кол-во ГП:</Text>
                        <InputNumber
                          size="middle"
                          min={0}
                          value={tempManualVolume ?? undefined}
                          placeholder="0"
                          className="w-24"
                          onChange={(value) => setTempManualVolume(value)}
                          onBlur={() => {
                            if (tempManualVolume !== position.manual_volume) {
                              handleManualVolumeChange(tempManualVolume);
                            }
                          }}
                          style={{ fontSize: '14px' }}
                        />
                        {position.unit && (
                          <Text className="text-sm text-gray-600 ml-1">
                            <strong>{position.unit}</strong>
                          </Text>
                        )}
                      </div>
                    ) : (
                      position.manual_volume && (
                        <div className="flex items-center gap-1">
                          <Text className="text-sm text-gray-500 font-semibold">Кол-во ГП:</Text>
                          <Text className="text-sm text-green-600">
                            <strong>{position.manual_volume}</strong>
                          </Text>
                          {position.unit && (
                            <Text className="text-sm text-green-600 ml-1">
                              <strong>{position.unit}</strong>
                            </Text>
                          )}
                        </div>
                      )
                    )
                  )
                )}
              </div>
            </Col>
            
            {/* Additional Work Button and Total Cost */}
            <Col xs={24} sm={24} md={24} lg={3}>
              <div className="flex flex-col items-end gap-2">
                {/* Кнопка добавления ДОП работы - для всех основных позиций */}
                {!position.is_additional && position.id && (
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔍 Opening additional work modal for position:', {
                        id: position.id,
                        work_name: position.work_name,
                        position_type: position.position_type,
                        idType: typeof position.id
                      });
                      if (!position.id || 
                          position.id === 'undefined' || 
                          position.id === undefined) {
                        console.error('❌ Position ID is invalid!', {
                          id: position.id,
                          type: typeof position.id,
                          position: position
                        });
                        message.error('Ошибка: ID позиции не определен');
                        return;
                      }
                      setShowAdditionalWorkModal(true);
                    }}
                    className="border border-orange-300 text-orange-600 hover:border-orange-400 hover:text-orange-700"
                    style={{ 
                      fontSize: '12px',
                      padding: '2px 8px',
                      height: '24px'
                    }}
                  >
                    + ДОП
                  </Button>
                )}
                
                {/* Кнопка удаления для ДОП работ */}
                {position.is_additional && position.id && (
                  <Popconfirm
                    title="Удалить ДОП работу?"
                    description="Это действие нельзя отменить. Все связанные работы и материалы будут удалены."
                    onConfirm={async (e) => {
                      e?.stopPropagation();
                      console.log('🗑️ Deleting additional work:', position.id);
                      setLoading(true);
                      try {
                        const result = await clientPositionsApi.delete(position.id);
                        if (result.error) {
                          message.error(result.error);
                        } else {
                          message.success('ДОП работа удалена');
                          onUpdate();
                        }
                      } catch (error) {
                        console.error('💥 Error deleting additional work:', error);
                        message.error('Ошибка при удалении ДОП работы');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      disabled={loading}
                      style={{ 
                        fontSize: '12px',
                        padding: '2px 8px',
                        height: '24px'
                      }}
                    >
                      Удалить
                    </Button>
                  </Popconfirm>
                )}
                
                {/* Total Cost */}
                <div>
                  <Text strong className="text-lg text-green-700 whitespace-nowrap">
                    {Math.round(totalCost).toLocaleString('ru-RU')} ₽
                  </Text>
                </div>
                
                {/* Statistics */}
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap">
                    <Text className="text-gray-600 text-xs">Р: </Text>
                    <Text strong className="text-green-600 text-xs">{worksCount}</Text>
                  </span>
                  <span className="whitespace-nowrap">
                    <Text className="text-gray-600 text-xs">М: </Text>
                    <Text strong className="text-blue-600 text-xs">{materialsCount}</Text>
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Expandable Content with Animation */}
        <div 
          className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${
            isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 bg-gray-50 min-h-0">
            {/* View Mode Toggle and Quick Add Button */}
            <div className="mb-4 flex justify-between items-center gap-4">
              <div className="flex gap-2 flex-1">
                {!quickAddMode && !templateAddMode ? (
                  <>
                    {canAddItems ? (
                      <>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => setQuickAddMode(true)}
                          className="h-10 border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:text-blue-700 transition-colors duration-200"
                          style={{
                            borderStyle: 'dashed',
                            fontSize: '14px',
                            fontWeight: '500',
                            flex: 1
                          }}
                        >
                          Добавить работу или материал
                        </Button>
                        <Button
                          type="dashed"
                          icon={<FormOutlined />}
                          onClick={() => setTemplateAddMode(true)}
                          className="h-10 border-2 border-dashed border-green-300 text-green-600 hover:border-green-400 hover:text-green-700 transition-colors duration-200"
                          style={{
                            borderStyle: 'dashed',
                            fontSize: '14px',
                            fontWeight: '500',
                            flex: 1
                          }}
                        >
                          Добавить по шаблону
                        </Button>
                      </>
                    ) : (
                      <div className="flex-1 h-10 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                        <Text className="text-gray-500 flex items-center gap-2">
                          <Tooltip title={positionLabel}>
                            <span className="text-lg cursor-help">{positionIcon}</span>
                          </Tooltip>
                          Структурный элемент - нельзя добавлять работы/материалы
                        </Text>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>

            {/* Quick Add Form */}
            {quickAddMode && (
              <QuickAddRow
                quickAddForm={quickAddForm}
                handleQuickAdd={handleQuickAdd}
                handleCurrencyChange={handleCurrencyChange}
                setQuickAddMode={setQuickAddMode}
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
                works={works}
                tender={tender}
              />
            )}

            {/* Template Add Form */}
            {templateAddMode && (
              <TemplateAddForm
                templateAddForm={templateAddForm}
                handleTemplateAdd={handleTemplateAdd}
                loadTemplates={loadTemplates}
                setTemplateAddMode={setTemplateAddMode}
                selectedTemplateName={selectedTemplateName}
                setSelectedTemplateName={setSelectedTemplateName}
                templateOptions={templateOptions}
                setTemplateOptions={setTemplateOptions}
                loadingTemplates={loadingTemplates}
                loading={loading}
              />
            )}

            {/* Table Header with Clear All button */}
            {totalItems > 0 && (
              <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                <div>
                  <Text strong className="text-gray-800">Элементы позиции</Text>
                  <Text className="ml-2 text-gray-600">({totalItems})</Text>
                </div>
                <Popconfirm
                  title="Удалить все элементы?"
                  description={`Будет удалено ${worksCount} работ и ${materialsCount} материалов`}
                  onConfirm={handleDeleteAllItems}
                  okText="Да, удалить все"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                  placement="topRight"
                >
                  <Button
                    danger
                    icon={<ClearOutlined />}
                    size="small"
                    loading={loading}
                    className="hover:bg-red-50"
                  >
                    Очистить все
                  </Button>
                </Popconfirm>
              </div>
            )}

            {/* Items Display - Table */}
            {totalItems > 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ width: '100%', minWidth: '1200px' }}>
                  <Table
                  key={refreshKey}
                  columns={columns}
                  dataSource={sortedBOQItems}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 1200, y: 400 }}
                  className="custom-table boq-items-table"
                  rowClassName={(record) => {
                    switch(record.item_type) {
                      case 'work':
                        return 'bg-orange-100/90 hover:bg-orange-100 font-medium transition-colors';
                      case 'sub_work':
                        return 'bg-purple-100 hover:bg-purple-200 font-medium transition-colors';
                      case 'material':
                        return record.work_link ? 'bg-blue-100 hover:bg-blue-200 transition-colors' : 'bg-blue-100/60 hover:bg-blue-200/80 transition-colors';
                      case 'sub_material':
                        return 'bg-green-100/80 hover:bg-green-200 transition-colors';
                      default:
                        return '';
                    }
                  }}
                components={{
                  body: {
                    row: ({ children, ...props }: any) => {
                      const record = props['data-row-key'] ? 
                        sortedBOQItems.find(item => item.id === props['data-row-key']) : 
                        null;
                      
                      // If this is the material or sub-material being edited, show the edit form
                      if (record && editingMaterialId === record.id && (record.item_type === 'material' || record.item_type === 'sub_material')) {
                        return (
                          <MaterialEditRow
                            item={record}
                            editForm={editForm}
                            handleSaveInlineEdit={handleSaveInlineEdit}
                            handleCancelInlineEdit={handleCancelInlineEdit}
                            handleWorkSelectionChange={handleWorkSelectionChange}
                            handleCoefficientChange={handleCoefficientChange}
                            tenderMarkup={tenderMarkup}
                            tender={tender}
                            works={works}
                            loading={loading}
                          />
                        );
                      }

                      // If this is the work or sub-work being edited, show the edit form
                      if (record && editingWorkId === record.id && (record.item_type === 'work' || record.item_type === 'sub_work')) {
                        return (
                          <WorkEditRow
                            item={record}
                            workEditForm={workEditForm}
                            handleSaveWorkEdit={handleSaveWorkEdit}
                            handleCancelWorkEdit={handleCancelWorkEdit}
                            tenderMarkup={tenderMarkup}
                            tender={tender}
                          />
                        );
                      }
                      
                      // Otherwise show normal row
                      return <tr {...props}>{children}</tr>;
                    }
                  }
                }}
                onRow={(record) => ({
                  'data-row-key': record.id,
                })}
                summary={(pageData) => {
                  const total = pageData.reduce((sum, item) => {
                    let quantity = item.quantity || 0;
                    const unitRate = item.unit_rate || 0;
                    
                    // For linked materials, calculate quantity based on work volume and coefficients
                    if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
                      // Find the linked work
                      const work = position.boq_items?.find(boqItem => {
                        if (item.work_link.work_boq_item_id && 
                            boqItem.id === item.work_link.work_boq_item_id && 
                            boqItem.item_type === 'work') {
                          return true;
                        }
                        if (item.work_link.sub_work_boq_item_id && 
                            boqItem.id === item.work_link.sub_work_boq_item_id && 
                            boqItem.item_type === 'sub_work') {
                          return true;
                        }
                        return false;
                      });
                      
                      if (work) {
                        // Get coefficients from BOQ item first, then from work_link
                        const consumptionCoef = item.consumption_coefficient || 
                                               item.work_link.material_quantity_per_work || 1;
                        const conversionCoef = item.conversion_coefficient || 
                                              item.work_link.usage_coefficient || 1;
                        const workQuantity = work.quantity || 0;
                        quantity = workQuantity * consumptionCoef * conversionCoef;
                      }
                    }
                    
                    // Apply currency conversion if needed
                    const currencyMultiplier = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate 
                      ? item.currency_rate 
                      : 1;
                    let itemTotal = quantity * unitRate * currencyMultiplier;
                    
                    // Add delivery cost for materials
                    if (item.item_type === 'material' || item.item_type === 'sub_material') {
                      const deliveryType = item.delivery_price_type;
                      const deliveryAmount = item.delivery_amount || 0;
                      
                      if (deliveryType === 'amount') {
                        // Fixed amount per unit (already in RUB)
                        itemTotal += deliveryAmount * quantity;
                      } else if (deliveryType === 'not_included') {
                        // 3% of base cost
                        itemTotal += itemTotal * 0.03;
                      }
                    }
                    
                    return sum + itemTotal;
                  }, 0);
                  
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: '#f8f9fa' }}>
                        <Table.Summary.Cell index={0} colSpan={8} align="right">
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} align="right">
                          <div className="whitespace-nowrap">
                            <Text strong className="text-lg text-green-700">
                              {Math.round(total).toLocaleString('ru-RU')} ₽
                            </Text>
                          </div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={9} />
                        <Table.Summary.Cell index={10} />
                        <Table.Summary.Cell index={11} />
                        <Table.Summary.Cell index={12} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
                  />
                </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <Empty
                  description={canAddItems ? "Нет добавленных элементов" : (
                    <span className="flex items-center justify-center gap-2">
                      <Tooltip title={positionLabel}>
                        <span className="text-lg cursor-help">{positionIcon}</span>
                      </Tooltip>
                      Структурный элемент не содержит элементов
                    </span>
                  )}
                  className="py-4"
                >
                  {canAddItems && (
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setQuickAddMode(true)}
                    >
                      Добавить первый элемент
                    </Button>
                  )}
                </Empty>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Material Linking Modal */}
      {selectedWorkId && (
        <MaterialLinkingModal
          visible={linkingModalVisible}
          workId={selectedWorkId}
          onClose={() => {
            setLinkingModalVisible(false);
            setSelectedWorkId(null);
          }}
          onSuccess={handleMaterialsLinked}
        />
      )}

      {/* Additional Work Modal */}
      {showAdditionalWorkModal && position.id && position.id !== 'undefined' && (
        <AdditionalWorkModal
          visible={showAdditionalWorkModal}
          onClose={() => setShowAdditionalWorkModal(false)}
          parentPositionId={position.id}
          parentPositionName={position.work_name || 'Позиция'}
          tenderId={tenderId}
          onSuccess={() => {
            setShowAdditionalWorkModal(false);
            onUpdate(); // Refresh parent component
          }}
        />
      )}

    </>
  );
};

export default React.memo(ClientPositionCardStreamlined, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.position.id === nextProps.position.id &&
    prevProps.position.boq_items?.length === nextProps.position.boq_items?.length &&
    prevProps.position.manual_volume === nextProps.position.manual_volume && // Check manual_volume
    prevProps.position.manual_note === nextProps.position.manual_note && // Check manual_note
    prevProps.works?.length === nextProps.works?.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.isExpanded === nextProps.isExpanded && // IMPORTANT: Check isExpanded for toggle to work
    JSON.stringify(prevProps.position.updated_at) === JSON.stringify(nextProps.position.updated_at)
  );
});