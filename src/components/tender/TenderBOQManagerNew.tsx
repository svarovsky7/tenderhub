import React, { useState, useEffect, useCallback } from 'react';
import { PlusOutlined, EditOutlined, CalculatorOutlined, CloseOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons';
import { message, Spin, InputNumber, Modal, Select, Button, Tag, Tooltip, Table } from 'antd';
import { clientPositionsApi, boqItemsApi, materialsApi, worksApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import AutoCompleteSearch from '../common/AutoCompleteSearch';
import { formatCurrency, formatQuantity, formatUnitRate } from '../../utils/formatters';
import type { ClientPosition, BOQItem, BOQItemInsert, Material, WorkItem } from '../../lib/supabase/types';
import type { WorkMaterialLink, WorkMaterialLinkDetailed } from '../../lib/supabase/api/work-material-links';

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
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [selectedWork, setSelectedWork] = useState<BOQItem | null>(null);
  const [selectedMaterialForLink, setSelectedMaterialForLink] = useState<string | null>(null);
  const [linkQuantity, setLinkQuantity] = useState<number>(1);
  const [linkCoefficient, setLinkCoefficient] = useState<number>(1);
  const [existingLinks, setExistingLinks] = useState<WorkMaterialLinkDetailed[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [allWorkLinks, setAllWorkLinks] = useState<Record<string, any[]>>({});
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
      
      // Load BOQ items for each position
      const positionsWithItems = await Promise.all(
        positions.map(async (position) => {
          const boqResult = await boqItemsApi.getByPosition(position.id);
          const boqItems = boqResult.error ? [] : (boqResult.data || []);
          const totalCost = boqItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
          
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
      
      if (!result.error && result.data) {
        // Group links by work ID
        const linksByWork: Record<string, any[]> = {};
        result.data.forEach((link: any) => {
          if (!linksByWork[link.work_boq_item_id]) {
            linksByWork[link.work_boq_item_id] = [];
          }
          linksByWork[link.work_boq_item_id].push(link);
        });
        
        console.log('📋 Links grouped by work:', linksByWork);
        setAllWorkLinks(linksByWork);
      }
    } catch (error) {
      console.error('💥 Error loading position links:', error);
    }
  }, []);

  // Open/close position
  const openModal = useCallback(async (position: PositionWithItems) => {
    console.log('🔄 Toggling position:', position.id);
    
    if (selectedPosition?.id !== position.id) {
      // Opening a new position - load links
      await loadLinksForPosition(position.id);
    }
    
    setSelectedPosition(prev => prev?.id === position.id ? null : position);
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

  // Add new BOQ item
  const addItem = useCallback(async () => {
    console.log('➕ Adding new BOQ item:', formData);
    
    if (!formData.name || !formData.quantity || !formData.price || !selectedPosition) {
      message.warning('Заполните все поля');
      return;
    }

    try {
      // Calculate next item number
      const existingItems = selectedPosition.boq_items || [];
      const lastItemNumber = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => item.sub_number || 0))
        : 0;

      const newItemData: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: selectedPosition.id,
        item_number: `${selectedPosition.position_number}.${lastItemNumber + 1}`,
        sub_number: lastItemNumber + 1,
        sort_order: lastItemNumber + 1,
        item_type: formData.type,
        description: formData.name,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        unit_rate: parseFloat(formData.price),
        consumption_coefficient: formData.type === 'material' && formData.consumptionCoefficient ? parseFloat(formData.consumptionCoefficient) : null,
        conversion_coefficient: formData.type === 'material' && formData.conversionCoefficient ? parseFloat(formData.conversionCoefficient) : null,
        material_id: formData.type === 'material' ? formData.selectedItemId : null,
        work_id: formData.type === 'work' ? formData.selectedItemId : null
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
      const newBOQItem: BOQItem = result.data;
      console.log('🎆 Created BOQ item from database:', newBOQItem);
      
      console.log('🎆 Adding new item to local state...');
      
      // Update local state - add item to current position
      setPositions(prev => prev.map(position => {
        if (position.id === selectedPosition.id) {
          const updatedItems = [...(position.boq_items || []), newBOQItem];
          const newTotalCost = updatedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
          
          console.log('🔄 Updated position items:', updatedItems.length);
          console.log('💰 New total cost:', newTotalCost);
          
          return {
            ...position,
            boq_items: updatedItems,
            total_position_cost: newTotalCost
          };
        }
        return position;
      }));
      
      // Update selectedPosition to show new item immediately
      setSelectedPosition(prev => {
        if (prev && prev.id === selectedPosition.id) {
          const updatedItems = [...(prev.boq_items || []), newBOQItem];
          return {
            ...prev,
            boq_items: updatedItems,
            total_position_cost: updatedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
          };
        }
        return prev;
      });
      
      message.success(`${formData.type === 'work' ? 'Работа' : 'Материал'} "${formData.name}" добавлена`);
      
      // Clear form
      setFormData({
        type: 'work',
        name: '',
        unit: 'м²',
        quantity: '',
        price: '',
        selectedItemId: null
      });

      // No need to reload positions - updated locally!
      console.log('✨ Local state updated, no reload needed');
    } catch (error) {
      console.error('💥 Add item error:', error);
      message.error('Ошибка добавления элемента');
    }
  }, [formData, selectedPosition, tenderId]);

  // Remove BOQ sub-item
  const removeSubItem = useCallback(async (positionId: string, subItemId: string) => {
    console.log('🗑️ Removing sub-item:', { positionId, subItemId });
    
    try {
      const result = await boqItemsApi.delete(subItemId);
      console.log('📦 Delete result:', result);

      if (result.error) {
        console.error('❌ Delete failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Sub-item deleted successfully');
      
      // Update local state - remove item from positions
      setPositions(prev => prev.map(position => {
        if (position.id === positionId) {
          const updatedItems = (position.boq_items || []).filter(item => item.id !== subItemId);
          const newTotalCost = updatedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
          
          console.log('🔄 Updated position after deletion - items:', updatedItems.length);
          console.log('💰 New total cost after deletion:', newTotalCost);
          
          return {
            ...position,
            boq_items: updatedItems,
            total_position_cost: newTotalCost
          };
        }
        return position;
      }));
      
      // Update selectedPosition if it matches the deleted item's position
      setSelectedPosition(prev => {
        if (prev && prev.id === positionId) {
          const updatedItems = (prev.boq_items || []).filter(item => item.id !== subItemId);
          return {
            ...prev,
            boq_items: updatedItems,
            total_position_cost: updatedItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
          };
        }
        return prev;
      });
      
      message.success('Элемент удален');
      
      // No need to reload positions - updated locally!
      console.log('✨ Local state updated after deletion, no reload needed');
    } catch (error) {
      console.error('💥 Delete error:', error);
      message.error('Ошибка удаления элемента');
    }
  }, []);

  // Функции для работы со связями работ и материалов
  const handleOpenLinkModal = useCallback(async (work: BOQItem, position: PositionWithItems) => {
    console.log('🚀 Opening link modal for work:', work);
    setSelectedWork(work);
    setSelectedPosition(position);
    setLinkModalVisible(true);
    setLoadingLinks(true);
    
    // Загружаем существующие связи для этой работы
    const result = await workMaterialLinksApi.getMaterialsForWork(work.id);
    console.log('📦 Existing links:', result);
    
    if (!result.error && result.data) {
      setExistingLinks(result.data);
    }
    setLoadingLinks(false);
  }, []);

  const handleCreateLink = useCallback(async () => {
    if (!selectedWork || !selectedMaterialForLink || !selectedPosition) {
      message.warning('Выберите материал для связывания');
      return;
    }

    console.log('🚀 Creating link:', {
      work: selectedWork.id,
      material: selectedMaterialForLink,
      quantity: linkQuantity,
      coefficient: linkCoefficient
    });

    const result = await workMaterialLinksApi.createLink({
      client_position_id: selectedPosition.id,
      work_boq_item_id: selectedWork.id,
      material_boq_item_id: selectedMaterialForLink,
      material_quantity_per_work: linkQuantity,
      usage_coefficient: linkCoefficient
    });

    if (result.error) {
      message.error(`Ошибка создания связи: ${result.error}`);
    } else {
      message.success('Связь создана успешно');
      // Перезагружаем связи для модального окна
      const linksResult = await workMaterialLinksApi.getMaterialsForWork(selectedWork.id);
      if (!linksResult.error && linksResult.data) {
        setExistingLinks(linksResult.data);
      }
      
      // Обновляем allWorkLinks для отображения в карточке
      await loadLinksForPosition(selectedPosition.id);
      
      // Сбрасываем выбор
      setSelectedMaterialForLink(null);
      setLinkQuantity(1);
      setLinkCoefficient(1);
    }
  }, [selectedWork, selectedMaterialForLink, selectedPosition, linkQuantity, linkCoefficient, loadLinksForPosition]);

  const handleDeleteLink = useCallback(async (linkId: string) => {
    console.log('🚀 Deleting link:', linkId);
    
    const result = await workMaterialLinksApi.deleteLink(linkId);
    
    if (result.error) {
      message.error('Ошибка удаления связи');
    } else {
      message.success('Связь удалена');
      // Обновляем список связей в модальном окне
      setExistingLinks(prev => prev.filter(link => link.link_id !== linkId));
      
      // Обновляем allWorkLinks для отображения в карточке
      if (selectedPosition) {
        await loadLinksForPosition(selectedPosition.id);
      }
    }
  }, [selectedPosition, loadLinksForPosition]);

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
            const positionQuantity = positionItems.reduce((sum, item) => sum + item.quantity, 0);
            const positionTotal = position.total_position_cost || 0;
            const averagePrice = positionQuantity > 0 ? positionTotal / positionQuantity : 0;

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
                      {/* Список существующих позиций */}
                      {positionItems.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2 text-sm text-gray-700">Добавленные позиции:</h4>
                          <div className="space-y-1">
                            {positionItems.map((subItem, index) => (
                              <div key={subItem.id}>
                                <div 
                                  className="flex justify-between items-center p-2 bg-white rounded border text-xs transition-all duration-300 ease-in-out transform hover:shadow-sm"
                                  style={{
                                    animation: index === positionItems.length - 1 ? 'fadeInSlide 0.3s ease-out' : undefined
                                  }}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{subItem.description}</div>
                                    <div className="text-gray-500">
                                      {subItem.item_type === 'work' ? '🔧' : '📦'} {formatQuantity(subItem.quantity)} {subItem.unit} × {formatUnitRate(subItem.unit_rate)}
                                      {subItem.item_type === 'material' && (subItem.consumption_coefficient || subItem.conversion_coefficient) && (
                                        <span className="ml-2 text-xs">
                                          {subItem.consumption_coefficient && <span title="Коэффициент расхода">К.р: {subItem.consumption_coefficient}</span>}
                                          {subItem.consumption_coefficient && subItem.conversion_coefficient && ' | '}
                                          {subItem.conversion_coefficient && <span title="Коэффициент перевода">К.п: {subItem.conversion_coefficient}</span>}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {subItem.item_type === 'work' && (
                                      <Tooltip title="Связать с материалами">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenLinkModal(subItem, position);
                                          }}
                                          className="text-blue-500 hover:text-blue-700 p-0.5 transition-colors duration-200"
                                        >
                                          <LinkOutlined style={{ fontSize: '14px' }} />
                                        </button>
                                      </Tooltip>
                                    )}
                                    <span className="font-semibold text-blue-600">
                                      {formatCurrency(subItem.total_amount)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeSubItem(position.id, subItem.id);
                                      }}
                                      className="text-red-500 hover:text-red-700 p-0.5 transition-colors duration-200"
                                    >
                                      <CloseOutlined style={{ fontSize: '14px' }} />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Отображение связанных материалов для работ */}
                                {subItem.item_type === 'work' && allWorkLinks[subItem.id] && allWorkLinks[subItem.id].length > 0 && (
                                  <div className="ml-6 mt-1 p-2 bg-blue-50 rounded border-l-2 border-blue-300">
                                    <div className="text-xs font-medium text-blue-700 mb-1">Связанные материалы:</div>
                                    <div className="space-y-1">
                                      {allWorkLinks[subItem.id].map((link: any) => (
                                        <div key={link.id} className="flex items-center justify-between text-xs text-gray-600">
                                          <div className="flex-1">
                                            <span className="font-medium">{link.material_description}</span>
                                            <span className="ml-2 text-gray-500">
                                              {formatQuantity(link.material_quantity_per_work)} {link.material_unit}/ед.
                                              {link.usage_coefficient !== 1 && ` × ${link.usage_coefficient}`}
                                            </span>
                                          </div>
                                          <div className="text-blue-600 font-medium">
                                            Всего: {formatQuantity(link.total_material_needed)} {link.material_unit}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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

                        {formData.quantity && formData.price && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-blue-900">
                                Стоимость:
                              </span>
                              <span className="font-bold text-blue-600">
                                {formatCurrency(parseFloat(formData.quantity || '0') * parseFloat(formData.price || '0'))}
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
                            disabled={!formData.name || !formData.quantity || !formData.price}
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

      {/* Модальное окно для связывания работ и материалов */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <LinkOutlined />
            <span>Связывание работы с материалами</span>
          </div>
        }
        open={linkModalVisible}
        onCancel={() => {
          setLinkModalVisible(false);
          setSelectedWork(null);
          setSelectedMaterialForLink(null);
          setLinkQuantity(1);
          setLinkCoefficient(1);
          setExistingLinks([]);
        }}
        width={800}
        footer={null}
      >
        {selectedWork && selectedPosition && (
          <div>
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-900">
                Работа: {selectedWork.description}
              </div>
              <div className="text-xs text-blue-700">
                Количество: {formatQuantity(selectedWork.quantity)} {selectedWork.unit}
              </div>
            </div>

            {/* Форма добавления связи */}
            <div className="mb-4 p-3 border rounded">
              <h4 className="font-medium mb-3">Добавить связь с материалом:</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Выберите материал из позиции
                  </label>
                  <Select
                    value={selectedMaterialForLink}
                    onChange={setSelectedMaterialForLink}
                    placeholder="Выберите материал"
                    className="w-full"
                    size="small"
                  >
                    {selectedPosition.boq_items
                      ?.filter(item => item.item_type === 'material')
                      .map(material => (
                        <Select.Option key={material.id} value={material.id}>
                          {material.description} ({material.unit})
                        </Select.Option>
                      ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Кол-во на ед. работы
                  </label>
                  <InputNumber
                    value={linkQuantity}
                    onChange={(value) => setLinkQuantity(value || 1)}
                    min={0.0001}
                    step={0.1}
                    precision={4}
                    placeholder="1.0000"
                    className="w-full"
                    size="small"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Коэф. использования
                  </label>
                  <InputNumber
                    value={linkCoefficient}
                    onChange={(value) => setLinkCoefficient(value || 1)}
                    min={0.0001}
                    step={0.1}
                    precision={4}
                    placeholder="1.0000"
                    className="w-full"
                    size="small"
                  />
                </div>
              </div>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateLink}
                disabled={!selectedMaterialForLink}
                className="mt-3"
                size="small"
              >
                Добавить связь
              </Button>
            </div>

            {/* Список существующих связей */}
            <div>
              <h4 className="font-medium mb-2">Связанные материалы:</h4>
              {loadingLinks ? (
                <Spin />
              ) : existingLinks.length > 0 ? (
                <div className="space-y-2">
                  {existingLinks.map((link: any) => (
                    <div key={link.link_id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{link.material_description}</div>
                        <div className="text-xs text-gray-500">
                          Количество: {link.quantity_per_work} {link.material_unit} на ед. работы
                          {link.usage_coefficient !== 1 && ` × коэф. ${link.usage_coefficient}`}
                        </div>
                        <div className="text-xs text-blue-600">
                          Всего необходимо: {formatQuantity(link.total_needed)} {link.material_unit}
                        </div>
                      </div>
                      <Button
                        danger
                        size="small"
                        icon={<DisconnectOutlined />}
                        onClick={() => handleDeleteLink(link.link_id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Нет связанных материалов</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TenderBOQManagerNew;