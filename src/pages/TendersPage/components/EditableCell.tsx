import React, { useState, useEffect, useRef } from 'react';
import { Input, DatePicker, InputNumber, Typography } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface EditableCellProps {
  value: any;
  type: 'text' | 'number' | 'date';
  onChange: (value: any) => Promise<void>;
  placeholder?: string;
  suffix?: string;
  precision?: number;
  min?: number;
  className?: string;
  formatter?: (value: any) => string;
  showEditIcon?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type,
  onChange,
  placeholder = '',
  suffix = '',
  precision = 0,
  min = 0,
  className = '',
  formatter,
  showEditIcon = true
}) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = async () => {
    console.log('💾 Saving value:', localValue);
    setSaving(true);
    try {
      await onChange(localValue);
      setEditing(false);
    } catch (error) {
      console.error('❌ Save failed:', error);
      setLocalValue(value); // Reset to original value
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('❌ Cancel editing');
    setLocalValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = formatter ? formatter(value) : value || placeholder || '—';

  // Special handling for date type - direct DatePicker without Popover
  if (type === 'date' && !editing) {
    return (
      <div className="flex justify-center items-center">
        <DatePicker
          value={localValue ? dayjs(localValue) : null}
          onChange={async (date) => {
            const newValue = date?.format('YYYY-MM-DD HH:mm:ss');
            setLocalValue(newValue);
            setSaving(true);
            try {
              await onChange(newValue);
            } catch (error) {
              console.error('❌ Save failed:', error);
              setLocalValue(value);
            } finally {
              setSaving(false);
            }
          }}
          showTime
          format="DD.MM.YYYY HH:mm"
          placeholder="Выберите дату и время"
          disabled={saving}
          style={{ 
            width: '160px',
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            textAlign: 'center'
          }}
          suffixIcon={<CalendarOutlined className="text-blue-500" style={{ verticalAlign: 'middle' }} />}
          className="hover:bg-gray-50 rounded transition-all text-center"
          popupClassName="date-picker-popup"
          inputReadOnly={false}
          allowClear={false}
        />
      </div>
    );
  }

  if (!editing) {
    return (
      <div 
        className={`inline-flex items-center gap-1 group cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-all ${className}`}
        onClick={() => setEditing(true)}
      >
        <Text className="select-none" style={{ cursor: 'default' }}>
          {displayValue}
        </Text>
        {showEditIcon && (
          <EditOutlined 
            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" 
            style={{ fontSize: 12 }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {type === 'text' && (
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          placeholder={placeholder}
          disabled={saving}
        />
      )}
      {type === 'number' && (
        <InputNumber
          ref={inputRef}
          value={localValue}
          onChange={(val) => setLocalValue(val)}
          onKeyDown={handleKeyDown}
          size="small"
          placeholder={placeholder}
          suffix={suffix}
          precision={precision}
          min={min}
          disabled={saving}
          style={{ width: '100%' }}
        />
      )}
      <CheckOutlined 
        className="text-green-500 cursor-pointer hover:text-green-600"
        onClick={handleSave}
        style={{ fontSize: 14 }}
      />
      <CloseOutlined
        className="text-red-500 cursor-pointer hover:text-red-600"
        onClick={handleCancel}
        style={{ fontSize: 14 }}
      />
    </div>
  );
};

export default EditableCell;