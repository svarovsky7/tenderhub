import React, { useState, useEffect, useCallback } from 'react';
import { PlusOutlined, EditOutlined, CloseOutlined, DisconnectOutlined, HolderOutlined, LinkOutlined, PlusCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { message, Spin, InputNumber, Tooltip, Modal, Button, Input, Radio } from 'antd';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clientPositionsApi, boqItemsApi, boqApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import { supabase } from '../../lib/supabase/client';
import AutoCompleteSearch from '../common/AutoCompleteSearch';
import { formatCurrency, formatQuantity, formatUnitRate } from '../../utils/formatters';
import { calculateMaterialVolume, updateLinkWithCalculatedVolume } from '../../utils/materialCalculations';
import { SortableBOQItem } from './SortableBOQItem';
import type { ClientPosition, BOQItem, BOQItemInsert } from '../../lib/supabase/types';

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
    selectedItemId: null as string | null
  });
  // Remove these states as AutoCompleteSearch handles loading
  // const [materials, setMaterials] = useState<Material[]>([]);
  // const [works, setWorks] = useState<WorkItem[]>([]);

  const units = ['м²', 'м³', 'шт.', 'кг', 'т', 'м.п.', 'компл.'];
  
  // Helper function to calculate total cost including only works and their linked materials
  const calculatePositionTotalCost = (items: BOQItem[], workLinks: Record<string, any[]>) => {
    let total = 0;
    let worksTotal = 0;
    let linkedMaterialsTotal = 0;
    
    console.log('💰 Calculating position total cost...');
    console.log('📋 Items count:', items?.length || 0);
    console.log('🔗 Work links:', Object.keys(workLinks || {}).length);
    
    // Считаем только работы и их привязанные материалы
    for (const item of items || []) {
      if (item.item_type === 'work') {
        // Добавляем стоимость работы
        const workAmount = item.total_amount || 0;
        worksTotal += workAmount;
        total += workAmount;
        
        console.log(`  🔧 Work: ${item.description} = ${workAmount}`);
        
        // Добавляем стоимость привязанных к работе материалов
        if (workLinks[item.id]) {
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
        // Логируем несвязанные материалы, но НЕ добавляем их к сумме
        console.log(`  ⚠️ Standalone material (NOT counted): ${item.description} = ${item.total_amount || 0}`);
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
      const result = await clientPositionsApi.getByTenderId(tenderId);
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
                link.material_conversion_coefficient || 1,
                link.usage_coefficient || 1
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

  useEffect(() => {
    if (tenderId) {
      loadPositions();
    }
  }, [tenderId, loadPositions]);

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
            link.material_conversion_coefficient || 1,
            link.usage_coefficient || 1
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
          
          // Обновляем selectedPosition если это текущая позиция
          setSelectedPosition(prev => {
            if (prev && prev.id === positionId) {
              return {
                ...prev,
                boq_items: updatedItems
              };
            }
            return prev;
          });
          
          // Обновляем positions массив
          setPositions(prev => prev.map(p => {
            if (p.id === positionId) {
              return {
                ...p,
                boq_items: updatedItems
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
        material_id: materialId,
        work_id: workId
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
      
      // Сначала обновляем selectedPosition
      const updatedSelectedPosition = {
        ...selectedPosition,
        boq_items: updatedItems,
        total_position_cost: newTotalCost
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
        selectedItemId: null
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
  const updateSubItem = useCallback(async (item: BOQItem, updates: Partial<BOQItem>) => {
    console.log('✏️ Updating sub-item:', { itemId: item.id, updates });
    
    try {
      const result = await boqItemsApi.update(item.id, updates);
      console.log('📦 Update result:', result);

      if (result.error) {
        console.error('❌ Update failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Sub-item updated successfully');
      
      // Update local state with the updated item
      const positionId = item.client_position_id;
      const freshResult = await boqApi.getHierarchicalByPosition(positionId);
      const updatedItems = freshResult.error ? [] : (freshResult.data || []);
      
      // Calculate total cost including only works and their linked materials
      const newTotalCost = calculatePositionTotalCost(updatedItems, allWorkLinks);
      
      setPositions(prev => prev.map(position => {
        if (position.id === positionId) {
          console.log('🔄 Updated position after edit - items:', updatedItems.length);
          console.log('💰 New total cost after edit:', newTotalCost);
          
          return {
            ...position,
            boq_items: updatedItems,
            total_position_cost: newTotalCost
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
  }, []);


  // Обработка перетаскивания материала на работу
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
        material_boq_item_id: materialItem.id,
        material_quantity_per_work: 1,
        usage_coefficient: 1
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

  // Настройка сенсоров для drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={positionItems.filter(item => {
                                // Исключаем привязанные материалы из списка для drag-and-drop
                                if (item.item_type === 'material') {
                                  const isLinked = Object.values(allWorkLinks).some((links: any) => 
                                    links.some((link: any) => link.material_boq_item_id === item.id)
                                  );
                                  return !isLinked;
                                }
                                return true;
                              }).map(item => item.id)}
                              strategy={verticalListSortingStrategy}
                            >
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
                                    <SortableBOQItem
                                      item={subItem}
                                      linkedMaterialsTotal={linkedMaterialsTotal}
                                      onRemove={(e) => {
                                        e.stopPropagation();
                                        removeSubItem(position.id, subItem.id);
                                      }}
                                      onEdit={updateSubItem}
                                    />
                                    
                                    {/* Отображение связанных материалов для работ */}
                                    {subItem.item_type === 'work' && allWorkLinks[subItem.id] && allWorkLinks[subItem.id].length > 0 && (
                                  <div className="ml-6 mt-1 p-2 bg-blue-50 rounded border-l-2 border-blue-300">
                                    <div className="text-xs font-medium text-blue-700 mb-1">
                                      Связанные материалы:
                                      <span className="ml-2 text-xs text-gray-500 font-normal">
                                        (перетащите на другую работу для перемещения, с Ctrl для копирования)
                                      </span>
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
                                        <SortableBOQItem
                                          key={link.id}
                                          item={linkedMaterialItem}
                                          isDraggable={!isEditing}
                                          dragData={{
                                            type: 'material',
                                            item: linkedMaterialItem,
                                            isLinkedMaterial: true,
                                            sourceWorkId: subItem.id,
                                            linkId: link.id || link.link_id
                                          }}
                                          className="mb-1"
                                        >
                                          <div className="flex flex-col gap-1 pb-1 border-b border-blue-200 last:border-0">
                                            <div className="flex items-center justify-between text-xs">
                                              <div className="flex items-center flex-1 gap-1">
                                                <HolderOutlined className="text-gray-400 cursor-move" style={{ fontSize: '10px' }} title="Перетащите на другую работу для переноса" />
                                                <span className="font-medium text-gray-700">{link.material_description}</span>
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
                                                  <Tooltip title="Отвязать материал от работы">
                                                    <button
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        // Удаление связи
                                                        const deleteResult = await workMaterialLinksApi.deleteLink(link.id || link.link_id);
                                                        if (!deleteResult.error) {
                                                          message.success('Материал отвязан от работы');
                                                          await loadLinksForPosition(position.id);
                                                        } else {
                                                          message.error('Ошибка отвязки материала');
                                                        }
                                                      }}
                                                      className="text-amber-600 hover:text-amber-800 p-0.5 transition-colors"
                                                      title="Отвязать материал от работы"
                                                    >
                                                      <DisconnectOutlined style={{ fontSize: '12px' }} />
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
                                          {!isEditing ? (
                                            <>
                                              <div className="flex items-center justify-between text-xs text-gray-500">
                                                <div>
                                                  <span className="mr-2">Расчет:</span>
                                                  <span className="font-mono bg-white px-1 py-0.5 rounded">
                                                    {formatQuantity(subItem.quantity)} {subItem.unit}
                                                    {link.material_consumption_coefficient && link.material_consumption_coefficient !== 1 && 
                                                      ` × ${link.material_consumption_coefficient}`}
                                                    {link.material_conversion_coefficient && link.material_conversion_coefficient !== 1 && 
                                                      ` × ${link.material_conversion_coefficient}`}
                                                    {link.usage_coefficient && link.usage_coefficient !== 1 && 
                                                      ` × ${link.usage_coefficient}`}
                                                  </span>
                                                </div>
                                                <div className="font-medium">
                                                  = {formatQuantity(link.calculated_material_volume || link.total_material_needed)} {link.material_unit}
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-between text-xs text-gray-500">
                                                <div>
                                                  Стоимость: {formatQuantity(link.calculated_material_volume || link.total_material_needed)} {link.material_unit} × {formatCurrency(link.material_unit_rate || 0)}
                                                </div>
                                                <div className="font-medium text-blue-600">
                                                  = {formatCurrency(link.calculated_total || 0)}
                                                </div>
                                              </div>
                                            </>
                                          ) : (
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
                                        </SortableBOQItem>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                              </div>
                            </SortableContext>
                          </DndContext>
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

    </div>
  );
};

export default TenderBOQManagerNew;