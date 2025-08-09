import React, { useState } from 'react';
import { Input, InputNumber, Select, Button, Space } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import type { BOQItem } from '../../lib/supabase/types';

interface EditableBOQItemProps {
  item: BOQItem;
  onSave: (item: BOQItem, updates: Partial<BOQItem>) => Promise<void>;
  onCancel?: () => void;
}

const units = ['м²', 'м³', 'шт.', 'кг', 'т', 'м.п.', 'компл.'];

export const EditableBOQItem: React.FC<EditableBOQItemProps> = ({
  item,
  onSave,
  onCancel
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_rate: item.unit_rate,
    consumption_coefficient: item.consumption_coefficient,
    conversion_coefficient: item.conversion_coefficient
  });
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    // Сбрасываем значения на текущие
    setEditedValues({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      consumption_coefficient: item.consumption_coefficient,
      conversion_coefficient: item.conversion_coefficient
    });
  };

  const handleSave = async () => {
    console.log('💾 Saving BOQ item changes:', editedValues);
    setSaving(true);
    
    try {
      // Фильтруем только измененные значения
      const updates: Partial<BOQItem> = {};
      let hasChanges = false;
      
      if (editedValues.description !== item.description) {
        updates.description = editedValues.description;
        hasChanges = true;
      }
      if (editedValues.unit !== item.unit) {
        updates.unit = editedValues.unit;
        hasChanges = true;
      }
      if (editedValues.quantity !== item.quantity) {
        updates.quantity = editedValues.quantity;
        hasChanges = true;
      }
      if (editedValues.unit_rate !== item.unit_rate) {
        updates.unit_rate = editedValues.unit_rate;
        hasChanges = true;
      }
      if (editedValues.consumption_coefficient !== item.consumption_coefficient) {
        updates.consumption_coefficient = editedValues.consumption_coefficient;
        hasChanges = true;
      }
      if (editedValues.conversion_coefficient !== item.conversion_coefficient) {
        updates.conversion_coefficient = editedValues.conversion_coefficient;
        hasChanges = true;
      }
      
      if (hasChanges) {
        await onSave(item, updates);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Failed to save item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Сбрасываем значения на оригинальные
    setEditedValues({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      consumption_coefficient: item.consumption_coefficient,
      conversion_coefficient: item.conversion_coefficient
    });
    if (onCancel) {
      onCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between group">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              item.item_type === 'work' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {item.item_type === 'work' ? '🔧' : '📦'}
            </span>
            <span className="text-xs text-gray-700 font-medium">
              {item.description}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {formatQuantity(item.quantity)} {item.unit} × {formatCurrency(item.unit_rate)}/ед.
            {item.consumption_coefficient && item.consumption_coefficient !== 1 && (
              <span className="ml-2">
                К.расх: {item.consumption_coefficient}
              </span>
            )}
            {item.conversion_coefficient && item.conversion_coefficient !== 1 && (
              <span className="ml-2">
                К.пер: {item.conversion_coefficient}
              </span>
            )}
          </div>
        </div>
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleEdit}
          title="Редактировать"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 border border-blue-300 rounded bg-blue-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-0.5">
            Наименование
          </label>
          <Input
            size="small"
            value={editedValues.description}
            onChange={(e) => setEditedValues({ ...editedValues, description: e.target.value })}
            placeholder="Наименование"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">
            Ед. изм.
          </label>
          <Select
            size="small"
            value={editedValues.unit}
            onChange={(value) => setEditedValues({ ...editedValues, unit: value })}
            className="w-full"
          >
            {units.map(unit => (
              <Select.Option key={unit} value={unit}>{unit}</Select.Option>
            ))}
          </Select>
        </div>
        
        {item.item_type === 'work' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">
              Объем
            </label>
            <InputNumber
              size="small"
              value={editedValues.quantity}
              onChange={(value) => setEditedValues({ ...editedValues, quantity: value || 0 })}
              min={0}
              step={0.01}
              className="w-full"
            />
          </div>
        )}
        
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">
            Цена за ед. (₽)
          </label>
          <InputNumber
            size="small"
            value={editedValues.unit_rate}
            onChange={(value) => setEditedValues({ ...editedValues, unit_rate: value || 0 })}
            min={0}
            step={0.01}
            className="w-full"
          />
        </div>
        
        {item.item_type === 'material' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">
                Коэф. расхода
              </label>
              <InputNumber
                size="small"
                value={editedValues.consumption_coefficient}
                onChange={(value) => setEditedValues({ ...editedValues, consumption_coefficient: value || null })}
                min={0}
                step={0.0001}
                placeholder="1.0000"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">
                Коэф. перевода
              </label>
              <InputNumber
                size="small"
                value={editedValues.conversion_coefficient}
                onChange={(value) => setEditedValues({ ...editedValues, conversion_coefficient: value || null })}
                min={0}
                step={0.0001}
                placeholder="1.0000"
                className="w-full"
              />
            </div>
          </>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button
          size="small"
          icon={<CloseOutlined />}
          onClick={handleCancel}
          disabled={saving}
        >
          Отмена
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          Сохранить
        </Button>
      </div>
    </div>
  );
};