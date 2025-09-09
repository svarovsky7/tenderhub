/**
 * Currency conversion utilities for BOQ items
 */

export type CurrencyType = 'RUB' | 'USD' | 'EUR' | 'CNY';

export interface CurrencyRates {
  usd_rate?: number | null;
  eur_rate?: number | null;
  cny_rate?: number | null;
}

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  'RUB': '₽',
  'USD': '$',
  'EUR': '€',
  'CNY': '¥'
};

export const CURRENCY_LABELS: Record<CurrencyType, string> = {
  'RUB': 'Рубль',
  'USD': 'Доллар',
  'EUR': 'Евро',
  'CNY': 'Юань'
};

export const CURRENCY_OPTIONS = [
  { value: 'RUB', label: '₽ Рубль', symbol: '₽' },
  { value: 'USD', label: '$ Доллар', symbol: '$' },
  { value: 'EUR', label: '€ Евро', symbol: '€' },
  { value: 'CNY', label: '¥ Юань', symbol: '¥' }
];

/**
 * Convert amount from foreign currency to rubles
 * @param amount - Amount in foreign currency
 * @param currency - Currency type (USD, EUR, CNY)
 * @param rates - Currency rates from tender
 * @returns Amount in rubles
 */
export const convertToRuble = (
  amount: number,
  currency: CurrencyType,
  rates: CurrencyRates | null
): number => {
  console.log('💱 Converting to rubles:', { amount, currency, rates });
  
  if (currency === 'RUB') {
    return amount;
  }

  if (!rates) {
    console.warn('⚠️ No rates provided, using 1:1');
    return amount;
  }

  const rateMap: Record<string, number> = {
    'USD': rates.usd_rate || 0,
    'EUR': rates.eur_rate || 0,
    'CNY': rates.cny_rate || 0
  };

  const rate = rateMap[currency];
  
  if (!rate || rate === 0) {
    console.warn(`⚠️ No exchange rate found for ${currency}`);
    return 0;
  }

  const result = amount * rate;
  console.log(`✅ Converted ${amount} ${currency} = ${result} RUB (rate: ${rate})`);
  
  return result;
};

/**
 * Convert amount from rubles to foreign currency
 * @param amount - Amount in rubles
 * @param currency - Target currency type
 * @param rates - Currency rates from tender
 * @returns Amount in foreign currency
 */
export const convertFromRuble = (
  amount: number,
  currency: CurrencyType,
  rates: CurrencyRates | null
): number => {
  console.log('💱 Converting from rubles:', { amount, currency, rates });
  
  if (currency === 'RUB') {
    return amount;
  }

  if (!rates) {
    console.warn('⚠️ No rates provided, using 1:1');
    return amount;
  }

  const rateMap: Record<string, number> = {
    'USD': rates.usd_rate || 0,
    'EUR': rates.eur_rate || 0,
    'CNY': rates.cny_rate || 0
  };

  const rate = rateMap[currency];
  
  if (!rate || rate === 0) {
    console.warn(`⚠️ No exchange rate found for ${currency}`);
    return 0;
  }

  const result = amount / rate;
  console.log(`✅ Converted ${amount} RUB = ${result} ${currency} (rate: ${rate})`);
  
  return result;
};

/**
 * Get currency rate for specific currency
 * @param currency - Currency type
 * @param rates - Currency rates from tender
 * @returns Exchange rate or null
 */
export const getCurrencyRate = (
  currency: CurrencyType,
  rates: CurrencyRates | null
): number | null => {
  // Log raw arguments first
  console.log('📥 getCurrencyRate RAW INPUT:', 'currency=', currency, 'rates=', rates);
  
  // Force log the rates object structure
  if (rates) {
    console.log('📊 RATES OBJECT STRUCTURE:');
    console.log('  - Keys:', Object.keys(rates));
    console.log('  - JSON:', JSON.stringify(rates));
    console.log('  - usd_rate direct access:', rates.usd_rate);
    console.log('  - Has usd_rate property?:', 'usd_rate' in rates);
    console.log('  - Has USD_RATE property?:', 'USD_RATE' in rates);
    console.log('  - Has usdRate property?:', 'usdRate' in rates);
    
    // Try to access all properties
    for (const [key, value] of Object.entries(rates)) {
      console.log(`  - rates.${key} = ${value} (type: ${typeof value})`);
    }
  }
  
  console.log('🔍 getCurrencyRate called:', { 
    currency, 
    rates,
    currency_type: typeof currency,
    rates_type: typeof rates,
    rates_keys: rates ? Object.keys(rates) : null,
    rates_values: rates ? Object.entries(rates) : null,
    usd_rate_value: rates?.usd_rate,
    eur_rate_value: rates?.eur_rate,
    cny_rate_value: rates?.cny_rate,
    rates_stringified: JSON.stringify(rates)
  });
  
  if (currency === 'RUB') {
    console.log('✅ Currency is RUB, returning 1');
    return 1;
  }

  if (!rates) {
    console.warn('⚠️ No rates object provided');
    return null;
  }

  const rateMap: Record<string, number | null | undefined> = {
    'USD': rates.usd_rate,
    'EUR': rates.eur_rate,
    'CNY': rates.cny_rate
  };

  const rate = rateMap[currency];
  console.log(`📊 Rate for ${currency}:`, {
    rate,
    rate_type: typeof rate,
    is_null: rate === null,
    is_undefined: rate === undefined,
    is_zero: rate === 0,
    is_number: typeof rate === 'number',
    actual_value: rate,
    will_return: typeof rate === 'number' ? rate : null
  });
  
  // Return the rate if it's a valid number (including 0, though 0 shouldn't be a valid exchange rate)
  // Don't use || operator as it will return null for 0
  return typeof rate === 'number' ? rate : null;
};

/**
 * Format amount with currency symbol
 * @param amount - Amount to format
 * @param currency - Currency type
 * @returns Formatted string with currency symbol
 */
export const formatCurrency = (
  amount: number,
  currency: CurrencyType = 'RUB'
): string => {
  const formatted = amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `${formatted} ${CURRENCY_SYMBOLS[currency]}`;
};

/**
 * Check if currency rates are available
 * @param rates - Currency rates from tender
 * @returns true if at least one rate is available
 */
export const hasValidRates = (rates: CurrencyRates): boolean => {
  return Boolean(
    (rates.usd_rate && rates.usd_rate > 0) ||
    (rates.eur_rate && rates.eur_rate > 0) ||
    (rates.cny_rate && rates.cny_rate > 0)
  );
};

/**
 * Get currency symbol for a currency type
 * @param currency - Currency type
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: CurrencyType): string => {
  return CURRENCY_SYMBOLS[currency] || '₽';
};