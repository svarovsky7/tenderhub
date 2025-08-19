import React, { useState, useEffect, forwardRef } from 'react';
import { Input, message } from 'antd';
import type { InputProps } from 'antd';

interface DecimalInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  precision?: number;
  addonAfter?: React.ReactNode;
  addonBefore?: React.ReactNode;
}

/**
 * Custom decimal input component that accepts both comma and dot as decimal separator
 * Automatically converts comma to dot for numeric processing
 */
const DecimalInput = forwardRef<any, DecimalInputProps>(({
  value,
  onChange,
  min,
  max,
  precision = 2,
  placeholder = '0',
  className = '',
  disabled = false,
  addonAfter,
  addonBefore,
  ...restProps
}, ref) => {
  // Store the display value as string
  const [displayValue, setDisplayValue] = useState<string>('');
  
  // Convert number value to display string
  useEffect(() => {
    if (value !== null && value !== undefined && !isNaN(value)) {
      setDisplayValue(value.toString());
    } else if (value === null || value === undefined) {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Allow empty input
    if (input === '') {
      setDisplayValue('');
      onChange?.(null);
      return;
    }

    // Replace ALL commas with dots for numeric parsing (not just the first one)
    const normalizedInput = input.replace(/,/g, '.');
    
    // Allow intermediate states like "1.", "1,", "-", etc.
    // But validate that it's a valid number pattern
    const isValidPattern = /^-?(\d+([.,]\d*)?|[.,]\d*)$/.test(input);
    
    if (!isValidPattern) {
      // Don't update if invalid pattern
      return;
    }
    
    // Update display value immediately (keep original with comma if present)
    setDisplayValue(input);
    
    // Try to parse the normalized value
    const numValue = parseFloat(normalizedInput);
    
    // Only trigger onChange if it's a valid complete number
    // Don't trigger for intermediate states like "1." or "1,"
    if (!normalizedInput.endsWith('.') && !isNaN(numValue)) {
      // Apply precision if specified
      let finalValue = numValue;
      if (precision !== undefined && precision >= 0) {
        finalValue = Math.round(numValue * Math.pow(10, precision)) / Math.pow(10, precision);
      }
      onChange?.(finalValue);
    }
  };

  const handleBlur = () => {
    if (displayValue === '' || displayValue === '-') {
      setDisplayValue('');
      onChange?.(null);
      return;
    }

    // Normalize and parse (replace ALL commas)
    const normalizedValue = displayValue.replace(/,/g, '.');
    const numValue = parseFloat(normalizedValue);
    
    if (!isNaN(numValue)) {
      // Apply constraints
      let finalValue = numValue;
      let showWarning = false;
      
      if (min !== undefined && finalValue < min) {
        // Special handling for consumption coefficient
        if (min === 1 && finalValue < 1) {
          message.warning('Значение коэфф. расхода не может быть менее 1,00');
          showWarning = true;
        }
        finalValue = min;
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max;
      }
      
      // Apply precision if specified
      if (precision !== undefined && precision >= 0) {
        finalValue = Math.round(finalValue * Math.pow(10, precision)) / Math.pow(10, precision);
      }
      
      // Update display and trigger onChange with final value
      setDisplayValue(finalValue.toString());
      onChange?.(finalValue);
    } else {
      // Reset to previous valid value
      if (value !== null && value !== undefined) {
        setDisplayValue(value.toString());
      } else {
        setDisplayValue('');
        onChange?.(null);
      }
    }
  };

  return (
    <Input
      {...restProps}
      ref={ref}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      addonAfter={addonAfter}
      addonBefore={addonBefore}
    />
  );
});

DecimalInput.displayName = 'DecimalInput';

export default DecimalInput;