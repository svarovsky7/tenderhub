import React, { useState, useCallback } from 'react';
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
  InputNumber,
  Tooltip,
  Popconfirm,
  Row,
  Col
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
  GroupOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { boqApi } from '../../lib/supabase/api';
import { workMaterialLinksApi } from '../../lib/supabase/api/work-material-links';
import MaterialLinkingModal from './MaterialLinkingModal';
import GroupedBOQDisplay from './GroupedBOQDisplay';
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
  type: 'work' | 'material';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  work_id?: string;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
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
  const materialsCount = position.boq_items?.filter(item => item.item_type === 'material').length || 0;
  const worksCount = position.boq_items?.filter(item => item.item_type === 'work').length || 0;
  const totalCost = position.total_position_cost || 0;
  const works = position.boq_items?.filter(item => item.item_type === 'work') || [];
  console.log('🔧 Available works for linking:', works.length, works.map(w => ({ id: w.id, desc: w.description })));


  // Delete BOQ item
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
      
      // If it's a material linked to work, calculate quantity based on work volume
      if (values.type === 'material' && values.work_id) {
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

      const newItem: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        item_type: values.type,
        description: values.description,
        unit: values.unit,
        quantity: finalQuantity,  // Use calculated quantity
        unit_rate: values.unit_rate,
        item_number: `${positionNumber}.${nextSubNumber}`,
        sub_number: nextSubNumber,
        sort_order: nextSubNumber,
        // Add coefficients for materials
        ...(values.type === 'material' && {
          consumption_coefficient: values.consumption_coefficient || 1,
          conversion_coefficient: values.conversion_coefficient || 1
        })
      };

      const result = await boqApi.create(newItem);
      if (result.error) {
        throw new Error(result.error);
      }

      // If it's a material and a work is selected, create link
      if (values.type === 'material' && values.work_id && result.data) {
        console.log('🔍 Attempting to create work-material link...');
        console.log('🔍 Material created with ID:', result.data.id);
        console.log('🔍 Work selected with ID:', values.work_id);
        
        const linkData = {
          client_position_id: position.id,
          work_boq_item_id: values.work_id,
          material_boq_item_id: result.data.id,
          material_quantity_per_work: values.consumption_coefficient || 1,
          usage_coefficient: values.conversion_coefficient || 1
        };
        
        console.log('🔗 Creating work-material link with data:', linkData);
        const linkResult = await workMaterialLinksApi.create(linkData);
        
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
      if (values.type === 'material' && values.work_id) {
        const linkedWork = works.find(w => w.id === values.work_id);
        message.success(`Материал добавлен и связан с работой: ${linkedWork?.description || values.work_id}`);
      } else {
        message.success(`${values.type === 'work' ? 'Работа' : 'Материал'} добавлен`);
      }
      
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
    setEditingMaterialId(item.id);
    
    // Get work_link information if exists
    const workLink = item.work_link;
    const linkedWork = workLink ? position.boq_items?.find(boqItem => 
      boqItem.id === workLink.work_boq_item_id && boqItem.item_type === 'work'
    ) : undefined;
    
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
    
    editForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      work_id: linkedWork?.id || undefined,
      consumption_coefficient: consumptionCoef,
      conversion_coefficient: conversionCoef
    });
  }, [editForm, position.boq_items]);

  // Save inline edited material
  const handleSaveInlineEdit = useCallback(async (values: any) => {
    if (!editingMaterialId) return;
    
    console.log('💾 Saving inline material edits:', values);
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
      }
      
      // Update the material itself INCLUDING coefficients
      const updateData = {
        description: values.description,
        unit: values.unit,
        quantity: finalQuantity,  // Use calculated quantity
        unit_rate: values.unit_rate,
        consumption_coefficient: values.consumption_coefficient || 1,
        conversion_coefficient: values.conversion_coefficient || 1
      };
      
      const result = await boqApi.update(editingMaterialId, updateData);
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Handle work linking if changed
      const existingLinks = await workMaterialLinksApi.getByMaterialId(editingMaterialId);
      const hasExistingLink = !existingLinks.error && existingLinks.data?.length > 0;
      const existingWorkId = hasExistingLink ? existingLinks.data[0].work_boq_item_id : null;
      
      console.log('🔗 Existing link info:', {
        hasLink: hasExistingLink,
        existingWorkId,
        newWorkId: values.work_id,
        needsUpdate: values.work_id === existingWorkId
      });
      
      // Check if we need to update, create, or delete link
      if (values.work_id !== existingWorkId) {
        // Remove old link if exists
        if (hasExistingLink) {
          await workMaterialLinksApi.delete(existingLinks.data[0].id);
          console.log('🔗 Removed old link');
        }
        
        // Create new link if work_id is provided
        if (values.work_id) {
          const linkData = {
            client_position_id: position.id,
            work_boq_item_id: values.work_id,
            material_boq_item_id: editingMaterialId,
            material_quantity_per_work: values.consumption_coefficient || 1,
            usage_coefficient: values.conversion_coefficient || 1
          };
          
          console.log('🔗 Creating new link with data:', linkData);
          const linkResult = await workMaterialLinksApi.create(linkData);
          console.log('✅ Material linked to work', linkResult);
        } else {
          console.log('✅ Material unlinked from work');
        }
      } else if (values.work_id && hasExistingLink) {
        // Update existing link with new coefficients ALWAYS
        const existingLink = existingLinks.data[0];
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
        await workMaterialLinksApi.update(existingLink.id, {
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
    setEditingWorkId(item.id);
    workEditForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate
    });
  }, [workEditForm]);

  // Save inline edited work
  const handleSaveWorkEdit = useCallback(async (values: any) => {
    if (!editingWorkId) return;
    
    console.log('💾 Saving work edits:', values);
    setLoading(true);
    try {
      const result = await boqApi.update(editingWorkId, values);
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
    {
      title: '№',
      dataIndex: 'item_number',
      key: 'item_number',
      width: '5%',
      minWidth: 60,
      render: (text) => <Text className="font-mono text-xs whitespace-nowrap">{text}</Text>
    },
    {
      title: 'Тип',
      dataIndex: 'item_type',
      key: 'item_type', 
      width: '8%',
      minWidth: 80,
      render: (type) => (
        <div className="whitespace-nowrap">
          {type === 'work' ? 
            <Tag icon={<BuildOutlined />} color="green" className="text-xs">Работа</Tag> : 
            <Tag icon={<ToolOutlined />} color="blue" className="text-xs">Материал</Tag>
          }
        </div>
      )
    },
    {
      title: 'Наименование',
      dataIndex: 'description',
      key: 'description',
      width: '35%',
      minWidth: 200,
      ellipsis: { showTitle: false },
      render: (text, record) => {
        // Find if material is linked to a work
        let linkedWork = null;
        if (record.item_type === 'material' && record.work_link) {
          linkedWork = position.boq_items?.find(item => 
            item.id === record.work_link.work_boq_item_id && item.item_type === 'work'
          );
        }
        
        return (
          <Tooltip title={text} placement="topLeft">
            <div>
              <div className="py-1 text-sm">{text}</div>
              {record.item_type === 'material' && linkedWork && (
                <div className="text-xs text-orange-600 mt-1 truncate">
                  → {linkedWork.description}
                </div>
              )}
            </div>
          </Tooltip>
        );
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
        if (record.item_type === 'material') {
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
        if (record.item_type === 'material') {
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
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      width: '10%',
      minWidth: 90,
      align: 'right',
      render: (value, record) => {
        // For materials linked to works, show calculated quantity
        if (record.item_type === 'material' && record.work_link) {
          const work = position.boq_items?.find(item => 
            item.id === record.work_link.work_boq_item_id && item.item_type === 'work'
          );
          
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
      title: 'Сумма',
      key: 'total',
      width: '12%',
      minWidth: 100,
      align: 'right',
      render: (_, record) => {
        let total = (record.quantity || 0) * (record.unit_rate || 0);
        
        // For linked materials, calculate based on work volume and coefficients
        if (record.item_type === 'material' && record.work_link) {
          const work = position.boq_items?.find(item => 
            item.id === record.work_link.work_boq_item_id && item.item_type === 'work'
          );
          
          if (work) {
            // Get coefficients from BOQ item first, then from work_link
            const consumptionCoef = record.consumption_coefficient || 
                                   record.work_link.material_quantity_per_work || 1;
            const conversionCoef = record.conversion_coefficient || 
                                  record.work_link.usage_coefficient || 1;
            const workQuantity = work.quantity || 0;
            const calculatedQuantity = workQuantity * consumptionCoef * conversionCoef;
            total = calculatedQuantity * (record.unit_rate || 0);
          }
        }
        
        return (
          <div className="whitespace-nowrap text-right">
            <Text strong className="text-green-600 text-sm">
              {total.toLocaleString('ru-RU', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 2 
              })} ₽
            </Text>
          </div>
        );
      }
    },
    {
      title: '',
      key: 'actions',
      width: '8%',
      minWidth: 80,
      render: (_, record) => (
        <div className="whitespace-nowrap">
          <Space size="small">
            {record.item_type === 'material' && (
              <Tooltip title="Редактировать материал / Связать с работой">
                <Button
                  type="text"
                  size="small"
                  icon={<FormOutlined />}
                  onClick={() => handleEditMaterial(record)}
                  className="text-xs"
                />
              </Tooltip>
            )}
            {record.item_type === 'work' && (
              <Tooltip title="Редактировать работу">
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
              <Tag icon={<BuildOutlined />} color="green">Работа</Tag>
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
                <InputNumber 
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
                <InputNumber 
                  placeholder="Цена" 
                  min={0}
                  precision={2}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Text strong className="text-green-600">
                {((workEditForm.getFieldValue('quantity') || 0) * 
                  (workEditForm.getFieldValue('unit_rate') || 0)).toLocaleString('ru-RU', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                })} ₽
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
                <Tag icon={<ToolOutlined />} color="blue">Материал</Tag>
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
                <InputNumber 
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
                <InputNumber 
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
                  {((editForm.getFieldValue('quantity') || 0) * 
                    (editForm.getFieldValue('unit_rate') || 0)).toLocaleString('ru-RU', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                  })} ₽
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={8} md={6} lg={3}>
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
                        {work.description} (Объем: {work.quantity} {work.unit})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={7} lg={4}>
                <Form.Item
                  name="consumption_coefficient"
                  className="mb-0"
                  label={<Text strong>Коэф. расхода</Text>}
                >
                  <InputNumber 
                    min={0.01}
                    max={9999}
                    step={0.1}
                    precision={2} 
                    className="w-full"
                    size="small"
                    onChange={handleCoefficientChange}
                    placeholder="1.00"
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={7} lg={4}>
                <Form.Item
                  name="conversion_coefficient"
                  className="mb-0"
                  label={<Text strong>Коэф. перевода</Text>}
                >
                  <InputNumber 
                    min={0.01}
                    max={9999}
                    step={0.1}
                    precision={2} 
                    className="w-full"
                    size="small"
                    onChange={handleCoefficientChange}
                    placeholder="1.00"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={24} md={24} lg={8}>
                <div className="text-sm text-gray-600 pt-2">
                  <Text type="secondary">
                    Количество будет рассчитано автоматически при привязке к работе
                  </Text>
                </div>
              </Col>
            </Row>
          )}
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
            prevValues.type !== currentValues.type || 
            prevValues.work_id !== currentValues.work_id
          }>
            {({ getFieldValue }) => (
              <Form.Item
                name="quantity"
                className="mb-0"
                label={<Text strong>Кол-во</Text>}
                rules={[{ required: true, message: 'Кол-во' }]}
              >
                <InputNumber 
                  placeholder="Кол-во" 
                  min={0}
                  precision={2}
                  className="w-full"
                  size="small"
                  disabled={getFieldValue('type') === 'material' && !!getFieldValue('work_id')}
                />
              </Form.Item>
            )}
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
            <InputNumber 
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
        <Col xs={24} sm={12} md={6} lg={6}>
          <Form.Item label={<Text strong>Действия</Text>} className="mb-0">
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
      
      {/* Additional fields for materials - work linking */}
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
        {({ getFieldValue }) =>
          getFieldValue('type') === 'material' && works.length > 0 && (
            <Row gutter={[12, 8]} className="w-full mt-3 pt-3 border-t border-blue-200">
              <Col xs={24} sm={12} md={10} lg={8}>
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
                        {work.description} (Объем: {work.quantity} {work.unit})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={7} lg={4}>
                <Form.Item
                  name="consumption_coefficient"
                  className="mb-0"
                  label={<Text strong>Коэф. расхода</Text>}
                  initialValue={1}
                >
                  <InputNumber 
                    min={0.01}
                    max={9999}
                    precision={2} 
                    className="w-full"
                    size="small"
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
              </Col>
              <Col xs={12} sm={6} md={7} lg={4}>
                <Form.Item
                  name="conversion_coefficient"
                  className="mb-0"
                  label={<Text strong>Коэф. перевода</Text>}
                  initialValue={1}
                >
                  <InputNumber 
                    min={0.01}
                    max={9999}
                    precision={2} 
                    className="w-full"
                    size="small"
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
              </Col>
              <Col xs={24} sm={24} md={24} lg={8}>
                <div className="text-sm text-gray-600 pt-2">
                  <Text type="secondary">
                    Количество будет рассчитано автоматически при привязке к работе
                  </Text>
                </div>
              </Col>
            </Row>
          )
        }
      </Form.Item>
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
            
            {/* Work Name */}
            <Col xs={24} sm={18} md={12} lg={10}>
              <Title level={5} className="mb-0" ellipsis={{ tooltip: position.work_name }}>
                {position.work_name}
              </Title>
            </Col>
            
            {/* Statistics - responsive layout */}
            <Col xs={24} sm={24} md={8} lg={8}>
              <div className="flex flex-wrap gap-4 justify-end">
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
                    {totalCost.toLocaleString('ru-RU', { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 2 
                    })} ₽
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
                  dataSource={position.boq_items || []}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 400 }}
                  className="custom-table"
                components={{
                  body: {
                    row: ({ children, ...props }: any) => {
                      const record = props['data-row-key'] ? 
                        position.boq_items?.find(item => item.id === props['data-row-key']) : 
                        null;
                      
                      // If this is the material being edited, show the edit form
                      if (record && editingMaterialId === record.id && record.item_type === 'material') {
                        return <MaterialEditRow item={record} />;
                      }
                      
                      // If this is the work being edited, show the edit form
                      if (record && editingWorkId === record.id && record.item_type === 'work') {
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
                  const total = pageData.reduce((sum, item) => 
                    sum + (item.quantity || 0) * (item.unit_rate || 0), 0
                  );
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: '#f8f9fa' }}>
                        <Table.Summary.Cell index={0} colSpan={8} align="right">
                          <Text strong className="text-gray-700">Итого по позиции:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <div className="whitespace-nowrap">
                            <Text strong className="text-lg text-green-700">
                              {total.toLocaleString('ru-RU', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 2 
                              })} ₽
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