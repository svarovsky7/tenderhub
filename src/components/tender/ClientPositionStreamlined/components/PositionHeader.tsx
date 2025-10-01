import React from 'react';
import {
  Row,
  Col,
  Tag,
  Tooltip,
  Input,
  InputNumber,
  Select,
  Button,
  Popconfirm,
  Typography,
  message
} from 'antd';
import { LinkOutlined, DeleteOutlined, CopyOutlined, SnippetsOutlined } from '@ant-design/icons';
import { PositionSummary } from './PositionSummary';
import { clientPositionsApi } from '../../../../lib/supabase/api';

const { Title, Text } = Typography;

interface PositionHeaderProps {
  position: any;
  isExpanded: boolean;
  canAddItems: boolean;
  onToggle: () => void;
  onUpdate: () => void;
  // Position hierarchy properties
  positionType: any;
  hierarchyLevel: number;
  isStructural: boolean;
  positionIcon: React.ReactNode;
  positionLabel: string;
  visualIndent: number;
  positionColors: any;
  fontWeight: string;
  textSize: string;
  tagColor: string;
  // State
  loading: boolean;
  setLoading: (value: boolean) => void;
  tempWorkName: string;
  setTempWorkName: (value: string) => void;
  tempUnit: string;
  setTempUnit: (value: string) => void;
  tempManualVolume: number | null;
  setTempManualVolume: (value: number | null) => void;
  tempManualNote: string;
  setTempManualNote: (value: string) => void;
  showAdditionalWorkModal: boolean;
  setShowAdditionalWorkModal: (value: boolean) => void;
  showAdditionalWorkForm: boolean;
  setShowAdditionalWorkForm: (value: boolean) => void;
  // Computed
  totalCost: number;
  worksCount: number;
  materialsCount: number;
  // Handlers
  handleManualVolumeChange: (value: number | null) => void;
  handleManualNoteChange: (value: string) => void;
  // Clipboard
  onCopyPosition?: (positionId: string) => Promise<void>;
  onPastePosition?: (positionId: string) => Promise<void>;
  hasCopiedData?: boolean;
  copiedItemsCount?: number;
  copiedFromPositionId?: string | null;
  clipboardLoading?: boolean;
}

/**
 * Компонент заголовка позиции с информацией и редактируемыми полями
 */
export const PositionHeader: React.FC<PositionHeaderProps> = ({
  position,
  isExpanded,
  canAddItems,
  onToggle,
  onUpdate,
  positionType,
  hierarchyLevel,
  isStructural,
  positionIcon,
  positionLabel,
  visualIndent,
  positionColors,
  fontWeight,
  textSize,
  tagColor,
  loading,
  setLoading,
  tempWorkName,
  setTempWorkName,
  tempUnit,
  setTempUnit,
  tempManualVolume,
  setTempManualVolume,
  tempManualNote,
  setTempManualNote,
  showAdditionalWorkModal,
  setShowAdditionalWorkModal,
  showAdditionalWorkForm,
  setShowAdditionalWorkForm,
  totalCost,
  worksCount,
  materialsCount,
  handleManualVolumeChange,
  handleManualNoteChange,
  onCopyPosition,
  onPastePosition,
  hasCopiedData,
  copiedItemsCount,
  copiedFromPositionId,
  clipboardLoading
}) => {
  return (
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
                  setShowAdditionalWorkForm(true);
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

            {/* Кнопка копирования содержимого позиции - показывать всегда, если ничего не скопировано, или только на скопированной позиции */}
            {canAddItems && onCopyPosition && position.id && !hasCopiedData && (
              <Tooltip title="Копировать содержимое позиции">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={async (e) => {
                    e.stopPropagation();
                    console.log('📋 Copy button clicked for position:', position.id);
                    await onCopyPosition(position.id);
                  }}
                  loading={clipboardLoading}
                  disabled={loading || clipboardLoading}
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    height: '24px'
                  }}
                >
                  Копировать
                </Button>
              </Tooltip>
            )}

            {/* Кнопка вставки содержимого из буфера - показывать на всех позициях */}
            {hasCopiedData && onPastePosition && position.id && (
              <Tooltip title={`Вставить ${copiedItemsCount} элементов`}>
                <Button
                  size="small"
                  type="primary"
                  icon={<SnippetsOutlined />}
                  onClick={async (e) => {
                    e.stopPropagation();
                    console.log('📋 Paste button clicked for position:', position.id);
                    await onPastePosition(position.id);
                  }}
                  loading={clipboardLoading}
                  disabled={loading || clipboardLoading}
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    height: '24px'
                  }}
                >
                  Вставить
                </Button>
              </Tooltip>
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
  );
};