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
import AdditionalWorkInlineForm from './ClientPositionStreamlined/components/AdditionalWorkInlineForm';
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
  isLoading?: boolean;  // Add loading state for lazy loading
}


const ClientPositionCardStreamlined: React.FC<ClientPositionCardStreamlinedProps> = ({
  position,
  isExpanded,
  onToggle,
  onUpdate,
  tenderId,
  tender,
  isLoading = false  // Default to false
}) => {
  
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
    showAdditionalWorkForm,
    setShowAdditionalWorkForm,
    totalItems,
    materialsCount,
    worksCount,
    totalCost,
    positionItemsKey,
    works
  } = useLocalState({ position, isExpanded });

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
  
  // Commercial cost recalculation moved to manual "Обновить" button
  // to avoid unnecessary DB load on every page load

  // Используем хук для сортировки элементов BOQ
  const sortedBOQItems = useSortedBOQItems({
    boqItems: position.boq_items || [],
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
          showAdditionalWorkForm={showAdditionalWorkForm}
          setShowAdditionalWorkForm={setShowAdditionalWorkForm}
          // Computed
          totalCost={totalCost}
          worksCount={worksCount}
          materialsCount={materialsCount}
          // Handlers
          handleManualVolumeChange={handleManualVolumeChange}
          handleManualNoteChange={handleManualNoteChange}
        />

        {/* Additional Work Inline Form - показывается даже когда позиция свернута */}
        {showAdditionalWorkForm && position.id && position.id !== 'undefined' && (
          <div className="px-4 pb-2">
            <AdditionalWorkInlineForm
              parentPositionId={position.id}
              parentPositionName={position.work_name || 'Позиция'}
              tenderId={tenderId}
              onSuccess={() => {
                setShowAdditionalWorkForm(false);
                onUpdate(); // Refresh parent component
              }}
              onCancel={() => setShowAdditionalWorkForm(false)}
            />
          </div>
        )}

        {/* Expandable Content with Animation */}
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${
            isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-4 bg-gray-50 min-h-0">
            {/* Show loading state if items are being loaded */}
            {isLoading && !position.boq_items ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                  <div className="text-gray-500">Загрузка элементов позиции...</div>
                </div>
              </div>
            ) : (
              <>
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
              </>
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


    </>
  );
};

export default React.memo(ClientPositionCardStreamlined, (prevProps, nextProps) => {
  // Helper function to calculate checksum of BOQ items for deep comparison
  const calculateBOQChecksum = (items: any[] | undefined) => {
    if (!items || items.length === 0) return '';
    // Include key fields that might change: id, quantity, unit_rate, total_amount, description, updated_at
    return items.map(item =>
      `${item.id}-${item.quantity}-${item.unit_rate}-${item.total_amount}-${item.description}-${item.updated_at}`
    ).join('|');
  };

  // Custom comparison to prevent unnecessary re-renders but allow updates when content changes
  return (
    prevProps.position.id === nextProps.position.id &&
    calculateBOQChecksum(prevProps.position.boq_items) === calculateBOQChecksum(nextProps.position.boq_items) && // Deep comparison of BOQ items
    prevProps.position.manual_volume === nextProps.position.manual_volume && // Check manual_volume
    prevProps.position.manual_note === nextProps.position.manual_note && // Check manual_note
    prevProps.works?.length === nextProps.works?.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.isExpanded === nextProps.isExpanded && // IMPORTANT: Check isExpanded for toggle to work
    JSON.stringify(prevProps.position.updated_at) === JSON.stringify(nextProps.position.updated_at)
  );
});