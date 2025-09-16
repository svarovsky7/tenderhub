import React, { memo, useCallback, useState } from 'react';
import { InputNumber, Tooltip, Button, Input, Select } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  DisconnectOutlined,
  SwapOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { formatCurrency, formatQuantity, formatUnitRate } from '../../utils/formatters';
import { CURRENCY_SYMBOLS } from '../../utils/currencyConverter';
import type { BOQItem } from '../../lib/supabase/types';

interface OptimizedBOQItemRowProps {
  item: BOQItem;
  isWork: boolean;
  isMaterial: boolean;
  isLinkedMaterial: boolean;
  isAdditional?: boolean;
  onEdit: (item: BOQItem) => void;
  onDelete: (itemId: string) => void;
  onMove?: (item: BOQItem) => void;
  onUpdateLink?: (linkId: string, materialId: string) => void;
  onDeleteLink?: (linkId: string) => void;
  onQuickUpdate?: (itemId: string, updates: Partial<BOQItem>) => Promise<void>;
  enableInlineEdit?: boolean;
}

const OptimizedBOQItemRow: React.FC<OptimizedBOQItemRowProps> = memo(({
  item,
  isWork,
  isMaterial,
  isLinkedMaterial,
  isAdditional = false,
  onEdit,
  onDelete,
  onMove,
  onUpdateLink,
  onDeleteLink,
  onQuickUpdate,
  enableInlineEdit = false
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Calculate display values
  const priceInRub = item.unit_rate || 0;
  const deliveryAmount = item.delivery_amount || 0;
  const totalAmount = (priceInRub + deliveryAmount) * item.quantity;

  // Handle inline edit start
  const handleStartEdit = useCallback((field: string, currentValue: any) => {
    if (!enableInlineEdit || isAdditional) return;
    setEditingField(field);
    setEditValue(currentValue);
  }, [enableInlineEdit, isAdditional]);

  // Handle inline edit save
  const handleSaveEdit = useCallback(async () => {
    if (!editingField || !onQuickUpdate) return;

    setSaving(true);
    try {
      await onQuickUpdate(item.id, { [editingField]: editValue });
      setEditingField(null);
      setEditValue(null);
    } finally {
      setSaving(false);
    }
  }, [editingField, editValue, item.id, onQuickUpdate]);

  // Handle inline edit cancel
  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue(null);
  }, []);

  // Row background color based on type
  const rowClassName = `
    group transition-all duration-200
    ${isWork ? 'bg-blue-50/50 hover:bg-blue-100/70' : ''}
    ${isMaterial && !isLinkedMaterial ? 'bg-green-50/50 hover:bg-green-100/70' : ''}
    ${isLinkedMaterial ? 'bg-purple-50/50 hover:bg-purple-100/70' : ''}
    ${isAdditional ? 'bg-orange-50/50 hover:bg-orange-100/70 opacity-75' : ''}
  `;

  return (
    <tr className={rowClassName}>
      {/* Item number */}
      <td className="px-2 py-1 text-xs text-gray-600 border-r">
        {item.item_number && (
          <span className="font-mono">
            {item.item_number}
            {item.sub_number && `.${item.sub_number}`}
          </span>
        )}
      </td>

      {/* Description */}
      <td className="px-2 py-1 border-r">
        <div className="flex items-center gap-1">
          {isWork && (
            <span className="text-blue-500 text-xs font-medium">Р</span>
          )}
          {isMaterial && !isLinkedMaterial && (
            <span className="text-green-500 text-xs font-medium">М</span>
          )}
          {isLinkedMaterial && (
            <Tooltip title="Привязан к работе">
              <LinkOutlined className="text-purple-500 text-xs" />
            </Tooltip>
          )}
          <span className={`text-sm ${isAdditional ? 'italic' : ''}`}>
            {item.description}
          </span>
          {isAdditional && (
            <span className="text-xs text-orange-600 ml-1">(ДОП)</span>
          )}
        </div>
      </td>

      {/* Unit */}
      <td className="px-2 py-1 text-center text-sm border-r">
        {item.unit}
      </td>

      {/* Quantity */}
      <td className="px-2 py-1 text-right border-r">
        {editingField === 'quantity' ? (
          <div className="flex items-center gap-1">
            <InputNumber
              size="small"
              value={editValue}
              onChange={setEditValue}
              min={0}
              precision={3}
              className="w-24"
              disabled={saving}
            />
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveEdit}
              loading={saving}
            />
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={handleCancelEdit}
              disabled={saving}
            />
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-white/50 px-1 rounded"
            onDoubleClick={() => handleStartEdit('quantity', item.quantity)}
          >
            {formatQuantity(item.quantity)}
          </div>
        )}
      </td>

      {/* Unit rate */}
      <td className="px-2 py-1 text-right border-r">
        {editingField === 'unit_rate' ? (
          <div className="flex items-center gap-1">
            <InputNumber
              size="small"
              value={editValue}
              onChange={setEditValue}
              min={0}
              precision={2}
              className="w-28"
              disabled={saving}
            />
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveEdit}
              loading={saving}
            />
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={handleCancelEdit}
              disabled={saving}
            />
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-white/50 px-1 rounded"
            onDoubleClick={() => handleStartEdit('unit_rate', item.unit_rate)}
          >
            {formatUnitRate(priceInRub)}
            {item.original_currency && item.original_currency !== 'RUB' && (
              <span className="text-xs text-gray-500 ml-1">
                {CURRENCY_SYMBOLS[item.original_currency]}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Delivery */}
      <td className="px-2 py-1 text-right text-sm border-r">
        {isMaterial && (
          <span className="text-gray-600">
            {item.delivery_price_type === 'included' && '—'}
            {item.delivery_price_type === 'not_included' && '3%'}
            {item.delivery_price_type === 'amount' && formatCurrency(deliveryAmount)}
          </span>
        )}
      </td>

      {/* Total amount */}
      <td className="px-2 py-1 text-right font-medium border-r">
        {formatCurrency(totalAmount)}
      </td>

      {/* Actions */}
      <td className="px-2 py-1">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Edit button */}
          {!isAdditional && (
            <Tooltip title="Редактировать">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(item)}
              />
            </Tooltip>
          )}

          {/* Move button for materials */}
          {isMaterial && onMove && (
            <Tooltip title="Переместить">
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={() => onMove(item)}
              />
            </Tooltip>
          )}

          {/* Update link button for linked materials */}
          {isLinkedMaterial && onUpdateLink && (item as any).link_id && (
            <Tooltip title="Изменить связь">
              <Button
                size="small"
                icon={<LinkOutlined />}
                onClick={() => onUpdateLink((item as any).link_id, item.material_id!)}
              />
            </Tooltip>
          )}

          {/* Delete button */}
          <Tooltip title={isLinkedMaterial ? "Отвязать от работы" : "Удалить"}>
            <Button
              size="small"
              danger
              icon={isLinkedMaterial ? <DisconnectOutlined /> : <DeleteOutlined />}
              onClick={() => {
                if (isLinkedMaterial && onDeleteLink && (item as any).link_id) {
                  onDeleteLink((item as any).link_id);
                } else {
                  onDelete(item.id);
                }
              }}
            />
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.unit_rate === nextProps.item.unit_rate &&
    prevProps.item.delivery_amount === nextProps.item.delivery_amount &&
    prevProps.item.description === nextProps.item.description &&
    prevProps.isAdditional === nextProps.isAdditional &&
    prevProps.enableInlineEdit === nextProps.enableInlineEdit
  );
});

OptimizedBOQItemRow.displayName = 'OptimizedBOQItemRow';

export default OptimizedBOQItemRow;