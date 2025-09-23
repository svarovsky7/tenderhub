import { useMemo } from 'react';
import type { BOQItemWithLibrary } from '../../../../lib/supabase/types';

interface UseBOQSortingProps {
  localBOQItems: any[];
  position: any;
}

export const useBOQSorting = ({ localBOQItems, position }: UseBOQSortingProps) => {
  // Sort BOQ items: works first, then their linked materials, then unlinked materials
  const sortedBOQItems = useMemo(() => {
    if (!localBOQItems || localBOQItems.length === 0) {
      return [];
    }

    // Debug for additional works
    if (position.is_additional) {
      console.log('🔄 Sorting BOQ items for ДОП работа:', {
        work_name: position.work_name,
        total_items: localBOQItems.length,
        works: localBOQItems.filter(i => i.item_type === 'work').length,
        materials: localBOQItems.filter(i => i.item_type === 'material').length,
        linked_materials: localBOQItems.filter(i => i.work_link).length
      });
    }

    const items = [...localBOQItems];
    const sortedItems: BOQItemWithLibrary[] = [];

    // Get all works and sub-works sorted by sub_number
    const works = items
      .filter(item => item.item_type === 'work' || item.item_type === 'sub_work')
      .sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));

    // Process each work/sub-work and its linked materials/sub-materials
    works.forEach(work => {
      // Add the work/sub-work
      sortedItems.push(work);

      // Find and add all materials/sub-materials linked to this work
      const linkedMaterials = items.filter(item => {
        if (item.item_type !== 'material' && item.item_type !== 'sub_material') {
          return false;
        }

        // Check if material/sub-material is linked to this work/sub-work
        if (work.item_type === 'work') {
          // Regular work - check work_boq_item_id
          return item.work_link?.work_boq_item_id === work.id;
        } else if (work.item_type === 'sub_work') {
          // Sub-work - check sub_work_boq_item_id
          return item.work_link?.sub_work_boq_item_id === work.id;
        }

        return false;
      }).sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));

      sortedItems.push(...linkedMaterials);
    });

    // Add unlinked materials and sub-materials at the end
    const unlinkedMaterials = items.filter(item =>
      (item.item_type === 'material' || item.item_type === 'sub_material') &&
      !item.work_link
    ).sort((a, b) => (a.sub_number || 0) - (b.sub_number || 0));

    sortedItems.push(...unlinkedMaterials);

    // Enable debug for ДОП работы
    if (position.is_additional) {
      console.log('✅ ДОП sorted items in ClientPositionCardStreamlined:', {
        work_name: position.work_name,
        total: sortedItems.length,
        works: works.length,
        linked: sortedItems.filter(i => (i.item_type === 'material' || i.item_type === 'sub_material') && i.work_link).length,
        unlinked: unlinkedMaterials.length,
        order: sortedItems.map((item, idx) => ({
          index: idx,
          id: item.id,
          type: item.item_type,
          desc: item.description,
          hasLink: !!item.work_link,
          linkedTo: item.work_link?.work_boq_item_id || item.work_link?.sub_work_boq_item_id
        }))
      });
    }

    return sortedItems;
  }, [localBOQItems, position.is_additional, position.work_name]);

  return {
    sortedBOQItems
  };
};