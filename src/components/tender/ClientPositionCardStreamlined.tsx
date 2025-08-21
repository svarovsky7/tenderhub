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
  InputNumber
} from 'antd';
import {
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  BuildOutlined,
  ToolOutlined,
  LinkOutlined,
  ClearOutlined,
  FormOutlined,
  TableOutlined,
  GroupOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boqApi, clientPositionsApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import MaterialLinkingModal from './MaterialLinkingModal';
import GroupedBOQDisplay from './GroupedBOQDisplay';
import { DecimalInput } from '../common';
import CostDetailCascadeSelector from '../common/CostDetailCascadeSelector';
import CostCategoryDisplay from './CostCategoryDisplay';
import type { 
  BOQItemWithLibrary,
  BOQItemInsert
} from '../../lib/supabase/types';

const { Title, Text } = Typography;

interface ClientPositionCardStreamlinedProps {
  position: any;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
  tenderId: string;
}

interface QuickAddRowData {
  type: 'work' | 'material' | 'sub_work' | 'sub_material';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  work_id?: string;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  detail_cost_category_id?: string;
  cost_category_display?: string;
  delivery_price_type?: 'included' | 'not_included' | 'amount';
  delivery_amount?: number;
}

const ClientPositionCardStreamlined: React.FC<ClientPositionCardStreamlinedProps> = ({
  position,
  isExpanded,
  onToggle,
  onUpdate,
  tenderId
}) => {
  console.log('🚀 ClientPositionCardStreamlined rendered:', position.id);
  
  
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [linkingModalVisible, setLinkingModalVisible] = useState(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [linkingMaterialId, setLinkingMaterialId] = useState<string | null>(null);
  const [linkMaterialModalVisible, setLinkMaterialModalVisible] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
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
    
    // Use functional update to prevent infinite loops
    setLocalWorks(prevWorks => {
      // Only update if the works list actually changed
      const prevIds = prevWorks.map(w => w.id).sort().join(',');
      const newIds = updatedWorks.map(w => w.id).sort().join(',');
      
      if (prevIds !== newIds) {
        console.log('🔧 Updated available works for linking:', updatedWorks.length, updatedWorks.map(w => ({ id: w.id, desc: w.description })));
        return updatedWorks;
      }
      return prevWorks;
    });
  }, [positionItemsKey]);
  
  const works = localWorks;
  console.log('🔧 Current works for linking:', works.length, works.map(w => ({ id: w.id, desc: w.description })));

  // Sort BOQ items: works first, then their linked materials, then unlinked materials
  const sortedBOQItems = useMemo(() => {
    if (!position.boq_items || position.boq_items.length === 0) {
      return [];
    }

    console.log('🔄 Sorting BOQ items for table view');
    const items = [...position.boq_items];
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
    
    console.log('✅ Sorted items:', {
      total: sortedItems.length,
      works: works.length,
      linked: sortedItems.filter(i => (i.item_type === 'material' || i.item_type === 'sub_material') && i.work_link).length,
      unlinked: unlinkedMaterials.length,
      subMaterials: sortedItems.filter(i => i.item_type === 'sub_material').map(i => ({
        desc: i.description,
        hasLink: !!i.work_link,
        workId: i.work_link?.work_boq_item_id,
        subWorkId: i.work_link?.sub_work_boq_item_id
      }))
    });
    
    return sortedItems;
  }, [position.boq_items]);

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

  const manualNoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (manualNoteTimeoutRef.current) {
        clearTimeout(manualNoteTimeoutRef.current);
      }
    };
  }, []);

  const handleManualNoteChange = useCallback((value: string) => {
    console.log('✏️ handleManualNoteChange called:', { positionId: position.id, value });
    
    // Очищаем предыдущий таймаут
    if (manualNoteTimeoutRef.current) {
      clearTimeout(manualNoteTimeoutRef.current);
    }
    
    // Устанавливаем новый таймаут с задержкой 800мс
    manualNoteTimeoutRef.current = setTimeout(async () => {
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
    }, 800);
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
          delivery_amount: values.delivery_amount || 0
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
      onUpdate();
    } catch (error) {
      console.error('❌ Add item error:', error);
      message.error('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  }, [position, tenderId, works, quickAddForm, onUpdate]);

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
    const linkedWork = workLink ? position.boq_items?.find(boqItem => {
      // Check if this item is linked via work_boq_item_id (for regular work) 
      // or sub_work_boq_item_id (for sub_work)
      if (workLink.work_boq_item_id && boqItem.id === workLink.work_boq_item_id && boqItem.item_type === 'work') {
        return true;
      }
      if (workLink.sub_work_boq_item_id && boqItem.id === workLink.sub_work_boq_item_id && boqItem.item_type === 'sub_work') {
        return true;
      }
      return false;
    }) : undefined;
    
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
      delivery_amount: item.delivery_amount || 0
    });
  }, [editForm, position.boq_items, localWorks]);

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
      
      // Update the material itself INCLUDING coefficients and delivery fields
      const updateData: any = {
        description: values.description,
        unit: values.unit,
        quantity: finalQuantity,  // Use calculated quantity
        unit_rate: values.unit_rate,
        consumption_coefficient: values.consumption_coefficient || 1,
        conversion_coefficient: values.conversion_coefficient || 1,
        detail_cost_category_id: detailCostCategoryId,
        delivery_price_type: values.delivery_price_type || 'included',
        delivery_amount: values.delivery_amount || 0
      };
      
      // Add base_quantity for unlinked materials
      if (!values.work_id && (editingItem.item_type === 'material' || editingItem.item_type === 'sub_material')) {
        updateData.base_quantity = values.quantity; // Store the user-entered base value
      }
      
      const result = await boqApi.update(editingMaterialId, updateData);
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Handle work linking if changed - get links for this position
      const positionLinks = await workMaterialLinksApi.getLinksByPosition(position.id);
      const existingLink = !positionLinks.error && positionLinks.data?.find(
        link => link.material_boq_item_id === editingMaterialId || 
                link.sub_material_boq_item_id === editingMaterialId
      );
      const hasExistingLink = !!existingLink;
      const existingWorkId = existingLink?.work_boq_item_id || existingLink?.sub_work_boq_item_id || null;
      
      console.log('🔗 Existing link info:', {
        hasLink: hasExistingLink,
        existingWorkId,
        newWorkId: values.work_id,
        needsUpdate: values.work_id === existingWorkId
      });
      
      // Check if we need to update, create, or delete link
      if (values.work_id !== existingWorkId) {
        // Remove old link if exists
        if (hasExistingLink && existingLink?.id) {
          await workMaterialLinksApi.deleteLink(existingLink.id);
          console.log('🔗 Removed old link');
        }
        
        // Create new link if work_id is provided
        if (values.work_id) {
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
          console.log('✅ Material linked to work', linkResult);
        } else {
          console.log('✅ Material unlinked from work');
        }
      } else if (values.work_id && hasExistingLink && existingLink) {
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
      }
      
      console.log('✅ Material updated successfully');
      message.success('Материал обновлен и коэффициенты сохранены');
      setEditingMaterialId(null);
      editForm.resetFields();
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления материала');
    } finally {
      setLoading(false);
    }
  }, [editingMaterialId, position.id, works, editForm, onUpdate]);

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
    setEditingWorkId(item.id);
    workEditForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      detail_cost_category_id: item.detail_cost_category_id || null
    });
  }, [workEditForm]);

  // Save inline edited work
  const handleSaveWorkEdit = useCallback(async (values: any) => {
    if (!editingWorkId) return;
    
    console.log('💾 Saving work edits:', values);
    console.log('🔍 Validating detail_cost_category_id:', values.detail_cost_category_id);
    setLoading(true);
    try {
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
      
      const updateData = {
        ...values,
        detail_cost_category_id: detailCostCategoryId
      };
      
      console.log('💾 Final update data:', updateData);
      const result = await boqApi.update(editingWorkId, updateData);
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log('✅ Work updated successfully');
      message.success('Работа обновлена');
      setEditingWorkId(null);
      workEditForm.resetFields();
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления работы');
    } finally {
      setLoading(false);
    }
  }, [editingWorkId, workEditForm, onUpdate]);

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
      width: '10%',
      minWidth: 90,
      render: (type) => {
        switch(type) {
          case 'work':
            return <Tag icon={<BuildOutlined />} color="orange" className="text-xs">Работа</Tag>;
          case 'sub_work':
            return <Tag icon={<BuildOutlined />} color="purple" className="text-xs">Суб-раб</Tag>;
          case 'material':
            return <Tag icon={<ToolOutlined />} color="blue" className="text-xs">Материал</Tag>;
          case 'sub_material':
            return <Tag icon={<ToolOutlined />} color="green" className="text-xs">Суб-мат</Tag>;
          default:
            return <Tag className="text-xs">{type}</Tag>;
        }
      }
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      minWidth: 180,
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
      width: '6%',
      minWidth: 55,
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
      width: '6%',
      minWidth: 55,
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
      width: '10%',
      minWidth: 90,
      align: 'right',
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
                <div className="text-right py-1">
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
                <div className="text-right py-1">
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
          <div className="text-right py-1 text-sm">
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
      width: '5%',
      minWidth: 50,
      align: 'center',
      render: (text) => (
        <div className="text-center py-1 text-sm">{text}</div>
      )
    },
    {
      title: 'Цена',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: '10%',
      minWidth: 90,
      align: 'right',
      render: (value) => (
        <div className="text-right py-1 text-sm">
          {value?.toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} ₽
        </div>
      )
    },
    {
      title: 'Доставка',
      key: 'delivery',
      width: '10%',
      minWidth: 100,
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
      width: '12%',
      minWidth: 100,
      align: 'right',
      render: (_, record) => {
        // Используем total_amount из БД - там уже учтена доставка
        const total = record.total_amount || 0;
        
        // Получаем дополнительные данные для тултипа
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
        
        // Create tooltip content for materials with delivery
        let tooltipContent = null;
        if ((record.item_type === 'material' || record.item_type === 'sub_material')) {
          const deliveryType = record.delivery_price_type || 'included';
          const deliveryAmount = record.delivery_amount || 0;
          const baseTotal = quantity * unitRate;
          
          if (deliveryType === 'amount' && record.delivery_amount > 0) {
            const deliveryTotal = record.delivery_amount * quantity;
            tooltipContent = (
              <div>
                <div>Материал: {Math.round(baseTotal).toLocaleString('ru-RU')} ₽</div>
                <div>Доставка: {Math.round(deliveryTotal).toLocaleString('ru-RU')} ₽</div>
                <div className="border-t pt-1 mt-1">
                  <strong>Итого: {Math.round(total).toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            );
          } else if (deliveryType === 'not_included') {
            const deliveryPerUnit = deliveryAmount || 0; // Используем значение из БД
            const deliveryTotal = deliveryPerUnit * quantity;
            tooltipContent = (
              <div>
                <div>Материал: {Math.round(baseTotal).toLocaleString('ru-RU')} ₽</div>
                <div>Доставка: {Math.round(deliveryTotal).toLocaleString('ru-RU')} ₽</div>
                <div className="border-t pt-1 mt-1">
                  <strong>Итого: {Math.round(total).toLocaleString('ru-RU')} ₽</strong>
                </div>
              </div>
            );
          }
        }
        
        const totalElement = (
          <div className="whitespace-nowrap text-right">
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
      width: '15%',
      minWidth: 150,
      align: 'center',
      render: (detailCategoryId) => (
        <CostCategoryDisplay detailCategoryId={detailCategoryId} />
      )
    },
    {
      title: '',
      key: 'actions',
      width: '8%',
      minWidth: 80,
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

  // Work Edit Row (inline editing)
  const WorkEditRow = ({ item }: { item: BOQItemWithLibrary }) => (
    <tr>
      <td colSpan={10} style={{ padding: 0 }}>
        <Form
          form={workEditForm}
          layout="vertical"
          onFinish={handleSaveWorkEdit}
          className="w-full"
          style={{ padding: '12px', backgroundColor: '#e6f7ff' }}
        >
          <Row gutter={16} align="middle">
            <Col xs={3} sm={2}>
              <Text className="font-mono text-xs">{item.item_number}</Text>
            </Col>
            <Col xs={3} sm={2}>
              {item.item_type === 'sub_work' ? (
                <Tag icon={<BuildOutlined />} color="volcano">Суб-раб</Tag>
              ) : (
                <Tag icon={<BuildOutlined />} color="green">Работа</Tag>
              )}
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item
                name="description"
                className="mb-0"
                rules={[{ required: true, message: 'Обязательно' }]}
              >
                <Input placeholder="Наименование работы" />
              </Form.Item>
            </Col>
            <Col xs={8} sm={4} md={3}>
              <Form.Item
                name="quantity"
                className="mb-0"
                rules={[{ required: true, message: 'Кол-во' }]}
              >
                <DecimalInput 
                  placeholder="Кол-во" 
                  min={0}
                  precision={2}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={8} sm={4} md={3}>
              <Form.Item
                name="unit"
                className="mb-0"
                rules={[{ required: true, message: 'Ед.' }]}
              >
                <Input placeholder="Ед." />
              </Form.Item>
            </Col>
            <Col xs={8} sm={4} md={3}>
              <Form.Item
                name="unit_rate"
                className="mb-0"
                rules={[{ required: true, message: 'Цена' }]}
              >
                <DecimalInput 
                  placeholder="Цена" 
                  min={0}
                  precision={2}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="detail_cost_category_id"
                className="mb-0"
                getValueFromEvent={(value) => value}
              >
                <CostDetailCascadeSelector
                  placeholder="Категория затрат"
                  onChange={(value, display) => {
                    workEditForm.setFieldValue('detail_cost_category_id', value);
                    workEditForm.setFieldValue('cost_category_display', display);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Text strong className="text-green-600">
                {Math.round((workEditForm.getFieldValue('quantity') || 0) * 
                  (workEditForm.getFieldValue('unit_rate') || 0)).toLocaleString('ru-RU')} ₽
              </Text>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="small">
                  Сохранить
                </Button>
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={handleCancelWorkEdit}
                  size="small"
                >
                  Отмена
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </td>
    </tr>
  );

  // Material Edit Row (inline editing) with improved responsive layout
  const MaterialEditRow = ({ item }: { item: BOQItemWithLibrary }) => (
    <tr>
      <td colSpan={10} style={{ padding: 0 }}>
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveInlineEdit}
          className="w-full"
          style={{ padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}
        >
          {/* Main edit row */}
          <Row gutter={[12, 8]} className="w-full">
            <Col xs={24} sm={2} md={2} lg={2}>
              <div className="flex items-center h-8">
                <Text className="font-mono text-xs">{item.item_number}</Text>
              </div>
            </Col>
            <Col xs={24} sm={3} md={3} lg={2}>
              <div className="flex items-center h-8">
                {item.item_type === 'sub_material' ? (
                  <Tag icon={<ToolOutlined />} color="purple">Суб-мат</Tag>
                ) : (
                  <Tag icon={<ToolOutlined />} color="blue">Материал</Tag>
                )}
              </div>
            </Col>
            <Col xs={24} sm={8} md={6} lg={6}>
              <Form.Item
                name="description"
                className="mb-0"
                rules={[{ required: true, message: 'Обязательно' }]}
              >
                <Input placeholder="Наименование" size="small" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4} md={3} lg={3}>
              <Form.Item
                name="quantity"
                className="mb-0"
                rules={[{ required: true, message: 'Кол-во' }]}
              >
                <DecimalInput 
                  placeholder="Кол-во" 
                  min={0}
                  precision={2}
                  className="w-full"
                  size="small"
                  disabled={!!editForm.getFieldValue('work_id')}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4} md={3} lg={2}>
              <Form.Item
                name="unit"
                className="mb-0"
                rules={[{ required: true, message: 'Ед.' }]}
              >
                <Input placeholder="Ед." size="small" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4} md={3} lg={3}>
              <Form.Item
                name="unit_rate"
                className="mb-0"
                rules={[{ required: true, message: 'Цена' }]}
              >
                <DecimalInput 
                  placeholder="Цена" 
                  min={0}
                  precision={2}
                  className="w-full"
                  size="small"
                  formatter={value => {
                    const num = parseFloat(`${value}`);
                    if (!isNaN(num)) {
                      return num.toLocaleString('ru-RU', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      });
                    }
                    return `${value}`;
                  }}
                  parser={value => value!.replace(/\s/g, '').replace(',', '.')}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <div className="flex items-center h-8">
                <Text strong className="text-green-600 whitespace-nowrap">
                  {Math.round((editForm.getFieldValue('quantity') || 0) * 
                    (editForm.getFieldValue('unit_rate') || 0)).toLocaleString('ru-RU')} ₽
                </Text>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Space size="small" className="flex justify-end">
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="small">
                  Сохранить
                </Button>
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={handleCancelInlineEdit}
                  size="small"
                >
                  Отмена
                </Button>
              </Space>
            </Col>
          </Row>
          {/* Second row for cost category */}
          <Row gutter={[12, 8]} className="w-full mt-2">
            <Col xs={24} sm={16} md={14} lg={12}>
              <Form.Item
                name="detail_cost_category_id"
                className="mb-2"
                getValueFromEvent={(value) => value}
              >
                <CostDetailCascadeSelector
                  placeholder="Категория затрат"
                  onChange={(value, display) => {
                    editForm.setFieldValue('detail_cost_category_id', value);
                    editForm.setFieldValue('cost_category_display', display);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          {/* Additional fields for materials - work linking */}
          {works.length > 0 && (
            <Row gutter={[12, 8]} className="w-full mt-3 pt-3 border-t border-blue-200">
              <Col xs={24} sm={12} md={10} lg={8}>
                <Form.Item
                  name="work_id"
                  className="mb-0"
                  label={<Text strong>Привязать к работе</Text>}
                >
                  <Select 
                    placeholder="Выберите работу" 
                    allowClear
                    size="small"
                    className="w-full"
                    onChange={handleWorkSelectionChange}
                    optionFilterProp="children"
                    showSearch
                  >
                    {works.map(work => (
                      <Select.Option key={work.id} value={work.id}>
                        {work.item_type === 'sub_work' ? '[СУБ] ' : ''}{work.description} (Объем: {work.quantity} {work.unit})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={7} lg={4}>
                <Form.Item
                  name="consumption_coefficient"
                  className="mb-0"
                  label={
                    <Space size={4}>
                      <Text strong>Коэф. расхода</Text>
                      <Tooltip title="Значение коэфф. расхода не может быть менее 1,00. При вводе значения менее 1 оно будет автоматически заменено на 1">
                        <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                      </Tooltip>
                    </Space>
                  }
                >
                  <DecimalInput 
                    min={1}
                    max={9999}
                    precision={4} 
                    className="w-full"
                    size="small"
                    onChange={handleCoefficientChange}
                    placeholder="1.0000"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={7} lg={4}>
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                  prevValues.work_id !== currentValues.work_id
                }>
                  {({ getFieldValue }) => (
                    <Form.Item
                      name="conversion_coefficient"
                      className="mb-0"
                      label={
                        <Tooltip title={!getFieldValue('work_id') ? 'Доступно только при привязке к работе' : 'Коэффициент перевода единиц измерения'}>
                          <Text strong className={!getFieldValue('work_id') ? 'text-gray-400' : ''}>
                            Коэф. перевода
                          </Text>
                        </Tooltip>
                      }
                    >
                      <DecimalInput 
                        min={0.01}
                        max={9999}
                        precision={4} 
                        className="w-full"
                        size="small"
                        disabled={!getFieldValue('work_id')}
                        onChange={handleCoefficientChange}
                        placeholder="1.0000"
                      />
                    </Form.Item>
                  )}
                </Form.Item>
              </Col>
            </Row>
          )}
          
          {/* Delivery fields for materials and sub-materials */}
          <Row gutter={[12, 8]} className="w-full mt-3 pt-3 border-t border-blue-200">
            <Col xs={12} sm={8} md={6} lg={4}>
              <Form.Item
                name="delivery_price_type"
                label={<Text strong>Тип доставки</Text>}
                className="mb-0"
              >
                <Select
                  placeholder="Тип доставки"
                  style={{ width: '100%' }}
                  size="small"
                >
                  <Select.Option value="included">Включена</Select.Option>
                  <Select.Option value="not_included">Не включена (3%)</Select.Option>
                  <Select.Option value="amount">Фиксированная сумма</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.delivery_price_type !== currentValues.delivery_price_type
                }
              >
                {({ getFieldValue }) => {
                  const deliveryType = getFieldValue('delivery_price_type');
                  return (
                    <Form.Item
                      name="delivery_amount"
                      label={<Text strong>Сумма доставки</Text>}
                      className="mb-0"
                    >
                      <DecimalInput
                        min={0}
                        precision={2}
                        placeholder="0.00"
                        disabled={deliveryType !== 'amount'}
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </td>
    </tr>
  );

  // Quick add row with improved responsive layout
  const QuickAddRow = () => (
    <Form
      form={quickAddForm}
      layout="vertical"
      onFinish={handleQuickAdd}
      className="w-full"
    >
      {/* Main add row */}
      <Row gutter={[12, 8]} className="w-full">
        <Col xs={24} sm={6} md={4} lg={3}>
          <Form.Item
            name="type"
            initialValue="work"
            className="mb-0"
            label={<Text strong>Тип</Text>}
          >
            <Select className="w-full" size="small">
              <Select.Option value="work">Работа</Select.Option>
              <Select.Option value="material">Материал</Select.Option>
              <Select.Option value="sub_work">Суб-раб</Select.Option>
              <Select.Option value="sub_material">Суб-мат</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={8} lg={7}>
          <Form.Item
            name="description"
            className="mb-0"
            label={<Text strong>Наименование</Text>}
            rules={[{ required: true, message: 'Обязательно' }]}
          >
            <Input placeholder="Наименование" size="small" />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6} md={3} lg={3}>
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
            prevValues.type !== currentValues.type || prevValues.work_id !== currentValues.work_id
          }>
            {({ getFieldValue }) => {
              const isMaterial = getFieldValue('type') === 'material' || getFieldValue('type') === 'sub_material';
              const hasWorkSelected = !!getFieldValue('work_id');
              const showTooltip = isMaterial && hasWorkSelected;
              
              return (
                <Form.Item
                  name="quantity"
                  className="mb-0"
                  label={
                    <Space size={4}>
                      <Text strong>Кол-во</Text>
                      {showTooltip && (
                        <Tooltip title="Количество рассчитывается автоматически: Объём работы × Коэф. расхода × Коэф. перевода">
                          <QuestionCircleOutlined style={{ color: '#1890ff', fontSize: '12px', cursor: 'help' }} />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  rules={[{ required: true, message: 'Кол-во' }]}
                >
                  <DecimalInput 
                    placeholder="Кол-во" 
                    min={0}
                    precision={4}
                    className="w-full"
                    size="small"
                    disabled={showTooltip}
                    style={showTooltip ? { backgroundColor: '#f5f5f5' } : {}}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Col>
        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Item
            name="unit"
            className="mb-0"
            label={<Text strong>Ед.</Text>}
            rules={[{ required: true, message: 'Ед.' }]}
          >
            <Input placeholder="Ед." size="small" />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6} md={3} lg={3}>
          <Form.Item
            name="unit_rate"
            className="mb-0"
            label={<Text strong>Цена</Text>}
            rules={[{ required: true, message: 'Цена' }]}
          >
            <DecimalInput 
              placeholder="Цена" 
              min={0}
              precision={2}
              className="w-full"
              size="small"
              formatter={value => {
                const num = parseFloat(`${value}`);
                if (!isNaN(num)) {
                  return num.toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  });
                }
                return `${value}`;
              }}
              parser={value => value!.replace(/\s/g, '').replace(',', '.')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={6} lg={5}>
          <Form.Item
            name="detail_cost_category_id"
            className="mb-0"
            label={<Text strong>Категория затрат</Text>}
            getValueFromEvent={(value) => value}
          >
            <CostDetailCascadeSelector
              placeholder="Выберите категорию"
              style={{ width: '100%' }}
              onChange={(value, display) => {
                quickAddForm.setFieldValue('detail_cost_category_id', value);
                quickAddForm.setFieldValue('cost_category_display', display);
              }}
            />
          </Form.Item>
        </Col>
      </Row>
      
      {/* Additional fields for materials and sub-materials - work linking */}
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
        {({ getFieldValue }) =>
          (getFieldValue('type') === 'material' || getFieldValue('type') === 'sub_material') && works.length > 0 && (
            <>
            <Row gutter={[12, 8]} className="w-full mt-3 pt-3 border-t border-blue-200">
              <Col xs={12} sm={12} md={5} lg={4}>
                <Form.Item
                  name="work_id"
                  className="mb-0"
                  label={<Text strong>Привязать к работе</Text>}
                >
                  <Select 
                    placeholder={works.length > 0 ? "Выберите работу" : "Сначала добавьте работу"}
                    allowClear
                    size="small"
                    className="w-full"
                    optionFilterProp="children"
                    showSearch
                    disabled={works.length === 0}
                    onChange={(workId) => {
                      console.log('🎯 Work selected in quick add form:', workId);
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
                        console.log('📊 Auto-calculated quantity:', calculatedQuantity);
                      }
                    }}
                  >
                    {works.map(work => (
                      <Select.Option key={work.id} value={work.id}>
                        {work.item_type === 'sub_work' ? '[СУБ] ' : ''}{work.description} (Объем: {work.quantity} {work.unit})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={6} sm={6} md={3} lg={2}>
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const consumptionValue = getFieldValue('consumption_coefficient');
                    const hasError = consumptionValue && consumptionValue < 1;
                    
                    return (
                      <Form.Item
                        name="consumption_coefficient"
                        className="mb-0"
                        label={
                          <Space size={4}>
                            <Text strong>Коэф. расхода</Text>
                            <Tooltip title="Значение коэфф. расхода не может быть менее 1,00. При вводе значения менее 1 оно будет автоматически заменено на 1">
                              <QuestionCircleOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                            </Tooltip>
                          </Space>
                        }
                        initialValue={1}
                        validateStatus={hasError ? 'error' : ''}
                      >
                        <DecimalInput 
                          min={1}
                          max={9999}
                          precision={4} 
                          className="w-full"
                          size="small"
                          style={hasError ? { borderColor: '#ff4d4f', boxShadow: '0 0 0 2px rgba(255, 77, 79, 0.2)' } : {}}
                          onChange={() => {
                            const workId = quickAddForm.getFieldValue('work_id');
                            if (!workId) return;
                            const work = works.find(w => w.id === workId);
                            if (work && work.quantity) {
                              const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                              const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                              const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                              
                              // Check for overflow
                              const MAX_NUMERIC_VALUE = 99999999.9999;
                              if (calculatedQuantity > MAX_NUMERIC_VALUE) {
                                message.warning(`Количество слишком большое: ${calculatedQuantity.toLocaleString('ru-RU')}. Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}`);
                                quickAddForm.setFieldsValue({ quantity: MAX_NUMERIC_VALUE });
                              } else {
                                quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                              }
                            }
                          }}
                        />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
              <Col xs={6} sm={6} md={3} lg={2}>
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                  prevValues.work_id !== currentValues.work_id
                }>
                  {({ getFieldValue }) => (
                    <Form.Item
                      name="conversion_coefficient"
                      className="mb-0"
                      label={
                        <Tooltip title={!getFieldValue('work_id') ? 'Доступно только при привязке к работе' : 'Коэффициент перевода единиц измерения'}>
                          <Text strong className={!getFieldValue('work_id') ? 'text-gray-400' : ''}>
                            Коэф. перевода
                          </Text>
                        </Tooltip>
                      }
                      initialValue={1}
                    >
                      <DecimalInput 
                        min={0.01}
                        max={9999}
                        precision={4} 
                        className="w-full"
                        size="small"
                        disabled={!getFieldValue('work_id')}
                        onChange={() => {
                          const workId = quickAddForm.getFieldValue('work_id');
                          if (!workId) return;
                          const work = works.find(w => w.id === workId);
                          if (work && work.quantity) {
                            const consumptionCoef = quickAddForm.getFieldValue('consumption_coefficient') || 1;
                            const conversionCoef = quickAddForm.getFieldValue('conversion_coefficient') || 1;
                            const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;
                            
                            // Check for overflow
                            const MAX_NUMERIC_VALUE = 99999999.9999;
                            if (calculatedQuantity > MAX_NUMERIC_VALUE) {
                              message.warning(`Количество слишком большое: ${calculatedQuantity.toLocaleString('ru-RU')}. Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}`);
                              quickAddForm.setFieldsValue({ quantity: MAX_NUMERIC_VALUE });
                            } else {
                              quickAddForm.setFieldsValue({ quantity: calculatedQuantity });
                            }
                          }
                        }}
                      />
                    </Form.Item>
                  )}
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={3} lg={2}>
                <Form.Item
                  name="delivery_price_type"
                  label={<Text strong>Доставка</Text>}
                  initialValue="included"
                  className="mb-0"
                >
                  <Select
                    placeholder="Тип"
                    style={{ width: '100%' }}
                    size="small"
                  >
                    <Select.Option value="included">Включена</Select.Option>
                    <Select.Option value="not_included">Не включена (3%)</Select.Option>
                    <Select.Option value="amount">Сумма</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={3} lg={2}>
                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => 
                    prevValues.delivery_price_type !== currentValues.delivery_price_type
                  }
                >
                  {({ getFieldValue }) => {
                    const deliveryType = getFieldValue('delivery_price_type');
                    return (
                      <Form.Item
                        name="delivery_amount"
                        label={<Text strong>Сумма</Text>}
                        className="mb-0"
                        rules={[
                          {
                            required: deliveryType === 'amount',
                            message: 'Сумма'
                          }
                        ]}
                      >
                        <DecimalInput
                          min={0}
                          precision={2}
                          placeholder="0.00"
                          disabled={deliveryType !== 'amount'}
                          style={{ width: '100%' }}
                          size="small"
                        />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
            </>
          )
        }
      </Form.Item>
      
      {/* Action buttons - moved to the bottom */}
      <Row gutter={[12, 8]} className="mt-3">
        <Col xs={24}>
          <Form.Item className="mb-0">
            <Space className="w-full" size="small">
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="small">
                Сохранить
              </Button>
              <Button 
                icon={<CloseOutlined />} 
                size="small"
                onClick={() => {
                  setQuickAddMode(false);
                  quickAddForm.resetFields();
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

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
          border: isExpanded ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
          width: '100%'
        }}
      >
        {/* Header with improved responsive layout */}
        <div 
          className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          onClick={onToggle}
        >
          <Row gutter={[16, 8]} align="middle" className="w-full">
            {/* Icon and Position Number */}
            <Col xs={24} sm={6} md={4} lg={3}>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <FolderOpenOutlined className="text-xl text-blue-500" />
                ) : (
                  <FolderOutlined className="text-xl text-gray-400" />
                )}
                <Tag color="blue" className="font-mono">{position.position_number}</Tag>
              </div>
            </Col>
            
            {/* Work Name with client data */}
            <Col xs={24} sm={18} md={12} lg={10}>
              <div>
                <Title level={5} className="mb-1" ellipsis={{ tooltip: position.work_name }}>
                  {position.work_name}
                </Title>
                <div className="flex flex-wrap gap-3 mt-1">
                  {position.unit && (
                    <Tooltip title="Единица измерения">
                      <Text className="text-xs text-gray-600">
                        <span className="text-gray-500">Ед.изм:</span> <strong>{position.unit}</strong>
                      </Text>
                    </Tooltip>
                  )}
                  {position.volume && (
                    <Tooltip title="Количество">
                      <Text className="text-xs text-gray-600">
                        <span className="text-gray-500">Кол-во:</span> <strong>{position.volume}</strong>
                      </Text>
                    </Tooltip>
                  )}
                  {position.client_note && (
                    <Tooltip title={`Примечание: ${position.client_note}`}>
                      <Text className="text-xs text-gray-600">
                        <QuestionCircleOutlined className="mr-1" />
                        <span className="text-gray-500">Примечание</span>
                      </Text>
                    </Tooltip>
                  )}
                </div>
              </div>
            </Col>
            
            {/* Statistics - responsive layout */}
            <Col xs={24} sm={24} md={8} lg={8}>
              <div className="flex flex-wrap gap-4 justify-end items-center">
                <div className="flex items-center gap-1">
                  <Text className="text-xs text-gray-500">Кол-во ГП:</Text>
                  <InputNumber
                    size="small"
                    min={0}
                    value={position.manual_volume ?? undefined}
                    placeholder="0"
                    className="w-20"
                    onChange={(value) => handleManualVolumeChange(value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Text className="text-xs text-gray-500">Примечание ГП:</Text>
                  <Input
                    size="small"
                    value={position.manual_note ?? undefined}
                    placeholder="Примечание"
                    className="w-32"
                    onChange={(e) => handleManualNoteChange(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <div className="whitespace-nowrap">
                  <Text className="text-gray-600">Работы: </Text>
                  <Text strong className="text-green-600">{worksCount}</Text>
                </div>
                <div className="whitespace-nowrap">
                  <Text className="text-gray-600">Материалы: </Text>
                  <Text strong className="text-blue-600">{materialsCount}</Text>
                </div>
              </div>
            </Col>
            
            {/* Total Cost */}
            <Col xs={24} sm={24} md={24} lg={3}>
              <div className="flex justify-end">
                <div className="text-right">
                  <Text strong className="text-lg text-green-700 whitespace-nowrap block">
                    {Math.round(totalCost).toLocaleString('ru-RU')} ₽
                  </Text>
                  <Text type="secondary" className="text-xs">Итого</Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="p-4 bg-gray-50 min-h-0">
            {/* View Mode Toggle and Quick Add Button */}
            <div className="mb-4 flex justify-between items-center gap-4">
              {!quickAddMode ? (
                <>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setQuickAddMode(true)}
                    className="flex-1 h-10 border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:text-blue-700 transition-colors duration-200"
                    style={{ 
                      borderStyle: 'dashed',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    + Быстрое добавление работы или материала
                  </Button>
                  {totalItems > 0 && (
                    <div className="flex gap-1">
                      <Tooltip title="Табличный вид">
                        <Button
                          type={viewMode === 'table' ? 'primary' : 'default'}
                          icon={<TableOutlined />}
                          onClick={() => setViewMode('table')}
                        >
                          Таблица
                        </Button>
                      </Tooltip>
                      <Tooltip title="Группировка по работам">
                        <Button
                          type={viewMode === 'grouped' ? 'primary' : 'default'}
                          icon={<GroupOutlined />}
                          onClick={() => setViewMode('grouped')}
                        >
                          Группы
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full" />
              )}
            </div>

            {/* Quick Add Form */}
            {quickAddMode && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="mb-2">
                  <Text strong className="text-blue-800">Быстрое добавление</Text>
                </div>
                <QuickAddRow />
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

            {/* Items Display - Table or Grouped */}
            {totalItems > 0 ? (
              viewMode === 'table' ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <Table
                  columns={columns}
                  dataSource={sortedBOQItems}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 400 }}
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
                    
                    let itemTotal = quantity * unitRate;
                    
                    // Add delivery cost for materials
                    if (item.item_type === 'material' || item.item_type === 'sub_material') {
                      const deliveryType = item.delivery_price_type;
                      const deliveryAmount = item.delivery_amount || 0;
                      
                      if (deliveryType === 'amount' && deliveryAmount > 0) {
                        itemTotal += deliveryAmount * quantity;
                      } else if (deliveryType === 'not_included') {
                        itemTotal += deliveryAmount * quantity; // Используем значение из БД
                      }
                    }
                    
                    return sum + itemTotal;
                  }, 0);
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: '#f8f9fa' }}>
                        <Table.Summary.Cell index={0} colSpan={8} align="right">
                          <Text strong className="text-gray-700">Итого по позиции:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <div className="whitespace-nowrap">
                            <Text strong className="text-lg text-green-700">
                              {Math.round(total).toLocaleString('ru-RU')} ₽
                            </Text>
                          </div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
                  />
                </div>
              ) : (
                <GroupedBOQDisplay 
                  items={position.boq_items || []}
                  onEdit={(item) => {
                    if (item.item_type === 'material') {
                      handleEditMaterial(item);
                    } else {
                      handleEditWork(item);
                    }
                  }}
                  onDelete={handleDeleteItem}
                />
              )
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <Empty
                  description="Нет добавленных элементов"
                  className="py-4"
                >
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickAddMode(true)}
                >
                  Добавить первый элемент
                </Button>
                </Empty>
              </div>
            )}
          </div>
        )}
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

    </>
  );
};

export default ClientPositionCardStreamlined;