import { useCallback } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { boqApi, workMaterialLinksApi } from '../../../../lib/supabase/api';
import type { BOQItem } from '../../../../lib/supabase/types';
import { getCurrencyRate } from '../../../../utils/currencyConverter';

interface BOQItemWithLibrary extends BOQItem {
  libraryWorkId?: string | null;
  libraryMaterialId?: string | null;
}

interface UseWorkHandlersProps {
  position: any;
  workEditForm: FormInstance;
  editingWorkId: string | null;
  setEditingWorkId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setRefreshKey: (fn: (prev: number) => number) => void;
  onUpdate: () => void;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

export const useWorkHandlers = ({
  position,
  workEditForm,
  editingWorkId,
  setEditingWorkId,
  setLoading,
  setRefreshKey,
  onUpdate,
  tender
}: UseWorkHandlersProps) => {

  // Start editing work inline
  const handleEditWork = useCallback((item: BOQItemWithLibrary) => {
    console.log('✏️ Starting inline edit for work:', item.id);
    console.log('🎯 Work detail_cost_category_id:', item.detail_cost_category_id);

    // Calculate correct currency rate from tender
    let correctCurrencyRate = 1;
    if (item.currency_type && item.currency_type !== 'RUB' && tender) {
      const rateFromTender = getCurrencyRate(item.currency_type, tender);
      correctCurrencyRate = rateFromTender || 1;
      console.log('💱 [handleEditWork] Setting correct currency rate:', {
        itemRate: item.currency_rate,
        tenderRate: correctCurrencyRate,
        currency: item.currency_type
      });
    }

    setEditingWorkId(item.id);
    workEditForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      detail_cost_category_id: item.detail_cost_category_id || null,
      item_type: item.item_type,
      currency_type: item.currency_type || 'RUB',
      currency_rate: correctCurrencyRate,
      quote_link: item.quote_link || '',
      note: item.note || ''
    });
  }, [workEditForm, tender, setEditingWorkId]);

  // Save inline edited work
  const handleSaveWorkEdit = useCallback(async (values: any) => {
    if (!editingWorkId) return;

    console.log('💾 Saving work edits:', values);
    console.log('🔍 Validating detail_cost_category_id:', values.detail_cost_category_id);
    setLoading(true);
    try {
      // Find current work item
      const currentWorkItem = position.boq_items?.find((item: any) => item.id === editingWorkId);
      if (!currentWorkItem) {
        console.error('❌ Current work item not found:', editingWorkId);
        message.error('Редактируемая работа не найдена');
        setLoading(false);
        return;
      }

      const oldItemType = currentWorkItem.item_type;
      const newItemType = values.item_type;
      console.log('🔄 Type change check:', { oldItemType, newItemType });

      let detailCostCategoryId = null;

      // Validate detail_cost_category_id if provided
      if (values.detail_cost_category_id && values.detail_cost_category_id !== '') {
        // Import validation function
        const { getDetailCategoryDisplay } = await import('../../../../lib/supabase/api/construction-costs');

        const { data: categoryExists } = await getDetailCategoryDisplay(values.detail_cost_category_id);
        if (categoryExists) {
          detailCostCategoryId = values.detail_cost_category_id;
          console.log('✅ detail_cost_category_id validated:', detailCostCategoryId);
        } else {
          console.error('❌ detail_cost_category_id does not exist in database:', values.detail_cost_category_id);
          message.error('Выбранная категория затрат не найдена в базе данных');
          setLoading(false);
          return;
        }
      }

      // Calculate currency rate from tender
      let calculatedCurrencyRate = null;
      console.log('🔍 [handleSaveWorkEdit] Tender check:', {
        tenderExists: !!tender,
        tenderValue: tender,
        tender_raw: JSON.stringify(tender),
        tender_usd_rate: tender?.usd_rate,
        tender_eur_rate: tender?.eur_rate,
        tender_cny_rate: tender?.cny_rate,
        currency_type: values.currency_type,
        unit_rate: values.unit_rate
      });

      // For foreign currency, we MUST have a valid exchange rate
      if (values.currency_type && values.currency_type !== 'RUB') {
        if (!tender) {
          console.error('❌ [handleSaveWorkEdit] TENDER IS NULL! Cannot get currency rate');
          message.error('Ошибка: курсы валют еще не загружены. Подождите и попробуйте снова.');
          setLoading(false);
          return;
        }

        const rateFromTender = getCurrencyRate(values.currency_type, tender);

        console.log('🔍 [handleSaveWorkEdit] getCurrencyRate result:', {
          currency: values.currency_type,
          tender,
          tender_raw: JSON.stringify(tender),
          rateFromTender,
          rateFromTender_type: typeof rateFromTender,
          tenderUsdRate: tender?.usd_rate,
          tenderEurRate: tender?.eur_rate,
          tenderCnyRate: tender?.cny_rate
        });

        if (!rateFromTender || rateFromTender === 0) {
          console.error('❌ [handleSaveWorkEdit] No valid currency rate found for', values.currency_type);
          message.error(`Ошибка: курс ${values.currency_type} не установлен в тендере. Обратитесь к администратору.`);
          setLoading(false);
          return;
        }

        calculatedCurrencyRate = rateFromTender;
        console.log('💱 [handleSaveWorkEdit] Currency rate calculation:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          calculatedRate: calculatedCurrencyRate,
          unitRate: values.unit_rate
        });
      }
      // For RUB, currency_rate should be NULL (not 1)

      // IMPORTANT: Don't use values.currency_rate, always calculate from tender
      // Remove currency_rate from values to avoid overwriting
      const { currency_rate: ignoredRate, ...cleanValues } = values;

      const updateData = {
        ...cleanValues,
        detail_cost_category_id: detailCostCategoryId,
        item_type: values.item_type || currentWorkItem.item_type,
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,  // Always use calculated rate, never from form
        quote_link: values.quote_link || null,
        note: values.note || null
      };

      console.log('💾 Final update data:', {
        ...updateData,
        valuesRate: values.currency_rate,
        calculatedRate: calculatedCurrencyRate,
        willSaveRate: updateData.currency_rate
      });
      const result = await boqApi.update(editingWorkId, updateData);
      if (result.error) {
        throw new Error(result.error);
      }

      // If work type changed, update all linked materials
      if (oldItemType !== newItemType) {
        console.log('🔗 Work type changed, updating linked materials');

        // Get all links for this position
        const positionLinks = await workMaterialLinksApi.getLinksByPosition(position.id);
        if (!positionLinks.error && positionLinks.data) {
          // Find links associated with this work
          const workLinks = positionLinks.data.filter((link: any) => {
            if (oldItemType === 'work') {
              return link.work_boq_item_id === editingWorkId;
            } else if (oldItemType === 'sub_work') {
              return link.sub_work_boq_item_id === editingWorkId;
            }
            return false;
          });

          console.log('🔍 Found links to update:', workLinks.length);

          // Update each link
          for (const link of workLinks) {
            const newLinkData: any = {
              client_position_id: link.client_position_id,
              material_quantity_per_work: link.material_quantity_per_work,
              usage_coefficient: link.usage_coefficient
            };

            // Set the correct work field based on new type and material type
            const materialId = link.material_boq_item_id || link.sub_material_boq_item_id;
            const isMaterialSub = !!link.sub_material_boq_item_id;

            if (newItemType === 'work') {
              // Regular work
              newLinkData.work_boq_item_id = editingWorkId;
              if (isMaterialSub) {
                newLinkData.sub_material_boq_item_id = materialId;
              } else {
                newLinkData.material_boq_item_id = materialId;
              }
            } else if (newItemType === 'sub_work') {
              // Sub-work
              newLinkData.sub_work_boq_item_id = editingWorkId;
              if (isMaterialSub) {
                newLinkData.sub_material_boq_item_id = materialId;
              } else {
                newLinkData.material_boq_item_id = materialId;
              }
            }

            console.log('🔄 Updating link:', { oldLink: link, newLinkData });

            // Delete old link and create new one
            await workMaterialLinksApi.deleteLink(link.id);
            await workMaterialLinksApi.createLink(newLinkData);
          }

          console.log('✅ Updated all material links for type change');
        }
      }

      // Update linked materials in the background using setTimeout to avoid blocking UI
      setTimeout(async () => {
        try {
          console.log('🔄 Background: Updating linked materials for work:', editingWorkId);
          const positionLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          if (!positionLinksResult.error && positionLinksResult.data) {
            const linkedMaterials = positionLinksResult.data.filter((link: any) => {
              return (link.work_boq_item_id === editingWorkId) ||
                     (link.sub_work_boq_item_id === editingWorkId);
            });

            for (const link of linkedMaterials) {
              const materialId = link.material_boq_item_id || link.sub_material_boq_item_id;
              if (!materialId) continue;

              const material = position.boq_items?.find((item: any) => item.id === materialId);
              if (!material) continue;

              const workQuantity = values.quantity || 0;
              const consumptionCoef = material.consumption_coefficient ||
                                     link.material_quantity_per_work || 1;
              const conversionCoef = material.conversion_coefficient ||
                                    link.usage_coefficient || 1;
              const newQuantity = workQuantity * consumptionCoef * conversionCoef;

              const unitRate = material.unit_rate || 0;
              let newTotalAmount = newQuantity * unitRate;

              if (material.delivery_price_type === 'amount' && material.delivery_amount > 0) {
                newTotalAmount += (material.delivery_amount * newQuantity);
              } else if (material.delivery_price_type === 'not_included' && material.delivery_amount > 0) {
                newTotalAmount += (material.delivery_amount * newQuantity);
              }

              await boqApi.update(materialId, {
                quantity: newQuantity,
                total_amount: newTotalAmount
              });
            }

            if (linkedMaterials.length > 0) {
              console.log('✅ Background: Updated', linkedMaterials.length, 'linked materials');
            }
          }
        } catch (error) {
          console.error('❌ Background: Error updating linked materials:', error);
        }
      }, 100); // Small delay to let the UI update first

      console.log('✅ Work updated successfully');

      // Just call onUpdate to refresh the position data
      // The parent component will reload the data from server

      message.success('Работа обновлена');
      setEditingWorkId(null);
      workEditForm.resetFields();
      setRefreshKey(prev => prev + 1); // Force refresh
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления работы');
    } finally {
      setLoading(false);
    }
  }, [editingWorkId, workEditForm, onUpdate, position.boq_items, position.id, tender,
      setLoading, setEditingWorkId, setRefreshKey]);

  // Cancel work inline edit
  const handleCancelWorkEdit = useCallback(() => {
    console.log('❌ Cancelling work edit');
    setEditingWorkId(null);
    workEditForm.resetFields();
  }, [workEditForm, setEditingWorkId]);

  return {
    handleEditWork,
    handleSaveWorkEdit,
    handleCancelWorkEdit
  };
};