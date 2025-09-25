import { useCallback } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { useQueryClient } from '@tanstack/react-query';
import { boqApi, workMaterialLinksApi } from '../../../../lib/supabase/api';
import type { BOQItem, BOQItemInsert } from '../../../../lib/supabase/types';
import { getCurrencyRate } from '../../../../utils/currencyConverter';

interface BOQItemWithLibrary extends BOQItem {
  libraryWorkId?: string | null;
  libraryMaterialId?: string | null;
  library_item?: any;
  work_link?: any;
}

interface QuickAddRowData {
  type: 'work' | 'material' | 'sub_work' | 'sub_material';
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  work_id?: string;
  consumption_coefficient?: number;
  conversion_coefficient?: number;
  detail_cost_category_id?: string;
  delivery_price_type?: string;
  delivery_amount?: number;
  material_type?: string;
  currency_type?: string;
  quote_link?: string;
  note?: string;
}

interface UseQuickAddHandlersProps {
  position: any;
  tenderId: string;
  works: BOQItemWithLibrary[];
  quickAddForm: FormInstance;
  setLoading: (loading: boolean) => void;
  setLocalWorks: (works: any) => void;
  setQuickAddMode: (mode: boolean) => void;
  setSelectedCurrency: (currency: string) => void;
  setSelectedWorkId: (id: string | null) => void;
  setLinkingModalVisible: (visible: boolean) => void;
  onUpdate: () => void;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

export const useQuickAddHandlers = ({
  position,
  tenderId,
  works,
  quickAddForm,
  setLoading,
  setLocalWorks,
  setQuickAddMode,
  setSelectedCurrency,
  setSelectedWorkId,
  setLinkingModalVisible,
  onUpdate,
  tender
}: UseQuickAddHandlersProps) => {
  const queryClient = useQueryClient();

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
      // Get next item number
      const existingItems = position.boq_items || [];
      const positionNumber = position.position_number;
      const nextSubNumber = existingItems.length + 1;

      let finalQuantity = values.quantity;
      let baseQuantity = values.quantity; // Store user-entered base quantity

      // For unlinked materials and sub-materials, apply coefficients to user-entered quantity
      if ((values.type === 'material' || values.type === 'sub_material') && !values.work_id) {
        // Use the quantity entered by user and apply coefficients
        const consumptionCoef = values.consumption_coefficient || 1;
        // Note: conversion_coefficient is always 1 for unlinked materials (field is disabled in UI)
        finalQuantity = (values.quantity || 1) * consumptionCoef;
        baseQuantity = values.quantity || 1; // Store the base quantity before coefficients

        console.log('📊 Calculated unlinked material quantity:', {
          baseQuantity: baseQuantity,
          consumption: consumptionCoef,
          finalQuantity: finalQuantity
        });
      }

      // If it's a material/sub-material linked to work, calculate quantity based on work volume
      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id) {
        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          // Calculate material quantity: work_quantity * consumption * conversion
          const consumptionCoef = values.consumption_coefficient || 1;
          const conversionCoef = values.conversion_coefficient || 1;
          finalQuantity = work.quantity * consumptionCoef * conversionCoef;

          console.log('📊 Calculated material quantity for new item:', {
            workQuantity: work.quantity,
            consumption: consumptionCoef,
            conversion: conversionCoef,
            result: finalQuantity
          });

          // Check for numeric overflow (max value for numeric(12,4) is 99,999,999.9999)
          const MAX_NUMERIC_VALUE = 99999999.9999;
          if (finalQuantity > MAX_NUMERIC_VALUE) {
            console.error('⚠️ Calculated quantity exceeds database limits:', finalQuantity);
            message.error(`Ошибка: расчетное количество слишком большое (${finalQuantity.toLocaleString('ru-RU')}). Максимум: ${MAX_NUMERIC_VALUE.toLocaleString('ru-RU')}. Уменьшите коэффициенты.`);
            setLoading(false);
            return;
          }
        }
      }

      // Validate detail_cost_category_id before creating item
      let detailCostCategoryId = null;
      if (values.detail_cost_category_id && values.detail_cost_category_id !== '') {
        console.log('🔍 Validating quick add detail_cost_category_id:', values.detail_cost_category_id);

        // Import validation function
        const { getDetailCategoryDisplay } = await import('../../../../lib/supabase/api/construction-costs');

        const { data: categoryExists } = await getDetailCategoryDisplay(values.detail_cost_category_id);
        if (categoryExists) {
          detailCostCategoryId = values.detail_cost_category_id;
          console.log('✅ Quick add detail_cost_category_id validated:', detailCostCategoryId);
        } else {
          console.error('❌ Quick add detail_cost_category_id does not exist in database:', values.detail_cost_category_id);
          message.error('Выбранная категория затрат не найдена в базе данных');
          setLoading(false);
          return;
        }
      }

      // Calculate currency rate from tender
      let calculatedCurrencyRate = null;
      console.log('🔍 [handleQuickAdd] Tender check:', {
        tenderExists: !!tender,
        tenderValue: tender,
        currency_type: values.currency_type,
        unit_rate: values.unit_rate
      });

      // For foreign currency, we MUST have a valid exchange rate
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
      // For RUB, currency_rate should be NULL (not 1)

      const newItem: BOQItemInsert = {
        tender_id: tenderId,
        client_position_id: position.id,
        item_type: values.type,  // Use actual type directly
        description: values.description,  // Use description without prefix
        unit: values.unit,
        quantity: finalQuantity,  // Use calculated quantity
        unit_rate: values.unit_rate,
        item_number: `${positionNumber}.${nextSubNumber}`,
        sub_number: nextSubNumber,
        sort_order: nextSubNumber,
        // Add currency fields
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,
        // Add quote link and note fields
        quote_link: values.quote_link || null,
        note: values.note || null,
        // Add detail cost category if validated
        ...(detailCostCategoryId && {
          detail_cost_category_id: detailCostCategoryId
        }),
        // Add base_quantity for unlinked materials
        ...((values.type === 'material' || values.type === 'sub_material') && !values.work_id && {
          base_quantity: baseQuantity
        }),
        // Add coefficients and delivery fields for materials and sub-materials
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
      console.log('📦 BOQ result.data:', result.data);
      console.log('📦 BOQ result.data type:', typeof result.data);

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

      // If it's a material/sub-material and a work is selected, create link
      if ((values.type === 'material' || values.type === 'sub_material') && values.work_id && result.data) {
        console.log('🔍 Attempting to create work-material link...');
        console.log('🔍 Material created with data:', result.data);
        console.log('🔍 Material ID:', result.data.id);
        console.log('🔍 Work selected with ID:', values.work_id);

        // Get the work item to check its type
        const workItem = works.find(w => w.id === values.work_id);
        const isSubWork = workItem?.item_type === 'sub_work';
        const isSubMaterial = values.type === 'sub_material';

        // Build link data based on types
        const linkData: any = {
          client_position_id: position.id,
          material_quantity_per_work: values.consumption_coefficient || 1,
          usage_coefficient: values.conversion_coefficient || 1
        };

        // Set appropriate fields based on types
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
          console.error('❌ Error details:', linkResult);
          message.warning('Материал добавлен, но связь с работой не создана: ' + linkResult.error);
        } else {
          console.log('✅ Material linked to work successfully', linkResult);

          // Add link info to the result for immediate display
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

      // Show appropriate success message
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

      // Update local works list if we just added a work or sub-work
      if ((values.type === 'work' || values.type === 'sub_work') && result.data) {
        const newWork: BOQItemWithLibrary = {
          ...result.data,
          item_type: values.type,
          library_item: undefined,
          work_link: undefined
        };
        setLocalWorks((prev: BOQItemWithLibrary[]) => [...prev, newWork]);
        console.log('🔄 Added work to local list:', newWork.description);
      }

      // Force refresh of works list for any new item to ensure UI is up to date
      // This is needed because onUpdate is async and the parent might not update immediately
      setTimeout(() => {
        const currentWorks = position.boq_items?.filter((item: any) =>
          item.item_type === 'work' || item.item_type === 'sub_work'
        ) || [];
        if ((values.type === 'work' || values.type === 'sub_work') && result.data) {
          // Ensure the new work is in the list
          const workExists = currentWorks.some((w: any) => w.id === result.data.id);
          if (!workExists) {
            const newWork: BOQItemWithLibrary = {
              ...result.data,
              item_type: values.type,
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
  }, [position, tenderId, works, quickAddForm, onUpdate, tender,
      setLoading, setLocalWorks, setQuickAddMode, setSelectedCurrency]);

  // Open material linking modal
  const handleLinkMaterials = useCallback((workId: string) => {
    console.log('🔗 Opening material linking for work:', workId);
    setSelectedWorkId(workId);
    setLinkingModalVisible(true);
  }, [setSelectedWorkId, setLinkingModalVisible]);

  // Handle material linking
  const handleMaterialsLinked = useCallback(() => {
    console.log('✅ Materials linked successfully');
    setLinkingModalVisible(false);
    setSelectedWorkId(null);
    onUpdate();
  }, [onUpdate, setLinkingModalVisible, setSelectedWorkId]);

  return {
    handleQuickAdd,
    handleLinkMaterials,
    handleMaterialsLinked
  };
};