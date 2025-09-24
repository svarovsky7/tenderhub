import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// Import extracted components
import { QuickAddRow } from './ClientPositionStreamlined/components/QuickAdd/QuickAddRow';
import { TemplateAddForm } from './ClientPositionStreamlined/components/Template/TemplateAddForm';
import { ActionButtons } from './ClientPositionStreamlined/components/ActionButtons';
import { PositionSummary } from './ClientPositionStreamlined/components/PositionSummary';
import { EmptyState } from './ClientPositionStreamlined/components/EmptyState';
import { BOQItemsTable } from './ClientPositionStreamlined/components/BOQItemsTable';

// Import extracted hooks
import { useLocalState } from './ClientPositionStreamlined/hooks/useLocalState';
import { usePositionActions } from './ClientPositionStreamlined/hooks/usePositionActions';
import { useDeleteHandlers } from './ClientPositionStreamlined/hooks/useDeleteHandlers';
import { useMaterialEdit } from './ClientPositionStreamlined/hooks/useMaterialEdit';
import { useWorkEdit } from './ClientPositionStreamlined/hooks/useWorkEdit';
import { useLinkingHandlers } from './ClientPositionStreamlined/hooks/useLinkingHandlers';
import { useQuickAdd } from './ClientPositionStreamlined/hooks/useQuickAdd';
import { useMediaQueryFix } from './ClientPositionStreamlined/hooks/useMediaQueryFix';
import { useSortedBOQItems } from './ClientPositionStreamlined/hooks/useSortedBOQItems';
import { useCommercialCost } from './ClientPositionStreamlined/hooks/useCommercialCost';
import { useTenderMarkup } from './ClientPositionStreamlined/hooks/useTenderMarkup';
import { getTableColumns } from './ClientPositionStreamlined/components/Table/BOQTableColumns';
import { PositionTableStyles, getPositionCardStyles } from './ClientPositionStreamlined/styles/PositionStyles';
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
import { boqApi, clientPositionsApi } from '../../lib/supabase/api';
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

  // Use local state hook
  const {
    loading,
    setLoading,
    editingItem,
    setEditingItem,
    linkingMaterialId,
    setLinkingMaterialId,
    linkMaterialModalVisible,
    setLinkMaterialModalVisible,
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
    editSelectedCurrency,
    setEditSelectedCurrency,
    tempWorkName,
    setTempWorkName,
    tempUnit,
    setTempUnit,
    showAdditionalWorkModal,
    setShowAdditionalWorkModal,
    totalItems,
    materialsCount,
    worksCount,
    totalCost,
    positionItemsKey,
    works
  } = useLocalState({ position });

  // Load tender markup
  const { tenderMarkup, loadingMarkup } = useTenderMarkup({ tenderId });

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

  // Используем хук для сортировки элементов BOQ
  const sortedBOQItems = useSortedBOQItems({
    localBOQItems,
    position
  });

  // Используем хук для предотвращения проблем с MediaQuery
  useMediaQueryFix();

  // Optimized table columns with improved responsive widths and no horizontal scroll
  // Get table columns configuration
  const columns = getTableColumns({
    position,
    handleEditMaterial,
    handleEditWork,
    handleDeleteItem
  });


  // Work Edit Row (inline editing) - With column headers

  // Material Edit Row (inline editing) - Compact two-row layout

  return (
    <>
      {/* Component Styles */}
      <PositionTableStyles />
      <Card
        {...getPositionCardStyles(isExpanded, positionColors)}
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
                
                <PositionSummary
                  totalCost={totalCost}
                  worksCount={worksCount}
                  materialsCount={materialsCount}
                />
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
                <ActionButtons
                  canAddItems={canAddItems}
                  quickAddMode={quickAddMode}
                  templateAddMode={templateAddMode}
                  setQuickAddMode={setQuickAddMode}
                  setTemplateAddMode={setTemplateAddMode}
                  positionIcon={positionIcon}
                  positionLabel={positionLabel}
                />
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
              <BOQItemsTable
                refreshKey={refreshKey}
                columns={columns}
                sortedBOQItems={sortedBOQItems}
                position={position}
                editingMaterialId={editingMaterialId}
                editingWorkId={editingWorkId}
                editForm={editForm}
                workEditForm={workEditForm}
                handleSaveInlineEdit={handleSaveInlineEdit}
                handleCancelInlineEdit={handleCancelInlineEdit}
                handleWorkSelectionChange={handleWorkSelectionChange}
                handleCoefficientChange={handleCoefficientChange}
                handleSaveWorkEdit={handleSaveWorkEdit}
                handleCancelWorkEdit={handleCancelWorkEdit}
                tenderMarkup={tenderMarkup}
                tender={tender}
                works={works}
                loading={loading}
              />
            ) : (
              <EmptyState
                canAddItems={canAddItems}
                positionIcon={positionIcon}
                positionLabel={positionLabel}
                onAddFirstItem={() => setQuickAddMode(true)}
              />
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