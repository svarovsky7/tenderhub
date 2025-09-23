import { useCallback, useState } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { boqApi, workMaterialLinksApi } from '../../../../lib/supabase/api';
import { getCurrencyRate } from '../../../../utils/currencyConverter';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

interface UseWorkEditProps {
  position: any;
  localBOQItems: any[];
  setLocalBOQItems: React.Dispatch<React.SetStateAction<any[]>>;
  workEditForm: FormInstance;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  onUpdate: () => void;
  tender?: any;
}

export const useWorkEdit = ({
  position,
  localBOQItems,
  setLocalBOQItems,
  workEditForm,
  setRefreshKey,
  onUpdate,
  tender
}: UseWorkEditProps) => {
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEditWork = useCallback((item: BOQItemWithLibrary) => {
    console.log('✏️ Starting inline edit for work:', item.id);
    console.log('🎯 Work detail_cost_category_id:', item.detail_cost_category_id);
    console.log('📦 Full work item data:', JSON.stringify(item));

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

    // Preserve the exact category ID value from the item
    const categoryIdToSet = item.detail_cost_category_id !== undefined ? item.detail_cost_category_id : null;
    console.log('🎯 [handleEditWork] Setting category ID in form:', categoryIdToSet);

    setEditingWorkId(item.id);
    workEditForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      detail_cost_category_id: categoryIdToSet,
      item_type: item.item_type,
      currency_type: item.currency_type || 'RUB',
      currency_rate: correctCurrencyRate,
      quote_link: item.quote_link || '',
      note: item.note || ''
    });

    console.log('✅ [handleEditWork] Form values set successfully');
  }, [workEditForm, tender]);

  const handleSaveWorkEdit = useCallback(async (values: any) => {
    if (!editingWorkId) return;

    console.log('💾 Saving work edits:', values);
    console.log('🔍 Validating detail_cost_category_id:', values.detail_cost_category_id);
    setLoading(true);
    try {
      const currentWorkItem = position.boq_items?.find(item => item.id === editingWorkId);
      if (!currentWorkItem) {
        console.error('❌ Current work item not found:', editingWorkId);
        message.error('Редактируемая работа не найдена');
        return;
      }

      const oldItemType = currentWorkItem.item_type;
      const newItemType = values.item_type;
      console.log('🔄 Type change check:', { oldItemType, newItemType });

      // Log all incoming values for debugging
      console.log('📋 [handleSaveWorkEdit] All values:', values);
      console.log('🎯 [handleSaveWorkEdit] detail_cost_category_id from values:', values.detail_cost_category_id);

      // Get the category ID from form values and use it directly
      const formCategoryId = values.detail_cost_category_id;
      console.log('📊 [handleSaveWorkEdit] Category ID from form values:', formCategoryId);
      console.log('🔍 [handleSaveWorkEdit] Full values object:', JSON.stringify(values));

      // Use the form value directly, preserving undefined/null difference
      const detailCostCategoryId = formCategoryId === undefined ? null : formCategoryId;
      console.log('🎯 [handleSaveWorkEdit] Final category ID to save:', detailCostCategoryId);

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

      // Explicitly exclude fields that should not be in update: currency_rate, detail_cost_category_id, work_id, and material_id
      const {
        currency_rate: ignoredRate,
        detail_cost_category_id: ignoredCategoryId,
        work_id: ignoredWorkId,
        material_id: ignoredMaterialId,
        ...cleanValues
      } = values;

      console.log('🔍 [handleSaveWorkEdit] cleanValues after exclusion:', cleanValues);
      console.log('🔍 [handleSaveWorkEdit] excluded detail_cost_category_id:', ignoredCategoryId);

      const updateData = {
        ...cleanValues,
        detail_cost_category_id: detailCostCategoryId, // Use our validated value
        item_type: values.item_type || currentWorkItem.item_type,
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,
        quote_link: values.quote_link || null,
        note: values.note || null
      };

      console.log('💾 Final update data:', {
        ...updateData,
        valuesRate: values.currency_rate,
        calculatedRate: calculatedCurrencyRate,
        willSaveRate: updateData.currency_rate,
        finalCategoryId: updateData.detail_cost_category_id
      });
      const result = await boqApi.update(editingWorkId, updateData);
      if (result.error) {
        throw new Error(result.error);
      }

      if (oldItemType !== newItemType) {
        console.log('🔗 Work type changed, updating linked materials');

        const positionLinks = await workMaterialLinksApi.getLinksByPosition(position.id);
        if (!positionLinks.error && positionLinks.data) {
          const workLinks = positionLinks.data.filter(link => {
            if (oldItemType === 'work') {
              return link.work_boq_item_id === editingWorkId;
            } else if (oldItemType === 'sub_work') {
              return link.sub_work_boq_item_id === editingWorkId;
            }
            return false;
          });

          console.log('🔍 Found links to update:', workLinks.length);

          for (const link of workLinks) {
            const newLinkData: any = {
              client_position_id: link.client_position_id,
              material_quantity_per_work: link.material_quantity_per_work,
              usage_coefficient: link.usage_coefficient
            };

            const materialId = link.material_boq_item_id || link.sub_material_boq_item_id;
            const isMaterialSub = !!link.sub_material_boq_item_id;

            if (newItemType === 'work') {
              newLinkData.work_boq_item_id = editingWorkId;
              if (isMaterialSub) {
                newLinkData.sub_material_boq_item_id = materialId;
              } else {
                newLinkData.material_boq_item_id = materialId;
              }
            } else if (newItemType === 'sub_work') {
              newLinkData.sub_work_boq_item_id = editingWorkId;
              if (isMaterialSub) {
                newLinkData.sub_material_boq_item_id = materialId;
              } else {
                newLinkData.material_boq_item_id = materialId;
              }
            }

            console.log('🔄 Updating link:', { oldLink: link, newLinkData });

            await workMaterialLinksApi.deleteLink(link.id);
            await workMaterialLinksApi.createLink(newLinkData);
          }

          console.log('✅ Updated all material links for type change');
        }
      }

      setTimeout(async () => {
        try {
          console.log('🔄 Background: Updating linked materials for work:', editingWorkId);
          const positionLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          if (!positionLinksResult.error && positionLinksResult.data) {
            const linkedMaterials = positionLinksResult.data.filter(link => {
              return (link.work_boq_item_id === editingWorkId) ||
                (link.sub_work_boq_item_id === editingWorkId);
            });

            for (const link of linkedMaterials) {
              const materialId = link.material_boq_item_id || link.sub_material_boq_item_id;
              if (!materialId) continue;

              const material = position.boq_items?.find(item => item.id === materialId);
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
      }, 100);

      console.log('✅ Work updated successfully');

      if (result.data) {
        const updatedItem = result.data;
        const itemIndex = localBOQItems.findIndex((item: any) => item.id === editingWorkId);
        if (itemIndex !== -1) {
          const updatedItems = [...localBOQItems];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updatedItem };
          setLocalBOQItems(updatedItems);
          console.log('📝 Updated local work data:', updatedItems[itemIndex]);
        }
      }

      message.success('Работа обновлена');
      setEditingWorkId(null);
      workEditForm.resetFields();
      setRefreshKey(prev => prev + 1);
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления работы');
    } finally {
      setLoading(false);
    }
  }, [editingWorkId, workEditForm, onUpdate, position, tender, localBOQItems, setLocalBOQItems, setRefreshKey]);

  const handleCancelWorkEdit = useCallback(() => {
    console.log('❌ Cancelling work edit');
    setEditingWorkId(null);
    workEditForm.resetFields();
  }, [workEditForm]);

  return {
    editingWorkId,
    handleEditWork,
    handleSaveWorkEdit,
    handleCancelWorkEdit,
    workEditLoading: loading
  };
};