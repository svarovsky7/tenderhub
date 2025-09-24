import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// Import extracted components
import { QuickAddRow } from './ClientPositionStreamlined/components/QuickAdd/QuickAddRow';
import { TemplateAddForm } from './ClientPositionStreamlined/components/Template/TemplateAddForm';
import { ActionButtons } from './ClientPositionStreamlined/components/ActionButtons';
import { EmptyState } from './ClientPositionStreamlined/components/EmptyState';
import { BOQItemsTable } from './ClientPositionStreamlined/components/BOQItemsTable';
import { PositionHeader } from './ClientPositionStreamlined/components/PositionHeader';

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
  Form,
  message,
  Popconfirm
} from 'antd';
import {
  ClearOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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

const { Text } = Typography;

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
        {/* Position Header */}
        <PositionHeader
          position={position}
          isExpanded={isExpanded}
          canAddItems={canAddItems}
          onToggle={onToggle}
          onUpdate={onUpdate}
          // Position hierarchy properties
          positionType={positionType}
          hierarchyLevel={hierarchyLevel}
          isStructural={isStructural}
          positionIcon={positionIcon}
          positionLabel={positionLabel}
          visualIndent={visualIndent}
          positionColors={positionColors}
          fontWeight={fontWeight}
          textSize={textSize}
          tagColor={tagColor}
          // State
          loading={loading}
          setLoading={setLoading}
          tempWorkName={tempWorkName}
          setTempWorkName={setTempWorkName}
          tempUnit={tempUnit}
          setTempUnit={setTempUnit}
          tempManualVolume={tempManualVolume}
          setTempManualVolume={setTempManualVolume}
          tempManualNote={tempManualNote}
          setTempManualNote={setTempManualNote}
          showAdditionalWorkModal={showAdditionalWorkModal}
          setShowAdditionalWorkModal={setShowAdditionalWorkModal}
          // Computed
          totalCost={totalCost}
          worksCount={worksCount}
          materialsCount={materialsCount}
          // Handlers
          handleManualVolumeChange={handleManualVolumeChange}
          handleManualNoteChange={handleManualNoteChange}
        />

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