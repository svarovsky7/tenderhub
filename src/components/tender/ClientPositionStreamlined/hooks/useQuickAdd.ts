import { useCallback, useState } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { useQueryClient } from '@tanstack/react-query';
import { boqApi, workMaterialLinksApi } from '../../../../lib/supabase/api';
import { getCurrencyRate } from '../../../../utils/currencyConverter';
import type { BOQItemWithLibrary, BOQItemInsert } from '../../../../lib/supabase/types';

interface QuickAddRowData {
  type: 'work' | 'material' | 'sub_work' | 'sub_material';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  work_id?: string;
  material_type?: 'main' | 'auxiliary';
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  detail_cost_category_id?: string;
  cost_category_display?: string;
  delivery_price_type?: 'included' | 'not_included' | 'amount';
  delivery_amount?: number;
  currency_type?: 'RUB' | 'USD' | 'EUR' | 'CNY';
  quote_link?: string;
  note?: string;
}

interface UseQuickAddProps {
  position: any;
  tenderId: string;
  works: BOQItemWithLibrary[];
  setLocalWorks: React.Dispatch<React.SetStateAction<BOQItemWithLibrary[]>>;
  quickAddForm: FormInstance;
  onUpdate: () => void;
  tender?: any;
}

export const useQuickAdd = ({
  position,
  tenderId,
  works,
  setLocalWorks,
  quickAddForm,
  onUpdate,
  tender
}: UseQuickAddProps) => {
  const queryClient = useQueryClient();
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'CNY'>('RUB');
  const [loading, setLoading] = useState(false);

  // Handle currency change in quick add form
  const handleCurrencyChange = useCallback((currency: 'RUB' | 'USD' | 'EUR' | 'CNY') => {
    console.log('💱 Currency changed:', currency);
    console.log('🔍 Tender data available:', { tender, hasTender: !!tender });
    setSelectedCurrency(currency);

    if (currency === 'RUB') {
      quickAddForm.setFieldsValue({
        currency_type: 'RUB',
        currency_rate: 1
      });
    } else {
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

        if (!fetchedRate || fetchedRate === 0) {
          console.error('❌ No valid currency rate found for', currency);
          message.warning(`Курс ${currency} не установлен в тендере. Установите курс валюты в настройках тендера.`);
          quickAddForm.setFieldsValue({
            currency_type: 'RUB'
          });
          return;
        }

        rate = fetchedRate;
      } else {
        console.log('⚠️ No tender data available, cannot convert currency');
        message.warning('Данные тендера еще не загружены. Подождите и попробуйте снова.');
        return;
      }

      quickAddForm.setFieldsValue({
        currency_type: currency,
        currency_rate: rate
      });
    }
  }, [quickAddForm, tender]);

  // Quick add new item
  const handleQuickAdd = useCallback(async (values: QuickAddRowData) => {
    console.log('🚀 Quick adding item:', values);
    console.log('📊 Form values:', {
      type: values.type,
      work_id: values.work_id,
      consumption: values.consumption_coefficient,
      conversion: values.conversion_coefficient,
      available_works: works.length,
      works: works.map(w => ({ id: w.id, desc: w.description }))
    });
    setLoading(true);
    try {
      const existingItems = position.boq_items || [];
      const positionNumber = position.position_number;
      const nextSubNumber = existingItems.length + 1;

      let finalQuantity = values.quantity;
      let baseQuantity = values.quantity;

      if ((values.type === 'material' || values.type === 'sub_material') && !values.work_id) {
        const consumptionCoef = values.consumption_coefficient || 1;
        finalQuantity = (values.quantity || 1) * consumptionCoef;
        baseQuantity = values.quantity || 1;

        console.log('📊 Calculated unlinked material quantity:', {
          baseQuantity: baseQuantity,
          consumption: consumptionCoef,
          finalQuantity: finalQuantity
        });
      }

      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id) {
        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          const consumptionCoef = values.consumption_coefficient || 1;
          const conversionCoef = values.conversion_coefficient || 1;
          finalQuantity = work.quantity * consumptionCoef * conversionCoef;

          console.log('📊 Calculated material quantity for new item:', {
            workQuantity: work.quantity,
            consumption: consumptionCoef,
            conversion: conversionCoef,
            result: finalQuantity
          });

          const MAX_NUMERIC_VALUE = 99999999.9999;
          if (finalQuantity > MAX_NUMERIC_VALUE) {
            console.error('⚠️ Calculated quantity exceeds database limits:', finalQuantity);
            message.error(`Ошибка: расчетное количество слишком большое (${finalQuantity.toLocaleString('ru-RU')}). Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}. Уменьшите коэффициенты.`);
            setLoading(false);
            return;
          }
        }
      }

      // Pass the category ID directly without validation
      const detailCostCategoryId = values.detail_cost_category_id || null;
      console.log('📊 Quick add using detail_cost_category_id:', detailCostCategoryId);

      let calculatedCurrencyRate = null;
      console.log('🔍 [handleQuickAdd] Tender check:', {
        tenderExists: !!tender,
        tenderValue: tender,
        currency_type: values.currency_type,
        unit_rate: values.unit_rate
      });

      if (values.currency_type && values.currency_type !== 'RUB') {
        if (!tender) {
          console.error('❌ [handleQuickAdd] TENDER IS NULL! Cannot get currency rate');
          message.error('Ошибка: курсы валют еще не загружены. Подождите и попробуйте снова.');
          setLoading(false);
          return;
        }

        const rateFromTender = getCurrencyRate(values.currency_type, tender);

        console.log('🔍 [handleQuickAdd] getCurrencyRate result:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          tenderUsdRate: tender?.usd_rate,
          tenderEurRate: tender?.eur_rate,
          tenderCnyRate: tender?.cny_rate
        });

        if (!rateFromTender || rateFromTender === 0) {
          console.error('❌ [handleQuickAdd] No valid currency rate found for', values.currency_type);
          message.error(`Ошибка: курс ${values.currency_type} не установлен в тендере. Обратитесь к администратору.`);
          setLoading(false);
          return;
        }

        calculatedCurrencyRate = rateFromTender;
        console.log('💱 [handleQuickAdd] Currency rate calculation:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          calculatedRate: calculatedCurrencyRate,
          unitRate: values.unit_rate
        });
      }

      const newItem: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        item_type: values.type,
        description: values.description,
        unit: values.unit,
        quantity: finalQuantity,
        unit_rate: values.unit_rate,
        item_number: `${positionNumber}.${nextSubNumber}`,
        sub_number: nextSubNumber,
        sort_order: nextSubNumber,
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,
        quote_link: values.quote_link || null,
        note: values.note || null,
        ...(detailCostCategoryId && {
          detail_cost_category_id: detailCostCategoryId
        }),
        ...((values.type === 'material' || values.type === 'sub_material') && !values.work_id && {
          base_quantity: baseQuantity
        }),
        ...((values.type === 'material' || values.type === 'sub_material') && {
          consumption_coefficient: values.consumption_coefficient || 1,
          conversion_coefficient: values.conversion_coefficient || 1,
          delivery_price_type: values.delivery_price_type || 'included',
          delivery_amount: values.delivery_amount || 0,
          material_type: values.material_type || 'main'
        })
      };

      const result = await boqApi.create(newItem);
      console.log('📦 BOQ create result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Invalidate cost category display cache to refresh the UI for new item
      if (result.data?.detail_cost_category_id) {
        console.log('🔄 Invalidating cost category cache for new item:', result.data.detail_cost_category_id);
        queryClient.invalidateQueries({
          queryKey: ['costCategoryDisplay', result.data.detail_cost_category_id]
        });
      }

      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id && result.data) {
        console.log('🔍 Attempting to create work-material link...');

        const workItem = works.find(w => w.id === values.work_id);
        const isSubWork = workItem?.item_type === 'sub_work';
        const isSubMaterial = values.type === 'sub_material';

        const linkData: any = {
          client_position_id: position.id,
          material_quantity_per_work: values.consumption_coefficient || 1,
          usage_coefficient: values.conversion_coefficient || 1
        };

        if (isSubWork && isSubMaterial) {
          linkData.sub_work_boq_item_id = values.work_id;
          linkData.sub_material_boq_item_id = result.data.id;
        } else if (isSubWork && !isSubMaterial) {
          linkData.sub_work_boq_item_id = values.work_id;
          linkData.material_boq_item_id = result.data.id;
        } else if (!isSubWork && isSubMaterial) {
          linkData.work_boq_item_id = values.work_id;
          linkData.sub_material_boq_item_id = result.data.id;
        } else {
          linkData.work_boq_item_id = values.work_id;
          linkData.material_boq_item_id = result.data.id;
        }

        console.log('🔗 Creating work-material link with data:', linkData);
        const linkResult = await workMaterialLinksApi.createLink(linkData);

        if (linkResult.error) {
          console.error('❌ Failed to create work-material link:', linkResult.error);
          message.warning('Материал добавлен, но связь с работой не создана: ' + linkResult.error);
        } else {
          console.log('✅ Material linked to work successfully', linkResult);

          if (linkResult.data) {
            result.data.work_link = {
              ...linkResult.data,
              material_quantity_per_work: values.consumption_coefficient || 1,
              usage_coefficient: values.conversion_coefficient || 1
            };
            console.log('📎 Link added to material:', result.data);
          }
        }
      } else {
        console.log('⚠️ Link not created:', {
          is_material: values.type === 'material',
          has_work_id: !!values.work_id,
          has_result_data: !!result.data
        });
      }

      console.log('✅ Item added successfully');

      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id) {
        const linkedWork = works.find(w => w.id === values.work_id);
        const itemType = values.type === 'sub_material' ? 'Суб-материал' : 'Материал';
        message.success(`${itemType} добавлен и связан с работой: ${linkedWork?.description || values.work_id}`);
      } else {
        const typeNames = {
          'work': 'Работа',
          'material': 'Материал',
          'sub_work': 'Суб-работа',
          'sub_material': 'Суб-материал'
        };
        message.success(`${typeNames[values.type]} добавлен`);
      }

      if ((values.type === 'work' || values.type === 'sub_work') && result.data) {
        const newWork: BOQItemWithLibrary = {
          ...result.data,
          item_type: 'work',
          library_item: undefined,
          work_link: undefined
        };
        setLocalWorks(prev => [...prev, newWork]);
        console.log('🔄 Added work to local list:', newWork.description);
      }

      setTimeout(() => {
        const currentWorks = position.boq_items?.filter(item =>
          item.item_type === 'work' || item.item_type === 'sub_work'
        ) || [];
        if ((values.type === 'work' || values.type === 'sub_work') && result.data) {
          const workExists = currentWorks.some(w => w.id === result.data.id);
          if (!workExists) {
            const newWork: BOQItemWithLibrary = {
              ...result.data,
              item_type: 'work',
              library_item: undefined,
              work_link: undefined
            };
            setLocalWorks([...currentWorks, newWork]);
          } else {
            setLocalWorks(currentWorks);
          }
        } else {
          setLocalWorks(currentWorks);
        }
        console.log('🔄 Force refreshed works list');
      }, 100);

      quickAddForm.resetFields();
      setQuickAddMode(false);
      setSelectedCurrency('RUB');
      onUpdate();
    } catch (error) {
      console.error('❌ Add item error:', error);
      message.error('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  }, [position, tenderId, works, quickAddForm, onUpdate, tender, setLocalWorks]);

  return {
    quickAddMode,
    setQuickAddMode,
    selectedCurrency,
    setSelectedCurrency,
    handleCurrencyChange,
    handleQuickAdd,
    quickAddLoading: loading
  };
};