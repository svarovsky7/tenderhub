import { useCallback } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { boqApi, workMaterialLinksApi } from '../../../../lib/supabase/api';
import type { BOQItem } from '../../../../lib/supabase/types';

interface BOQItemWithLibrary extends BOQItem {
  libraryWorkId?: string | null;
  libraryMaterialId?: string | null;
}

interface UseMaterialHandlersProps {
  position: any;
  works: any[];
  editForm: FormInstance;
  editingMaterialId: string | null;
  setEditingMaterialId: (id: string | null) => void;
  setEditingItem: (item: any) => void;
  setLoading: (loading: boolean) => void;
  setRefreshKey: (fn: (prev: number) => number) => void;
  onUpdate: () => void;
  tender?: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  } | null;
}

export const useMaterialHandlers = ({
  position,
  works,
  editForm,
  editingMaterialId,
  setEditingMaterialId,
  setEditingItem,
  setLoading,
  setRefreshKey,
  onUpdate,
  tender
}: UseMaterialHandlersProps) => {

  // Start editing material inline
  const handleEditMaterial = useCallback((item: BOQItemWithLibrary) => {
    console.log('✏️ Starting inline edit for material:', item.id);
    console.log('🔍 Material data:', item);
    console.log('🔗 Work link data:', item.work_link);

    // Force refresh works list before editing to ensure we have the latest data
    const currentWorks = position.boq_items?.filter(
      (i: any) => i.item_type === 'work' || i.item_type === 'sub_work'
    ) || [];

    console.log('🏗️ Available works for linking:', currentWorks.map((w: any) => ({
      id: w.id,
      name: w.description,
      type: w.item_type
    })));

    setEditingMaterialId(item.id);
    setEditingItem(item);

    // Determine work_id based on link type
    let linkedWorkId = null;
    if (item.work_link) {
      // For sub-materials, prefer sub_work_boq_item_id
      if (item.item_type === 'sub_material' && item.work_link.sub_work_boq_item_id) {
        linkedWorkId = item.work_link.sub_work_boq_item_id;
      }
      // For regular materials or if no sub_work link, use work_boq_item_id
      else if (item.work_link.work_boq_item_id) {
        linkedWorkId = item.work_link.work_boq_item_id;
      }
      // Fallback to sub_work if that's all we have
      else if (item.work_link.sub_work_boq_item_id) {
        linkedWorkId = item.work_link.sub_work_boq_item_id;
      }
    }

    // Prepare values for form with all required fields
    const formValues = {
      description: item.description || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      unit_rate: item.unit_rate || 0,
      delivery_price_type: item.delivery_price_type || 'included',
      delivery_amount: item.delivery_amount || 0,
      quote_link: item.quote_link || '',
      note: item.note || '',
      detail_cost_category_id: item.detail_cost_category_id || null,
      work_id: linkedWorkId,
      consumption_coefficient: item.consumption_coefficient ||
                              item.work_link?.material_quantity_per_work || 1,
      conversion_coefficient: item.conversion_coefficient ||
                             item.work_link?.usage_coefficient || 1,
      item_type: item.item_type || 'material'  // Add item_type to preserve it
    };

    console.log('📝 Setting form values:', formValues);
    editForm.setFieldsValue(formValues);
  }, [position.boq_items, editForm, setEditingMaterialId, setEditingItem]);

  // Save inline edit for material
  const handleSaveInlineEdit = useCallback(async (values: any) => {
    if (!editingMaterialId) return;

    console.log('💾 Saving inline edit for material:', editingMaterialId);
    console.log('📋 Form values:', values);

    setLoading(true);
    try {
      // Get current item data
      const editingItem = position.boq_items?.find((item: any) => item.id === editingMaterialId);
      if (!editingItem) {
        throw new Error('Item not found');
      }

      // Prepare update data
      const updateData: any = {
        description: values.description,
        quantity: values.quantity || 0,
        unit: values.unit,
        unit_rate: values.unit_rate || 0,
        delivery_price_type: values.delivery_price_type || 'included',
        delivery_amount: values.delivery_amount || 0,
        quote_link: values.quote_link || null,
        note: values.note || null,
        detail_cost_category_id: values.detail_cost_category_id || null,
        consumption_coefficient: values.consumption_coefficient || 1,
        conversion_coefficient: values.conversion_coefficient || 1
      };

      // Note: Currency fields removed as they don't exist in database
      // If currency handling is needed, it should be done at the application level

      console.log('📤 Sending update with data:', updateData);
      const result = await boqApi.update(editingMaterialId, updateData);

      if (result.error) {
        throw new Error(result.error);
      }

      // Handle work link updates
      const newWorkId = values.work_id;
      const hasExistingLink = !!editingItem.work_link;
      const existingWorkId = editingItem.work_link?.work_boq_item_id ||
                             editingItem.work_link?.sub_work_boq_item_id;
      const existingLink = editingItem.work_link;

      if (newWorkId !== existingWorkId) {
        // Link changed - handle link creation/update/deletion
        if (!newWorkId && hasExistingLink) {
          // Unlink material from work
          await workMaterialLinksApi.deleteLink(existingItem.work_link.id);
          console.log('🔗 Unlinked material from work');
        } else if (newWorkId && !hasExistingLink) {
          // Create new link
          const linkData = await createMaterialLink(
            newWorkId,
            editingMaterialId,
            values,
            position.id,
            editingItem,
            works
          );
          const linkResult = await workMaterialLinksApi.createLink(linkData);

          if (linkResult.error) {
            throw new Error(`Failed to create link: ${linkResult.error}`);
          }
          console.log('✅ Material linked to work successfully');
        }
      } else if (newWorkId && hasExistingLink && existingLink) {
        // Update existing link with new coefficients
        await updateLinkCoefficients(
          existingLink.id,
          editingMaterialId,
          values,
          works
        );
      }

      // Just call onUpdate to refresh the position data
      // The parent component will reload the data from server

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
  }, [editingMaterialId, position.id, position.boq_items, works, editForm, onUpdate, tender,
      setLoading, setEditingMaterialId, setRefreshKey]);

  // Cancel inline edit
  const handleCancelInlineEdit = useCallback(() => {
    console.log('❌ Cancelling inline edit');
    setEditingMaterialId(null);
    editForm.resetFields();
  }, [editForm, setEditingMaterialId]);

  // Helper function to create material link data
  const createMaterialLink = async (
    workId: string,
    materialId: string,
    values: any,
    positionId: string,
    editingItem: any,
    works: any[]
  ) => {
    const workItem = works.find(w => w.id === workId);
    const isSubWork = workItem?.item_type === 'sub_work';
    const isSubMaterial = editingItem.item_type === 'sub_material';

    const linkData: any = {
      client_position_id: positionId,
      material_quantity_per_work: values.consumption_coefficient || 1,
      usage_coefficient: values.conversion_coefficient || 1
    };

    if (isSubWork && isSubMaterial) {
      linkData.sub_work_boq_item_id = workId;
      linkData.sub_material_boq_item_id = materialId;
    } else if (isSubWork && !isSubMaterial) {
      linkData.sub_work_boq_item_id = workId;
      linkData.material_boq_item_id = materialId;
    } else if (!isSubWork && isSubMaterial) {
      linkData.work_boq_item_id = workId;
      linkData.sub_material_boq_item_id = materialId;
    } else {
      linkData.work_boq_item_id = workId;
      linkData.material_boq_item_id = materialId;
    }

    return linkData;
  };

  // Helper function to update link coefficients
  const updateLinkCoefficients = async (
    linkId: string,
    materialId: string,
    values: any,
    works: any[]
  ) => {
    const newConsumption = values.consumption_coefficient || 1;
    const newConversion = values.conversion_coefficient || 1;

    // Update coefficients in BOQ item
    await boqApi.update(materialId, {
      consumption_coefficient: newConsumption,
      conversion_coefficient: newConversion
    });

    // Update link to keep consistency
    await workMaterialLinksApi.updateLink(linkId, {
      material_quantity_per_work: newConsumption,
      usage_coefficient: newConversion
    });

    // Update quantity if it depends on work
    const work = works.find(w => w.id === values.work_id);
    if (work && work.quantity) {
      const calculatedQuantity = work.quantity * newConsumption * newConversion;
      await boqApi.update(materialId, {
        quantity: calculatedQuantity
      });
    }
  };

  return {
    handleEditMaterial,
    handleSaveInlineEdit,
    handleCancelInlineEdit
  };
};