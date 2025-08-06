import React, { useState, useEffect, useCallback } from 'react';
import { PlusOutlined, EditOutlined, CalculatorOutlined, CloseOutlined } from '@ant-design/icons';
import { message, Spin } from 'antd';
import { clientPositionsApi, boqItemsApi, materialsApi, worksApi } from '../../lib/supabase/api';
import type { ClientPosition, BOQItem, BOQItemInsert, Material, WorkItem } from '../../lib/supabase/types';

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
  const [formData, setFormData] = useState({
    type: 'work' as 'work' | 'material',
    name: '',
    unit: 'м²',
    quantity: '',
    price: ''
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [works, setWorks] = useState<WorkItem[]>([]);

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

  // Load library data
  const loadLibraryData = useCallback(async () => {
    console.log('📡 Loading library data...');
    
    try {
      const [materialsResult, worksResult] = await Promise.all([
        materialsApi.getAll({ search: '' }, { limit: 1000 }),
        worksApi.getAll({ search: '' }, { limit: 1000 })
      ]);

      if (materialsResult.error) {
        console.error('❌ Materials loading error:', materialsResult.error);
      } else {
        console.log('✅ Materials loaded:', materialsResult.data?.length);
        setMaterials(materialsResult.data || []);
      }

      if (worksResult.error) {
        console.error('❌ Works loading error:', worksResult.error);
      } else {
        console.log('✅ Works loaded:', worksResult.data?.length);
        setWorks(worksResult.data || []);
      }
    } catch (error) {
      console.error('💥 Error loading library data:', error);
      message.error('Ошибка загрузки справочников');
    }
  }, []);

  useEffect(() => {
    if (tenderId) {
      loadPositions();
      loadLibraryData();
    }
  }, [tenderId, loadPositions, loadLibraryData]);

  // Open/close position
  const openModal = useCallback((position: PositionWithItems) => {
    console.log('🔄 Toggling position:', position.id);
    setSelectedPosition(prev => prev?.id === position.id ? null : position);
    setFormData({
      type: 'work',
      name: '',
      unit: 'м²',
      quantity: '',
      price: ''
    });
  }, []);

  const closeModal = useCallback(() => {
    console.log('❌ Closing modal');
    setSelectedPosition(null);
    setFormData({
      type: 'work',
      name: '',
      unit: 'м²',
      quantity: '',
      price: ''
    });
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((field: string, value: string) => {
    console.log('📝 Form field changed:', { field, value });
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

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
        material_id: null,
        work_id: null
      };

      console.log('📡 Creating BOQ item:', newItemData);
      const result = await boqItemsApi.create(newItemData);
      console.log('📦 Create result:', result);

      if (result.error) {
        console.error('❌ Create failed:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ BOQ item created successfully');
      message.success(`${formData.type === 'work' ? 'Работа' : 'Материал'} "${formData.name}" добавлена`);
      
      // Clear form
      setFormData({
        type: 'work',
        name: '',
        unit: 'м²',
        quantity: '',
        price: ''
      });

      // Reload positions
      await loadPositions();
    } catch (error) {
      console.error('💥 Add item error:', error);
      message.error('Ошибка добавления элемента');
    }
  }, [formData, selectedPosition, tenderId, loadPositions]);

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
      message.success('Элемент удален');
      
      // Reload positions
      await loadPositions();
    } catch (error) {
      console.error('💥 Delete error:', error);
      message.error('Ошибка удаления элемента');
    }
  }, [loadPositions]);

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Ведомость Объемов Работ (ВОР)
        </h1>

        {/* Общая стоимость */}
        <div className="bg-blue-600 text-white p-6 rounded-lg mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Общая стоимость проекта</h2>
              <p className="text-blue-100">По всем позициям ВОР</p>
            </div>
            <div className="text-3xl font-bold">
              {totalProject.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        {/* Карточки позиций */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
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
                {/* Заголовок карточки */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => selectedPosition?.id === position.id ? setSelectedPosition(null) : openModal(position)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Позиция {position.position_number}. {position.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {selectedPosition?.id === position.id ? (
                        <CloseOutlined style={{ fontSize: '20px', color: '#9CA3AF' }} />
                      ) : (
                        <EditOutlined style={{ fontSize: '20px', color: '#9CA3AF' }} />
                      )}
                    </div>
                  </div>
                  
                  {position.client_note && (
                    <p className="text-sm text-gray-600 mb-4">
                      {position.client_note}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500 block">Объем</span>
                      <span className="font-medium text-sm">
                        {positionQuantity.toFixed(2)} ед.
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Средняя цена</span>
                      <span className="font-medium text-sm">
                        {averagePrice.toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} ₽
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Стоимость</span>
                      <span className="font-bold text-blue-600">
                        {positionTotal.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>

                  {positionItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        Позиций: {positionItems.length}
                      </div>
                    </div>
                  )}
                </div>

                {/* Развернутая форма внутри карточки */}
                {selectedPosition?.id === position.id && (
                  <div className="border-t bg-gray-50">
                    <div className="p-6">
                      {/* Список существующих позиций */}
                      {positionItems.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 text-gray-800">Добавленные позиции:</h4>
                          <div className="space-y-2">
                            {positionItems.map((subItem) => (
                              <div key={subItem.id} className="flex justify-between items-center p-3 bg-white rounded border">
                                <div>
                                  <div className="font-medium text-sm">{subItem.description}</div>
                                  <div className="text-xs text-gray-600">
                                    {subItem.item_type === 'work' ? '🔧 Работы' : '📦 Материалы'} • 
                                    {subItem.quantity} {subItem.unit} × {subItem.unit_rate.toLocaleString('ru-RU')} ₽
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-blue-600 text-sm">
                                    {subItem.total_amount.toLocaleString('ru-RU')} ₽
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeSubItem(position.id, subItem.id);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1"
                                  >
                                    <CloseOutlined style={{ fontSize: '16px' }} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Форма добавления */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-semibold mb-4 text-gray-800">Добавить новую позицию:</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Тип
                            </label>
                            <select
                              value={formData.type}
                              onChange={(e) => handleInputChange('type', e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="work">🔧 Работы</option>
                              <option value="material">📦 Материалы</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Наименование
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              placeholder="Введите название работы или материала"
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Ед. измерения
                            </label>
                            <select
                              value={formData.unit}
                              onChange={(e) => handleInputChange('unit', e.target.value)}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {units.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Объем
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.quantity}
                              onChange={(e) => handleInputChange('quantity', e.target.value)}
                              placeholder="0"
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Цена (₽)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.price}
                              onChange={(e) => handleInputChange('price', e.target.value)}
                              placeholder="0"
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {formData.quantity && formData.price && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-900">
                                Стоимость позиции:
                              </span>
                              <span className="font-bold text-blue-600">
                                {(parseFloat(formData.quantity || '0') * parseFloat(formData.price || '0')).toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem();
                            }}
                            disabled={!formData.name || !formData.quantity || !formData.price}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            <PlusOutlined style={{ fontSize: '16px', marginRight: '4px' }} />
                            Добавить
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeModal();
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
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
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">
              Позиции заказчика не найдены
            </div>
            <p className="text-gray-500">
              Создайте позиции заказчика для начала работы с ВОР
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenderBOQManagerNew;