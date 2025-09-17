import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { boqApi, clientPositionsApi, workMaterialTemplatesApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import { getActiveTenderMarkup } from '../../lib/supabase/api/tender-markup';
import MaterialLinkingModal from './MaterialLinkingModal';
import AdditionalWorkModal from './AdditionalWorkModal';
import { DecimalInput } from '../common';
import CostDetailCascadeSelector from '../common/CostDetailCascadeSelector';
import CostCategoryDisplay from './CostCategoryDisplay';
import { 
  calculateWorkCommercialCost,
  calculateMainMaterialCommercialCost,
  calculateAuxiliaryMaterialCommercialCost,
  calculateMaterialCommercialCost,
  calculateSubcontractWorkCommercialCost,
  calculateSubcontractMaterialCommercialCost,
  calculateAuxiliarySubcontractMaterialCommercialCost
} from '../../utils/calculateCommercialCost';
import type { 
  BOQItemWithLibrary,
  BOQItemInsert,
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
import { CURRENCY_OPTIONS, convertToRuble, getCurrencyRate, getCurrencySymbol } from '../../utils/currencyConverter';

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

interface QuickAddRowData {
  type: 'work' | 'material' | 'sub_work' | 'sub_material';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  work_id?: string;
  material_type?: 'main' | 'auxiliary';
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  detail_cost_category_id?: string;
  cost_category_display?: string;
  delivery_price_type?: 'included' | 'not_included' | 'amount';
  delivery_amount?: number;
  currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY';
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
  
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [linkingModalVisible, setLinkingModalVisible] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [linkingMaterialId, setLinkingMaterialId] = useState<string | null>(null);
  const [linkMaterialModalVisible, setLinkMaterialModalVisible] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [workEditForm] = Form.useForm();

  // Computed properties
  const totalItems = position.boq_items?.length || 0;
  const materialsCount = position.boq_items?.filter(item => item.item_type === 'material' || item.item_type === 'sub_material').length || 0;
  const worksCount = position.boq_items?.filter(item => item.item_type === 'work' || item.item_type === 'sub_work').length || 0;
  const totalCost = position.total_position_cost || 0;
  
  const [localWorks, setLocalWorks] = useState<BOQItemWithLibrary[]>([]);
  const [localBOQItems, setLocalBOQItems] = useState<any[]>(position.boq_items || []);
  const [tempManualVolume, setTempManualVolume] = useState<number | null>(position.manual_volume ?? null);
  const [tempManualNote, setTempManualNote] = useState<string>(position.manual_note ?? '');
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [editSelectedCurrency, setEditSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [tempWorkName, setTempWorkName] = useState<string>(position.work_name ?? '');
  const [tempUnit, setTempUnit] = useState<string>(position.unit ?? '');
  const [tenderMarkup, setTenderMarkup] = useState<any>(null);
  const [showAdditionalWorkModal, setShowAdditionalWorkModal] = useState(false);
  const [templateAddMode, setTemplateAddMode] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateAddForm] = Form.useForm();
  
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
  
  // Function to calculate commercial cost
  const calculateCommercialCost = useCallback((record: BOQItemWithLibrary) => {
    if (!tenderMarkup) {
      console.log('⚠️ TenderMarkup is not loaded yet');
      return 0;
    }
    
    // Calculate base cost with delivery
    let quantity = record.quantity || 0;
    const unitRate = record.unit_rate || 0;
    
    // For linked materials, calculate quantity based on work volume
    if ((record.item_type === 'material' || record.item_type === 'sub_material') && record.work_link) {
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
        const consumptionCoef = record.consumption_coefficient || 
                               record.work_link.material_quantity_per_work || 1;
        const conversionCoef = record.conversion_coefficient || 
                              record.work_link.usage_coefficient || 1;
        const workQuantity = work.quantity || 0;
        quantity = workQuantity * consumptionCoef * conversionCoef;
      }
    }
    
    // Calculate base cost including delivery
    let baseCost = quantity * unitRate;
    
    // Add delivery for materials
    if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
      const deliveryType = record.delivery_price_type || 'included';
      const deliveryAmount = record.delivery_amount || 0;
      
      if ((deliveryType === 'amount' || deliveryType === 'not_included') && deliveryAmount > 0) {
        baseCost = baseCost + (deliveryAmount * quantity);
      }
    }
    
    // Calculate commercial cost based on item type
    let commercialCost = baseCost;
    
    switch (record.item_type) {
      case 'work':
        commercialCost = calculateWorkCommercialCost(baseCost, tenderMarkup);
        break;
      case 'material':
        // Определяем тип материала и рассчитываем коммерческую стоимость
        const isAuxiliary = record.material_type === 'auxiliary';
        if (isAuxiliary) {
          const result = calculateAuxiliaryMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        } else {
          const result = calculateMainMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        }
        break;
      case 'sub_work':
        commercialCost = calculateSubcontractWorkCommercialCost(baseCost, tenderMarkup);
        break;
      case 'sub_material':
        // Определяем тип субматериала и рассчитываем коммерческую стоимость
        const isSubAuxiliary = record.material_type === 'auxiliary';
        if (isSubAuxiliary) {
          const result = calculateAuxiliarySubcontractMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        } else {
          const result = calculateSubcontractMaterialCommercialCost(baseCost, tenderMarkup);
          commercialCost = result.materialCost + result.workMarkup; // Полная коммерческая стоимость
        }
        break;
    }
    
    return commercialCost;
  }, [tenderMarkup, position.boq_items]);

  // Function to save commercial fields to database
  const saveCommercialFields = useCallback(async (itemId: string, commercialCost: number, baseCost: number) => {
    if (!tenderMarkup || baseCost <= 0) return;
    
    const markupCoefficient = commercialCost / baseCost;
    
    try {
      console.log('🚀 Saving commercial fields:', { itemId, commercialCost, markupCoefficient });
      const result = await boqApi.updateCommercialFields(itemId, commercialCost, markupCoefficient);
      
      if (result.error) {
        console.error('❌ Failed to save commercial fields:', result.error);
      } else {
        console.log('✅ Commercial fields saved successfully');
      }
    } catch (error) {
      console.error('💥 Exception saving commercial fields:', error);
    }
  }, [tenderMarkup]);
  
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
  
  // Calculate position-level commercial costs split between works and materials with detailed breakdown
  const commercialCosts = useMemo(() => {
    if (!position.boq_items || !tenderMarkup) {
      return { works: 0, materials: 0, total: 0, breakdown: [] };
    }

    let worksTotal = 0;
    let materialsTotal = 0;
    const breakdown: any[] = [];

    position.boq_items.forEach(item => {
      const commercialCost = calculateCommercialCost(item);
      
      // Create detailed breakdown for each item
      let quantity = item.quantity || 0;
      const unitRate = item.unit_rate || 0;
      
      // For linked materials, calculate actual quantity
      if ((item.item_type === 'material' || item.item_type === 'sub_material') && item.work_link) {
        const work = position.boq_items?.find(w => {
          if (item.work_link.work_boq_item_id && 
              w.id === item.work_link.work_boq_item_id && 
              w.item_type === 'work') {
            return true;
          }
          if (item.work_link.sub_work_boq_item_id && 
              w.id === item.work_link.sub_work_boq_item_id && 
              w.item_type === 'sub_work') {
            return true;
          }
          return false;
        });
        
        if (work) {
          const consumptionCoef = item.consumption_coefficient || 
                                 item.work_link.material_quantity_per_work || 1;
          const conversionCoef = item.conversion_coefficient || 
                                item.work_link.usage_coefficient || 1;
          const workQuantity = work.quantity || 0;
          quantity = workQuantity * consumptionCoef * conversionCoef;
        }
      }
      
      // Calculate base cost with delivery
      let baseCost = quantity * unitRate;
      const deliveryType = item.delivery_price_type || 'included';
      const deliveryAmount = item.delivery_amount || 0;
      
      if ((deliveryType === 'amount' || deliveryType === 'not_included') && deliveryAmount > 0) {
        baseCost = baseCost + (deliveryAmount * quantity);
      }

      // Create detailed stages for each item type
      let stages = [];
      let itemWorksContribution = 0;
      let itemMaterialsContribution = 0;
      
      if (item.item_type === 'work') {
        // Work item - detailed calculation stages
        const mechanizationCost = baseCost * (tenderMarkup.mechanization_service / 100);
        const mbpGsmCost = baseCost * (tenderMarkup.mbp_gsm / 100);
        const warrantyCost = baseCost * (tenderMarkup.warranty_period / 100);
        const work16 = (baseCost + mechanizationCost) * (1 + tenderMarkup.works_16_markup / 100);
        const worksCostGrowth = (work16 + mbpGsmCost) * (1 + tenderMarkup.works_cost_growth / 100);
        const contingencyCosts = (work16 + mbpGsmCost) * (1 + tenderMarkup.contingency_costs / 100);
        const ooz = (worksCostGrowth + contingencyCosts - work16 - mbpGsmCost) * (1 + tenderMarkup.overhead_own_forces / 100);
        const ofz = ooz * (1 + tenderMarkup.general_costs_without_subcontract / 100);
        const profit = ofz * (1 + tenderMarkup.profit_own_forces / 100);
        const totalCommercial = profit + warrantyCost;

        stages = [
          { name: 'Работа ПЗ (база)', value: baseCost },
          { name: 'Служба механизации', value: mechanizationCost, percent: tenderMarkup.mechanization_service },
          { name: 'МБП+ГСМ', value: mbpGsmCost, percent: tenderMarkup.mbp_gsm },
          { name: 'Работа 1,6', value: work16, formula: `(База + СМ) × ${1 + tenderMarkup.works_16_markup / 100}` },
          { name: 'Рост работ', value: worksCostGrowth, percent: tenderMarkup.works_cost_growth },
          { name: 'Непредвиденные', value: contingencyCosts, percent: tenderMarkup.contingency_costs },
          { name: 'ООЗ собств. силы', value: ooz, percent: tenderMarkup.overhead_own_forces },
          { name: 'ОФЗ (без субподр.)', value: ofz, percent: tenderMarkup.general_costs_without_subcontract },
          { name: 'Прибыль собств. силы', value: profit, percent: tenderMarkup.profit_own_forces },
          { name: 'Гарантийный период', value: warrantyCost, percent: tenderMarkup.warranty_period },
          { name: 'ИТОГО коммерческая', value: totalCommercial, isTotal: true }
        ];
        itemWorksContribution = commercialCost;
        
      } else if (item.item_type === 'sub_work') {
        // Subcontract work
        const subcontractGrowth = baseCost * (1 + tenderMarkup.subcontract_works_cost_growth / 100);
        const subcontractOverhead = subcontractGrowth * (1 + tenderMarkup.overhead_subcontract / 100);
        const subcontractProfit = subcontractOverhead * (1 + tenderMarkup.profit_subcontract / 100);

        stages = [
          { name: 'СУБРАБ ПЗ (база)', value: baseCost },
          { name: 'Субраб РОСТ', value: subcontractGrowth, percent: tenderMarkup.subcontract_works_cost_growth },
          { name: 'Субраб ООЗ', value: subcontractOverhead, percent: tenderMarkup.overhead_subcontract },
          { name: 'Субраб прибыль', value: subcontractProfit, percent: tenderMarkup.profit_subcontract, isTotal: true }
        ];
        itemWorksContribution = commercialCost;
        
      } else if (item.item_type === 'material') {
        // Определяем тип материала (основной или вспомогательный)
        const isAuxiliary = item.material_type === 'auxiliary';
        
        // Рассчитываем полную коммерческую стоимость материала
        const materialsGrowth = baseCost * (1 + tenderMarkup.materials_cost_growth / 100);
        const contingencyMaterials = baseCost * (1 + tenderMarkup.contingency_costs / 100);
        const oozMat = (materialsGrowth + contingencyMaterials - baseCost) * (1 + tenderMarkup.overhead_own_forces / 100);
        const ofzMat = oozMat * (1 + tenderMarkup.general_costs_without_subcontract / 100);
        const profitMat = ofzMat * (1 + tenderMarkup.profit_own_forces / 100);
        const markup = profitMat - baseCost;

        if (isAuxiliary) {
          // Вспомогательный материал - наценённая стоимость переходит в работы
          stages = [
            { name: 'Материал вспомогательный ПЗ', value: baseCost },
            { name: 'Материалы РОСТ', value: materialsGrowth, percent: tenderMarkup.materials_cost_growth },
            { name: 'Непредвиденные мат.', value: contingencyMaterials, percent: tenderMarkup.contingency_costs },
            { name: 'ООЗ мат', value: oozMat, percent: tenderMarkup.overhead_own_forces },
            { name: 'ОФЗ мат', value: ofzMat, percent: tenderMarkup.general_costs_without_subcontract },
            { name: 'Прибыль мат', value: profitMat, percent: tenderMarkup.profit_own_forces },
            { name: '→ Наценённая стоимость в работы', value: profitMat, highlight: 'work', isTotal: true },
            { name: '→ В материалах остается', value: 0, highlight: 'material' }
          ];
          itemMaterialsContribution = 0; // Ничего не остается в материалах
          itemWorksContribution = profitMat; // Вся стоимость переходит в работы
        } else {
          // Основной материал - база остается, наценка переходит в работы
          stages = [
            { name: 'Материал основной ПЗ (база)', value: baseCost },
            { name: 'Материалы РОСТ', value: materialsGrowth, percent: tenderMarkup.materials_cost_growth },
            { name: 'Непредвиденные мат.', value: contingencyMaterials, percent: tenderMarkup.contingency_costs },
            { name: 'ООЗ мат', value: oozMat, percent: tenderMarkup.overhead_own_forces },
            { name: 'ОФЗ мат', value: ofzMat, percent: tenderMarkup.general_costs_without_subcontract },
            { name: 'Прибыль мат', value: profitMat, percent: tenderMarkup.profit_own_forces },
            { name: '→ В материалах остается', value: baseCost, highlight: 'material' },
            { name: '→ В работы переходит', value: markup, highlight: 'work' }
          ];
          itemMaterialsContribution = baseCost; // Базовая стоимость остается в материалах
          itemWorksContribution = markup; // Наценка переходит в работы
        }
        
      } else if (item.item_type === 'sub_material') {
        // Определяем тип субматериала (основной или вспомогательный)
        const isAuxiliary = item.material_type === 'auxiliary';
        
        // Рассчитываем полную коммерческую стоимость субматериала
        const submatGrowth = baseCost * (1 + tenderMarkup.subcontract_works_cost_growth / 100);
        const submatOverhead = submatGrowth * (1 + tenderMarkup.overhead_subcontract / 100);
        const submatProfit = submatOverhead * (1 + tenderMarkup.profit_subcontract / 100);
        const markup = submatProfit - baseCost;

        if (isAuxiliary) {
          // Вспомогательный субматериал - наценённая стоимость переходит в субработы
          stages = [
            { name: 'Субматериал вспомогательный ПЗ', value: baseCost },
            { name: 'Субмат РОСТ', value: submatGrowth, percent: tenderMarkup.subcontract_works_cost_growth },
            { name: 'Субмат ООЗ', value: submatOverhead, percent: tenderMarkup.overhead_subcontract },
            { name: 'Субмат прибыль', value: submatProfit, percent: tenderMarkup.profit_subcontract },
            { name: '→ Наценённая стоимость в субработы', value: submatProfit, highlight: 'work', isTotal: true },
            { name: '→ В материалах остается', value: 0, highlight: 'material' }
          ];
          itemMaterialsContribution = 0; // Ничего не остается в материалах
          itemWorksContribution = submatProfit; // ВСЯ стоимость переходит в работы
        } else {
          // Основной субматериал - база остается, наценка переходит в субработы
          stages = [
            { name: 'Субматериал основной ПЗ (база)', value: baseCost },
            { name: 'Субмат РОСТ', value: submatGrowth, percent: tenderMarkup.subcontract_works_cost_growth },
            { name: 'Субмат ООЗ', value: submatOverhead, percent: tenderMarkup.overhead_subcontract },
            { name: 'Субмат прибыль', value: submatProfit, percent: tenderMarkup.profit_subcontract },
            { name: '→ В материалах остается', value: baseCost, highlight: 'material' },
            { name: '→ В субраб. переходит', value: markup, highlight: 'work' }
          ];
          itemMaterialsContribution = baseCost; // Базовая стоимость остается в материалах
          itemWorksContribution = markup; // Наценка переходит в работы
        }
      }

      breakdown.push({
        item: item.description || 'Без названия',
        type: item.item_type,
        baseCost,
        commercialCost,
        stages,
        worksContribution: itemWorksContribution,
        materialsContribution: itemMaterialsContribution
      });

      // Add to totals
      worksTotal += itemWorksContribution;
      materialsTotal += itemMaterialsContribution;
    });
    
    return {
      works: worksTotal,
      materials: materialsTotal,
      total: worksTotal + materialsTotal,
      breakdown
    };
  }, [position.boq_items, tenderMarkup, calculateCommercialCost]);
  
  
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

  // Sort BOQ items: works first, then their linked materials, then unlinked materials
  const sortedBOQItems = useMemo(() => {
    if (!localBOQItems || localBOQItems.length === 0) {
      return [];
    }

    // Debug for additional works
    if (position.is_additional) {
      console.log('🔄 Sorting BOQ items for ДОП работа:', {
        work_name: position.work_name,
        total_items: localBOQItems.length,
        works: localBOQItems.filter(i => i.item_type === 'work').length,
        materials: localBOQItems.filter(i => i.item_type === 'material').length,
        linked_materials: localBOQItems.filter(i => i.work_link).length
      });
    }
    
    const items = [...localBOQItems];
    const sortedItems: BOQItemWithLibrary[] = [];
    
    // Get all works and sub-works sorted by sub_number
    const works = items
      .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
      .sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));
    
    // Process each work/sub-work and its linked materials/sub-materials
    works.forEach(work => {
      // Add the work/sub-work
      sortedItems.push(work);
      
      // Find and add all materials/sub-materials linked to this work
      const linkedMaterials = items.filter(item => {
        if (item.item_type !== 'material' && item.item_type !== 'sub_material') {
          return false;
        }
        
        // Check if material/sub-material is linked to this work/sub-work
        if (work.item_type === 'work') {
          // Regular work - check work_boq_item_id
          return item.work_link?.work_boq_item_id === work.id;
        } else if (work.item_type === 'sub_work') {
          // Sub-work - check sub_work_boq_item_id
          return item.work_link?.sub_work_boq_item_id === work.id;
        }
        
        return false;
      }).sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));
      
      sortedItems.push(...linkedMaterials);
    });
    
    // Add unlinked materials and sub-materials at the end
    const unlinkedMaterials = items.filter(item => 
      (item.item_type === 'material' || item.item_type === 'sub_material') && 
      !item.work_link
    ).sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));
    
    sortedItems.push(...unlinkedMaterials);
    
    // Enable debug for ДОП работы
    if (position.is_additional) {
      console.log('✅ ДОП sorted items in ClientPositionCardStreamlined:', {
        work_name: position.work_name,
        total: sortedItems.length,
        works: works.length,
        linked: sortedItems.filter(i => (i.item_type === 'material' || i.item_type === 'sub_material') && i.work_link).length,
        unlinked: unlinkedMaterials.length,
        order: sortedItems.map((item, idx) => ({
          index: idx,
          id: item.id,
          type: item.item_type,
          desc: item.description,
          hasLink: !!item.work_link,
          linkedTo: item.work_link?.work_boq_item_id || item.work_link?.sub_work_boq_item_id
        }))
      });
    }
    
    return sortedItems;
  }, [localBOQItems]);

  // Delete BOQ item
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
        onUpdate(); // Обновляем родительский компонент
      }
    } catch (error) {
      console.error('💥 Manual volume update exception:', error);
      message.error('Ошибка сохранения количества ГП');
    }
  }, [position.id, onUpdate]);

  // Отключаем все MediaQueryList listeners для предотвращения infinite loops
  useEffect(() => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) => {
      const mql = originalMatchMedia.call(window, query);
      // Блокируем addEventListener для всех MediaQueryList объектов
      const originalAddListener = mql.addEventListener;
      mql.addEventListener = function(...args: any[]) {
        // Игнорируем все попытки добавить listeners
        return;
      };
      // Блокируем addListener для совместимости
      (mql as any).addListener = function() {
        return;
      };
      return mql;
    };
    
    return () => {
      window.matchMedia = originalMatchMedia;
    };
  }, []);

  // Load templates for autocomplete
  const loadTemplates = useCallback(async (searchValue: string) => {
    if (searchValue.length < 2) {
      setTemplateOptions([]);
      return;
    }

    setLoadingTemplates(true);
    try {
      console.log('🔍 Searching templates:', searchValue);
      const result = await workMaterialTemplatesApi.getTemplates();
      if (result.data) {
        const uniqueNames = [...new Set(result.data.map(t => t.template_name))]
          .filter(name => name.toLowerCase().includes(searchValue.toLowerCase()));
        setTemplateOptions(uniqueNames.map(name => ({
          value: name,
          label: name
        })));
        console.log('✅ Found templates:', uniqueNames.length);
      }
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      message.error('Ошибка загрузки шаблонов');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Handle template addition to position
  const handleTemplateAdd = useCallback(async () => {
    if (!selectedTemplateName) {
      message.warning('Выберите шаблон');
      return;
    }

    console.log('🚀 Adding template to position:', {
      templateName: selectedTemplateName,
      tenderId,
      positionId: position.id
    });

    setLoading(true);
    try {
      // Convert template to BOQ items with links
      const convertResult = await workMaterialTemplatesApi.convertTemplateToBOQItems(
        selectedTemplateName,
        tenderId,
        position.id // Pass client position ID for proper insertion
      );

      if (convertResult.error) {
        throw new Error(convertResult.error);
      }

      if (!convertResult.data) {
        throw new Error('Нет элементов для добавления');
      }

      // Insert items using bulk API
      const { boqBulkApi } = await import('../../lib/supabase/api/boq/bulk');
      const bulkResult = await boqBulkApi.bulkCreateInPosition(position.id, convertResult.data);

      if (bulkResult.error) {
        throw new Error(bulkResult.error);
      }

      message.success(`Шаблон "${selectedTemplateName}" добавлен (${bulkResult.data} элементов)`);

      // Reset form and close inline mode
      templateAddForm.resetFields();
      setSelectedTemplateName('');
      setTemplateAddMode(false);
      setTemplateOptions([]);

      // Refresh the position data
      onUpdate();
    } catch (error: any) {
      console.error('❌ Error adding template:', error);
      message.error(`Ошибка добавления шаблона: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedTemplateName, tenderId, position.id, templateAddForm, onUpdate]);

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
        onUpdate(); // Обновляем родительский компонент
      }
    } catch (error) {
      console.error('💥 Manual note update exception:', error);
      message.error('Ошибка сохранения примечания ГП');
    }
  }, [position.id, onUpdate]);

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
      const deletePromises = items.map(item => boqApi.delete(item.id));
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
  }, [position.id, position.boq_items, onUpdate]);


  // Handle currency change in quick add form
  const handleCurrencyChange = useCallback((currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => {
    console.log('💱 Currency changed:', currency);
    console.log('🔍 Tender data available:', { tender, hasTender: !!tender });
    setSelectedCurrency(currency);
    
    if (currency === 'RUB') {
      // When switching to RUB, enable unit_rate field
      quickAddForm.setFieldsValue({ 
        currency_type: 'RUB',
        currency_rate: 1
      });
    } else {
      // When switching to foreign currency
      let rate = 1;
      if (tender) {
        const fetchedRate = getCurrencyRate(currency, tender);
        console.log('📊 Currency rate from tender:', {
          currency,
          fetchedRate,
          fetchedRate_type: typeof fetchedRate,
          tender_rates: {
            usd: tender?.usd_rate,
            eur: tender?.eur_rate,
            cny: tender?.cny_rate
          }
        });
        
        if (!fetchedRate || fetchedRate === 0) {
          console.error('❌ No valid currency rate found for', currency);
          message.warning(`Курс ${currency} не установлен в тендере. Установите курс валюты в настройках тендера.`);
          // Reset to RUB if no rate available
          quickAddForm.setFieldsValue({ 
            currency_type: 'RUB'
          });
          return;
        }
        
        rate = fetchedRate;
      } else {
        console.log('⚠️ No tender data available, cannot convert currency');
        message.warning('Данные тендера еще не загружены. Подождите и попробуйте снова.');
        return;
      }
      
      quickAddForm.setFieldsValue({ 
        currency_type: currency,
        currency_rate: rate
      });
      
      // No need to recalculate unit_rate since it's entered directly in the currency
    }
  }, [quickAddForm, tender]);


  // Quick add new item
  const handleQuickAdd = useCallback(async (values: QuickAddRowData) => {
    console.log('🚀 Quick adding item:', values);
    console.log('📊 Form values:', {
      type: values.type,
      work_id: values.work_id,
      consumption: values.consumption_coefficient,
      conversion: values.conversion_coefficient,
      available_works: works.length,
      works: works.map(w => ({ id: w.id, desc: w.description }))
    });
    setLoading(true);
    try {
      // Get next item number
      const existingItems = position.boq_items || [];
      const positionNumber = position.position_number;
      const nextSubNumber = existingItems.length + 1;

      let finalQuantity = values.quantity;
      let baseQuantity = values.quantity; // Store user-entered base quantity
      
      // For unlinked materials and sub-materials, apply coefficients to user-entered quantity
      if ((values.type === 'material' || values.type === 'sub_material') && !values.work_id) {
        // Use the quantity entered by user and apply coefficients
        const consumptionCoef = values.consumption_coefficient || 1;
        // Note: conversion_coefficient is always 1 for unlinked materials (field is disabled in UI)
        finalQuantity = (values.quantity || 1) * consumptionCoef;
        baseQuantity = values.quantity || 1; // Store the base quantity before coefficients
        
        console.log('📊 Calculated unlinked material quantity:', {
          baseQuantity: baseQuantity,
          consumption: consumptionCoef,
          finalQuantity: finalQuantity
        });
      }
      
      // If it's a material/sub-material linked to work, calculate quantity based on work volume
      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id) {
        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          // Calculate material quantity: work_quantity * consumption * conversion
          const consumptionCoef = values.consumption_coefficient || 1;
          const conversionCoef = values.conversion_coefficient || 1;
          finalQuantity = work.quantity * consumptionCoef * conversionCoef;
          
          console.log('📊 Calculated material quantity for new item:', {
            workQuantity: work.quantity,
            consumption: consumptionCoef,
            conversion: conversionCoef,
            result: finalQuantity
          });
          
          // Check for numeric overflow (max value for numeric(12,4) is 99,999,999.9999)
          const MAX_NUMERIC_VALUE = 99999999.9999;
          if (finalQuantity > MAX_NUMERIC_VALUE) {
            console.error('⚠️ Calculated quantity exceeds database limits:', finalQuantity);
            message.error(`Ошибка: расчетное количество слишком большое (${finalQuantity.toLocaleString('ru-RU')}). Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}. Уменьшите коэффициенты.`);
            setLoading(false);
            return;
          }
        }
      }

      // Validate detail_cost_category_id before creating item
      let detailCostCategoryId = null;
      if (values.detail_cost_category_id && values.detail_cost_category_id !== '') {
        console.log('🔍 Validating quick add detail_cost_category_id:', values.detail_cost_category_id);
        
        // Import validation function
        const { getDetailCategoryDisplay } = await import('../../lib/supabase/api/construction-costs');
        
        const { data: categoryExists } = await getDetailCategoryDisplay(values.detail_cost_category_id);
        if (categoryExists) {
          detailCostCategoryId = values.detail_cost_category_id;
          console.log('✅ Quick add detail_cost_category_id validated:', detailCostCategoryId);
        } else {
          console.error('❌ Quick add detail_cost_category_id does not exist in database:', values.detail_cost_category_id);
          message.error('Выбранная категория затрат не найдена в базе данных');
          setLoading(false);
          return;
        }
      }

      // Calculate currency rate from tender
      let calculatedCurrencyRate = null;
      console.log('🔍 [handleQuickAdd] Tender check:', {
        tenderExists: !!tender,
        tenderValue: tender,
        currency_type: values.currency_type,
        unit_rate: values.unit_rate
      });
      
      // For foreign currency, we MUST have a valid exchange rate
      if (values.currency_type && values.currency_type !== 'RUB') {
        if (!tender) {
          console.error('❌ [handleQuickAdd] TENDER IS NULL! Cannot get currency rate');
          message.error('Ошибка: курсы валют еще не загружены. Подождите и попробуйте снова.');
          setLoading(false);
          return;
        }
        
        const rateFromTender = getCurrencyRate(values.currency_type, tender);
        
        console.log('🔍 [handleQuickAdd] getCurrencyRate result:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          tenderUsdRate: tender?.usd_rate,
          tenderEurRate: tender?.eur_rate,
          tenderCnyRate: tender?.cny_rate
        });
        
        if (!rateFromTender || rateFromTender === 0) {
          console.error('❌ [handleQuickAdd] No valid currency rate found for', values.currency_type);
          message.error(`Ошибка: курс ${values.currency_type} не установлен в тендере. Обратитесь к администратору.`);
          setLoading(false);
          return;
        }
        
        calculatedCurrencyRate = rateFromTender;
        console.log('💱 [handleQuickAdd] Currency rate calculation:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          calculatedRate: calculatedCurrencyRate,
          unitRate: values.unit_rate
        });
      }
      // For RUB, currency_rate should be NULL (not 1)

      const newItem: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        item_type: values.type,  // Use actual type directly
        description: values.description,  // Use description without prefix
        unit: values.unit,
        quantity: finalQuantity,  // Use calculated quantity
        unit_rate: values.unit_rate,
        item_number: `${positionNumber}.${nextSubNumber}`,
        sub_number: nextSubNumber,
        sort_order: nextSubNumber,
        // Add currency fields
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,
        // Add quote link and note fields
        quote_link: values.quote_link || null,
        note: values.note || null,
        // Add detail cost category if validated
        ...(detailCostCategoryId && { 
          detail_cost_category_id: detailCostCategoryId
        }),
        // Add base_quantity for unlinked materials
        ...((values.type === 'material' || values.type === 'sub_material') && !values.work_id && {
          base_quantity: baseQuantity
        }),
        // Add coefficients and delivery fields for materials and sub-materials
        ...((values.type === 'material' || values.type === 'sub_material') && {
          consumption_coefficient: values.consumption_coefficient || 1,
          conversion_coefficient: values.conversion_coefficient || 1,
          delivery_price_type: values.delivery_price_type || 'included',
          delivery_amount: values.delivery_amount || 0,
          material_type: values.material_type || 'main'
        })
      };

      const result = await boqApi.create(newItem);
      console.log('📦 BOQ create result:', result);
      console.log('📦 BOQ result.data:', result.data);
      console.log('📦 BOQ result.data type:', typeof result.data);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // If it's a material/sub-material and a work is selected, create link
      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id && result.data) {
        console.log('🔍 Attempting to create work-material link...');
        console.log('🔍 Material created with data:', result.data);
        console.log('🔍 Material ID:', result.data.id);
        console.log('🔍 Work selected with ID:', values.work_id);
        
        // Get the work item to check its type
        const workItem = works.find(w => w.id === values.work_id);
        const isSubWork = workItem?.item_type === 'sub_work';
        const isSubMaterial = values.type === 'sub_material';
        
        // Build link data based on types
        const linkData: any = {
          client_position_id: position.id,
          material_quantity_per_work: values.consumption_coefficient || 1,
          usage_coefficient: values.conversion_coefficient || 1
        };
        
        // Set appropriate fields based on types
        if (isSubWork && isSubMaterial) {
          linkData.sub_work_boq_item_id = values.work_id;
          linkData.sub_material_boq_item_id = result.data.id;
        } else if (isSubWork && !isSubMaterial) {
          linkData.sub_work_boq_item_id = values.work_id;
          linkData.material_boq_item_id = result.data.id;
        } else if (!isSubWork && isSubMaterial) {
          linkData.work_boq_item_id = values.work_id;
          linkData.sub_material_boq_item_id = result.data.id;
        } else {
          linkData.work_boq_item_id = values.work_id;
          linkData.material_boq_item_id = result.data.id;
        }
        
        console.log('🔗 Creating work-material link with data:', linkData);
        const linkResult = await workMaterialLinksApi.createLink(linkData);
        
        if (linkResult.error) {
          console.error('❌ Failed to create work-material link:', linkResult.error);
          console.error('❌ Error details:', linkResult);
          message.warning('Материал добавлен, но связь с работой не создана: ' + linkResult.error);
        } else {
          console.log('✅ Material linked to work successfully', linkResult);
          
          // Add link info to the result for immediate display
          if (linkResult.data) {
            result.data.work_link = {
              ...linkResult.data,
              material_quantity_per_work: values.consumption_coefficient || 1,
              usage_coefficient: values.conversion_coefficient || 1
            };
            console.log('📎 Link added to material:', result.data);
          }
        }
      } else {
        console.log('⚠️ Link not created:', {
          is_material: values.type === 'material',
          has_work_id: !!values.work_id,
          has_result_data: !!result.data
        });
      }

      console.log('✅ Item added successfully');
      
      // Show appropriate success message
      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id) {
        const linkedWork = works.find(w => w.id === values.work_id);
        const itemType = values.type === 'sub_material' ? 'Суб-материал' : 'Материал';
        message.success(`${itemType} добавлен и связан с работой: ${linkedWork?.description || values.work_id}`);
      } else {
        const typeNames = {
          'work': 'Работа',
          'material': 'Материал',
          'sub_work': 'Суб-работа',
          'sub_material': 'Суб-материал'
        };
        message.success(`${typeNames[values.type]} добавлен`);
      }
      
      // Update local works list if we just added a work or sub-work
      if ((values.type === 'work' || values.type === 'sub_work') && result.data) {
        const newWork: BOQItemWithLibrary = {
          ...result.data,
          item_type: 'work',
          library_item: undefined,
          work_link: undefined
        };
        setLocalWorks(prev => [...prev, newWork]);
        console.log('🔄 Added work to local list:', newWork.description);
      }
      
      // Force refresh of works list for any new item to ensure UI is up to date
      // This is needed because onUpdate is async and the parent might not update immediately
      setTimeout(() => {
        const currentWorks = position.boq_items?.filter(item => 
          item.item_type === 'work' || item.item_type === 'sub_work'
        ) || [];
        if ((values.type === 'work' || values.type === 'sub_work') && result.data) {
          // Ensure the new work is in the list
          const workExists = currentWorks.some(w => w.id === result.data.id);
          if (!workExists) {
            const newWork: BOQItemWithLibrary = {
              ...result.data,
              item_type: 'work',
              library_item: undefined,
              work_link: undefined
            };
            setLocalWorks([...currentWorks, newWork]);
          } else {
            setLocalWorks(currentWorks);
          }
        } else {
          setLocalWorks(currentWorks);
        }
        console.log('🔄 Force refreshed works list');
      }, 100);
      
      quickAddForm.resetFields();
      setQuickAddMode(false);
      setSelectedCurrency('RUB');
      onUpdate();
    } catch (error) {
      console.error('❌ Add item error:', error);
      message.error('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  }, [position, tenderId, works, quickAddForm, onUpdate, tender]);

  // Open material linking modal
  const handleLinkMaterials = useCallback((workId: string) => {
    console.log('🔗 Opening material linking for work:', workId);
    setSelectedWorkId(workId);
    setLinkingModalVisible(true);
  }, []);

  // Handle material linking
  const handleMaterialsLinked = useCallback(() => {
    console.log('✅ Materials linked successfully');
    setLinkingModalVisible(false);
    setSelectedWorkId(null);
    onUpdate();
  }, [onUpdate]);


  // Start editing material inline
  const handleEditMaterial = useCallback((item: BOQItemWithLibrary) => {
    console.log('✏️ Starting inline edit for material:', item.id);
    console.log('🔍 Material data:', item);
    console.log('🔗 Work link data:', item.work_link);
    
    // Force refresh works list before editing to ensure we have the latest data
    const currentWorks = position.boq_items?.filter(boqItem => 
      boqItem.item_type === 'work' || boqItem.item_type === 'sub_work'
    ) || [];
    if (currentWorks.length !== localWorks.length) {
      console.log('🔄 Updating works list before edit:', currentWorks.length, 'works');
      setLocalWorks(currentWorks);
    }
    
    setEditingMaterialId(item.id);
    
    // Get work_link information if exists
    const workLink = item.work_link;
    
    // Debug for ДОП работы
    if (position.is_additional) {
      console.log('🔍 ДОП: Editing material:', {
        material: item.description,
        material_type: item.item_type,
        has_work_link: !!workLink,
        work_link: workLink,
        work_boq_item_id: workLink?.work_boq_item_id,
        sub_work_boq_item_id: workLink?.sub_work_boq_item_id,
        available_works: position.boq_items?.filter(i => i.item_type === 'work' || i.item_type === 'sub_work').map(w => ({ 
          id: w.id, 
          type: w.item_type,
          desc: w.description 
        })),
        localWorks: localWorks.map(w => ({
          id: w.id,
          type: w.item_type,
          desc: w.description
        }))
      });
    }
    
    const linkedWork = workLink ? position.boq_items?.find(boqItem => {
      // Check if this item is linked via work_boq_item_id (for regular work) 
      // or sub_work_boq_item_id (for sub_work)
      if (workLink.work_boq_item_id && boqItem.id === workLink.work_boq_item_id && boqItem.item_type === 'work') {
        if (position.is_additional) {
          console.log('✅ ДОП: Found linked work:', boqItem.description);
        }
        return true;
      }
      if (workLink.sub_work_boq_item_id && boqItem.id === workLink.sub_work_boq_item_id && boqItem.item_type === 'sub_work') {
        if (position.is_additional) {
          console.log('✅ ДОП: Found linked sub_work:', boqItem.description);
        }
        return true;
      }
      return false;
    }) : undefined;
    
    // More debug for ДОП if not found
    if (position.is_additional && workLink && !linkedWork) {
      console.error('❌ ДОП: Linked work not found for material:', {
        material: item.description,
        searching_for_work_id: workLink.work_boq_item_id,
        searching_for_sub_work_id: workLink.sub_work_boq_item_id,
        available_items: position.boq_items?.map(i => ({
          id: i.id,
          type: i.item_type,
          desc: i.description
        }))
      });
    }
    
    // Get coefficients from BOQ item itself (primary source)
    // Fall back to work_link values if BOQ item doesn't have them
    const consumptionCoef = item.consumption_coefficient || 
                           workLink?.material_quantity_per_work || 1;
    const conversionCoef = item.conversion_coefficient || 
                          workLink?.usage_coefficient || 1;
    
    console.log('📦 Setting form values:', {
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      work_id: linkedWork?.id || undefined,
      consumption_coefficient: consumptionCoef,
      conversion_coefficient: conversionCoef,
      source: {
        boq_consumption: item.consumption_coefficient,
        boq_conversion: item.conversion_coefficient,
        link_consumption: workLink?.material_quantity_per_work,
        link_conversion: workLink?.usage_coefficient
      }
    });
    
    // For unlinked materials, show base_quantity if available, otherwise use quantity
    const displayQuantity = (!linkedWork && item.base_quantity !== null && item.base_quantity !== undefined) 
      ? item.base_quantity 
      : item.quantity;
    
    console.log('📝 Setting edit form values:', {
      isLinked: !!linkedWork,
      baseQuantity: item.base_quantity,
      quantity: item.quantity,
      displayQuantity: displayQuantity
    });
    
    // Calculate correct currency rate from tender
    let correctCurrencyRate = 1;
    if (item.currency_type && item.currency_type !== 'RUB' && tender) {
      const rateFromTender = getCurrencyRate(item.currency_type, tender);
      correctCurrencyRate = rateFromTender || 1;
      console.log('💱 [handleEditMaterial] Setting correct currency rate:', {
        itemRate: item.currency_rate,
        tenderRate: correctCurrencyRate,
        currency: item.currency_type
      });
    }
    
    editForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: displayQuantity,
      unit_rate: item.unit_rate,
      work_id: linkedWork?.id || undefined,
      consumption_coefficient: consumptionCoef,
      conversion_coefficient: conversionCoef,
      detail_cost_category_id: item.detail_cost_category_id || null,
      delivery_price_type: item.delivery_price_type || 'included',
      delivery_amount: item.delivery_amount || 0,
      item_type: item.item_type,
      material_type: item.material_type || 'main',  // Add material type field
      currency_type: item.currency_type || 'RUB',
      currency_rate: correctCurrencyRate,
      quote_link: item.quote_link || '',
      note: item.note || ''
    });
  }, [editForm, position.boq_items, localWorks, tender]);

  // Save inline edited material
  const handleSaveInlineEdit = useCallback(async (values: any) => {
    if (!editingMaterialId) return;
    
    // Get the item being edited to check its type
    const editingItem = position.boq_items?.find(item => item.id === editingMaterialId);
    if (!editingItem) {
      console.error('❌ Could not find item being edited');
      return;
    }
    
    console.log('💾 Saving inline material edits:', values);
    console.log('🔍 Item type being edited:', editingItem.item_type);
    console.log('🔍 Coefficients to save:', {
      consumption: values.consumption_coefficient,
      conversion: values.conversion_coefficient,
      work_id: values.work_id,
      raw_values: values
    });
    setLoading(true);
    try {
      let finalQuantity = values.quantity;
      
      // If linking to work, calculate quantity based on work volume
      if (values.work_id) {
        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          // Calculate material quantity: work_quantity * consumption * conversion
          const consumptionCoef = values.consumption_coefficient || 1;
          const conversionCoef = values.conversion_coefficient || 1;
          finalQuantity = work.quantity * consumptionCoef * conversionCoef;
          
          console.log('📊 Calculated material quantity:', {
            workQuantity: work.quantity,
            consumption: consumptionCoef,
            conversion: conversionCoef,
            result: finalQuantity
          });
          
          // Check for numeric overflow
          const MAX_NUMERIC_VALUE = 99999999.9999;
          if (finalQuantity > MAX_NUMERIC_VALUE) {
            console.error('⚠️ Calculated quantity exceeds database limits:', finalQuantity);
            message.error(`Ошибка: расчетное количество слишком большое (${finalQuantity.toLocaleString('ru-RU')}). Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}. Уменьшите коэффициенты.`);
            setLoading(false);
            return;
          }
        }
      } else {
        // For unlinked materials and sub-materials, check if recalculation is needed
        if (editingItem.item_type === 'material' || editingItem.item_type === 'sub_material') {
          const consumptionCoef = values.consumption_coefficient || 1;
          // Note: conversion_coefficient is always 1 for unlinked materials (field is disabled)
          
          // Check if values actually changed
          const baseQuantityChanged = values.quantity !== editingItem.base_quantity;
          const consumptionChanged = consumptionCoef !== (editingItem.consumption_coefficient || 1);
          
          console.log('🔍 Checking for changes:', {
            baseQuantityChanged,
            consumptionChanged,
            newBase: values.quantity,
            oldBase: editingItem.base_quantity,
            newConsumption: consumptionCoef,
            oldConsumption: editingItem.consumption_coefficient
          });
          
          if (baseQuantityChanged || consumptionChanged) {
            // Recalculate only if something changed
            finalQuantity = (values.quantity || 1) * consumptionCoef;
            
            console.log('📊 Recalculated unlinked material quantity:', {
              baseQuantity: values.quantity,
              consumption: consumptionCoef,
              finalQuantity: finalQuantity
            });
          } else {
            // Keep existing calculated quantity
            finalQuantity = editingItem.quantity;
            console.log('📊 No changes detected, keeping existing quantity:', finalQuantity);
          }
          
          // Check for numeric overflow
          const MAX_NUMERIC_VALUE = 99999999.9999;
          if (finalQuantity > MAX_NUMERIC_VALUE) {
            console.error('⚠️ Calculated quantity exceeds database limits:', finalQuantity);
            message.error(`Ошибка: расчетное количество слишком большое (${finalQuantity.toLocaleString('ru-RU')}). Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}. Уменьшите коэффициенты.`);
            setLoading(false);
            return;
          }
        }
      }
      
      // Validate detail_cost_category_id before updating
      let detailCostCategoryId = null;
      if (values.detail_cost_category_id && values.detail_cost_category_id !== '') {
        console.log('🔍 Validating material detail_cost_category_id:', values.detail_cost_category_id);
        
        // Import validation function
        const { getDetailCategoryDisplay } = await import('../../lib/supabase/api/construction-costs');
        
        const { data: categoryExists } = await getDetailCategoryDisplay(values.detail_cost_category_id);
        if (categoryExists) {
          detailCostCategoryId = values.detail_cost_category_id;
          console.log('✅ Material detail_cost_category_id validated:', detailCostCategoryId);
        } else {
          console.error('❌ Material detail_cost_category_id does not exist in database:', values.detail_cost_category_id);
          message.error('Выбранная категория затрат не найдена в базе данных');
          setLoading(false);
          return;
        }
      }
      
      // Calculate currency rate from tender
      let calculatedCurrencyRate = null;
      
      // For foreign currency, we MUST have a valid exchange rate
      if (values.currency_type && values.currency_type !== 'RUB') {
        if (!tender) {
          console.error('❌ [handleSaveInlineEdit] TENDER IS NULL! Cannot get currency rate');
          message.error('Ошибка: курсы валют еще не загружены. Подождите и попробуйте снова.');
          setLoading(false);
          return;
        }
        
        const rateFromTender = getCurrencyRate(values.currency_type, tender);
        
        console.log('🔍 [handleSaveInlineEdit] getCurrencyRate result:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          tenderUsdRate: tender?.usd_rate,
          tenderEurRate: tender?.eur_rate,
          tenderCnyRate: tender?.cny_rate
        });
        
        if (!rateFromTender || rateFromTender === 0) {
          console.error('❌ [handleSaveInlineEdit] No valid currency rate found for', values.currency_type);
          message.error(`Ошибка: курс ${values.currency_type} не установлен в тендере. Обратитесь к администратору.`);
          setLoading(false);
          return;
        }
        
        calculatedCurrencyRate = rateFromTender;
        console.log('💱 [handleSaveInlineEdit] Currency rate calculation:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          calculatedRate: calculatedCurrencyRate
        });
      }
      // For RUB, currency_rate should be NULL (not 1)

      // Update the material itself INCLUDING coefficients and delivery fields
      // IMPORTANT: Don't use values.currency_rate, always calculate from tender
      // Remove currency_rate from values to avoid any conflicts
      const { currency_rate: ignoredRate, ...cleanValues } = values;
      
      const updateData: any = {
        description: cleanValues.description,
        unit: cleanValues.unit,
        quantity: finalQuantity,  // Use calculated quantity
        unit_rate: cleanValues.unit_rate,
        consumption_coefficient: cleanValues.consumption_coefficient || 1,
        conversion_coefficient: cleanValues.conversion_coefficient || 1,
        detail_cost_category_id: detailCostCategoryId,
        delivery_price_type: cleanValues.delivery_price_type || 'included',
        delivery_amount: cleanValues.delivery_amount || 0,
        item_type: cleanValues.item_type || editingItem.item_type,
        material_type: cleanValues.material_type || 'main',  // Add material type field
        currency_type: cleanValues.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,  // Always use calculated rate, never from form
        quote_link: cleanValues.quote_link || null,
        note: cleanValues.note || null
      };
      
      // Add base_quantity for unlinked materials
      if (!values.work_id && (editingItem.item_type === 'material' || editingItem.item_type === 'sub_material')) {
        updateData.base_quantity = values.quantity; // Store the user-entered base value
      }
      
      console.log('📡 Calling boqApi.update for material with data:', {
        materialId: editingMaterialId, 
        updateData,
        dataKeys: Object.keys(updateData)
      });
      
      const result = await boqApi.update(editingMaterialId, updateData);
      
      console.log('📦 Material update API result:', { 
        error: result.error, 
        data: result.data,
        dataId: result.data?.id
      });
      
      if (result.error) {
        console.error('❌ Material update failed with error:', result.error);
        throw new Error(result.error);
      }
      
      console.log('✅ Material BOQ item updated in database successfully');
      
      // Handle work linking if changed - get links for this position
      const positionLinks = await workMaterialLinksApi.getLinksByPosition(position.id);
      const existingLink = !positionLinks.error && positionLinks.data?.find(
        link => link.material_boq_item_id === editingMaterialId || 
                link.sub_material_boq_item_id === editingMaterialId
      );
      const hasExistingLink = !!existingLink;
      const existingWorkId = existingLink?.work_boq_item_id || existingLink?.sub_work_boq_item_id || null;
      
      console.log('🔗 Existing link info:', {
        materialId: editingMaterialId,
        materialType: editingItem.item_type,
        hasLink: hasExistingLink,
        existingLink: existingLink ? {
          id: existingLink.id,
          work_boq_item_id: existingLink.work_boq_item_id,
          sub_work_boq_item_id: existingLink.sub_work_boq_item_id,
          material_boq_item_id: existingLink.material_boq_item_id,
          sub_material_boq_item_id: existingLink.sub_material_boq_item_id
        } : null,
        existingWorkId,
        newWorkId: values.work_id,
        needsUpdate: values.work_id !== existingWorkId
      });
      
      // Check if we need to update, create, or delete link
      // Note: values.work_id может быть undefined, null или пустой строкой при отвязке
      // Важно: нужно правильно обработать все варианты "пустых" значений
      const newWorkId = values.work_id && values.work_id !== '' ? values.work_id : null;
      
      console.log('🔍 Comparing work IDs:', {
        rawWorkId: values.work_id,
        newWorkId,
        existingWorkId,
        needsChange: newWorkId !== existingWorkId,
        isUnlinking: !newWorkId && existingWorkId,
        isLinking: newWorkId && !existingWorkId,
        isChanging: newWorkId && existingWorkId && newWorkId !== existingWorkId
      });
      
      // Важно: сравниваем с учетом того, что оба значения могут быть null
      const workIdChanged = (newWorkId || null) !== (existingWorkId || null);
      
      if (workIdChanged) {
        console.log('🔄 Work ID has changed, processing link update:', {
          scenario: !newWorkId && existingWorkId ? 'UNLINKING' : 
                    newWorkId && !existingWorkId ? 'LINKING' : 
                    'CHANGING',
          from: existingWorkId,
          to: newWorkId
        });
        
        // Remove old link if exists
        if (hasExistingLink && existingLink?.id) {
          console.log('🗑️ Removing old link:', {
            linkId: existingLink.id,
            oldWorkId: existingWorkId,
            materialId: editingMaterialId,
            materialType: editingItem.item_type,
            reason: !newWorkId ? 'User cleared work selection (unlinking)' : 'Changing to different work'
          });
          const deleteResult = await workMaterialLinksApi.deleteLink(existingLink.id);
          if (deleteResult.error) {
            console.error('❌ Failed to delete old link:', deleteResult.error);
            throw new Error(`Failed to delete old link: ${deleteResult.error}`);
          }
          console.log('✅ Removed old link successfully');
        }
        
        // Create new link if work_id is provided
        if (newWorkId) {
          // Get the work item to check its type
          const workItem = works.find(w => w.id === values.work_id);
          const isSubWork = workItem?.item_type === 'sub_work';
          const isSubMaterial = editingItem.item_type === 'sub_material';
          
          console.log('🔍 Link type detection:', {
            workId: values.work_id,
            workType: workItem?.item_type,
            isSubWork,
            materialId: editingMaterialId,
            materialType: editingItem.item_type,
            isSubMaterial
          });
          
          // Build link data based on types
          const linkData: any = {
            client_position_id: position.id,
            material_quantity_per_work: values.consumption_coefficient || 1,
            usage_coefficient: values.conversion_coefficient || 1
          };
          
          // Set appropriate fields based on types
          if (isSubWork && isSubMaterial) {
            // Both are sub-types
            console.log('📎 Linking sub_work to sub_material');
            linkData.sub_work_boq_item_id = values.work_id;
            linkData.sub_material_boq_item_id = editingMaterialId;
          } else if (isSubWork && !isSubMaterial) {
            // Sub-work with regular material
            console.log('📎 Linking sub_work to material');
            linkData.sub_work_boq_item_id = values.work_id;
            linkData.material_boq_item_id = editingMaterialId;
          } else if (!isSubWork && isSubMaterial) {
            // Regular work with sub-material
            console.log('📎 Linking work to sub_material');
            linkData.work_boq_item_id = values.work_id;
            linkData.sub_material_boq_item_id = editingMaterialId;
          } else {
            // Both are regular types
            console.log('📎 Linking work to material');
            linkData.work_boq_item_id = values.work_id;
            linkData.material_boq_item_id = editingMaterialId;
          }
          
          console.log('🔗 Creating new link with data:', linkData);
          const linkResult = await workMaterialLinksApi.createLink(linkData);
          
          if (linkResult.error) {
            console.error('❌ Failed to create link:', linkResult.error);
            throw new Error(`Failed to create link: ${linkResult.error}`);
          }
          
          console.log('✅ Material linked to work successfully:', {
            linkId: linkResult.data?.id,
            workId: values.work_id,
            materialId: editingMaterialId
          });
        } else {
          console.log('✅ Material unlinked from work (no new work_id provided)');
        }
      } else if (newWorkId && hasExistingLink && existingLink) {
        // Update existing link with new coefficients ALWAYS
        const oldConsumption = existingLink.material_quantity_per_work || 1;
        const oldConversion = existingLink.usage_coefficient || 1;
        const newConsumption = values.consumption_coefficient || 1;
        const newConversion = values.conversion_coefficient || 1;
        
        console.log('🔍 Comparing coefficients:', {
          existing: {
            consumption: oldConsumption,
            conversion: oldConversion
          },
          new: {
            consumption: newConsumption,
            conversion: newConversion
          },
          changed: oldConsumption !== newConsumption || oldConversion !== newConversion
        });
        
        // Update coefficients in BOQ item (not in link)
        console.log('📊 Updating BOQ item coefficients with:', {
          materialId: editingMaterialId,
          consumption_coefficient: newConsumption,
          conversion_coefficient: newConversion
        });
        
        const coeffUpdateResult = await boqApi.update(editingMaterialId, {
          consumption_coefficient: newConsumption,
          conversion_coefficient: newConversion
        });
        
        if (coeffUpdateResult.error) {
          console.error('❌ Failed to update coefficients:', coeffUpdateResult.error);
          throw new Error(coeffUpdateResult.error);
        }
        
        console.log('✅ BOQ item coefficients updated successfully:', coeffUpdateResult.data);
        
        // Also update link to keep consistency (if the link table has these columns)
        await workMaterialLinksApi.updateLink(existingLink.id, {
          material_quantity_per_work: newConsumption,
          usage_coefficient: newConversion
        });
        
        // Also update quantity if it depends on work
        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          const calculatedQuantity = work.quantity * newConsumption * newConversion;
          
          // Update BOQ item quantity too
          const quantityUpdateResult = await boqApi.update(editingMaterialId, {
            quantity: calculatedQuantity
          });
          
          if (quantityUpdateResult.error) {
            console.error('❌ Failed to update quantity:', quantityUpdateResult.error);
          } else {
            console.log('📏 Updated material quantity based on coefficients:', calculatedQuantity);
          }
        }
      } else {
        console.log('📊 No work link change detected, keeping existing link state:', {
          hasLink: hasExistingLink,
          workId: existingWorkId
        });
      }

      // Final verification of link state
      const finalLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
      const finalLink = !finalLinksResult.error && finalLinksResult.data?.find(
        link => link.material_boq_item_id === editingMaterialId || 
                link.sub_material_boq_item_id === editingMaterialId
      );
      
      console.log('🎯 Final link state after all operations:', {
        materialId: editingMaterialId,
        hasLink: !!finalLink,
        linkDetails: finalLink ? {
          id: finalLink.id,
          work_boq_item_id: finalLink.work_boq_item_id,
          sub_work_boq_item_id: finalLink.sub_work_boq_item_id
        } : null,
        expectedState: !newWorkId ? 'Should be unlinked' : `Should be linked to ${newWorkId}`
      });

      // Update linked works in the background when material changes affect them
      setTimeout(async () => {
        try {
          console.log('🔄 Background: Checking for linked works affected by material:', editingMaterialId);
          const positionLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          if (!positionLinksResult.error && positionLinksResult.data) {
            const linkedWorks = positionLinksResult.data.filter(link => {
              return (link.material_boq_item_id === editingMaterialId) ||
                     (link.sub_material_boq_item_id === editingMaterialId);
            });

            // Note: For materials, we typically don't need to update work totals
            // but we could add logic here if needed for specific business rules
            if (linkedWorks.length > 0) {
              console.log('✅ Background: Found', linkedWorks.length, 'linked works for updated material');
              // Add any work update logic here if needed in the future
            }
          }
        } catch (error) {
          console.error('❌ Background: Error checking linked works:', error);
        }
      }, 100); // Small delay to let the UI update first
      
      console.log('✅ Material updated successfully');
      
      // Update local data with the fresh data from API
      if (result.data) {
        const updatedItem = result.data;
        const itemIndex = localBOQItems.findIndex((item: any) => item.id === editingMaterialId);
        if (itemIndex !== -1) {
          // Create a new array with updated item to trigger re-render
          const updatedItems = [...localBOQItems];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updatedItem };
          setLocalBOQItems(updatedItems);
          console.log('📝 Updated local item data:', updatedItems[itemIndex]);
        }
      }
      
      message.success('Материал обновлен и коэффициенты сохранены');
      setEditingMaterialId(null);
      editForm.resetFields();
      setRefreshKey(prev => prev + 1); // Force refresh
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления материала');
    } finally {
      setLoading(false);
    }
  }, [editingMaterialId, position.id, works, editForm, onUpdate, tender]);

  // Cancel inline edit
  const handleCancelInlineEdit = useCallback(() => {
    console.log('❌ Cancelling inline edit');
    setEditingMaterialId(null);
    editForm.resetFields();
  }, [editForm]);

  // Start editing work inline
  const handleEditWork = useCallback((item: BOQItemWithLibrary) => {
    console.log('✏️ Starting inline edit for work:', item.id);
    console.log('🎯 Work detail_cost_category_id:', item.detail_cost_category_id);
    
    // Calculate correct currency rate from tender
    let correctCurrencyRate = 1;
    if (item.currency_type && item.currency_type !== 'RUB' && tender) {
      const rateFromTender = getCurrencyRate(item.currency_type, tender);
      correctCurrencyRate = rateFromTender || 1;
      console.log('💱 [handleEditWork] Setting correct currency rate:', {
        itemRate: item.currency_rate,
        tenderRate: correctCurrencyRate,
        currency: item.currency_type
      });
    }
    
    setEditingWorkId(item.id);
    workEditForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      detail_cost_category_id: item.detail_cost_category_id || null,
      item_type: item.item_type,
      currency_type: item.currency_type || 'RUB',
      currency_rate: correctCurrencyRate,
      quote_link: item.quote_link || '',
      note: item.note || ''
    });
  }, [workEditForm, tender]);

  // Save inline edited work
  const handleSaveWorkEdit = useCallback(async (values: any) => {
    if (!editingWorkId) return;
    
    console.log('💾 Saving work edits:', values);
    console.log('🔍 Validating detail_cost_category_id:', values.detail_cost_category_id);
    setLoading(true);
    try {
      // Find current work item
      const currentWorkItem = position.boq_items?.find(item => item.id === editingWorkId);
      if (!currentWorkItem) {
        console.error('❌ Current work item not found:', editingWorkId);
        message.error('Редактируемая работа не найдена');
        return;
      }

      const oldItemType = currentWorkItem.item_type;
      const newItemType = values.item_type;
      console.log('🔄 Type change check:', { oldItemType, newItemType });

      let detailCostCategoryId = null;
      
      // Validate detail_cost_category_id if provided
      if (values.detail_cost_category_id && values.detail_cost_category_id !== '') {
        // Import validation function
        const { getDetailCategoryDisplay } = await import('../../lib/supabase/api/construction-costs');
        
        const { data: categoryExists } = await getDetailCategoryDisplay(values.detail_cost_category_id);
        if (categoryExists) {
          detailCostCategoryId = values.detail_cost_category_id;
          console.log('✅ detail_cost_category_id validated:', detailCostCategoryId);
        } else {
          console.error('❌ detail_cost_category_id does not exist in database:', values.detail_cost_category_id);
          message.error('Выбранная категория затрат не найдена в базе данных');
          return;
        }
      }
      
      // Calculate currency rate from tender
      let calculatedCurrencyRate = null;
      console.log('🔍 [handleSaveWorkEdit] Tender check:', {
        tenderExists: !!tender,
        tenderValue: tender,
        tender_raw: JSON.stringify(tender),
        tender_usd_rate: tender?.usd_rate,
        tender_eur_rate: tender?.eur_rate,
        tender_cny_rate: tender?.cny_rate,
        currency_type: values.currency_type,
        unit_rate: values.unit_rate
      });
      
      // For foreign currency, we MUST have a valid exchange rate
      if (values.currency_type && values.currency_type !== 'RUB') {
        if (!tender) {
          console.error('❌ [handleSaveWorkEdit] TENDER IS NULL! Cannot get currency rate');
          message.error('Ошибка: курсы валют еще не загружены. Подождите и попробуйте снова.');
          setLoading(false);
          return;
        }
        
        const rateFromTender = getCurrencyRate(values.currency_type, tender);
        
        console.log('🔍 [handleSaveWorkEdit] getCurrencyRate result:', {
          currency: values.currency_type,
          tender,
          tender_raw: JSON.stringify(tender),
          rateFromTender,
          rateFromTender_type: typeof rateFromTender,
          tenderUsdRate: tender?.usd_rate,
          tenderEurRate: tender?.eur_rate,
          tenderCnyRate: tender?.cny_rate
        });
        
        if (!rateFromTender || rateFromTender === 0) {
          console.error('❌ [handleSaveWorkEdit] No valid currency rate found for', values.currency_type);
          message.error(`Ошибка: курс ${values.currency_type} не установлен в тендере. Обратитесь к администратору.`);
          setLoading(false);
          return;
        }
        
        calculatedCurrencyRate = rateFromTender;
        console.log('💱 [handleSaveWorkEdit] Currency rate calculation:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          calculatedRate: calculatedCurrencyRate,
          unitRate: values.unit_rate
        });
      }
      // For RUB, currency_rate should be NULL (not 1)

      // IMPORTANT: Don't use values.currency_rate, always calculate from tender
      // Remove currency_rate from values to avoid overwriting
      const { currency_rate: ignoredRate, ...cleanValues } = values;
      
      const updateData = {
        ...cleanValues,
        detail_cost_category_id: detailCostCategoryId,
        item_type: values.item_type || currentWorkItem.item_type,
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,  // Always use calculated rate, never from form
        quote_link: values.quote_link || null,
        note: values.note || null
      };
      
      console.log('💾 Final update data:', {
        ...updateData,
        valuesRate: values.currency_rate,
        calculatedRate: calculatedCurrencyRate,
        willSaveRate: updateData.currency_rate
      });
      const result = await boqApi.update(editingWorkId, updateData);
      if (result.error) {
        throw new Error(result.error);
      }

      // If work type changed, update all linked materials
      if (oldItemType !== newItemType) {
        console.log('🔗 Work type changed, updating linked materials');
        
        // Get all links for this position
        const positionLinks = await workMaterialLinksApi.getLinksByPosition(position.id);
        if (!positionLinks.error && positionLinks.data) {
          // Find links associated with this work
          const workLinks = positionLinks.data.filter(link => {
            if (oldItemType === 'work') {
              return link.work_boq_item_id === editingWorkId;
            } else if (oldItemType === 'sub_work') {
              return link.sub_work_boq_item_id === editingWorkId;
            }
            return false;
          });

          console.log('🔍 Found links to update:', workLinks.length);

          // Update each link
          for (const link of workLinks) {
            const newLinkData: any = {
              client_position_id: link.client_position_id,
              material_quantity_per_work: link.material_quantity_per_work,
              usage_coefficient: link.usage_coefficient
            };

            // Set the correct work field based on new type and material type
            const materialId = link.material_boq_item_id || link.sub_material_boq_item_id;
            const isMaterialSub = !!link.sub_material_boq_item_id;

            if (newItemType === 'work') {
              // Regular work
              newLinkData.work_boq_item_id = editingWorkId;
              if (isMaterialSub) {
                newLinkData.sub_material_boq_item_id = materialId;
              } else {
                newLinkData.material_boq_item_id = materialId;
              }
            } else if (newItemType === 'sub_work') {
              // Sub-work  
              newLinkData.sub_work_boq_item_id = editingWorkId;
              if (isMaterialSub) {
                newLinkData.sub_material_boq_item_id = materialId;
              } else {
                newLinkData.material_boq_item_id = materialId;
              }
            }

            console.log('🔄 Updating link:', { oldLink: link, newLinkData });

            // Delete old link and create new one
            await workMaterialLinksApi.deleteLink(link.id);
            await workMaterialLinksApi.createLink(newLinkData);
          }

          console.log('✅ Updated all material links for type change');
        }
      }

      // Update linked materials in the background using setTimeout to avoid blocking UI
      setTimeout(async () => {
        try {
          console.log('🔄 Background: Updating linked materials for work:', editingWorkId);
          const positionLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          if (!positionLinksResult.error && positionLinksResult.data) {
            const linkedMaterials = positionLinksResult.data.filter(link => {
              return (link.work_boq_item_id === editingWorkId) ||
                     (link.sub_work_boq_item_id === editingWorkId);
            });

            for (const link of linkedMaterials) {
              const materialId = link.material_boq_item_id || link.sub_material_boq_item_id;
              if (!materialId) continue;

              const material = position.boq_items?.find(item => item.id === materialId);
              if (!material) continue;

              const workQuantity = values.quantity || 0;
              const consumptionCoef = material.consumption_coefficient || 
                                     link.material_quantity_per_work || 1;
              const conversionCoef = material.conversion_coefficient || 
                                    link.usage_coefficient || 1;
              const newQuantity = workQuantity * consumptionCoef * conversionCoef;

              const unitRate = material.unit_rate || 0;
              let newTotalAmount = newQuantity * unitRate;

              if (material.delivery_price_type === 'amount' && material.delivery_amount > 0) {
                newTotalAmount += (material.delivery_amount * newQuantity);
              } else if (material.delivery_price_type === 'not_included' && material.delivery_amount > 0) {
                newTotalAmount += (material.delivery_amount * newQuantity);
              }

              await boqApi.update(materialId, {
                quantity: newQuantity,
                total_amount: newTotalAmount
              });
            }

            if (linkedMaterials.length > 0) {
              console.log('✅ Background: Updated', linkedMaterials.length, 'linked materials');
            }
          }
        } catch (error) {
          console.error('❌ Background: Error updating linked materials:', error);
        }
      }, 100); // Small delay to let the UI update first
      
      console.log('✅ Work updated successfully');
      
      // Update local data with the fresh data from API
      if (result.data) {
        const updatedItem = result.data;
        const itemIndex = localBOQItems.findIndex((item: any) => item.id === editingWorkId);
        if (itemIndex !== -1) {
          // Create a new array with updated item to trigger re-render
          const updatedItems = [...localBOQItems];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updatedItem };
          setLocalBOQItems(updatedItems);
          console.log('📝 Updated local work data:', updatedItems[itemIndex]);
        }
      }
      
      message.success('Работа обновлена');
      setEditingWorkId(null);
      workEditForm.resetFields();
      setRefreshKey(prev => prev + 1); // Force refresh
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления работы');
    } finally {
      setLoading(false);
    }
  }, [editingWorkId, workEditForm, onUpdate, position.boq_items, position.id, tender]);

  // Cancel work inline edit
  const handleCancelWorkEdit = useCallback(() => {
    console.log('❌ Cancelling work edit');
    setEditingWorkId(null);
    workEditForm.resetFields();
  }, [workEditForm]);

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
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 50,
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
      width: 200,
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

  // Handle work selection change in edit form
  const handleWorkSelectionChange = useCallback((workId: string) => {
    if (!workId) return;
    
    const work = works.find(w => w.id === workId);
    if (work && work.quantity) {
      const consumptionCoef = editForm.getFieldValue('consumption_coefficient') || 1;
      const conversionCoef = editForm.getFieldValue('conversion_coefficient') || 1;
      const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
      
      editForm.setFieldsValue({ quantity: calculatedQuantity });
      console.log('📊 Updated quantity based on work selection:', calculatedQuantity);
    }
  }, [works, editForm]);

  // Handle coefficient change in edit form
  const handleCoefficientChange = useCallback(() => {
    const workId = editForm.getFieldValue('work_id');
    if (!workId) return;
    
    const work = works.find(w => w.id === workId);
    if (work && work.quantity) {
      const consumptionCoef = editForm.getFieldValue('consumption_coefficient') || 1;
      const conversionCoef = editForm.getFieldValue('conversion_coefficient') || 1;
      const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
      
      editForm.setFieldsValue({ quantity: calculatedQuantity });
      console.log('📊 Updated quantity based on coefficient change:', calculatedQuantity);
    }
  }, [works, editForm]);

  // Work Edit Row (inline editing) - With column headers
  const WorkEditRow = ({ item }: { item: BOQItemWithLibrary }) => {
    // Watch form fields for dynamic calculation
    const quantity = Form.useWatch('quantity', workEditForm) || 0;
    const unitRate = Form.useWatch('unit_rate', workEditForm) || 0;
    const itemType = Form.useWatch('item_type', workEditForm) || item.item_type;
    const currencyType = Form.useWatch('currency_type', workEditForm) || 'RUB';
    const currencyRate = Form.useWatch('currency_rate', workEditForm) || 1;
    
    // Calculate commercial cost
    const commercialCost = useMemo(() => {
      if (!tenderMarkup || !unitRate || !quantity) return 0;
      
      const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
      const baseCost = quantity * unitRate * currencyMultiplier;
      
      if (itemType === 'work') {
        return calculateWorkCommercialCost(baseCost, tenderMarkup);
      } else if (itemType === 'sub_work') {
        return calculateSubcontractWorkCommercialCost(baseCost, tenderMarkup);
      }
      
      return baseCost;
    }, [quantity, unitRate, itemType, tenderMarkup]);
    
    // Determine background color based on item type
    const getEditBackgroundColor = () => {
      switch(item.item_type) {
        case 'work':
          return 'rgba(254, 215, 170, 0.3)'; // Orange for work (fed7aa with opacity)
        case 'sub_work':
          return 'rgba(233, 213, 255, 0.3)'; // Purple for sub-work (e9d5ff with opacity)
        default:
          return '#f0f8ff';
      }
    };

    const getBorderColor = () => {
      switch(item.item_type) {
        case 'work':
          return '#fb923c'; // Orange border
        case 'sub_work':
          return '#c084fc'; // Purple border
        default:
          return '#1890ff';
      }
    };

    return (
    <tr>
      <td colSpan={13} style={{ padding: 0 }}>
        <Form
          form={workEditForm}
            layout="vertical"
            onFinish={handleSaveWorkEdit}
            className="w-full"
            style={{ 
              padding: '12px', 
              backgroundColor: getEditBackgroundColor(), 
              borderRadius: '4px',
              border: `2px solid ${getBorderColor()}`,
              boxShadow: `0 2px 4px ${getBorderColor()}33`
            }}
          >
          {/* First row with main fields */}
          <div className="flex items-end gap-2 mb-3">
            {/* Type */}
            <Form.Item 
              name="item_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
              className="mb-0"
              style={{ width: '110px' }}
              rules={[{ required: true, message: 'Тип' }]}
            >
              <Select size="small" placeholder="Тип">
                <Select.Option value="work">Работа</Select.Option>
                <Select.Option value="sub_work">Суб-работа</Select.Option>
              </Select>
            </Form.Item>

            {/* Name - расширен */}
            <Form.Item
              name="description"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Наименование</span>}
              className="mb-0"
              style={{ flex: '1 1 auto', minWidth: '0' }}
              rules={[{ required: true, message: 'Наименование' }]}
            >
              <Input.TextArea 
                placeholder="Наименование работы" 
                size="small" 
                autoSize={{ minRows: 1, maxRows: 2 }}
                style={{ resize: 'none', width: '100%' }}
              />
            </Form.Item>

            {/* Quantity - поменяли местами с единицами */}
            <Form.Item
              name="quantity"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Количество</span>}
              className="mb-0"
              style={{ width: '100px' }}
              rules={[{ required: true, message: 'Кол-во' }]}
            >
              <DecimalInput 
                placeholder="0.00" 
                min={0}
                precision={2}
                size="small"
              />
            </Form.Item>

            {/* Unit - поменяли местами с количеством */}
            <Form.Item
              name="unit"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ед. изм.</span>}
              className="mb-0"
              style={{ width: '80px' }}
              rules={[{ required: true, message: 'Ед.' }]}
            >
              <Input placeholder="шт" size="small" />
            </Form.Item>

            {/* Currency fields */}
            <>
              <Form.Item
                name="currency_type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Валюта</span>}
                className="mb-0"
                style={{ width: '80px' }}
              >
                <Select 
                  size="small"
                  onChange={(value) => {
                    // Update currency rate when currency changes
                    const newRate = value !== 'RUB' && tender ? getCurrencyRate(value, tender) : null;
                    workEditForm.setFieldValue('currency_rate', newRate);
                  }}
                >
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

                
                {/* Hidden field to store currency rate */}
                <Form.Item
                  name="currency_rate" 
                  hidden
                >
                  <Input />
                </Form.Item>

            </>

            {/* Price */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.currency_type !== curr.currency_type}>
              {({ getFieldValue }) => {
                const selectedCurrency = getFieldValue('currency_type') || 'RUB';
                const currencySymbol = getCurrencySymbol(selectedCurrency);
                return (
                  <Form.Item
                    name="unit_rate"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Цена за ед.</span>}
                    className="mb-0"
                    style={{ width: '120px' }}
                    rules={[{ required: true, message: 'Цена' }]}
                  >
                    <DecimalInput 
                      placeholder="0.00" 
                      min={0}
                      precision={2}
                      size="small"
                      suffix={currencySymbol}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            {/* Total - стандартная ширина */}
            <Form.Item 
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Сумма</span>}
              className="mb-0"
              style={{ width: '140px' }}
            >
              <div style={{ 
                height: '24px', 
                padding: '0 8px',
                background: '#f5f5f5',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 'normal',
                color: '#000'
              }}>
                {formatCurrency(quantity * unitRate * (currencyType !== 'RUB' && currencyRate ? currencyRate : 1))}
              </div>
            </Form.Item>
          </div>

          {/* Second row with category */}
          <div className="flex items-end gap-2 mb-3">
            <Form.Item
              name="detail_cost_category_id"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Категория затрат</span>}
              className="mb-0 flex-1"
              rules={[{ required: true, message: 'Выберите категорию затрат' }]}
            >
              <CostDetailCascadeSelector
                placeholder="Выберите категорию затрат"
                size="small"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          {/* Third row: Quote Link */}
          <div className="flex items-end gap-2 mb-3">
            <Form.Item
              name="quote_link"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ссылка на КП</span>}
              className="mb-0 flex-1"
            >
              <Input 
                placeholder="Ссылка на коммерческое предложение"
                size="small"
              />
            </Form.Item>
          </div>

          {/* Fourth row: Note + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
            <Form.Item
              name="note"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Примечание</span>}
              className="mb-0 flex-1"
            >
              <Input 
                placeholder="Примечание к элементу"
                size="small"
              />
            </Form.Item>
            
            {/* Action Buttons - same row on desktop */}
            <div className="flex gap-2 flex-shrink-0 sm:pb-1">
              <Button 
                type="default" 
                icon={<CloseOutlined />} 
                onClick={handleCancelWorkEdit}
                size="middle"
                danger
                style={{ height: '32px', fontSize: '13px' }}
              >
                Отмена
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />} 
                size="middle"
                style={{ height: '32px', fontSize: '13px' }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </Form>
      </td>
    </tr>
    );
  };

  // Material Edit Row (inline editing) - Compact two-row layout
  const MaterialEditRow = ({ item }: { item: BOQItemWithLibrary }) => {
    // Watch form fields for dynamic calculation
    const quantity = Form.useWatch('quantity', editForm) || 0;
    const unitRate = Form.useWatch('unit_rate', editForm) || 0;
    const itemType = Form.useWatch('item_type', editForm) || item.item_type;
    const workId = Form.useWatch('work_id', editForm);
    const deliveryType = Form.useWatch('delivery_price_type', editForm) || 'included';
    const deliveryAmount = Form.useWatch('delivery_amount', editForm) || 0;
    const consumptionCoef = Form.useWatch('consumption_coefficient', editForm) || 1;
    const conversionCoef = Form.useWatch('conversion_coefficient', editForm) || 1;
    const currencyType = Form.useWatch('currency_type', editForm) || 'RUB';
    const currencyRate = Form.useWatch('currency_rate', editForm) || 1;
    
    // Calculate actual quantity based on work link
    const actualQuantity = useMemo(() => {
      if (workId) {
        // Find the linked work to get its quantity
        const linkedWork = works.find(w => w.id === workId);
        const workQuantity = linkedWork?.quantity || 0;
        return workQuantity * consumptionCoef * conversionCoef;
      }
      // For unlinked materials, apply consumption coefficient to base quantity
      return quantity * consumptionCoef;
    }, [workId, quantity, consumptionCoef, conversionCoef, works]);
    
    // Calculate delivery cost per unit
    const deliveryCost = useMemo(() => {
      const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
      if (deliveryType === 'included') return 0;
      if (deliveryType === 'not_included') return unitRate * currencyMultiplier * 0.03;
      if (deliveryType === 'amount') return deliveryAmount; // deliveryAmount is already in RUB per unit
      return 0;
    }, [deliveryType, deliveryAmount, unitRate, currencyType, currencyRate]);
    
    // Calculate commercial cost
    const commercialCost = useMemo(() => {
      if (!tenderMarkup || !unitRate) return 0;
      
      // Apply currency conversion
      const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
      
      // Calculate total base cost with delivery
      const baseCostPerUnit = unitRate * currencyMultiplier;
      const totalBaseCost = actualQuantity * baseCostPerUnit;
      const totalDeliveryCost = actualQuantity * deliveryCost;
      const totalCostWithDelivery = totalBaseCost + totalDeliveryCost;
      
      if (itemType === 'material') {
        // Check if it's linked (main) or unlinked (auxiliary)
        const isLinked = !!workId;
        if (isLinked) {
          // For main materials, return just the base cost (markup goes to works)
          const result = calculateMainMaterialCommercialCost(totalCostWithDelivery, tenderMarkup);
          return result.materialCost;
        } else {
          // For auxiliary materials, return 0 (all cost goes to works)
          const result = calculateAuxiliaryMaterialCommercialCost(totalCostWithDelivery, tenderMarkup);
          return result.materialCost; // This will be 0
        }
      } else if (itemType === 'sub_material') {
        // For sub-materials
        const result = calculateSubcontractMaterialCommercialCost(totalCostWithDelivery, tenderMarkup);
        return result.materialCost;
      }
      
      return totalCostWithDelivery;
    }, [actualQuantity, unitRate, deliveryCost, itemType, workId, tenderMarkup]);
    
    // Determine background color based on item type and link status
    const getEditBackgroundColor = () => {
      switch(item.item_type) {
        case 'material':
          return item.work_link ? 'rgba(191, 219, 254, 0.3)' : 'rgba(219, 234, 254, 0.3)'; // Blue shades for material
        case 'sub_material':
          return 'rgba(187, 247, 208, 0.3)'; // Green for sub-material (bbf7d0 with opacity)
        default:
          return '#fff5f0';
      }
    };

    const getBorderColor = () => {
      switch(item.item_type) {
        case 'material':
          return '#60a5fa'; // Blue border
        case 'sub_material':
          return '#34d399'; // Green border
        default:
          return '#ff7a45';
      }
    };

    return (
    <tr>
      <td colSpan={13} style={{ padding: 0 }}>
        <Form
          form={editForm}
            layout="vertical"
            onFinish={handleSaveInlineEdit}
            className="w-full"
            style={{ 
              padding: '12px', 
              backgroundColor: getEditBackgroundColor(), 
              borderRadius: '4px',
              border: `2px solid ${getBorderColor()}`,
              boxShadow: `0 2px 4px ${getBorderColor()}33`
            }}
          >
          {/* Single row with all main fields - compact table-like layout */}
          <div className="flex items-end gap-2 mb-3">
            {/* Type - expanded */}
            <Form.Item 
              name="item_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
              className="mb-0"
              style={{ width: '110px' }}
              rules={[{ required: true, message: 'Тип' }]}
            >
              <Select size="small" placeholder="Тип">
                <Select.Option value="material">Материал</Select.Option>
                <Select.Option value="sub_material">Суб-мат</Select.Option>
              </Select>
            </Form.Item>

            {/* Material Type - основной/вспомогательный */}
            <Form.Item
              name="material_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Вид</span>}
              className="mb-0"
              style={{ width: '140px' }}
              initialValue="main"
            >
              <Select size="small" placeholder="Вид материала">
                <Select.Option value="main">Основной</Select.Option>
                <Select.Option value="auxiliary">Вспомогательный</Select.Option>
              </Select>
            </Form.Item>

            {/* Name - expanded to full width */}
            <Form.Item
              name="description"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Наименование</span>}
              className="mb-0 flex-1"
              style={{ minWidth: '200px' }}
              rules={[{ required: true, message: 'Наименование' }]}
            >
              <Input.TextArea 
                placeholder="Наименование материала" 
                size="small" 
                autoSize={{ minRows: 1, maxRows: 2 }}
                style={{ resize: 'none' }}
              />
            </Form.Item>

            {/* Work Link */}
            <Form.Item
              name="work_id"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Привязка к работе</span>}
              className="mb-0"
              style={{ width: '180px' }}
            >
              <Select
                placeholder="Работа"
                allowClear
                size="small"
                showSearch
                onChange={handleWorkSelectionChange}
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {works.map((work) => (
                  <Select.Option key={work.id} value={work.id}>
                    {work.description}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Consumption Coefficient */}
            <Form.Item
              name="consumption_coefficient"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.расх</span>}
              className="mb-0"
              style={{ width: '70px' }}
              rules={[
                { type: 'number', min: 1, message: 'Значение коэффициента расхода не может быть менее 1' }
              ]}
            >
              <DecimalInput 
                placeholder="1.00" 
                min={1}
                precision={4}
                size="small"
                onChange={(value) => {
                  // Ensure value is at least 1
                  const validValue = value && value < 1 ? 1 : value;
                  if (value && value < 1) {
                    message.warning('Значение коэффициента расхода не может быть менее 1');
                    editForm.setFieldValue('consumption_coefficient', 1);
                  }
                  handleCoefficientChange(validValue);
                }}
                style={{ textAlign: 'center' }}
              />
            </Form.Item>

            {/* Conversion Coefficient */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
              {({ getFieldValue }) => (
                <Form.Item
                  name="conversion_coefficient"
                  label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.перев</span>}
                  className="mb-0"
                  style={{ width: '70px' }}
                >
                  <DecimalInput 
                    placeholder="1.00" 
                    min={0}
                    precision={4}
                    size="small"
                    disabled={!getFieldValue('work_id')}
                    onChange={handleCoefficientChange}
                    style={{ textAlign: 'center' }}
                  />
                </Form.Item>
              )}
            </Form.Item>

            {/* Quantity */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
              {({ getFieldValue }) => (
                <Form.Item
                  name="quantity"
                  label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Кол-во</span>}
                  className="mb-0"
                  style={{ width: '75px' }}
                  rules={[{ required: true, message: 'Кол-во' }]}
                >
                  <DecimalInput 
                    placeholder="0.00" 
                    min={0}
                    precision={2}
                    size="small"
                    disabled={!!getFieldValue('work_id')}
                    style={{ textAlign: 'center' }}
                  />
                </Form.Item>
              )}
            </Form.Item>

            {/* Unit - moved after Quantity */}
            <Form.Item
              name="unit"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Ед. изм.</span>}
              className="mb-0"
              style={{ width: '80px' }}
              rules={[{ required: true, message: 'Ед.' }]}
            >
              <Input placeholder="шт" size="small" style={{ textAlign: 'center' }} />
            </Form.Item>

            {/* Currency Type */}
            <>
              <Form.Item
                name="currency_type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Валюта</span>}
                className="mb-0"
                style={{ width: '80px' }}
              >
                <Select 
                  size="small" 
                  style={{ textAlign: 'center' }}
                  onChange={(value) => {
                    // Update currency rate when currency changes
                    const newRate = value !== 'RUB' && tender ? getCurrencyRate(value, tender) : null;
                    editForm.setFieldValue('currency_rate', newRate);
                  }}
                >
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

              {/* Hidden field to store currency rate */}
              <Form.Item
                name="currency_rate" 
                hidden
              >
                <Input />
              </Form.Item>
            </>

            {/* Price */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.currency_type !== curr.currency_type}>
              {({ getFieldValue }) => {
                const selectedCurrency = getFieldValue('currency_type') || 'RUB';
                const currencySymbol = getCurrencySymbol(selectedCurrency);
                return (
                  <Form.Item
                    name="unit_rate"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Цена</span>}
                    className="mb-0"
                    style={{ width: '90px' }}
                    rules={[{ required: true, message: 'Цена' }]}
                  >
                    <DecimalInput 
                      placeholder="0.00" 
                      min={0}
                      precision={2}
                      size="small"
                      suffix={currencySymbol}
                      style={{ textAlign: 'center' }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            {/* Delivery */}
            <Form.Item
              name="delivery_price_type"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Доставка</span>}
              className="mb-0"
              style={{ width: '120px' }}
              initialValue="included"
            >
              <Select placeholder="Тип" size="small" style={{ textAlign: 'center' }}>
                <Select.Option value="included">Включена</Select.Option>
                <Select.Option value="not_included">Не вкл. (3%)</Select.Option>
                <Select.Option value="amount">Фикс. сумма</Select.Option>
              </Select>
            </Form.Item>

            {/* Conditional Delivery Amount field */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.delivery_price_type !== curr.delivery_price_type}>
              {({ getFieldValue }) => {
                const deliveryType = getFieldValue('delivery_price_type');
                return deliveryType === 'amount' ? (
                  <Form.Item
                    name="delivery_amount"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Сум.дост</span>}
                    className="mb-0"
                    style={{ width: '80px' }}
                  >
                    <DecimalInput 
                      placeholder="0.00" 
                      min={0}
                      precision={2}
                      size="small"
                      suffix="₽"
                      style={{ textAlign: 'center' }}
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            {/* Total - стандартная ширина */}
            <Form.Item 
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Сумма</span>}
              className="mb-0"
              style={{ minWidth: '100px', maxWidth: '140px' }}
            >
              <div style={{ 
                height: '24px', 
                padding: '0 8px',
                background: '#f5f5f5',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'normal',
                color: '#000',
                whiteSpace: 'nowrap'
              }}>
                {(() => {
                  // Use actualQuantity which includes coefficients calculation
                  const unitRate = editForm.getFieldValue('unit_rate') || 0;
                  const deliveryType = editForm.getFieldValue('delivery_price_type') || 'included';
                  const deliveryAmount = editForm.getFieldValue('delivery_amount') || 0;
                  const currencyType = editForm.getFieldValue('currency_type') || 'RUB';
                  const currencyRate = editForm.getFieldValue('currency_rate') || 1;
                  
                  const currencyMultiplier = currencyType !== 'RUB' && currencyRate ? currencyRate : 1;
                  const baseTotal = actualQuantity * unitRate * currencyMultiplier;
                  let deliveryCost = 0;
                  
                  if (deliveryType === 'not_included') {
                    deliveryCost = baseTotal * 0.03;
                  } else if (deliveryType === 'amount') {
                    // deliveryAmount is per unit in RUB, no need to multiply by currencyMultiplier
                    deliveryCost = deliveryAmount * actualQuantity;
                  }
                  
                  return formatCurrency(baseTotal + deliveryCost);
                })()}
              </div>
            </Form.Item>
          </div>

          {/* Second row: Category field */}
          <div className="flex items-end gap-2">
            <Form.Item
              name="detail_cost_category_id"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Категория затрат</span>}
              className="mb-0 flex-1"
              rules={[{ required: true, message: 'Выберите категорию затрат' }]}
            >
              <CostDetailCascadeSelector
                placeholder="Выберите категорию затрат"
                size="small"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>

          {/* Third row: Quote Link */}
          <div className="flex items-end gap-2">
            <Form.Item
              name="quote_link"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ссылка на КП</span>}
              className="mb-0 flex-1"
            >
              <Input 
                placeholder="Ссылка на коммерческое предложение"
                size="small"
              />
            </Form.Item>
          </div>

          {/* Fourth row: Note + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
            <Form.Item
              name="note"
              label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Примечание</span>}
              className="mb-0 flex-1"
            >
              <Input 
                placeholder="Примечание к элементу"
                size="small"
              />
            </Form.Item>
            
            {/* Action Buttons - same row on desktop */}
            <div className="flex gap-2 flex-shrink-0 sm:pb-1">
              <Button 
                type="default" 
                icon={<CloseOutlined />} 
                onClick={handleCancelInlineEdit}
                size="middle"
                danger
                style={{ height: '32px', fontSize: '13px' }}
              >
                Отмена
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<CheckOutlined />} 
                size="middle"
                loading={loading}
                style={{ height: '32px', fontSize: '13px' }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </Form>
      </td>
    </tr>
    );
  };

  // State for quick add form type
  const [quickAddFormType, setQuickAddFormType] = useState<string>('work');
  
  // Quick add row with table-like layout matching edit forms
  const QuickAddRow = () => {
    // Determine background color based on type
    const getAddBackgroundColor = () => {
      switch(quickAddFormType) {
        case 'work':
          return 'rgba(254, 215, 170, 0.2)'; // Light orange for work
        case 'sub_work':
          return 'rgba(233, 213, 255, 0.2)'; // Light purple for sub-work
        case 'material':
          return 'rgba(219, 234, 254, 0.2)'; // Light blue for material
        case 'sub_material':
          return 'rgba(187, 247, 208, 0.2)'; // Light green for sub-material
        default:
          return '#f9f9f9';
      }
    };

    const getBorderColor = () => {
      switch(quickAddFormType) {
        case 'work':
          return '#fb923c'; // Orange border
        case 'sub_work':
          return '#c084fc'; // Purple border
        case 'material':
          return '#60a5fa'; // Blue border
        case 'sub_material':
          return '#34d399'; // Green border
        default:
          return '#d9d9d9';
      }
    };

    return (
    <Form
      form={quickAddForm}
      layout="vertical"
      onFinish={handleQuickAdd}
      className="w-full"
      style={{ 
        padding: '12px', 
        backgroundColor: getAddBackgroundColor(), 
        borderRadius: '4px',
        border: `2px solid ${getBorderColor()}`,
        boxShadow: `0 2px 4px ${getBorderColor()}33`,
        marginBottom: '16px'
      }}
    >
      <Form.Item 
        noStyle
        shouldUpdate
      >
        {({ getFieldValue }) => {
          const currentType = getFieldValue('type') || 'work';
          if (currentType !== quickAddFormType) {
            setQuickAddFormType(currentType);
          }
          const isWork = currentType === 'work' || currentType === 'sub_work';
          const isMaterial = currentType === 'material' || currentType === 'sub_material';

          return (
            <>
            {/* Main fields row - adapted for both works and materials */}
            <div className="flex items-end gap-2 mb-3">
              {/* Type */}
              <Form.Item
                name="type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Тип</span>}
                className="mb-0"
                initialValue="work"
                style={{ width: '110px' }}
              >
                <Select size="small" placeholder="Тип" onChange={setQuickAddFormType}>
                  <Select.Option value="work">Работа</Select.Option>
                  <Select.Option value="sub_work">Суб-работа</Select.Option>
                  <Select.Option value="material">Материал</Select.Option>
                  <Select.Option value="sub_material">Суб-мат</Select.Option>
                </Select>
              </Form.Item>

              {/* Material Type - only for materials, right after Type */}
              {isMaterial && (
                <Form.Item
                  name="material_type"
                  label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Вид</span>}
                  className="mb-0"
                  style={{ width: '140px' }}
                  initialValue="main"
                >
                  <Select size="small" placeholder="Вид материала">
                    <Select.Option value="main">Основной</Select.Option>
                    <Select.Option value="auxiliary">Вспомогательный</Select.Option>
                  </Select>
                </Form.Item>
              )}

              {/* Name - expands to fill available space */}
              <Form.Item
                name="description"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Наименование</span>}
                className="mb-0 flex-1"
                style={{ minWidth: '200px' }}
                rules={[{ required: true, message: 'Наименование' }]}
              >
                <Input.TextArea 
                  placeholder={isWork ? "Наименование работы" : "Наименование материала"}
                  size="small"
                  autoSize={{ minRows: 1, maxRows: 2 }}
                  style={{ resize: 'none' }}
                />
              </Form.Item>

              {/* Work Link - only for materials */}
              {isMaterial && (
                <Form.Item
                  name="work_id"
                  label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Привязка к работе</span>}
                  className="mb-0"
                  style={{ width: '180px' }}
                >
                  <Select
                    placeholder="Работа"
                    allowClear
                    size="small"
                    showSearch
                    onChange={(workId) => {
                      if (!workId) {
                        quickAddForm.setFieldsValue({ quantity: undefined });
                        return;
                      }
                      const work = works.find(w => w.id === workId);
                      if (work && work.quantity) {
                        const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                        const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                        const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                        quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                      }
                    }}
                    filterOption={(input, option) =>
                      (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {works.map((work) => (
                      <Select.Option key={work.id} value={work.id}>
                        {work.description}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {/* Coefficients - only for materials */}
              {isMaterial && (
                <>
                  <Form.Item
                    name="consumption_coefficient"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.расх</span>}
                    className="mb-0"
                    initialValue={1}
                    style={{ width: '70px' }}
                    rules={[
                      { type: 'number', min: 1, message: 'Значение коэффициента расхода не может быть менее 1' }
                    ]}
                  >
                    <DecimalInput 
                      placeholder="1.00" 
                      min={1}
                      precision={4}
                      size="small"
                      style={{ textAlign: 'center' }}
                      onChange={(value) => {
                        // Ensure value is at least 1
                        const validValue = value && value < 1 ? 1 : value;
                        if (value && value < 1) {
                          message.warning('Значение коэффициента расхода не может быть менее 1');
                          quickAddForm.setFieldValue('consumption_coefficient', 1);
                        }
                        const workId = quickAddForm.getFieldValue('work_id');
                        if (!workId) return;
                        const work = works.find(w => w.id === workId);
                        if (work && work.quantity) {
                          const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                          const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                          const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                          quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                        }
                      }}
                    />
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
                    {({ getFieldValue }) => (
                      <Form.Item
                        name="conversion_coefficient"
                        label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>К.перев</span>}
                        className="mb-0"
                        initialValue={1}
                        style={{ width: '70px' }}
                      >
                        <DecimalInput 
                          placeholder="1.00" 
                          min={0}
                          precision={4}
                          size="small"
                          disabled={!getFieldValue('work_id')}
                          style={{ textAlign: 'center' }}
                          onChange={() => {
                            const workId = quickAddForm.getFieldValue('work_id');
                            if (!workId) return;
                            const work = works.find(w => w.id === workId);
                            if (work && work.quantity) {
                              const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                              const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                              const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                              quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                            }
                          }}
                        />
                      </Form.Item>
                    )}
                  </Form.Item>
                </>
              )}

              {/* Quantity */}
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.work_id !== curr.work_id}>
                {({ getFieldValue }) => (
                  <Form.Item
                    name="quantity"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Кол-во</span>}
                    className="mb-0"
                    style={{ width: '75px' }}
                    rules={[{ required: true, message: 'Кол-во' }]}
                  >
                    <DecimalInput 
                      placeholder="0.00" 
                      min={0}
                      precision={2}
                      size="small"
                      disabled={isMaterial && !!getFieldValue('work_id')}
                      style={{ textAlign: 'center' }}
                    />
                  </Form.Item>
                )}
              </Form.Item>

              {/* Unit */}
              <Form.Item
                name="unit"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Ед. изм.</span>}
                className="mb-0"
                style={{ width: '60px' }}
                rules={[{ required: true, message: 'Ед.' }]}
              >
                <Input placeholder="шт" size="small" style={{ textAlign: 'center' }} />
              </Form.Item>

              {/* Currency selector - always show for testing */}
              <Form.Item
                name="currency_type"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Валюта</span>}
                className="mb-0"
                style={{ width: '70px' }}
                initialValue="RUB"
              >
                <Select 
                  size="small" 
                  style={{ textAlign: 'center' }}
                  onChange={handleCurrencyChange}
                >
                  <Select.Option value="RUB">₽</Select.Option>
                  <Select.Option value="USD">$</Select.Option>
                  <Select.Option value="EUR">€</Select.Option>
                  <Select.Option value="CNY">¥</Select.Option>
                </Select>
              </Form.Item>

              {/* Hidden field to store currency rate */}
              {selectedCurrency !== 'RUB' && (
                <Form.Item
                  name="currency_rate" 
                  hidden
                  initialValue={tender ? getCurrencyRate(selectedCurrency, tender) : 1}
                >
                  <Input />
                </Form.Item>
              )}

              {/* Price */}
              <Form.Item
                name="unit_rate"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>
                  Цена {selectedCurrency === 'RUB' ? '₽' : CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol}
                </span>}
                className="mb-0"
                style={{ width: '90px' }}
                rules={[{ required: true, message: 'Цена' }]}
              >
                <DecimalInput 
                  placeholder="0.00" 
                  min={0}
                  precision={2}
                  size="small"
                  suffix={selectedCurrency === 'RUB' ? '₽' : CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol}
                  style={{ textAlign: 'center' }}
                />
              </Form.Item>

              {/* Delivery - only for materials */}
              {isMaterial && (
                <>
                  <Form.Item
                    name="delivery_price_type"
                    label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Доставка</span>}
                    className="mb-0"
                    style={{ width: '120px' }}
                    initialValue="included"
                  >
                    <Select placeholder="Тип" size="small" style={{ textAlign: 'center' }}>
                      <Select.Option value="included">Включена</Select.Option>
                      <Select.Option value="not_included">Не вкл. (3%)</Select.Option>
                      <Select.Option value="amount">Фикс. сумма</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.delivery_price_type !== curr.delivery_price_type}>
                    {({ getFieldValue }) => {
                      const deliveryType = getFieldValue('delivery_price_type');
                      return deliveryType === 'amount' ? (
                        <Form.Item
                          name="delivery_amount"
                          label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600, display: 'block', textAlign: 'center' }}>Сум.дост</span>}
                          className="mb-0"
                          style={{ width: '80px' }}
                        >
                          <DecimalInput 
                            placeholder="0.00" 
                            min={0}
                            precision={2}
                            size="small"
                            suffix="₽"
                            style={{ textAlign: 'center' }}
                          />
                        </Form.Item>
                      ) : null;
                    }}
                  </Form.Item>
                </>
              )}
            </div>

            {/* Second row: Category field and Action Buttons */}
            <div className="flex items-end gap-2 mb-3">
              <Form.Item
                name="detail_cost_category_id"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Категория затрат</span>}
                className="mb-0 flex-1"
                rules={[{ required: true, message: 'Выберите категорию затрат' }]}
              >
                <CostDetailCascadeSelector
                  placeholder="Выберите категорию затрат"
                  size="small"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            {/* Third row: Quote Link */}
            <div className="flex items-end gap-2 mb-3">
              <Form.Item
                name="quote_link"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Ссылка на КП</span>}
                className="mb-0 flex-1"
              >
                <Input 
                  placeholder="Ссылка на коммерческое предложение"
                  size="small"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            {/* Fourth row: Note + Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
              <Form.Item
                name="note"
                label={<span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>Примечание</span>}
                className="mb-0 flex-1"
              >
                <Input.TextArea 
                  placeholder="Примечание к элементу"
                  size="small"
                  rows={2}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              {/* Action Buttons - same row on desktop */}
              <div className="flex gap-2 flex-shrink-0 sm:pb-1">
                <Button 
                  type="default" 
                  icon={<CloseOutlined />} 
                  onClick={() => {
                    setQuickAddMode(false);
                    quickAddForm.resetFields();
                    setQuickAddFormType('work');
                    setSelectedCurrency('RUB');
                  }}
                  size="middle"
                  danger
                  style={{ height: '32px', fontSize: '13px' }}
                >
                  Отмена
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  htmlType="submit"
                  size="middle"
                  style={{ height: '32px', fontSize: '13px' }}
                >
                  Добавить
                </Button>
              </div>
            </div>
            </>
          );
        }}
      </Form.Item>
    </Form>
    );
  };

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
                
                {/* Third row - Client Quantity - only for non-ДОП positions */}
                {!position.is_additional && position.volume && (
                  <div className="flex items-center gap-1">
                    <Text className="text-sm text-gray-500 font-semibold">Кол-во Заказчика:</Text>
                    <Text className="text-sm text-gray-600">
                      <strong>{position.volume}</strong>
                    </Text>
                    {position.unit && (
                      <Text className="text-sm text-gray-600 ml-1">
                        <strong>{position.unit}</strong>
                      </Text>
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
            {quickAddMode && <QuickAddRow />}

            {/* Template Add Form */}
            {templateAddMode && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-green-300">
                <Form
                  form={templateAddForm}
                  layout="horizontal"
                  onFinish={handleTemplateAdd}
                  className="flex items-end gap-3"
                >
                  <Form.Item
                    name="template_name"
                    label="Выберите шаблон"
                    className="mb-0 flex-1"
                    rules={[{ required: true, message: 'Выберите шаблон' }]}
                  >
                    <AutoComplete
                      placeholder="Начните вводить название шаблона..."
                      options={templateOptions}
                      onSearch={loadTemplates}
                      onSelect={(value: string) => setSelectedTemplateName(value)}
                      loading={loadingTemplates}
                      allowClear
                      size="middle"
                      notFoundContent={loadingTemplates ? 'Загрузка...' : 'Введите минимум 2 символа для поиска'}
                    />
                  </Form.Item>

                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<CheckOutlined />}
                    loading={loading}
                    disabled={!selectedTemplateName}
                  >
                    Вставить
                  </Button>

                  <Button
                    onClick={() => {
                      setTemplateAddMode(false);
                      templateAddForm.resetFields();
                      setSelectedTemplateName('');
                      setTemplateOptions([]);
                    }}
                    icon={<CloseOutlined />}
                  >
                    Отмена
                  </Button>
                </Form>
              </div>
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
                        return <MaterialEditRow item={record} />;
                      }
                      
                      // If this is the work or sub-work being edited, show the edit form
                      if (record && editingWorkId === record.id && (record.item_type === 'work' || record.item_type === 'sub_work')) {
                        return <WorkEditRow item={record} />;
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