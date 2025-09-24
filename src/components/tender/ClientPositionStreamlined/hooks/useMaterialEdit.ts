import { useCallback, useState } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { boqApi, workMaterialLinksApi } from '../../../../lib/supabase/api';
import { getCurrencyRate } from '../../../../utils/currencyConverter';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

interface UseMaterialEditProps {
  position: any;
  localWorks: BOQItemWithLibrary[];
  setLocalWorks: React.Dispatch<React.SetStateAction<BOQItemWithLibrary[]>>;
  editForm: FormInstance;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  onUpdate: () => void;
  tender?: any;
}

export const useMaterialEdit = ({
  position,
  localWorks,
  setLocalWorks,
  editForm,
  setRefreshKey,
  onUpdate,
  tender
}: UseMaterialEditProps) => {
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const works = localWorks;

  const handleEditMaterial = useCallback((item: BOQItemWithLibrary) => {
    console.log('✏️ Starting inline edit for material:', item.id);
    console.log('🔍 Material data:', item);
    console.log('🔗 Work link data:', item.work_link);

    const currentWorks = position.boq_items?.filter(boqItem =>
      boqItem.item_type === 'work' || boqItem.item_type === 'sub_work'
    ) || [];
    if (currentWorks.length !== localWorks.length) {
      console.log('🔄 Updating works list before edit:', currentWorks.length, 'works');
      setLocalWorks(currentWorks);
    }

    setEditingMaterialId(item.id);

    const workLink = item.work_link;

    if (position.is_additional) {
      console.log('🔍 ДОП: Editing material:', {
        material: item.description,
        material_type: item.item_type,
        has_work_link: !!workLink,
        work_link: workLink,
        work_boq_item_id: workLink?.work_boq_item_id,
        sub_work_boq_item_id: workLink?.sub_work_boq_item_id,
        available_works: position.boq_items?.filter(i => i.item_type === 'work' || i.item_type === 'sub_work').map(w => ({
          id: w.id,
          type: w.item_type,
          desc: w.description
        })),
        localWorks: localWorks.map(w => ({
          id: w.id,
          type: w.item_type,
          desc: w.description
        }))
      });
    }

    const linkedWork = workLink ? position.boq_items?.find(boqItem => {
      if (workLink.work_boq_item_id && boqItem.id === workLink.work_boq_item_id && boqItem.item_type === 'work') {
        if (position.is_additional) {
          console.log('✅ ДОП: Found linked work:', boqItem.description);
        }
        return true;
      }
      if (workLink.sub_work_boq_item_id && boqItem.id === workLink.sub_work_boq_item_id && boqItem.item_type === 'sub_work') {
        if (position.is_additional) {
          console.log('✅ ДОП: Found linked sub_work:', boqItem.description);
        }
        return true;
      }
      return false;
    }) : undefined;

    if (position.is_additional && workLink && !linkedWork) {
      console.error('❌ ДОП: Linked work not found for material:', {
        material: item.description,
        searching_for_work_id: workLink.work_boq_item_id,
        searching_for_sub_work_id: workLink.sub_work_boq_item_id,
        available_items: position.boq_items?.map(i => ({
          id: i.id,
          type: i.item_type,
          desc: i.description
        }))
      });
    }

    const consumptionCoef = item.consumption_coefficient ||
      workLink?.material_quantity_per_work || 1;
    const conversionCoef = item.conversion_coefficient ||
      workLink?.usage_coefficient || 1;

    console.log('📦 Setting form values:', {
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      work_id: linkedWork?.id || undefined,
      consumption_coefficient: consumptionCoef,
      conversion_coefficient: conversionCoef,
      source: {
        boq_consumption: item.consumption_coefficient,
        boq_conversion: item.conversion_coefficient,
        link_consumption: workLink?.material_quantity_per_work,
        link_conversion: workLink?.usage_coefficient
      }
    });

    const displayQuantity = (!linkedWork && item.base_quantity !== null && item.base_quantity !== undefined)
      ? item.base_quantity
      : item.quantity;

    console.log('📝 Setting edit form values:', {
      isLinked: !!linkedWork,
      baseQuantity: item.base_quantity,
      quantity: item.quantity,
      displayQuantity: displayQuantity
    });

    let correctCurrencyRate = 1;
    if (item.currency_type && item.currency_type !== 'RUB' && tender) {
      const rateFromTender = getCurrencyRate(item.currency_type, tender);
      correctCurrencyRate = rateFromTender || 1;
      console.log('💱 [handleEditMaterial] Setting correct currency rate:', {
        itemRate: item.currency_rate,
        tenderRate: correctCurrencyRate,
        currency: item.currency_type
      });
    }

    // Preserve the exact category ID value from the item
    const categoryIdToSet = item.detail_cost_category_id !== undefined ? item.detail_cost_category_id : null;
    console.log('🎯 [handleEditMaterial] Setting category ID in form:', categoryIdToSet);
    console.log('📦 Full material item data:', JSON.stringify(item));

    editForm.setFieldsValue({
      description: item.description,
      unit: item.unit,
      quantity: displayQuantity,
      unit_rate: item.unit_rate,
      work_id: linkedWork?.id || undefined,
      consumption_coefficient: consumptionCoef,
      conversion_coefficient: conversionCoef,
      detail_cost_category_id: categoryIdToSet,
      delivery_price_type: item.delivery_price_type || 'included',
      delivery_amount: item.delivery_amount || 0,
      item_type: item.item_type,
      material_type: item.material_type || 'main',
      currency_type: item.currency_type || 'RUB',
      currency_rate: correctCurrencyRate,
      quote_link: item.quote_link || '',
      note: item.note || ''
    });

    console.log('✅ [handleEditMaterial] Form values set successfully');
  }, [editForm, position, localWorks, setLocalWorks, tender]);

  const handleSaveInlineEdit = useCallback(async (values: any) => {
    if (!editingMaterialId) return;

    const editingItem = position.boq_items?.find(item => item.id === editingMaterialId);
    if (!editingItem) {
      console.error('❌ Could not find item being edited');
      return;
    }

    console.log('💾 Saving inline material edits:', values);
    console.log('🔍 Item type being edited:', editingItem.item_type);
    console.log('🔍 Coefficients to save:', {
      consumption: values.consumption_coefficient,
      conversion: values.conversion_coefficient,
      work_id: values.work_id,
      raw_values: values
    });
    setLoading(true);
    try {
      let finalQuantity = values.quantity;
      let baseQuantity = null;

      if (values.work_id) {
        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          const consumptionCoef = values.consumption_coefficient || 1;
          const conversionCoef = values.conversion_coefficient || 1;
          finalQuantity = work.quantity * consumptionCoef * conversionCoef;
          console.log('📊 Calculated linked material quantity:', {
            workQuantity: work.quantity,
            consumption: consumptionCoef,
            conversion: conversionCoef,
            result: finalQuantity
          });
        }
      } else {
        baseQuantity = values.quantity;
        const consumptionCoef = values.consumption_coefficient || 1;
        finalQuantity = baseQuantity * consumptionCoef;
        console.log('📊 Calculated unlinked material quantity:', {
          baseQuantity,
          consumption: consumptionCoef,
          result: finalQuantity
        });
      }

      // Log all incoming values for debugging
      console.log('📋 [handleSaveInlineEdit] All values:', values);
      console.log('🎯 [handleSaveInlineEdit] detail_cost_category_id from values:', values.detail_cost_category_id);

      // Get the category ID from form values and use it directly
      const formCategoryId = values.detail_cost_category_id;
      console.log('📊 [handleSaveInlineEdit] Category ID from form values:', formCategoryId);
      console.log('🔍 [handleSaveInlineEdit] Full values object:', JSON.stringify(values));

      // Use the form value directly, preserving undefined/null difference
      const detailCostCategoryId = formCategoryId === undefined ? null : formCategoryId;
      console.log('🎯 [handleSaveInlineEdit] Final category ID to save:', detailCostCategoryId);

      let calculatedCurrencyRate = null;
      console.log('🔍 [handleSaveInlineEdit] Tender check:', {
        tenderExists: !!tender,
        tenderValue: tender,
        currency_type: values.currency_type,
        unit_rate: values.unit_rate
      });

      if (values.currency_type && values.currency_type !== 'RUB') {
        if (!tender) {
          console.error('❌ [handleSaveInlineEdit] TENDER IS NULL! Cannot get currency rate');
          message.error('Ошибка: курсы валют еще не загружены. Подождите и попробуйте снова.');
          setLoading(false);
          return;
        }

        const rateFromTender = getCurrencyRate(values.currency_type, tender);

        console.log('🔍 [handleSaveInlineEdit] getCurrencyRate result:', {
          currency: values.currency_type,
          tender,
          rateFromTender,
          tenderUsdRate: tender?.usd_rate,
          tenderEurRate: tender?.eur_rate,
          tenderCnyRate: tender?.cny_rate
        });

        if (!rateFromTender || rateFromTender === 0) {
          console.error('❌ [handleSaveInlineEdit] No valid currency rate found for', values.currency_type);
          message.error(`Ошибка: курс ${values.currency_type} не установлен в тендере. Обратитесь к администратору.`);
          setLoading(false);
          return;
        }

        calculatedCurrencyRate = rateFromTender;
        console.log('💱 [handleSaveInlineEdit] Currency rate calculation:', {
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

      console.log('🔍 [handleSaveInlineEdit] cleanValues after exclusion:', cleanValues);
      console.log('🔍 [handleSaveInlineEdit] excluded detail_cost_category_id:', ignoredCategoryId);

      const updateData = {
        ...cleanValues,
        quantity: finalQuantity,
        consumption_coefficient: values.consumption_coefficient || 1,
        conversion_coefficient: values.conversion_coefficient || 1,
        delivery_price_type: values.delivery_price_type || 'included',
        delivery_amount: values.delivery_amount || 0,
        detail_cost_category_id: detailCostCategoryId, // Use our validated value
        material_type: values.material_type || 'main',
        currency_type: values.currency_type || 'RUB',
        currency_rate: calculatedCurrencyRate,
        quote_link: values.quote_link || null,
        note: values.note || null,
        ...(baseQuantity !== null && { base_quantity: baseQuantity })
      };

      console.log('📝 Preparing material update:', updateData);
      // Store the update data - we'll do a single update at the end
      let pendingUpdate = { ...updateData };
      let performedInitialUpdate = false;

      const existingLink = editingItem.work_link;
      const hasExistingLink = !!existingLink;
      const existingWorkId = existingLink?.work_boq_item_id || existingLink?.sub_work_boq_item_id || null;

      console.log('🔍 Link state check:', {
        hasExistingLink,
        existingWorkId,
        newWorkId: values.work_id,
        needsUpdate: values.work_id !== existingWorkId
      });

      const newWorkId = values.work_id && values.work_id !== '' ? values.work_id : null;

      console.log('🔍 Comparing work IDs:', {
        rawWorkId: values.work_id,
        newWorkId,
        existingWorkId,
        needsChange: newWorkId !== existingWorkId,
        isUnlinking: !newWorkId && existingWorkId,
        isLinking: newWorkId && !existingWorkId,
        isChanging: newWorkId && existingWorkId && newWorkId !== existingWorkId
      });

      const workIdChanged = (newWorkId || null) !== (existingWorkId || null);

      if (workIdChanged) {
        console.log('🔄 Work ID has changed, processing link update:', {
          scenario: !newWorkId && existingWorkId ? 'UNLINKING' :
            newWorkId && !existingWorkId ? 'LINKING' :
              'CHANGING',
          from: existingWorkId,
          to: newWorkId
        });

        if (hasExistingLink && existingLink?.id) {
          console.log('🗑️ Removing old link:', {
            linkId: existingLink.id,
            oldWorkId: existingWorkId,
            materialId: editingMaterialId,
            materialType: editingItem.item_type,
            reason: !newWorkId ? 'User cleared work selection (unlinking)' : 'Changing to different work'
          });
          const deleteResult = await workMaterialLinksApi.deleteLink(existingLink.id);
          if (deleteResult.error) {
            console.error('❌ Failed to delete old link:', deleteResult.error);
            throw new Error(`Failed to delete old link: ${deleteResult.error}`);
          }
          console.log('✅ Removed old link successfully');
        }

        if (newWorkId) {
          const workItem = works.find(w => w.id === values.work_id);
          const isSubWork = workItem?.item_type === 'sub_work';
          const isSubMaterial = editingItem.item_type === 'sub_material';

          console.log('🔍 Link type detection:', {
            workId: values.work_id,
            workType: workItem?.item_type,
            isSubWork,
            materialId: editingMaterialId,
            materialType: editingItem.item_type,
            isSubMaterial
          });

          const linkData: any = {
            client_position_id: position.id,
            material_quantity_per_work: values.consumption_coefficient || 1,
            usage_coefficient: values.conversion_coefficient || 1
          };

          if (isSubWork && isSubMaterial) {
            console.log('📎 Linking sub_work to sub_material');
            linkData.sub_work_boq_item_id = values.work_id;
            linkData.sub_material_boq_item_id = editingMaterialId;
          } else if (isSubWork && !isSubMaterial) {
            console.log('📎 Linking sub_work to material');
            linkData.sub_work_boq_item_id = values.work_id;
            linkData.material_boq_item_id = editingMaterialId;
          } else if (!isSubWork && isSubMaterial) {
            console.log('📎 Linking work to sub_material');
            linkData.work_boq_item_id = values.work_id;
            linkData.sub_material_boq_item_id = editingMaterialId;
          } else {
            console.log('📎 Linking work to material');
            linkData.work_boq_item_id = values.work_id;
            linkData.material_boq_item_id = editingMaterialId;
          }

          console.log('🔗 Creating new link with data:', linkData);
          const linkResult = await workMaterialLinksApi.createLink(linkData);

          if (linkResult.error) {
            console.error('❌ Failed to create link:', linkResult.error);
            throw new Error(`Failed to create link: ${linkResult.error}`);
          }

          console.log('✅ Material linked to work successfully:', {
            linkId: linkResult.data?.id,
            workId: values.work_id,
            materialId: editingMaterialId
          });
        } else {
          console.log('✅ Material unlinked from work (no new work_id provided)');
        }
      } else if (newWorkId && hasExistingLink && existingLink) {
        const oldConsumption = existingLink.material_quantity_per_work || 1;
        const oldConversion = existingLink.usage_coefficient || 1;
        const newConsumption = values.consumption_coefficient || 1;
        const newConversion = values.conversion_coefficient || 1;

        console.log('🔍 Comparing coefficients:', {
          existing: {
            consumption: oldConsumption,
            conversion: oldConversion
          },
          new: {
            consumption: newConsumption,
            conversion: newConversion
          },
          changed: oldConsumption !== newConsumption || oldConversion !== newConversion
        });

        console.log('📊 Will update BOQ item coefficients:', {
          materialId: editingMaterialId,
          consumption_coefficient: newConsumption,
          conversion_coefficient: newConversion
        });

        // Merge coefficients into pending update
        pendingUpdate = {
          ...pendingUpdate,
          consumption_coefficient: newConsumption,
          conversion_coefficient: newConversion
        };

        await workMaterialLinksApi.updateLink(existingLink.id, {
          material_quantity_per_work: newConsumption,
          usage_coefficient: newConversion
        });

        const work = works.find(w => w.id === values.work_id);
        if (work && work.quantity) {
          const calculatedQuantity = work.quantity * newConsumption * newConversion;

          // Merge quantity into pending update
          pendingUpdate = {
            ...pendingUpdate,
            quantity: calculatedQuantity
          };

          console.log('📏 Will update material quantity based on coefficients:', calculatedQuantity);
        }
      } else {
        console.log('📊 No work link change detected, keeping existing link state:', {
          hasLink: hasExistingLink,
          workId: existingWorkId
        });
      }

      const finalLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
      const finalLink = !finalLinksResult.error && finalLinksResult.data?.find(
        link => link.material_boq_item_id === editingMaterialId ||
          link.sub_material_boq_item_id === editingMaterialId
      );

      console.log('🎯 Final link state after all operations:', {
        materialId: editingMaterialId,
        hasLink: !!finalLink,
        linkDetails: finalLink ? {
          id: finalLink.id,
          work_boq_item_id: finalLink.work_boq_item_id,
          sub_work_boq_item_id: finalLink.sub_work_boq_item_id
        } : null,
        expectedState: !newWorkId ? 'Should be unlinked' : `Should be linked to ${newWorkId}`
      });

      setTimeout(async () => {
        try {
          console.log('🔄 Background: Checking for linked works affected by material:', editingMaterialId);
          const positionLinksResult = await workMaterialLinksApi.getLinksByPosition(position.id);
          if (!positionLinksResult.error && positionLinksResult.data) {
            const linkedWorks = positionLinksResult.data.filter(link => {
              return (link.material_boq_item_id === editingMaterialId) ||
                (link.sub_material_boq_item_id === editingMaterialId);
            });

            if (linkedWorks.length > 0) {
              console.log('✅ Background: Found', linkedWorks.length, 'linked works for updated material');
            }
          }
        } catch (error) {
          console.error('❌ Background: Error checking linked works:', error);
        }
      }, 100);

      // Perform the single consolidated update
      console.log('💾 Performing single consolidated BOQ update:', pendingUpdate);
      const finalResult = await boqApi.update(editingMaterialId, pendingUpdate);
      if (finalResult.error) {
        console.error('❌ Failed to update BOQ item:', finalResult.error);
        throw new Error(finalResult.error);
      }
      console.log('✅ BOQ item updated successfully with all changes:', finalResult.data);

      if (finalResult.data) {
        const updatedItem = finalResult.data;
        const itemIndex = localBOQItems.findIndex((item: any) => item.id === editingMaterialId);
        if (itemIndex !== -1) {
          const updatedItems = [...localBOQItems];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updatedItem };
          setLocalBOQItems(updatedItems);
          console.log('📝 Updated local item data:', updatedItems[itemIndex]);
        }
      }

      message.success('Материал обновлен и коэффициенты сохранены');
      setEditingMaterialId(null);
      editForm.resetFields();
      setRefreshKey(prev => prev + 1);
      onUpdate();
    } catch (error) {
      console.error('❌ Update error:', error);
      message.error('Ошибка обновления материала');
    } finally {
      setLoading(false);
    }
  }, [editingMaterialId, position, works, editForm, onUpdate, tender, setRefreshKey]);

  const handleCancelInlineEdit = useCallback(() => {
    console.log('❌ Cancelling inline edit');
    setEditingMaterialId(null);
    editForm.resetFields();
  }, [editForm]);

  const handleWorkSelectionChange = useCallback((workId: string) => {
    console.log('🔗 Work selection changed:', workId);
    if (!workId) return;

    const work = works.find(w => w.id === workId);
    if (!work || !work.quantity) return;

    const consumptionCoef = editForm.getFieldValue('consumption_coefficient') || 1;
    const conversionCoef = editForm.getFieldValue('conversion_coefficient') || 1;
    const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;

    editForm.setFieldsValue({ quantity: calculatedQuantity });
    console.log('📊 Updated quantity based on work:', calculatedQuantity);
  }, [works, editForm]);

  const handleCoefficientChange = useCallback((value?: number) => {
    const workId = editForm.getFieldValue('work_id');
    if (!workId) return;

    const work = works.find(w => w.id === workId);
    if (!work || !work.quantity) return;

    const consumptionCoef = editForm.getFieldValue('consumption_coefficient') || 1;
    const conversionCoef = editForm.getFieldValue('conversion_coefficient') || 1;
    const calculatedQuantity = work.quantity * consumptionCoef * conversionCoef;

    editForm.setFieldsValue({ quantity: calculatedQuantity });
    console.log('📊 Updated quantity based on coefficients:', calculatedQuantity);
  }, [works, editForm]);

  return {
    editingMaterialId,
    handleEditMaterial,
    handleSaveInlineEdit,
    handleCancelInlineEdit,
    handleWorkSelectionChange,
    handleCoefficientChange,
    materialEditLoading: loading
  };
};