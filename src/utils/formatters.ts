/**
 * Utility functions for formatting numbers and currencies
 */

/**
 * Format number as Russian currency with proper spacing and decimals
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true for amounts > 0.01)
 * @returns Formatted string like "1 234 567,89 ₽"
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  showDecimals?: boolean
): string => {
  // Handle null/undefined/empty values
  if (amount === null || amount === undefined || amount === '') {
    return '0,00 ₽';
  }

  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle invalid numbers
  if (isNaN(numAmount)) {
    console.warn('⚠️ Invalid amount for formatting:', amount);
    return '0,00 ₽';
  }

  // Always show 2 decimal places for currency
  const shouldShowDecimals = showDecimals !== undefined
    ? showDecimals
    : true; // Always show decimals for currency

  // Format with Russian locale
  const formatted = numAmount.toLocaleString('ru-RU', {
    minimumFractionDigits: shouldShowDecimals ? 2 : 0,
    maximumFractionDigits: 2, // Always max 2 decimals
  });

  return `${formatted} ₽`;
};

/**
 * Format quantity with appropriate decimal places
 * @param quantity - The quantity to format
 * @param maxDecimals - Maximum decimal places (default: 2)
 * @returns Formatted string like "123,45"
 */
export const formatQuantity = (
  quantity: number | string | null | undefined,
  maxDecimals: number = 2
): string => {
  // Handle null/undefined/empty values
  if (quantity === null || quantity === undefined || quantity === '') {
    return '0';
  }

  // Convert to number
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

  // Handle invalid numbers
  if (isNaN(numQuantity)) {
    console.warn('⚠️ Invalid quantity for formatting:', quantity);
    return '0';
  }

  // Format with appropriate decimals
  const formatted = numQuantity.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });

  return formatted;
};

/**
 * Format unit rate (price per unit) with currency
 * @param unitRate - The unit rate to format
 * @returns Formatted string like "1 234,56 ₽"
 */
export const formatUnitRate = (
  unitRate: number | string | null | undefined
): string => {
  return formatCurrency(unitRate, true); // Always show decimals for unit rates
};

/**
 * Format percentage with % symbol
 * @param percentage - The percentage to format
 * @returns Formatted string like "15,5%"
 */
export const formatPercentage = (
  percentage: number | string | null | undefined
): string => {
  // Handle null/undefined/empty values
  if (percentage === null || percentage === undefined || percentage === '') {
    return '0%';
  }

  // Convert to number
  const numPercentage = typeof percentage === 'string' ? parseFloat(percentage) : percentage;

  // Handle invalid numbers
  if (isNaN(numPercentage)) {
    console.warn('⚠️ Invalid percentage for formatting:', percentage);
    return '0%';
  }

  // Format with Russian locale
  const formatted = numPercentage.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return `${formatted}%`;
};