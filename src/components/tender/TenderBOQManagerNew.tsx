import React, { useState, useEffect, useCallback } from 'react';
import { PlusOutlined, EditOutlined, CloseOutlined, DisconnectOutlined, HolderOutlined, LinkOutlined, PlusCircleOutlined, SwapOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons';
import { message, Spin, InputNumber, Tooltip, Modal, Button, Input, Radio, List, Empty, Select } from 'antd';
// Drag-and-drop disabled - using modal for material movement
import { clientPositionsApi, boqItemsApi, boqApi, tendersApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import { supabase } from '../../lib/supabase/client';
import AutoCompleteSearch from '../common/AutoCompleteSearch';
import { CostCascadeSelector } from '../common';
import { formatCurrency, formatQuantity, formatUnitRate } from '../../utils/formatters';
import { CURRENCY_SYMBOLS, CURRENCY_OPTIONS } from '../../utils/currencyConverter';
import { calculateMaterialVolume, updateLinkWithCalculatedVolume } from '../../utils/materialCalculations';
// Components for drag-and-drop removed - using modal approach
import type { ClientPosition, BOQItem, BOQItemInsert, DeliveryPriceType } from '../../lib/supabase/types';

interface TenderBOQManagerNewProps {
  tenderId: string;
}

interface PositionWithItems extends ClientPosition {
  boq_items?: BOQItem[];
  total_position_cost?: number;
}

const TenderBOQManagerNew: React.FC<TenderBOQManagerNewProps> = ({ tenderId }) => {
  console.log('🚀 TenderBOQManagerNew called with tenderId:', tenderId);

  // State
  const [positions, setPositions] = useState<PositionWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionWithItems | null>(null);
  const [allWorkLinks, setAllWorkLinks] = useState<Record<string, any[]>>({});
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkData, setEditingLinkData] = useState<any>({});
  
  // Move material modal state
  const [moveModal, setMoveModal] = useState<{
    visible: boolean;
    materialId: string | null;
    materialName: string;
    currentWorkId: string | null;
    currentWorkName: string;
    isLinkedMaterial: boolean;
    linkId?: string;
  }>({
    visible: false,
    materialId: null,
    materialName: '',
    currentWorkId: null,
    currentWorkName: '',
    isLinkedMaterial: false
  });
  
  // State for editing item
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    description: string;
    quantity: number;
    unit_rate: number;
    consumption_coefficient?: number;
    conversion_coefficient?: number;
    delivery_price_type?: 'included' | 'not_included' | 'amount';
    delivery_amount?: number;
    cost_node_id?: string | null;
    cost_node_display?: string | null;
    currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY';
    currency_rate?: number | null;
  }>({
    description: '',
    quantity: 0,
    unit_rate: 0,
    consumption_coefficient: 1,
    conversion_coefficient: 1,
    delivery_price_type: 'included',
    delivery_amount: 0,
    currency_type: 'RUB'
  });
  
  // Conflict resolution modal state
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    srcId: string | null;
    tgtId: string | null;
    targetWorkId: string | null;
    materialName: string;
    sourceworkName: string;
    targetWorkName: string;
  }>({
    visible: false,
    srcId: null,
    tgtId: null,
    targetWorkId: null,
    materialName: '',
    sourceworkName: '',
    targetWorkName: ''
  });
  const [conflictStrategy, setConflictStrategy] = useState<'sum' | 'replace'>('sum');
  const [formData, setFormData] = useState({
    type: 'work' as 'work' | 'material',
    name: '',
    unit: 'м²',
    quantity: '',
    price: '',
    consumptionCoefficient: '',
    conversionCoefficient: '',
    selectedItemId: null as string | null,
    deliveryPriceType: 'included' as 'included' | 'not_included' | 'amount',
    deliveryAmount: '',
    cost_node_id: null as string | null,
    cost_node_display: null as string | null
  });
  
  // Состояние для курсов валют из тендера
  const [tenderRates, setTenderRates] = useState<{
    usd_rate: number | null;
    eur_rate: number | null;
    cny_rate: number | null;
  }>({
    usd_rate: null,
    eur_rate: null,
    cny_rate: null
  });
  // Remove these states as AutoCompleteSearch handles loading
  // const [materials, setMaterials] = useState<Material[]>([]);
  // const [works, setWorks] = useState<WorkItem[]>([]);

  const units = ['м²', 'м³', 'шт.', 'кг', 'т', 'м.п.', 'компл.'];
  
  // Функция форматирования цены с символом валюты
  const formatPriceWithCurrency = (price: number, currencyType?: string) => {
    const currency = currencyType || 'RUB';
    const symbol = CURRENCY_SYMBOLS[currency] || '₽';
    
    if (currency === 'RUB') {
      return formatCurrency(price);
    }
    
    // Для валют показываем символ перед суммой
    return `${symbol}${price.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };
  
  // Функция расчета итоговой суммы с учетом валюты
  const calculateTotalAmount = (item: {
    item_type: string;
    unit_rate: number;
    quantity: number;
    currency_type?: string;
    currency_rate?: number | null;
    delivery_price_type?: string;
    delivery_amount?: number | null;
  }) => {
    // Конвертируем цену в рубли если указана валюта
    const priceInRub = item.currency_type && item.currency_type !== 'RUB' && item.currency_rate
      ? item.unit_rate * item.currency_rate
      : item.unit_rate;
    
    // Для материалов учитываем доставку
    if (item.item_type === 'material' || item.item_type === 'sub_material') {
      let deliveryAmount = 0;
      
      if (item.delivery_price_type === 'not_included') {
        // 3% от цены в рублях
        deliveryAmount = priceInRub * 0.03;
      } else if (item.delivery_price_type === 'amount') {
        // Фиксированная сумма (в рублях)
        deliveryAmount = item.delivery_amount || 0;
      }
      // Для 'included' deliveryAmount остается 0
      
      return (priceInRub + deliveryAmount) * item.quantity;
    }
    
    // Для работ просто умножаем на количество
    return priceInRub * item.quantity;
  };
  
  // Helper function to calculate total cost including all works and materials
  const calculatePositionTotalCost = (items: BOQItem[], workLinks: Record<string, any[]>) => {
    let total = 0;
    let worksTotal = 0;
    let linkedMaterialsTotal = 0;
    let unlinkedMaterialsTotal = 0;
    
    console.log('💰 Calculating position total cost...');
    console.log('📋 Items count:', items?.length || 0);
    console.log('🔗 Work links:', Object.keys(workLinks || {}).length);
    
    // Создаем список ID связанных материалов
    const linkedMaterialIds = new Set<string>();
    Object.values(workLinks || {}).forEach((links: any[]) => {
      links.forEach((link: any) => {
        if (link.material_boq_item_id) {
          linkedMaterialIds.add(link.material_boq_item_id);
        }
      });
    });
    
    // Считаем работы, привязанные материалы и несвязанные материалы
    for (const item of items || []) {
      if (item.item_type === 'work') {
        // Добавляем стоимость работы (всегда, независимо от наличия материалов)
        const workAmount = item.total_amount || 0;
        worksTotal += workAmount;
        total += workAmount;
        
        console.log(`  🔧 Work: ${item.description} = ${workAmount}`);
        
        // Добавляем стоимость привязанных к работе материалов (если есть)
        if (workLinks[item.id] && workLinks[item.id].length > 0) {
          const materialsTotal = workLinks[item.id].reduce((sum: number, link: any) => {
            const linkTotal = link.calculated_total || 0;
            console.log(`    📦 Linked material: ${linkTotal}`);
            return sum + linkTotal;
          }, 0);
          linkedMaterialsTotal += materialsTotal;
          total += materialsTotal;
          console.log(`    📦 Total materials for work: ${materialsTotal}`);
        }
      } else if (item.item_type === 'material') {
        // Проверяем, не является ли этот материал связанным
        if (!linkedMaterialIds.has(item.id)) {
          // Это несвязанный материал - добавляем его стоимость
          const materialAmount = item.total_amount || 0;
          unlinkedMaterialsTotal += materialAmount;
          total += materialAmount;
          console.log(`  📦 Unlinked material: ${item.description} = ${materialAmount}`);
        }
      }
    }
    
    console.log('💰 TOTAL CALCULATION:');
    console.log('  🔧 Works total:', worksTotal);
    console.log('  📦 Linked materials total:', linkedMaterialsTotal);
    console.log('  💎 Position total:', total);
    
    return total;
  };

  // Load positions from database
  const loadPositions = useCallback(async () => {
    console.log('📡 Loading positions for tender:', tenderId);
    setLoading(true);
    
    try {
      const result = await clientPositionsApi.getByTenderId(tenderId, {}, { limit: 1000 });
      console.log('📦 Positions API response:', result);
      
      if (result.error) {
        console.error('❌ Failed to load positions:', result.error);
        throw new Error(result.error);
      }

      // Handle paginated response
      const positions = result.data || [];
      console.log('📋 Raw positions data:', positions);
      console.log('🔍 First position details:', positions[0] ? {
        id: positions[0].id,
        position_number: positions[0].position_number,
        item_no: positions[0].item_no,
        work_name: positions[0].work_name
      } : 'No positions');
      
      // Load BOQ items for each position
      const positionsWithItems = await Promise.all(
        positions.map(async (position) => {
          console.log(`📋 Processing position ${position.id}:`, {
            position_number: position.position_number,
            item_no: position.item_no
          });
          
          // Use hierarchical API to get items with linked materials
          const boqResult = await boqApi.getHierarchicalByPosition(position.id);
          const boqItems = boqResult.error ? [] : (boqResult.data || []);
          
          // Get work-material links for this position
          const linksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          const positionWorkLinks: Record<string, any[]> = {};
          
          if (!linksResult.error && linksResult.data) {
            // Group links by work ID
            linksResult.data.forEach((link: any) => {
              if (!positionWorkLinks[link.work_boq_item_id]) {
                positionWorkLinks[link.work_boq_item_id] = [];
              }
              
              // Calculate material volume and cost
              const workItem = boqItems.find(item => item.id === link.work_boq_item_id);
              const workVolume = workItem?.quantity || 0;
              
              const materialVolume = calculateMaterialVolume(
                workVolume,
                link.material_consumption_coefficient || 1,
                link.material_conversion_coefficient || 1
              );
              
              positionWorkLinks[link.work_boq_item_id].push({
                ...link,
                calculated_material_volume: materialVolume,
                calculated_total: materialVolume * (link.material_unit_rate || 0)
              });
            });
          }
          
          // Calculate total using only works and their linked materials
          const totalCost = calculatePositionTotalCost(
            boqItems.filter(item => !(item as any).is_linked_material), // Only non-linked items
            positionWorkLinks
          );
          
          console.log(`💰 Position ${position.position_number} total: ${totalCost}`);
          
          return {
            ...position,
            boq_items: boqItems,
            total_position_cost: totalCost
          };
        })
      );

      console.log('✅ Positions with BOQ items loaded:', positionsWithItems.length);
      setPositions(positionsWithItems);
    } catch (error) {
      console.error('💥 Error loading positions:', error);
      message.error('Ошибка загрузки позиций');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  // Library data is now handled by AutoCompleteSearch component

  // Загрузка курсов валют из тендера
  const loadTenderRates = useCallback(async () => {
    console.log('💱 Loading tender rates for:', tenderId);
    try {
      const result = await tendersApi.getById(tenderId);
      if (result.error) {
        console.error('❌ Error loading tender rates:', result.error);
        return;
      }
      
      if (result.data) {
        setTenderRates({
          usd_rate: result.data.usd_rate || null,
          eur_rate: result.data.eur_rate || null,
          cny_rate: result.data.cny_rate || null
        });
        console.log('✅ Tender rates loaded:', {
          usd: result.data.usd_rate,
          eur: result.data.eur_rate,
          cny: result.data.cny_rate
        });
      }
    } catch (error) {
      console.error('💥 Exception loading tender rates:', error);
    }
  }, [tenderId]);

  useEffect(() => {
    if (tenderId) {
      loadPositions();
      loadTenderRates();
    }
  }, [tenderId, loadPositions, loadTenderRates]);

  // Load links for all works in a position
  const loadLinksForPosition = useCallback(async (positionId: string) => {
    console.log('🚀 Loading links for position:', positionId);
    
    try {
      const result = await workMaterialLinksApi.getLinksByPosition(positionId);
      console.log('📦 Links loaded for position:', result);
      
      if (result.error) {
        console.error('❌ Error loading links:', result.error);
        message.error(`Ошибка загрузки связей: ${result.error}`);
        return;
      }
      
      if (result.data) {
        // Получаем позицию и её работы
        const position = positions.find(p => p.id === positionId);
        
        // Group links by work ID and update calculations
        const linksByWork: Record<string, any[]> = {};
        result.data.forEach((link: any) => {
          // Находим работу для получения её объема
          const workItem = position?.boq_items?.find(item => item.id === link.work_boq_item_id);
          const workVolume = workItem?.quantity || 0;
          
          // Рассчитываем объем материала: объем работы * коэффициент расхода * коэффициент перевода
          const materialVolume = calculateMaterialVolume(
            workVolume,
            link.material_consumption_coefficient || 1,
            link.material_conversion_coefficient || 1
          );
          
          // Обновляем связь с правильным расчетом
          const updatedLink = {
            ...link,
            calculated_material_volume: materialVolume,
            total_material_needed: materialVolume,
            calculated_total: materialVolume * (link.material_unit_rate || 0)
          };
          
          if (!linksByWork[link.work_boq_item_id]) {
            linksByWork[link.work_boq_item_id] = [];
          }
          linksByWork[link.work_boq_item_id].push(updatedLink);
        });
        
        console.log('📋 Links grouped by work with updated calculations:', linksByWork);
        setAllWorkLinks(linksByWork);
        
        // Также обновляем элементы позиции для визуального отображения
        const freshResult = await boqApi.getHierarchicalByPosition(positionId);
        if (!freshResult.error && freshResult.data) {
          const updatedItems = freshResult.data;
          
          // Calculate new totals
          const newTotalCost = calculatePositionTotalCost(updatedItems, linksByWork);
          const materialsTotal = updatedItems.filter(i => i.item_type === 'material').reduce((sum, i) => sum + (i.total_amount || 0), 0);
          const worksTotal = updatedItems.filter(i => i.item_type === 'work').reduce((sum, i) => sum + (i.total_amount || 0), 0);
          
          // Update position totals in database
          const updateResult = await clientPositionsApi.update(positionId, {
            total_materials_cost: materialsTotal,
            total_works_cost: worksTotal
          });
          
          if (updateResult.error) {
            console.error('❌ Failed to update position totals:', updateResult.error);
          } else {
            console.log('✅ Position totals updated in database');
          }
          
          // Обновляем selectedPosition если это текущая позиция
          setSelectedPosition(prev => {
            if (prev && prev.id === positionId) {
              return {
                ...prev,
                boq_items: updatedItems,
                total_position_cost: newTotalCost,
                total_materials_cost: materialsTotal,
                total_works_cost: worksTotal
              };
            }
            return prev;
          });
          
          // Обновляем positions массив
          setPositions(prev => prev.map(p => {
            if (p.id === positionId) {
              return {
                ...p,
                boq_items: updatedItems,
                total_position_cost: newTotalCost,
                total_materials_cost: materialsTotal,
                total_works_cost: worksTotal
              };
            }
            return p;
          }));
        }
      }
    } catch (error) {
      console.error('💥 Error loading position links:', error);
    }
  }, [positions, boqApi]);

  // Open/close position
  const openModal = useCallback(async (position: PositionWithItems) => {
    console.log('🔄 Toggling position:', position.id);
    console.log('📋 Position details in openModal:', {
      id: position.id,
      position_number: position.position_number,
      item_no: position.item_no,
      work_name: position.work_name
    });
    
    if (!position.position_number && position.position_number !== 0) {
      console.error('❌ Position missing position_number!', position);
      message.error('Ошибка: У позиции отсутствует номер. Пожалуйста, обновите страницу.');
      return;
    }
    
    try {
      if (selectedPosition?.id !== position.id) {
        console.log('📂 Opening position:', position.id);
        // Opening a new position - load links
        await loadLinksForPosition(position.id);
        setSelectedPosition(position);
        console.log('✅ Position opened successfully');
      } else {
        console.log('📁 Closing position:', position.id);
        // Closing current position - clear links
        setSelectedPosition(null);
        setAllWorkLinks({});
        console.log('✅ Position closed successfully');
      }
    } catch (error) {
      console.error('💥 Error in openModal:', error);
      message.error('Ошибка при открытии позиции');
    }
    setFormData({
      type: 'work',
      name: '',
      unit: 'м²',
      quantity: '',
      price: '',
      consumptionCoefficient: '',
      conversionCoefficient: '',
      selectedItemId: null
    });
  }, [selectedPosition, loadLinksForPosition]);

  const closeModal = useCallback(() => {
    console.log('❌ Closing modal');
    setSelectedPosition(null);
    setFormData({
      type: 'work',
      name: '',
      unit: 'м²',
      quantity: '',
      price: '',
      consumptionCoefficient: '',
      conversionCoefficient: '',
      selectedItemId: null
    });
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((field: string, value: string) => {
    console.log('📝 Form field changed:', { field, value });
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Clear name and selected item when type changes
      if (field === 'type') {
        newData.name = '';
        newData.selectedItemId = null;
        newData.unit = 'м²'; // Reset to default unit
      }
      
      return newData;
    });
  }, []);

  // Handle autocomplete selection with auto-fill unit
  const handleItemSelect = useCallback((value: string, option: { id: string; name: string; unit: string }) => {
    console.log('✅ Item selected from autocomplete:', { value, option });
    setFormData(prev => ({
      ...prev,
      name: option.name,
      unit: option.unit,
      selectedItemId: option.id
    }));
  }, []);

  // Handle name change from autocomplete
  const handleNameChange = useCallback((value: string) => {
    console.log('📝 Name changed:', value);
    setFormData(prev => ({
      ...prev,
      name: value,
      // Clear selected ID if user types custom name
      selectedItemId: prev.name !== value ? null : prev.selectedItemId
    }));
  }, []);

  // Handle manual volume changes
  const handleManualVolumeChange = useCallback(
    (positionId: string, value: number | null) => {
      console.log('✏️ handleManualVolumeChange called:', { positionId, value });

      const oldValue = positions.find((p) => p.id === positionId)?.manual_volume ?? null;
      console.log('🔁 manual volume state change:', {
        positionId,
        oldValue,
        newValue: value,
      });
      setPositions((prev) =>
        prev.map((p) => (p.id === positionId ? { ...p, manual_volume: value } : p))
      );

      clientPositionsApi
        .update(positionId, { manual_volume: value })
        .then((result) => {
          console.log('📦 manual volume update result:', result);
          if (result.error) {
            console.error('❌ manual volume update failed:', result.error);
            message.error('Ошибка сохранения объема');
            setPositions((prev) =>
              prev.map((p) => (p.id === positionId ? { ...p, manual_volume: oldValue } : p))
            );
          } else {
            console.log('✅ manual volume updated successfully');
          }
        })
        .catch((error) => {
          console.error('💥 manual volume update exception:', error);
          message.error('Ошибка сохранения объема');
          setPositions((prev) =>
            prev.map((p) => (p.id === positionId ? { ...p, manual_volume: oldValue } : p))
          );
        });
    },
    [positions]
  );

  // Add new BOQ item with retry logic
  const addItem = useCallback(async () => {
    console.log('➕ Adding new BOQ item:', formData);
    
    // Для материалов не требуем объем, для работ - требуем
    if (!formData.name || !formData.price || !selectedPosition) {
      message.warning('Заполните наименование и цену');
      return;
    }
    
    if (formData.type === 'work' && !formData.quantity) {
      message.warning('Для работ необходимо указать объем');
      return;
    }

    try {
      console.log('🚀 Adding new BOQ item to position:', {
        id: selectedPosition.id,
        position_number: selectedPosition.position_number,
        item_no: selectedPosition.item_no,
        work_name: selectedPosition.work_name
      });
      
      // Check if position has valid position_number
      if (!selectedPosition.position_number && selectedPosition.position_number !== 0) {
        console.error('❌ Selected position missing position_number!', selectedPosition);
        message.error('Ошибка: У позиции отсутствует номер. Пожалуйста, обновите страницу.');
        return;
      }

      // Let the API handle sub_number and item_number generation
      // The API will also handle retries in case of duplicates
      
      // Проверяем selectedItemId на пустую строку
      const materialId = formData.type === 'material' && formData.selectedItemId && formData.selectedItemId !== '' 
        ? formData.selectedItemId 
        : null;
      const workId = formData.type === 'work' && formData.selectedItemId && formData.selectedItemId !== '' 
        ? formData.selectedItemId 
        : null;
      
      console.log('🔍 Form data before creating:', {
        type: formData.type,
        name: formData.name,
        selectedItemId: formData.selectedItemId,
        materialId,
        workId
      });
      
      const newItemData: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: selectedPosition.id,
        // Don't set item_number and sub_number - let crud.ts generate them
        // item_number and sub_number will be auto-generated
        item_type: formData.type,
        description: formData.name,
        unit: formData.unit,
        quantity: formData.type === 'material' ? 1 : parseFloat(formData.quantity || '0'),
        unit_rate: parseFloat(formData.price),
        consumption_coefficient: formData.type === 'material' && formData.consumptionCoefficient ? parseFloat(formData.consumptionCoefficient) : null,
        conversion_coefficient: formData.type === 'material' && formData.conversionCoefficient ? parseFloat(formData.conversionCoefficient) : null,
        delivery_price_type: formData.type === 'material' ? formData.deliveryPriceType : null,
        delivery_amount: formData.type === 'material' && formData.deliveryPriceType === 'amount' && formData.deliveryAmount ? parseFloat(formData.deliveryAmount) : null,
        material_id: materialId,
        work_id: workId,
        cost_node_id: formData.cost_node_id
      };

      console.log('📡 Creating BOQ item:', newItemData);
      const result = await boqItemsApi.create(newItemData);
      console.log('📦 Create result:', result);

      if (result.error) {
        console.error('❌ Create failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ BOQ item created successfully');
      
      // Use the complete BOQ item returned from the database
      const newBOQItem = result.data;
      if (!newBOQItem) {
        throw new Error('No data returned from create');
      }
      console.log('🎆 Created BOQ item from database:', newBOQItem);
      
      console.log('🎆 Adding new item to local state...');
      
      // Get fresh hierarchical BOQ items for the position to ensure we have the latest state
      const freshResult = await boqApi.getHierarchicalByPosition(selectedPosition.id);
      console.log('📥 Fresh result from API:', freshResult);
      
      const hierarchicalItems = freshResult.error ? [] : (freshResult.data || []);
      
      // Логируем все элементы для отладки
      console.log('🔍 All hierarchical items:');
      hierarchicalItems.forEach(item => {
        console.log(`  - ${item.item_type}: ${item.description} (id: ${item.id}, is_linked: ${(item as any).is_linked_material})`);
      });
      
      // Фильтруем только несвязанные элементы (работы и материалы, которые не являются linked)
      const updatedItems = hierarchicalItems.filter(item => !(item as any).is_linked_material);
      
      console.log('📊 Hierarchical items:', hierarchicalItems.length);
      console.log('📊 Filtered items (non-linked):', updatedItems.length);
      console.log('📊 New material added:', newBOQItem.description, newBOQItem.item_type, 'ID:', newBOQItem.id);
      
      // Проверяем, есть ли новый материал в списке
      const newItemInList = updatedItems.find(item => item.id === newBOQItem.id);
      console.log('🔎 New item found in list?', newItemInList ? 'YES' : 'NO');
      
      if (newBOQItem.item_type === 'material' && !newItemInList) {
        console.log('⚠️ New material not found in updated items, adding manually');
        console.log('📦 Material details:', newBOQItem);
        updatedItems.push(newBOQItem);
      }
      
      console.log('📋 Final updatedItems count:', updatedItems.length);
      console.log('📋 Final updatedItems IDs:', updatedItems.map(i => i.id));
      
      // Calculate total cost including only works and their linked materials
      const newTotalCost = calculatePositionTotalCost(updatedItems, allWorkLinks);
      
      console.log('🔄 Updated position items:', updatedItems.length);
      console.log('💰 New total cost:', newTotalCost);
      
      // Update position totals in database  
      const materialsTotal = updatedItems.filter(i => i.item_type === 'material').reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const worksTotal = updatedItems.filter(i => i.item_type === 'work').reduce((sum, i) => sum + (i.total_amount || 0), 0);
      
      const updateResult = await clientPositionsApi.update(selectedPosition.id, {
        total_materials_cost: materialsTotal,
        total_works_cost: worksTotal
      });
      
      if (updateResult.error) {
        console.error('❌ Failed to update position totals:', updateResult.error);
      } else {
        console.log('✅ Position totals updated in database');
      }
      
      // Сначала обновляем selectedPosition
      const updatedSelectedPosition = {
        ...selectedPosition,
        boq_items: updatedItems,
        total_position_cost: newTotalCost,
        total_materials_cost: materialsTotal,
        total_works_cost: worksTotal
      };
      
      setSelectedPosition(updatedSelectedPosition);
      
      // Затем обновляем positions
      setPositions(prev => prev.map(position => {
        if (position.id === selectedPosition.id) {
          return updatedSelectedPosition;
        }
        return position;
      }));
      
      console.log('✅ State updated with new items');
      
      // Если добавлен материал, нужно также обновить allWorkLinks
      // чтобы новый материал не был ошибочно скрыт
      if (newBOQItem.item_type === 'material') {
        console.log('🔄 Reloading links for position after adding material');
        // Перезагружаем связи для позиции, чтобы убедиться что новый материал отображается
        await loadLinksForPosition(selectedPosition.id);
        console.log('✅ Links reloaded');
      }
      
      message.success(`${formData.type === 'work' ? 'Работа' : 'Материал'} "${formData.name}" добавлена`);
      
      // Clear form - reset all fields
      setFormData({
        type: 'work',
        name: '',
        unit: 'м²',
        quantity: '',
        price: '',
        consumptionCoefficient: '',
        conversionCoefficient: '',
        selectedItemId: null,
        deliveryPriceType: 'included',
        deliveryAmount: '',
        cost_node_id: null,
        cost_node_display: null
      });

      // No need to reload positions - updated locally!
      console.log('✨ Local state updated, no reload needed');
    } catch (error: any) {
      console.error('💥 Error adding BOQ item:', error);
      message.error(error.message || 'Ошибка при добавлении элемента');
    }
  }, [formData, selectedPosition, tenderId]);

  // Remove BOQ sub-item
  const removeSubItem = useCallback(async (positionId: string, subItemId: string) => {
    console.log('🗑️ Removing sub-item:', { positionId, subItemId });
    
    try {
      // First find the position and item to delete
      const position = positions.find(p => p.id === positionId);
      const selectedPos = selectedPosition?.id === positionId ? selectedPosition : null;
      const targetPosition = selectedPos || position;
      
      if (!targetPosition) {
        console.error('❌ Position not found in state:', positionId);
        message.error('Ошибка: позиция не найдена');
        return;
      }
      
      // Find the item to delete for the success message
      const deletedItem = targetPosition.boq_items?.find(item => item.id === subItemId);
      if (!deletedItem) {
        console.error('❌ Item to delete not found:', subItemId);
        message.error('Ошибка: элемент не найден');
        return;
      }
      
      // Now delete from database
      console.log('📡 Deleting item from database...');
      const result = await boqItemsApi.delete(subItemId);
      console.log('📦 Delete result:', result);

      if (result.error) {
        console.error('❌ Delete failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Sub-item deleted successfully from database');
      
      // Filter out the deleted item from the position's items
      const updatedItems = (targetPosition.boq_items || []).filter(item => item.id !== subItemId);
      
      // If deleted item was a work, also remove its links from allWorkLinks
      if (deletedItem.item_type === 'work') {
        console.log('🔗 Removing links for deleted work:', subItemId);
        setAllWorkLinks(prev => {
          const newLinks = { ...prev };
          delete newLinks[subItemId];
          return newLinks;
        });
      }
      
      // Calculate total cost including only works and their linked materials
      const newTotalCost = calculatePositionTotalCost(updatedItems, allWorkLinks);
      
      console.log('🔄 Updated position after deletion - items:', updatedItems.length);
      console.log('💰 New total cost after deletion:', newTotalCost);
      
      // Update position totals in database
      const materialsTotal = updatedItems.filter(i => i.item_type === 'material').reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const worksTotal = updatedItems.filter(i => i.item_type === 'work').reduce((sum, i) => sum + (i.total_amount || 0), 0);
      
      const updateResult = await clientPositionsApi.update(positionId, {
        total_materials_cost: materialsTotal,
        total_works_cost: worksTotal
      });
      
      if (updateResult.error) {
        console.error('❌ Failed to update position totals:', updateResult.error);
      } else {
        console.log('✅ Position totals updated in database after deletion');
      }
      
      // Update both selectedPosition and positions
      const updatedPosition = {
        ...targetPosition,
        boq_items: updatedItems,
        total_position_cost: newTotalCost
      };
      
      // Update selectedPosition if it's the same position
      if (selectedPosition?.id === positionId) {
        setSelectedPosition(updatedPosition);
      }
      
      // Update positions array
      setPositions(prev => prev.map(p => {
        if (p.id === positionId) {
          return updatedPosition;
        }
        return p;
      }));
      
      // Show success message
      message.success(`${deletedItem?.item_type === 'work' ? 'Работа' : 'Материал'} успешно удален${deletedItem?.item_type === 'work' ? 'а' : ''}`);
      
      console.log('✅ UI updated after deletion');
      console.log('✨ Local state updated after deletion, no reload needed');
    } catch (error) {
      console.error('💥 Delete error:', error);
      message.error('Ошибка удаления элемента');
    }
  }, [positions, selectedPosition, allWorkLinks]);

  // Update BOQ sub-item
  const updateSubItem = useCallback(async (item: BOQItem, updates?: Partial<BOQItem>) => {
    // If no updates provided, open edit modal inline
    if (!updates) {
      console.log('✏️ Opening inline edit for:', item);
      setEditingItem(item);
      
      // Initialize form data with all fields for materials
      if (item.item_type === 'material') {
        setEditFormData({
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_rate: item.unit_rate || 0,
          consumption_coefficient: item.consumption_coefficient || 1,
          conversion_coefficient: item.conversion_coefficient || 1,
          delivery_price_type: item.delivery_price_type || 'included',
          delivery_amount: item.delivery_amount || 0,
          cost_node_id: (item as any).cost_node_id || null,
          cost_node_display: (item as any).cost_node_display || null,
          currency_type: item.currency_type || 'RUB',
          currency_rate: item.currency_rate || null
        });
      } else {
        // For works, use simpler form
        setEditFormData({
          description: item.description || '',
          quantity: item.quantity || 0,
          unit_rate: item.unit_rate || 0,
          cost_node_id: (item as any).cost_node_id || null,
          cost_node_display: (item as any).cost_node_display || null,
          currency_type: item.currency_type || 'RUB',
          currency_rate: item.currency_rate || null
        });
      }
      return;
    }
    
    console.log('✏️ Updating sub-item:', { itemId: item.id, updates });
    
    try {
      const result = await boqItemsApi.update(item.id, updates);
      console.log('📦 Update result:', result);

      if (result.error) {
        console.error('❌ Update failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Sub-item updated successfully');
      
      // Update local state immediately with calculated total_amount
      const positionId = item.client_position_id;
      
      // Find current position
      const currentPosition = positions.find(p => p.id === positionId);
      if (!currentPosition) return;
      
      // Update the item locally with calculated total_amount
      const updatedItems = currentPosition.boq_items?.map(boqItem => {
        if (boqItem.id === item.id) {
          // Calculate new total_amount based on quantity and unit_rate
          const newQuantity = updates.quantity !== undefined ? updates.quantity : boqItem.quantity;
          const newUnitRate = updates.unit_rate !== undefined ? updates.unit_rate : boqItem.unit_rate;
          const newTotalAmount = (newQuantity || 0) * (newUnitRate || 0);
          
          return {
            ...boqItem,
            ...updates,
            total_amount: newTotalAmount
          };
        }
        return boqItem;
      }) || [];
      
      // Calculate total cost including only works and their linked materials
      const newTotalCost = calculatePositionTotalCost(updatedItems, allWorkLinks);
      
      // Update position totals in database
      const materialsTotal = updatedItems.filter(i => i.item_type === 'material').reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const worksTotal = updatedItems.filter(i => i.item_type === 'work').reduce((sum, i) => sum + (i.total_amount || 0), 0);
      
      const updateResult = await clientPositionsApi.update(positionId, {
        total_materials_cost: materialsTotal,
        total_works_cost: worksTotal
      });
      
      if (updateResult.error) {
        console.error('❌ Failed to update position totals:', updateResult.error);
      } else {
        console.log('✅ Position totals updated in database after edit');
      }
      
      setPositions(prev => prev.map(position => {
        if (position.id === positionId) {
          console.log('🔄 Updated position after edit - items:', updatedItems.length);
          console.log('💰 New total cost after edit:', newTotalCost);
          
          return {
            ...position,
            boq_items: updatedItems,
            total_position_cost: newTotalCost,
            total_materials_cost: materialsTotal,
            total_works_cost: worksTotal
          };
        }
        return position;
      }));
      
      // Update selectedPosition if it matches the edited item's position
      setSelectedPosition(prev => {
        if (prev && prev.id === positionId) {
          return {
            ...prev,
            boq_items: updatedItems,
            total_position_cost: newTotalCost
          };
        }
        return prev;
      });
      
      message.success('Элемент обновлен');
      
      // No need to reload positions - updated locally!
      console.log('✨ Local state updated after edit, no reload needed');
    } catch (error) {
      console.error('💥 Update error:', error);
      message.error('Ошибка обновления элемента');
    }
  }, [positions, allWorkLinks, calculatePositionTotalCost, clientPositionsApi, boqItemsApi]);

  // Save edited item
  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    
    console.log('💾 Saving edited item:', editingItem.id);
    
    // Валидация курса валюты
    if (editFormData.currency_type !== 'RUB' && !editFormData.currency_rate) {
      message.error(`Не задан курс для ${editFormData.currency_type}. Обновите курсы валют в настройках тендера.`);
      return;
    }
    
    try {
      // Рассчитываем total_amount на клиенте
      const totalAmount = calculateTotalAmount({
        item_type: editingItem.item_type,
        unit_rate: editFormData.unit_rate,
        quantity: editFormData.quantity,
        currency_type: editFormData.currency_type,
        currency_rate: editFormData.currency_rate,
        delivery_price_type: editFormData.delivery_price_type,
        delivery_amount: editFormData.delivery_amount
      });
      
      const updates: Partial<BOQItem> = {
        description: editFormData.description,
        quantity: editFormData.quantity,
        unit_rate: editFormData.unit_rate,
        currency_type: editFormData.currency_type || 'RUB',
        currency_rate: editFormData.currency_rate,
        total_amount: totalAmount
      };
      
      // Call the update function with updates
      await updateSubItem(editingItem, updates);
      
      // Close edit modal
      setEditingItem(null);
      setEditFormData({
        description: '',
        quantity: 0,
        unit_rate: 0,
        currency_type: 'RUB'
      });
      
    } catch (error) {
      console.error('💥 Save edit error:', error);
      message.error('Ошибка сохранения изменений');
    }
  }, [editingItem, editFormData, updateSubItem, calculateTotalAmount]);

  // Handle update for BOQ item (materials with all fields)
  const handleUpdateBOQItem = useCallback(async () => {
    if (!editingItem) return;
    
    console.log('💾 Saving edited BOQ item:', editingItem.id);
    
    // Валидация курса валюты
    if (editFormData.currency_type !== 'RUB' && !editFormData.currency_rate) {
      message.error(`Не задан курс для ${editFormData.currency_type}. Обновите курсы валют в настройках тендера.`);
      return;
    }
    
    try {
      // Рассчитываем total_amount на клиенте
      const totalAmount = calculateTotalAmount({
        item_type: editingItem.item_type,
        unit_rate: editFormData.unit_rate,
        quantity: editFormData.quantity,
        currency_type: editFormData.currency_type,
        currency_rate: editFormData.currency_rate,
        delivery_price_type: editFormData.delivery_price_type,
        delivery_amount: editFormData.delivery_amount
      });
      
      // Prepare updates based on item type
      const updates: Partial<BOQItem> = {
        description: editFormData.description,
        quantity: editFormData.quantity,
        unit_rate: editFormData.unit_rate,
        cost_node_id: editFormData.cost_node_id,
        currency_type: editFormData.currency_type || 'RUB',
        currency_rate: editFormData.currency_rate,
        total_amount: totalAmount
      } as any;
      
      // Add material-specific fields
      if (editingItem.item_type === 'material') {
        updates.consumption_coefficient = editFormData.consumption_coefficient || 1;
        updates.conversion_coefficient = editFormData.conversion_coefficient || 1;
        updates.delivery_price_type = editFormData.delivery_price_type || 'included';
        updates.delivery_amount = editFormData.delivery_price_type === 'amount' ? (editFormData.delivery_amount || 0) : null;
      }
      
      // Call the update function with updates
      await updateSubItem(editingItem, updates);
      
      // Close edit modal
      setEditingItem(null);
      setEditFormData({
        description: '',
        quantity: 0,
        unit_rate: 0,
        consumption_coefficient: 1,
        conversion_coefficient: 1,
        delivery_price_type: 'included',
        delivery_amount: 0,
        currency_type: 'RUB'
      });
      
    } catch (error) {
      console.error('💥 Save edit error:', error);
      message.error('Ошибка сохранения изменений');
    }
  }, [editingItem, editFormData, updateSubItem, calculateTotalAmount]);

  // Открытие модального окна для перемещения материала
  const openMoveModal = useCallback((materialId: string, materialName: string, currentWorkId: string | null = null, isLinked: boolean = false, linkId?: string) => {
    console.log('🚀 Opening move modal for material:', materialId);
    
    // Найдем название текущей работы если материал привязан
    let currentWorkName = '';
    if (currentWorkId && selectedPosition) {
      const work = selectedPosition.boq_items?.find(item => item.id === currentWorkId);
      if (work) {
        currentWorkName = work.description || '';
      }
    }
    
    setMoveModal({
      visible: true,
      materialId,
      materialName,
      currentWorkId,
      currentWorkName,
      isLinkedMaterial: isLinked,
      linkId
    });
  }, [selectedPosition]);

  // Обработка перемещения материала в выбранную работу
  const handleMoveMaterial = useCallback(async (targetWorkId: string) => {
    if (!moveModal.materialId || !selectedPosition) return;
    
    console.log('🚀 Moving material to work:', { 
      materialId: moveModal.materialId, 
      targetWorkId,
      isLinked: moveModal.isLinkedMaterial,
      currentWorkId: moveModal.currentWorkId
    });
    
    try {
      if (moveModal.isLinkedMaterial && moveModal.currentWorkId) {
        // Перемещение уже связанного материала
        if (moveModal.linkId) {
          // Обновляем существующую связь
          const updateResult = await workMaterialLinksApi.updateLink(moveModal.linkId, {
            work_boq_item_id: targetWorkId
          });
          
          if (updateResult.error) {
            throw new Error(updateResult.error);
          }
          
          message.success(`Материал "${moveModal.materialName}" перемещен`);
        }
      } else {
        // Создание новой связи для несвязанного материала
        const linkData = {
          client_position_id: selectedPosition.id,
          work_boq_item_id: targetWorkId,
          material_boq_item_id: moveModal.materialId
        };
        
        console.log('📡 Creating link:', linkData);
        const createResult = await workMaterialLinksApi.createLink(linkData);
        
        if (createResult.error) {
          throw new Error(createResult.error);
        }
        
        message.success(`Материал "${moveModal.materialName}" привязан к работе`);
      }
      
      // Перезагружаем связи для обновления UI
      await loadLinksForPosition(selectedPosition.id);
      
      // Закрываем модальное окно
      setMoveModal({
        visible: false,
        materialId: null,
        materialName: '',
        currentWorkId: null,
        currentWorkName: '',
        isLinkedMaterial: false
      });
      
    } catch (error) {
      console.error('❌ Move error:', error);
      message.error('Ошибка перемещения материала');
    }
  }, [moveModal, selectedPosition, loadLinksForPosition]);

  // Обработка перетаскивания материала на работу (оставляем для обратной совместимости)
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active) return;
    
    // Получаем данные перетаскиваемого элемента и целевого элемента
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Check for Ctrl/Cmd key for copy mode
    const isCopy = (event as any).activatorEvent?.ctrlKey || (event as any).activatorEvent?.metaKey;
    
    console.log('🎯 Drag end:', { 
      active: activeData, 
      over: overData,
      activeId: active.id,
      overId: over.id,
      isCopy
    });
    
    // Проверяем, что материал перетаскивается на работу
    if (activeData?.type === 'material' && overData?.type === 'work') {
      const materialItem = activeData.item as BOQItem;
      const workItem = overData.item as BOQItem;
      
      // Check if this is a linked material being moved between works
      if (activeData.isLinkedMaterial && activeData.sourceWorkId && activeData.sourceWorkId !== workItem.id) {
        console.log('🔄 Moving linked material between works');
        await handleMaterialTransferBetweenWorks(
          activeData.sourceWorkId,
          workItem.id,
          materialItem.id,
          activeData.linkId,
          isCopy
        );
        return;
      }
      
      // Находим позицию для получения manual_volume
      const position = positions.find(p => 
        p.boq_items?.some(item => item.id === workItem.id)
      );
      
      if (!position) {
        message.error('Не удалось найти позицию для работы');
        return;
      }
      
      console.log('🔗 Creating link between material and work:', {
        material: materialItem.description,
        work: workItem.description,
        workVolume: workItem.quantity,
        materialCoefficients: {
          consumption: materialItem.consumption_coefficient,
          conversion: materialItem.conversion_coefficient
        }
      });
      
      // Создаем связь между материалом и работой
      const result = await workMaterialLinksApi.createLink({
        client_position_id: position.id,
        work_boq_item_id: workItem.id,
        material_boq_item_id: materialItem.id
      });
      
      if (result.error) {
        // Проверяем, не существует ли уже связь
        if (result.error.includes('duplicate') || result.error.includes('already exists')) {
          message.warning('Связь между этим материалом и работой уже существует');
        } else {
          message.error(`Ошибка создания связи: ${result.error}`);
        }
      } else {
        message.success('Материал успешно привязан к работе');
        
        // Обновляем объем материала на основе объема конкретной работы
        const calculatedVolume = (workItem.quantity || 0) * 
                                (materialItem.consumption_coefficient || 1) * 
                                (materialItem.conversion_coefficient || 1);
        
        console.log('📊 Calculated material volume:', {
          work_volume: workItem.quantity,
          consumption_coefficient: materialItem.consumption_coefficient,
          conversion_coefficient: materialItem.conversion_coefficient,
          result: calculatedVolume
        });
        
        // Перезагружаем связи и элементы позиции для обновления UI
        await loadLinksForPosition(position.id);
      }
    } else if (activeData?.type === 'material' && overData?.type === 'material') {
      // Перемещение материала в списке (изменение порядка)
      // TODO: Реализовать изменение порядка если необходимо
      console.log('📦 Reordering materials - not implemented yet');
    }
  }, [positions, loadLinksForPosition, loadPositions]);

  // Handle material transfer between works
  const handleMaterialTransferBetweenWorks = useCallback(async (
    sourceWorkId: string,
    targetWorkId: string,
    materialId: string,
    linkId: string,
    isCopy: boolean = false
  ) => {
    console.log('🚀 handleMaterialTransferBetweenWorks called:', { 
      sourceWorkId, 
      targetWorkId, 
      materialId, 
      linkId,
      isCopy 
    });
    
    try {
      // Call RPC function to move material
      const { data, error } = await supabase
        .rpc('rpc_move_material', {
          p_source_work: sourceWorkId,
          p_target_work: targetWorkId,
          p_material: materialId,
          p_new_index: 0,
          p_mode: isCopy ? 'copy' : 'move'
        });
      
      console.log('📦 RPC response:', { data, error });
      
      if (error) {
        console.error('❌ RPC error:', error);
        message.error('Ошибка перемещения материала');
        return;
      }
      
      // Check if there's a conflict
      if (data && data.conflict) {
        console.log('⚠️ Conflict detected, showing modal');
        
        // Get names for display
        const sourceWork = selectedPosition?.boq_items?.find(i => i.id === sourceWorkId);
        const targetWork = selectedPosition?.boq_items?.find(i => i.id === targetWorkId);
        const material = selectedPosition?.boq_items?.find(i => i.id === materialId);
        
        setConflictModal({
          visible: true,
          srcId: data.src_id,
          tgtId: data.tgt_id,
          targetWorkId: targetWorkId,
          materialName: material?.description || 'Материал',
          sourceworkName: sourceWork?.description || 'Работа А',
          targetWorkName: targetWork?.description || 'Работа Б'
        });
      } else if (data && data.ok) {
        console.log('✅ Material transferred successfully');
        message.success(isCopy ? 'Материал скопирован' : 'Материал перемещен');
        
        // Reload links for the position - this will also update BOQ items now
        if (selectedPosition) {
          await loadLinksForPosition(selectedPosition.id);
        }
      }
    } catch (error) {
      console.error('💥 Exception in material transfer:', error);
      message.error('Ошибка при перемещении материала');
    }
  }, [selectedPosition, loadLinksForPosition, boqApi, calculatePositionTotalCost, allWorkLinks]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback(async () => {
    console.log('🚀 handleConflictResolution called:', { 
      conflictModal, 
      conflictStrategy 
    });
    
    if (!conflictModal.srcId || !conflictModal.tgtId || !conflictModal.targetWorkId) {
      console.error('❌ Missing conflict data');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .rpc('rpc_resolve_conflict', {
          p_src_id: conflictModal.srcId,
          p_tgt_id: conflictModal.tgtId,
          p_target_work: conflictModal.targetWorkId,
          p_strategy: conflictStrategy
        });
      
      console.log('📦 Conflict resolution response:', { data, error });
      
      if (error) {
        console.error('❌ Conflict resolution error:', error);
        message.error('Ошибка разрешения конфликта');
      } else if (data && data.ok) {
        console.log('✅ Conflict resolved successfully');
        message.success(
          conflictStrategy === 'sum' 
            ? 'Объемы материалов суммированы' 
            : 'Материал заменен'
        );
        
        // Close modal
        setConflictModal({
          visible: false,
          srcId: null,
          tgtId: null,
          targetWorkId: null,
          materialName: '',
          sourceworkName: '',
          targetWorkName: ''
        });
        
        // Reload links and update UI - loadLinksForPosition now updates BOQ items too
        if (selectedPosition) {
          await loadLinksForPosition(selectedPosition.id);
        }
      }
    } catch (error) {
      console.error('💥 Exception in conflict resolution:', error);
      message.error('Ошибка при разрешении конфликта');
    }
  }, [conflictModal, conflictStrategy, selectedPosition, loadLinksForPosition, boqApi, calculatePositionTotalCost, allWorkLinks]);

  const handleDeleteLink = useCallback(async (linkId: string) => {
    console.log('🚀 Deleting link:', linkId);
    
    const result = await workMaterialLinksApi.deleteLink(linkId);
    
    if (result.error) {
      message.error('Ошибка удаления связи');
    } else {
      message.success('Связь удалена');
      
      // Обновляем allWorkLinks для отображения в карточке
      if (selectedPosition) {
        await loadLinksForPosition(selectedPosition.id);
      }
    }
  }, [selectedPosition, loadLinksForPosition]);

  // Удаление материала полностью (из связей и из BOQ)
  const handleDeleteMaterial = useCallback(async (materialId: string, linkId: string, materialName: string) => {
    console.log('🚀 Deleting material completely:', { materialId, linkId, materialName });
    
    try {
      // 1. Сначала удаляем связь
      console.log('🔗 Step 1: Deleting work-material link...');
      const linkDeleteResult = await workMaterialLinksApi.deleteLink(linkId);
      
      if (linkDeleteResult.error) {
        console.error('❌ Failed to delete link:', linkDeleteResult.error);
        message.error('Ошибка удаления связи материала');
        return;
      }
      
      console.log('✅ Link deleted successfully');
      
      // 2. Затем удаляем сам материал из BOQ
      console.log('🗑️ Step 2: Deleting material from BOQ...');
      const materialDeleteResult = await boqItemsApi.delete(materialId);
      
      if (materialDeleteResult.error) {
        console.error('❌ Failed to delete material:', materialDeleteResult.error);
        message.error('Ошибка удаления материала');
        return;
      }
      
      console.log('✅ Material deleted successfully');
      message.success(`Материал "${materialName}" удален`);
      
      // 3. Обновляем состояние локально
      if (selectedPosition) {
        console.log('🔄 Refreshing position data...');
        
        // Удаляем материал из списка BOQ items
        const updatedItems = selectedPosition.boq_items?.filter(item => item.id !== materialId) || [];
        
        // Пересчитываем общую стоимость
        const newTotalCost = calculatePositionTotalCost(updatedItems, allWorkLinks);
        
        // Обновляем totals в базе данных
        const materialsTotal = updatedItems.filter(i => i.item_type === 'material').reduce((sum, i) => sum + (i.total_amount || 0), 0);
        const worksTotal = updatedItems.filter(i => i.item_type === 'work').reduce((sum, i) => sum + (i.total_amount || 0), 0);
        
        await clientPositionsApi.update(selectedPosition.id, {
          total_materials_cost: materialsTotal,
          total_works_cost: worksTotal
        });
        
        // Обновляем selectedPosition
        const updatedSelectedPosition = {
          ...selectedPosition,
          boq_items: updatedItems,
          total_position_cost: newTotalCost,
          total_materials_cost: materialsTotal,
          total_works_cost: worksTotal
        };
        
        setSelectedPosition(updatedSelectedPosition);
        
        // Обновляем positions
        setPositions(prev => prev.map(position => {
          if (position.id === selectedPosition.id) {
            return updatedSelectedPosition;
          }
          return position;
        }));
        
        // Обновляем связи для отображения
        await loadLinksForPosition(selectedPosition.id);
        
        console.log('✨ State updated after material deletion');
      }
      
    } catch (error) {
      console.error('💥 Exception in handleDeleteMaterial:', error);
      message.error('Ошибка удаления материала');
    }
  }, [selectedPosition, workMaterialLinksApi, boqItemsApi, calculatePositionTotalCost, clientPositionsApi, allWorkLinks, loadLinksForPosition]);

  // Update linked material
  const handleUpdateLinkedMaterial = useCallback(async (linkId: string, materialId: string) => {
    console.log('🚀 Updating linked material:', { linkId, materialId, data: editingLinkData });
    
    try {
      // Обновляем сам материал
      if (editingLinkData.consumption_coefficient !== undefined || 
          editingLinkData.conversion_coefficient !== undefined ||
          editingLinkData.unit_rate !== undefined) {
        
        const materialUpdates: any = {};
        if (editingLinkData.consumption_coefficient !== undefined) {
          materialUpdates.consumption_coefficient = editingLinkData.consumption_coefficient;
        }
        if (editingLinkData.conversion_coefficient !== undefined) {
          materialUpdates.conversion_coefficient = editingLinkData.conversion_coefficient;
        }
        if (editingLinkData.unit_rate !== undefined) {
          materialUpdates.unit_rate = editingLinkData.unit_rate;
        }
        
        const result = await boqItemsApi.update(materialId, materialUpdates);
        
        if (result.error) {
          message.error('Ошибка обновления материала');
          return;
        }
      }
      
      message.success('Материал обновлен');
      setEditingLinkId(null);
      setEditingLinkData({});
      
      // Обновляем связи для позиции
      if (selectedPosition) {
        await loadLinksForPosition(selectedPosition.id);
      }
    } catch (error) {
      console.error('❌ Error updating material:', error);
      message.error('Ошибка обновления материала');
    }
  }, [selectedPosition, loadLinksForPosition, editingLinkData]);

  // Calculate totals
  const totalProject = positions.reduce((sum, position) => sum + (position.total_position_cost || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-6xl mx-auto">
        {/* Ультра-компактный заголовок */}
        <div className="bg-blue-600 text-white px-3 py-2 rounded-lg mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold">ВОР</h1>
              <span className="text-blue-100 text-xs">Позиций: {positions.length} | Элементов: {positions.reduce((sum, p) => sum + (p.boq_items?.length || 0), 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-100">Итого:</span>
              <span className="text-lg font-bold">{formatCurrency(totalProject)}</span>
            </div>
          </div>
        </div>

        {/* Карточки позиций - уменьшенный отступ */}
        <div className="grid grid-cols-1 gap-2">
          {positions.map((position) => {
            const positionItems = position.boq_items || [];
            const positionTotal = position.total_position_cost || 0;
            
            // Логируем для отладки отображения
            console.log('🎯 Rendering position:', position.id);
            console.log('💰 Position total from state:', positionTotal);
            console.log('📝 Position items count:', positionItems.length);
            
            if (selectedPosition?.id === position.id) {
              console.log('📝 Selected position items:', positionItems.map(i => ({
                id: i.id,
                type: i.item_type,
                desc: i.description,
                is_linked: (i as any).is_linked_material,
                amount: i.total_amount
              })));
              console.log('🔗 Current allWorkLinks:', allWorkLinks);
            }

            return (
              <div
                key={position.id}
                className={`bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-300 ${
                  selectedPosition?.id === position.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
              >
                {/* Заголовок карточки - ультра-компактный */}
                <div 
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => selectedPosition?.id === position.id ? setSelectedPosition(null) : openModal(position)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {position.item_no}. {position.work_name}
                        </h3>
                        {position.unit && (
                          <>
                            <span
                              className="text-xs text-gray-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('🖱️ Original volume display clicked for position:', position.id);
                              }}
                            >
                              ({formatQuantity(position.volume ?? 0)} {position.unit})
                            </span>
                            <div className="flex items-center gap-1">
                              <InputNumber
                                size="small"
                                min={0}
                                value={position.manual_volume ?? undefined}
                                placeholder="Ручной объём"
                                className="w-20"
                                onChange={(value) =>
                                  handleManualVolumeChange(position.id, value as number | null)
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🖱️ Manual volume input clicked for position:', position.id);
                                }}
                              />
                              <span
                                className="text-xs text-gray-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🖱️ Manual volume unit clicked for position:', position.id);
                                }}
                              >
                                {position.unit}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {position.client_note && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Прим: {position.client_note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {positionItems.length > 0 ? `${positionItems.length} поз.` : 'Пусто'}
                        </div>
                        <div className="text-sm font-bold text-blue-600">
                          {formatCurrency(positionTotal)}
                        </div>
                      </div>
                      {selectedPosition?.id === position.id ? (
                        <CloseOutlined style={{ fontSize: '16px', color: '#9CA3AF' }} />
                      ) : (
                        <EditOutlined style={{ fontSize: '16px', color: '#9CA3AF' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Развернутая форма внутри карточки - ультра-компактная */}
                {selectedPosition?.id === position.id && (
                  <div className="border-t bg-gray-50">
                    <div className="p-3">
                      {/* Список существующих позиций с drag-and-drop */}
                      {positionItems.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2 text-sm text-gray-700">
                            Добавленные позиции:
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              (перетащите материал на работу для создания связи)
                            </span>
                          </h4>
                              <div className="space-y-1">
                                {positionItems.map((subItem, index) => {
                                  // Проверяем, не является ли этот материал привязанным к какой-либо работе
                                  // Используем флаг is_linked_material из API вместо проверки allWorkLinks
                                  if ((subItem as any).is_linked_material) {
                                    // Этот материал уже отображается под работой, не показываем его отдельно
                                    return null;
                                  }
                                  
                                  // Дополнительная проверка через allWorkLinks для обратной совместимости
                                  if (subItem.item_type === 'material' && Object.keys(allWorkLinks).length > 0) {
                                    const isLinkedMaterial = Object.values(allWorkLinks).some((links: any) => 
                                      links.some((link: any) => link.material_boq_item_id === subItem.id)
                                    );
                                    
                                    if (isLinkedMaterial) {
                                      return null;
                                    }
                                  }
                                  
                                  // Рассчитываем общую стоимость материалов для работы
                                  let linkedMaterialsTotal = 0;
                                  if (subItem.item_type === 'work' && allWorkLinks[subItem.id]) {
                                    linkedMaterialsTotal = allWorkLinks[subItem.id].reduce((sum: number, link: any) => {
                                      return sum + (link.calculated_total || 0);
                                    }, 0);
                                  }
                                  
                                  return (
                                  <div key={subItem.id}>
                                    {subItem.item_type === 'work' ? (
                                      // Работы
                                      <div className="bg-white rounded border border-gray-300 mb-2">
                                        <div className="p-2 bg-gray-50 border-b border-gray-200">
                                          {editingItem?.id === subItem.id ? (
                                            // Inline edit form
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="text"
                                                  value={editFormData.description}
                                                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                                  placeholder="Название работы"
                                                />
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="number"
                                                  value={editFormData.quantity}
                                                  onChange={(e) => setEditFormData({...editFormData, quantity: parseFloat(e.target.value) || 0})}
                                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                                  placeholder="Кол-во"
                                                />
                                                <span className="text-xs text-gray-500">{subItem.unit}</span>
                                                <Select
                                                  size="small"
                                                  value={editFormData.currency_type || 'RUB'}
                                                  onChange={(value) => {
                                                    const rate = value !== 'RUB' ? tenderRates[`${value.toLowerCase()}_rate`] : null;
                                                    setEditFormData({
                                                      ...editFormData, 
                                                      currency_type: value,
                                                      currency_rate: rate
                                                    });
                                                  }}
                                                  className="w-20"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  {CURRENCY_OPTIONS.map(opt => (
                                                    <Select.Option key={opt.value} value={opt.value}>
                                                      {opt.symbol}
                                                    </Select.Option>
                                                  ))}
                                                </Select>
                                                <input
                                                  type="number"
                                                  value={editFormData.unit_rate}
                                                  onChange={(e) => setEditFormData({...editFormData, unit_rate: parseFloat(e.target.value) || 0})}
                                                  className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                                  placeholder="Цена за ед."
                                                  step="0.01"
                                                />
                                                {editFormData.currency_type !== 'RUB' && editFormData.currency_rate && (
                                                  <Tooltip title={`Курс: 1${CURRENCY_SYMBOLS[editFormData.currency_type]} = ${editFormData.currency_rate}₽`}>
                                                    <span className="text-xs text-gray-500">
                                                      = {formatCurrency(editFormData.unit_rate * editFormData.currency_rate)}
                                                    </span>
                                                  </Tooltip>
                                                )}
                                                <span className="text-sm font-semibold text-green-600">
                                                  Σ {formatCurrency(calculateTotalAmount({
                                                    item_type: subItem.item_type,
                                                    unit_rate: editFormData.unit_rate,
                                                    quantity: editFormData.quantity,
                                                    currency_type: editFormData.currency_type,
                                                    currency_rate: editFormData.currency_rate,
                                                    delivery_price_type: editFormData.delivery_price_type,
                                                    delivery_amount: editFormData.delivery_amount
                                                  }))}
                                                </span>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveEdit();
                                                  }}
                                                  className="text-green-500 hover:text-green-700 p-1"
                                                >
                                                  ✓
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingItem(null);
                                                  }}
                                                  className="text-gray-500 hover:text-gray-700 p-1"
                                                >
                                                  ✕
                                                </button>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-600">Затраты:</label>
                                                <div className="flex-1">
                                                  <CostCascadeSelector
                                                    value={editFormData.cost_node_id}
                                                    onChange={(costNodeId, displayValue) => {
                                                      setEditFormData({
                                                        ...editFormData,
                                                        cost_node_id: costNodeId,
                                                        cost_node_display: displayValue
                                                      });
                                                    }}
                                                    placeholder="Выберите категорию затрат"
                                                    style={{ fontSize: '12px' }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            // Normal display
                                            <div className="flex items-center justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm font-semibold">🔧 {subItem.description}</span>
                                                  <span className="text-xs text-gray-500">
                                                    {subItem.quantity} {subItem.unit} × {formatPriceWithCurrency(subItem.unit_rate || 0, subItem.currency_type)}/{subItem.unit}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-green-600">
                                                  {formatCurrency(subItem.total_amount || 0)}
                                                </span>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateSubItem(subItem);
                                                  }}
                                                  className="text-blue-500 hover:text-blue-700 p-1"
                                                >
                                                  <EditOutlined style={{ fontSize: '14px' }} />
                                                </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeSubItem(position.id, subItem.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1"
                                              >
                                                <CloseOutlined style={{ fontSize: '14px' }} />
                                              </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        {/* Отображение связанных материалов для работ */}
                                        {allWorkLinks[subItem.id] && allWorkLinks[subItem.id].length > 0 && (
                                  <div className="ml-6 mt-1 p-2 bg-blue-50 rounded border-l-2 border-blue-300">
                                    <div className="text-xs font-medium text-blue-700 mb-1">
                                      Связанные материалы:
                                    </div>
                                    <div className="space-y-1">
                                      {allWorkLinks[subItem.id].map((link: any) => {
                                        const isEditing = editingLinkId === (link.id || link.link_id);
                                        
                                        // Create a material item object for dragging
                                        const linkedMaterialItem = {
                                          id: link.material_boq_item_id,
                                          description: link.material_description,
                                          unit: link.material_unit,
                                          consumption_coefficient: link.material_consumption_coefficient,
                                          conversion_coefficient: link.material_conversion_coefficient,
                                          unit_rate: link.material_unit_rate,
                                          item_type: 'material' as const,
                                          is_linked_material: true
                                        };
                                        
                                        return (
                                        <div key={link.id} className="mb-1">
                                          <div className="flex flex-col gap-1 pb-1 border-b border-blue-200 last:border-0">
                                            <div className="flex items-center justify-between text-xs">
                                              <div className="flex items-center flex-1 gap-1">
                                                <span className="font-medium text-gray-700">{link.material_description}</span>
                                                <span className="text-gray-400">
                                                  {link.material_consumption_coefficient && link.material_consumption_coefficient !== 1 && (
                                                    <span className="ml-2">К.расх: {link.material_consumption_coefficient}</span>
                                                  )}
                                                  {link.material_conversion_coefficient && link.material_conversion_coefficient !== 1 && (
                                                    <span className="ml-2">К.пер: {link.material_conversion_coefficient}</span>
                                                  )}
                                                  <span className="ml-2">Цена: {formatCurrency(link.material_unit_rate || 0)}/{link.material_unit}</span>
                                                </span>
                                              </div>
                                            <div className="flex items-center gap-2">
                                              <div className="text-blue-600 font-semibold">
                                                {formatCurrency(link.calculated_total || 0)}
                                              </div>
                                              {!isEditing ? (
                                                <>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingLinkId(link.id || link.link_id);
                                                      setEditingLinkData({
                                                        consumption_coefficient: link.material_consumption_coefficient,
                                                        conversion_coefficient: link.material_conversion_coefficient,
                                                        unit_rate: link.material_unit_rate
                                                      });
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 p-0.5"
                                                    title="Редактировать материал"
                                                  >
                                                    <EditOutlined style={{ fontSize: '12px' }} />
                                                  </button>
                                                  <Tooltip title="Переместить в другую работу">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openMoveModal(
                                                          link.material_boq_item_id,
                                                          link.material_description,
                                                          subItem.id,
                                                          true,
                                                          link.id || link.link_id
                                                        );
                                                      }}
                                                      className="text-purple-500 hover:text-purple-700 p-0.5 transition-colors"
                                                      title="Переместить в другую работу"
                                                    >
                                                      <SendOutlined style={{ fontSize: '12px' }} />
                                                    </button>
                                                  </Tooltip>
                                                  <Tooltip title="Удалить материал">
                                                    <button
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        // Полное удаление материала
                                                        await handleDeleteMaterial(
                                                          link.material_boq_item_id, 
                                                          link.id || link.link_id, 
                                                          link.material_description
                                                        );
                                                      }}
                                                      className="text-red-600 hover:text-red-800 p-0.5 transition-colors"
                                                      title="Удалить материал"
                                                    >
                                                      <DeleteOutlined style={{ fontSize: '12px' }} />
                                                    </button>
                                                  </Tooltip>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleUpdateLinkedMaterial(link.id || link.link_id, link.material_boq_item_id);
                                                    }}
                                                    className="text-green-500 hover:text-green-700 p-0.5"
                                                    title="Сохранить"
                                                  >
                                                    ✓
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingLinkId(null);
                                                      setEditingLinkData({});
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700 p-0.5"
                                                    title="Отмена"
                                                  >
                                                    ✕
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          {!isEditing ? null : (
                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                              <div>
                                                <label className="block text-xs text-gray-600 mb-0.5">К. расхода</label>
                                                <InputNumber
                                                  size="small"
                                                  value={editingLinkData.consumption_coefficient}
                                                  onChange={(value) => setEditingLinkData({...editingLinkData, consumption_coefficient: value})}
                                                  min={0}
                                                  step={0.0001}
                                                  className="w-full text-xs"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-gray-600 mb-0.5">К. перевода</label>
                                                <InputNumber
                                                  size="small"
                                                  value={editingLinkData.conversion_coefficient}
                                                  onChange={(value) => setEditingLinkData({...editingLinkData, conversion_coefficient: value})}
                                                  min={0}
                                                  step={0.0001}
                                                  className="w-full text-xs"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs text-gray-600 mb-0.5">Цена (₽)</label>
                                                <InputNumber
                                                  size="small"
                                                  value={editingLinkData.unit_rate}
                                                  onChange={(value) => setEditingLinkData({...editingLinkData, unit_rate: value})}
                                                  min={0}
                                                  step={0.01}
                                                  className="w-full text-xs"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                        )}
                                      </div>
                                    ) : (
                                      // Несвязанные материалы
                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors mb-1">
                                        {editingItem?.id === subItem.id ? (
                                          // Inline edit form для материалов
                                          <div className="flex-1 space-y-2 p-2 bg-white border-2 border-blue-300 rounded">
                                            {/* Название материала */}
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-gray-600 w-24">Название:</label>
                                              <input
                                                type="text"
                                                value={editFormData.description}
                                                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Название материала"
                                              />
                                            </div>
                                            
                                            {/* Цена и единица измерения */}
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-gray-600 w-24">Цена:</label>
                                              <input
                                                type="number"
                                                value={editFormData.unit_rate}
                                                onChange={(e) => setEditFormData({...editFormData, unit_rate: parseFloat(e.target.value) || 0})}
                                                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Цена"
                                                step="0.01"
                                              />
                                              <span className="text-sm">₽/{subItem.unit}</span>
                                            </div>
                                            
                                            {/* Коэффициенты */}
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-gray-600 w-24">К. расхода:</label>
                                              <input
                                                type="number"
                                                value={editFormData.consumption_coefficient}
                                                onChange={(e) => setEditFormData({...editFormData, consumption_coefficient: parseFloat(e.target.value) || 1})}
                                                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="1.0000"
                                                step="0.0001"
                                              />
                                              <label className="text-xs text-gray-600 ml-2">К. перевода:</label>
                                              <input
                                                type="number"
                                                value={editFormData.conversion_coefficient}
                                                onChange={(e) => setEditFormData({...editFormData, conversion_coefficient: parseFloat(e.target.value) || 1})}
                                                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="1.0000"
                                                step="0.0001"
                                              />
                                            </div>
                                            
                                            {/* Категория затрат */}
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-gray-600 w-24">Затраты:</label>
                                              <div className="flex-1">
                                                <CostCascadeSelector
                                                  value={editFormData.cost_node_id}
                                                  onChange={(costNodeId, displayValue) => {
                                                    setEditFormData({
                                                      ...editFormData,
                                                      cost_node_id: costNodeId,
                                                      cost_node_display: displayValue
                                                    });
                                                  }}
                                                  placeholder="Выберите категорию затрат"
                                                  style={{ fontSize: '12px' }}
                                                />
                                              </div>
                                            </div>
                                            
                                            {/* Доставка */}
                                            <div className="flex items-center gap-2">
                                              <label className="text-xs text-gray-600 w-24">Доставка:</label>
                                              <select
                                                value={editFormData.delivery_price_type}
                                                onChange={(e) => setEditFormData({...editFormData, delivery_price_type: e.target.value as 'included' | 'not_included' | 'amount'})}
                                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                                              >
                                                <option value="included">В цене</option>
                                                <option value="not_included">Не в цене</option>
                                                <option value="amount">Суммой</option>
                                              </select>
                                              {editFormData.delivery_price_type === 'amount' && (
                                                <>
                                                  <input
                                                    type="number"
                                                    value={editFormData.delivery_amount}
                                                    onChange={(e) => setEditFormData({...editFormData, delivery_amount: parseFloat(e.target.value) || 0})}
                                                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                  />
                                                  <span className="text-sm">₽</span>
                                                </>
                                              )}
                                            </div>
                                            
                                            {/* Кнопки сохранения/отмены */}
                                            <div className="flex justify-end gap-2 pt-2 border-t">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingItem(null);
                                                }}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                              >
                                                Отмена
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUpdateBOQItem();
                                                }}
                                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                              >
                                                Сохранить
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{subItem.description}</span>
                                                <span className="text-xs text-gray-500">
                                                  {subItem.quantity} {subItem.unit}
                                                </span>
                                                {subItem.consumption_coefficient && subItem.consumption_coefficient !== 1 && (
                                                  <span className="text-xs text-gray-500">К.расх: {subItem.consumption_coefficient}</span>
                                                )}
                                                {subItem.conversion_coefficient && subItem.conversion_coefficient !== 1 && (
                                                  <span className="text-xs text-gray-500">К.пер: {subItem.conversion_coefficient}</span>
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-600 mt-1">
                                                Цена: {formatPriceWithCurrency(subItem.unit_rate || 0, subItem.currency_type)}/{subItem.unit}
                                                {subItem.currency_type && subItem.currency_type !== 'RUB' && subItem.currency_rate && (
                                                  <Tooltip title={`Курс: 1${CURRENCY_SYMBOLS[subItem.currency_type]} = ${subItem.currency_rate}₽`}>
                                                    <span className="ml-2 text-xs text-blue-600 cursor-help">
                                                      ({formatCurrency(subItem.unit_rate * subItem.currency_rate)})
                                                    </span>
                                                  </Tooltip>
                                                )}
                                                {(subItem as any).cost_node_display && (
                                                  <span className="ml-2 text-xs text-purple-600">
                                                    Затраты: {(subItem as any).cost_node_display}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-semibold text-blue-600">
                                                {formatCurrency(subItem.total_amount || 0)}
                                              </span>
                                              <Tooltip title="Привязать к работе">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openMoveModal(
                                                      subItem.id,
                                                      subItem.description || '',
                                                      null,
                                                      false
                                                    );
                                                  }}
                                                  className="text-purple-500 hover:text-purple-700 p-1 transition-colors"
                                                >
                                                  <LinkOutlined style={{ fontSize: '14px' }} />
                                                </button>
                                              </Tooltip>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateSubItem(subItem);
                                                }}
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                              >
                                                <EditOutlined style={{ fontSize: '14px' }} />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeSubItem(position.id, subItem.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1"
                                              >
                                                <CloseOutlined style={{ fontSize: '14px' }} />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                              </div>
                              );
                            })}
                              </div>
                        </div>
                      )}

                      {/* Форма добавления */}
                      <div className="bg-white p-3 rounded-lg border">
                        <h4 className="font-medium mb-2 text-sm text-gray-700">Добавить позицию:</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                              Тип
                            </label>
                            <select
                              value={formData.type}
                              onChange={(e) => handleInputChange('type', e.target.value)}
                              className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="work">🔧 Работы</option>
                              <option value="material">📦 Материалы</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                              Наименование
                            </label>
                            <AutoCompleteSearch
                              type={formData.type}
                              value={formData.name}
                              onChange={handleNameChange}
                              onSelect={handleItemSelect}
                              placeholder={`Поиск ${formData.type === 'work' ? 'работ' : 'материалов'} в справочнике...`}
                              className="w-full text-xs"
                            />
                          </div>
                        </div>

                        <div className={`grid grid-cols-1 ${formData.type === 'work' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2`}>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                              Ед. изм.
                            </label>
                            <select
                              value={formData.unit}
                              onChange={(e) => handleInputChange('unit', e.target.value)}
                              className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {units.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>

                          {/* Показываем поле объема только для работ */}
                          {formData.type === 'work' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                Объем
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.quantity}
                                onChange={(e) => handleInputChange('quantity', e.target.value)}
                                placeholder="0"
                                className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">
                              Цена (₽)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.price}
                              onChange={(e) => handleInputChange('price', e.target.value)}
                              placeholder="0"
                              className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Поля коэффициентов для материалов */}
                        {formData.type === 'material' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-0.5" title="Коэффициент расхода материала на единицу работ">
                                Коэф. расхода материала
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                value={formData.consumptionCoefficient}
                                onChange={(e) => handleInputChange('consumptionCoefficient', e.target.value)}
                                placeholder="1.0000"
                                className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-0.5" title="Коэффициент для перевода единиц измерения">
                                Коэф. перевода ед. изм.
                              </label>
                              <input
                                type="number"
                                step="0.0001"
                                value={formData.conversionCoefficient}
                                onChange={(e) => handleInputChange('conversionCoefficient', e.target.value)}
                                placeholder="1.0000"
                                className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* Поле выбора категории затрат */}
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-600 mb-0.5">
                            Категория затрат
                          </label>
                          <CostCascadeSelector
                            value={formData.cost_node_id}
                            onChange={(costNodeId, displayValue) => {
                              setFormData(prev => ({
                                ...prev,
                                cost_node_id: costNodeId,
                                cost_node_display: displayValue
                              }));
                              console.log('🚀 Cost category selected in BOQ form:', { costNodeId, displayValue });
                            }}
                            placeholder="Выберите категорию затрат"
                            style={{ fontSize: '12px' }}
                          />
                        </div>

                        {/* Поля доставки для материалов */}
                        {formData.type === 'material' && (
                          <div className="mt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                  Цена доставки
                                </label>
                                <select
                                  value={formData.deliveryPriceType}
                                  onChange={(e) => handleInputChange('deliveryPriceType', e.target.value)}
                                  className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="included">В цене</option>
                                  <option value="not_included">Не в цене</option>
                                  <option value="amount">Суммой</option>
                                </select>
                              </div>

                              {formData.deliveryPriceType === 'amount' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-0.5">
                                    Сумма доставки (₽)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={formData.deliveryAmount}
                                    onChange={(e) => handleInputChange('deliveryAmount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {((formData.type === 'work' && formData.quantity && formData.price) || 
                          (formData.type === 'material' && formData.price)) && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-blue-900">
                                {formData.type === 'material' ? 'Цена за единицу:' : 'Стоимость:'}
                              </span>
                              <span className="font-bold text-blue-600">
                                {formData.type === 'material' 
                                  ? formatCurrency(parseFloat(formData.price || '0'))
                                  : formatCurrency(parseFloat(formData.quantity || '0') * parseFloat(formData.price || '0'))}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem();
                            }}
                            disabled={!formData.name || !formData.price || (formData.type === 'work' && !formData.quantity)}
                            className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded text-xs hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            <PlusOutlined style={{ fontSize: '12px', marginRight: '2px' }} />
                            Добавить
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeModal();
                            }}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 transition-colors"
                          >
                            Свернуть
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {positions.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-base mb-2">
              Позиции заказчика не найдены
            </div>
            <p className="text-gray-500 text-sm">
              Создайте позиции заказчика для начала работы с ВОР
            </p>
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      <Modal
        title="Конфликт перемещения материала"
        open={conflictModal.visible}
        onOk={handleConflictResolution}
        onCancel={() => setConflictModal({
          visible: false,
          srcId: null,
          tgtId: null,
          targetWorkId: null,
          materialName: '',
          sourceworkName: '',
          targetWorkName: ''
        })}
        okText="Применить"
        cancelText="Отмена"
        width={500}
      >
        <div className="space-y-4">
          <p>
            Материал <strong>{conflictModal.materialName}</strong> уже привязан к работе <strong>{conflictModal.targetWorkName}</strong>.
          </p>
          <p>Выберите стратегию разрешения конфликта:</p>
          
          <Radio.Group 
            value={conflictStrategy} 
            onChange={(e) => setConflictStrategy(e.target.value)}
            className="space-y-2"
          >
            <Radio value="sum" className="block">
              <div>
                <div className="font-medium">Суммировать объемы</div>
                <div className="text-sm text-gray-500">
                  Объемы материала будут сложены, сохранив общее количество
                </div>
              </div>
            </Radio>
            <Radio value="replace" className="block">
              <div>
                <div className="font-medium">Заменить</div>
                <div className="text-sm text-gray-500">
                  Использовать коэффициенты из работы {conflictModal.sourceworkName}
                </div>
              </div>
            </Radio>
          </Radio.Group>
        </div>
      </Modal>

      {/* Модальное окно для перемещения материала */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SendOutlined className="text-purple-600" />
            <span>Переместить материал</span>
          </div>
        }
        open={moveModal.visible}
        onCancel={() => setMoveModal({
          visible: false,
          materialId: null,
          materialName: '',
          currentWorkId: null,
          currentWorkName: '',
          isLinkedMaterial: false
        })}
        footer={null}
        width={600}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm">
              <strong>Материал:</strong> {moveModal.materialName}
            </p>
            {moveModal.currentWorkId && (
              <p className="text-sm mt-1">
                <strong>Текущая работа:</strong> {moveModal.currentWorkName}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-3">
              Выберите работу для привязки материала:
            </p>
            
            {selectedPosition && selectedPosition.boq_items ? (
              <List
                dataSource={selectedPosition.boq_items.filter(item => 
                  item.item_type === 'work' && item.id !== moveModal.currentWorkId
                )}
                renderItem={(work) => (
                  <List.Item
                    className="cursor-pointer hover:bg-gray-50 px-3 py-2 rounded transition-colors"
                    onClick={() => handleMoveMaterial(work.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1">
                        <div className="font-medium">{work.description}</div>
                        <div className="text-sm text-gray-500">
                          {work.quantity} {work.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(work.total_amount || 0)}
                        </span>
                        <SendOutlined className="text-gray-400" />
                      </div>
                    </div>
                  </List.Item>
                )}
                locale={{
                  emptyText: (
                    <Empty
                      description="Нет доступных работ"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )
                }}
              />
            ) : (
              <Empty description="Нет доступных работ" />
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TenderBOQManagerNew;