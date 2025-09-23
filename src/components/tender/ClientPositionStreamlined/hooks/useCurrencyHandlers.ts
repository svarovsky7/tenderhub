import { useCallback } from 'react';
import type { FormInstance } from 'antd/es/form';
import { getCurrencyRate } from '../../../../utils/currencyConverter';

interface UseCurrencyHandlersProps {
  quickAddForm: FormInstance;
  setSelectedCurrency: (currency: string) => void;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

export const useCurrencyHandlers = ({
  quickAddForm,
  setSelectedCurrency,
  tender
}: UseCurrencyHandlersProps) => {

  // Handle currency change in quick add form
  const handleCurrencyChange = useCallback((currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => {
    console.log('💱 Currency changed:', currency);
    console.log('🔍 Tender data available:', { tender, hasTender: !!tender });
    setSelectedCurrency(currency);

    if (currency === 'RUB') {
      // When switching to RUB, enable unit_rate field
      quickAddForm.setFieldsValue({
        currency_type: 'RUB',
        currency_rate: 1
      });
    } else {
      // When switching to foreign currency
      let rate = 1;
      if (tender) {
        const fetchedRate = getCurrencyRate(currency, tender);
        console.log('📊 Currency rate from tender:', {
          currency,
          fetchedRate,
          fetchedRate_type: typeof fetchedRate,
          tender_rates: {
            usd: tender?.usd_rate,
            eur: tender?.eur_rate,
            cny: tender?.cny_rate
          }
        });

        if (fetchedRate && fetchedRate > 0) {
          rate = fetchedRate;
        } else {
          console.warn('⚠️ No valid rate found for currency:', currency);
        }
      } else {
        console.warn('⚠️ Tender data not available for currency conversion');
      }

      quickAddForm.setFieldsValue({
        currency_type: currency,
        currency_rate: rate
      });
    }
  }, [quickAddForm, tender, setSelectedCurrency]);

  return {
    handleCurrencyChange
  };
};