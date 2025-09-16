import { useState, useCallback } from 'react';
import { message } from 'antd';
import { workMaterialLinksApi } from '../lib/supabase/api/work-material-links';
import { boqApi } from '../lib/supabase/api';
import { calculateMaterialVolume, updateLinkWithCalculatedVolume } from '../utils/materialCalculations';
import type { BOQItem } from '../lib/supabase/types';

export const useWorkMaterialLinks = () => {
  const [allWorkLinks, setAllWorkLinks] = useState<Record<string, any[]>>({});

  // Load links for all works in a position
  const loadPositionWorkLinks = useCallback(async (
    positionId: string,
    boqItems: BOQItem[]
  ) => {
    try {
      console.log('🚀 Loading work-material links for position:', positionId);

      // Get all work IDs from BOQ items
      const workIds = boqItems
        .filter(item => item.item_type === 'work' && item.work_id)
        .map(item => item.work_id as string);

      if (workIds.length === 0) {
        console.log('✅ No works to load links for');
        return {};
      }

      // Load work-material links
      const { data: links, error } = await workMaterialLinksApi.getByWorks(workIds);

      if (error) throw error;

      console.log('✅ Loaded work-material links:', links?.length || 0);

      // Group links by work ID
      const linksByWork: Record<string, any[]> = {};

      for (const link of (links || [])) {
        if (!linksByWork[link.work_id]) {
          linksByWork[link.work_id] = [];
        }

        // Calculate material volume
        const workItem = boqItems.find(item => item.work_id === link.work_id);
        if (workItem) {
          const updatedLink = {
            ...link,
            calculated_volume: calculateMaterialVolume(
              workItem.quantity,
              link.consumption_coefficient || 1
            ),
            calculated_total: calculateMaterialVolume(
              workItem.quantity,
              link.consumption_coefficient || 1
            ) * (link.material_unit_rate || 0)
          };
          linksByWork[link.work_id].push(updatedLink);
        } else {
          linksByWork[link.work_id].push(link);
        }
      }

      // Update state
      setAllWorkLinks(linksByWork);

      return linksByWork;
    } catch (error) {
      console.error('❌ Error loading work-material links:', error);
      message.error('Ошибка загрузки связей работ и материалов');
      return {};
    }
  }, []);

  // Update link
  const updateLink = useCallback(async (
    linkId: string,
    updates: any,
    workQuantity: number
  ): Promise<boolean> => {
    try {
      console.log('🚀 Updating link:', linkId, updates);

      const updatedLink = updateLinkWithCalculatedVolume(updates, workQuantity);
      const { error } = await workMaterialLinksApi.updateLink(linkId, updatedLink);

      if (error) throw error;

      console.log('✅ Link updated');

      // Update state
      setAllWorkLinks(prev => {
        const newLinks = { ...prev };
        for (const workId in newLinks) {
          newLinks[workId] = newLinks[workId].map(link =>
            link.id === linkId ? { ...link, ...updatedLink } : link
          );
        }
        return newLinks;
      });

      return true;
    } catch (error) {
      console.error('❌ Error updating link:', error);
      message.error('Ошибка обновления связи');
      return false;
    }
  }, []);

  // Delete link
  const deleteLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      console.log('🚀 Deleting link:', linkId);

      const { error } = await workMaterialLinksApi.deleteLink(linkId);

      if (error) throw error;

      console.log('✅ Link deleted');

      // Update state
      setAllWorkLinks(prev => {
        const newLinks = { ...prev };
        for (const workId in newLinks) {
          newLinks[workId] = newLinks[workId].filter(link => link.id !== linkId);
        }
        return newLinks;
      });

      message.success('Связь удалена');
      return true;
    } catch (error) {
      console.error('❌ Error deleting link:', error);
      message.error('Ошибка удаления связи');
      return false;
    }
  }, []);

  // Create new link
  const createLink = useCallback(async (
    workId: string,
    materialId: string,
    linkData: any,
    workQuantity: number
  ): Promise<any | null> => {
    try {
      console.log('🚀 Creating link:', { workId, materialId, linkData });

      const dataWithCalculations = updateLinkWithCalculatedVolume(
        {
          work_id: workId,
          material_id: materialId,
          ...linkData
        },
        workQuantity
      );

      const { data: newLink, error } = await workMaterialLinksApi.createLink(dataWithCalculations);

      if (error) throw error;
      if (!newLink) throw new Error('Failed to create link');

      console.log('✅ Link created:', newLink);

      // Update state
      setAllWorkLinks(prev => ({
        ...prev,
        [workId]: [...(prev[workId] || []), newLink]
      }));

      message.success('Материал добавлен к работе');
      return newLink;
    } catch (error) {
      console.error('❌ Error creating link:', error);
      message.error('Ошибка добавления материала к работе');
      return null;
    }
  }, []);

  // Move material to another work
  const moveMaterialToWork = useCallback(async (
    linkId: string,
    fromWorkId: string,
    toWorkId: string
  ): Promise<boolean> => {
    try {
      console.log('🚀 Moving material to work:', { linkId, fromWorkId, toWorkId });

      const { error } = await workMaterialLinksApi.updateLink(linkId, {
        work_id: toWorkId
      });

      if (error) throw error;

      console.log('✅ Material moved');

      // Update state
      setAllWorkLinks(prev => {
        const newLinks = { ...prev };
        const link = newLinks[fromWorkId]?.find(l => l.id === linkId);

        if (link) {
          // Remove from old work
          newLinks[fromWorkId] = newLinks[fromWorkId].filter(l => l.id !== linkId);

          // Add to new work
          if (!newLinks[toWorkId]) {
            newLinks[toWorkId] = [];
          }
          newLinks[toWorkId].push({ ...link, work_id: toWorkId });
        }

        return newLinks;
      });

      message.success('Материал перемещен');
      return true;
    } catch (error) {
      console.error('❌ Error moving material:', error);
      message.error('Ошибка перемещения материала');
      return false;
    }
  }, []);

  return {
    allWorkLinks,
    setAllWorkLinks,
    loadPositionWorkLinks,
    updateLink,
    deleteLink,
    createLink,
    moveMaterialToWork
  };
};