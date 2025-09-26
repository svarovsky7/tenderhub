import { supabase } from '../../client';
import type {
  BOQItem,
  ApiResponse,
  BOQItemWithLibrary,
} from '../../types';
import { handleSupabaseError } from '../utils';

/**
 * Batch operations for BOQ items to optimize performance
 * Eliminates N+1 query problems by fetching all data in single requests
 */
export const boqBatchApi = {
  /**
   * Get all BOQ items for a tender with their library data in a single query
   * Much faster than loading items position by position
   */
  async getAllByTenderId(
    tenderId: string
  ): Promise<ApiResponse<BOQItemWithLibrary[]>> {
    console.log('🚀 boqBatchApi.getAllByTenderId - Loading ALL items at once for tender:', tenderId);
    const startTime = performance.now();

    try {
      // Fetch all BOQ items (simplified query without joins)
      const { data, error } = await supabase
        .from('boq_items')
        .select('*')
        .eq('tender_id', tenderId)
        .order('client_position_id')
        .order('sub_number');

      const queryTime = performance.now() - startTime;
      console.log(`📦 Loaded ${data?.length || 0} BOQ items in ${queryTime.toFixed(0)}ms`);

      if (error) {
        console.error('❌ Failed to load BOQ items:', error);
        return {
          error: handleSupabaseError(error, 'Get all BOQ items'),
        };
      }

      return {
        data: data || [],
        message: `Loaded ${data?.length || 0} items in ${queryTime.toFixed(0)}ms`,
      };
    } catch (error) {
      console.error('💥 Exception in getAllByTenderId:', error);
      return {
        error: handleSupabaseError(error, 'Get all BOQ items'),
      };
    }
  },

  /**
   * Get all work-material links for a tender in a single query
   */
  async getAllWorkLinksByTenderId(
    tenderId: string
  ): Promise<ApiResponse<any[]>> {
    console.log('🚀 boqBatchApi.getAllWorkLinksByTenderId - Loading ALL links at once for tender:', tenderId);
    const startTime = performance.now();

    try {
      // First get all work BOQ items for this tender to get their IDs
      const { data: workItems, error: workError } = await supabase
        .from('boq_items')
        .select('id')
        .eq('tender_id', tenderId)
        .in('item_type', ['work', 'sub_work']);

      if (workError) {
        console.error('❌ Failed to load work items:', workError);
        return {
          error: handleSupabaseError(workError, 'Get work items'),
        };
      }

      if (!workItems || workItems.length === 0) {
        console.log('📭 No work items found for tender');
        return { data: [] };
      }

      const workIds = workItems.map(item => item.id);
      console.log(`🔍 Found ${workIds.length} work items, loading their links...`);

      // Now get all links for these work items
      const { data: links, error: linksError } = await supabase
        .from('work_material_links')
        .select(`
          *,
          material_boq_item:material_boq_item_id (
            id,
            description,
            unit,
            unit_rate,
            quantity,
            total_amount,
            consumption_coefficient,
            conversion_coefficient
          )
        `)
        .in('work_boq_item_id', workIds);

      const queryTime = performance.now() - startTime;
      console.log(`📦 Loaded ${links?.length || 0} work-material links in ${queryTime.toFixed(0)}ms`);

      if (linksError) {
        console.error('❌ Failed to load work-material links:', linksError);
        return {
          error: handleSupabaseError(linksError, 'Get work-material links'),
        };
      }

      return {
        data: links || [],
        message: `Loaded ${links?.length || 0} links in ${queryTime.toFixed(0)}ms`,
      };
    } catch (error) {
      console.error('💥 Exception in getAllWorkLinksByTenderId:', error);
      return {
        error: handleSupabaseError(error, 'Get work-material links'),
      };
    }
  },

  /**
   * Get positions with their items and links in optimized batches
   * Groups data by position after fetching
   */
  async getPositionsWithItemsBatch(
    tenderId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<any>> {
    console.log('🚀 boqBatchApi.getPositionsWithItemsBatch - Optimized batch loading');
    const startTime = performance.now();

    try {
      // 1. Load positions with pagination
      const { data: positions, error: posError, count } = await supabase
        .from('client_positions')
        .select('*', { count: 'exact' })
        .eq('tender_id', tenderId)
        .order('position_number')
        .range(offset, offset + limit - 1);

      if (posError) {
        console.error('❌ Failed to load positions:', posError);
        return { error: handleSupabaseError(posError, 'Get positions') };
      }

      if (!positions || positions.length === 0) {
        console.log('📭 No positions found');
        return {
          data: {
            positions: [],
            totalCount: 0,
            hasMore: false
          }
        };
      }

      const positionIds = positions.map(p => p.id);
      console.log(`📋 Loaded ${positions.length} positions, fetching their items...`);

      // 2. Load all BOQ items for these positions
      const { data: items, error: itemsError } = await supabase
        .from('boq_items')
        .select(`
          *,
          materials_library (*),
          works_library (*)
        `)
        .in('client_position_id', positionIds)
        .order('client_position_id')
        .order('sub_number');

      if (itemsError) {
        console.error('❌ Failed to load BOQ items:', itemsError);
        return { error: handleSupabaseError(itemsError, 'Get BOQ items') };
      }

      // 3. Load work-material links for work items
      const workItemIds = items?.filter(i => i.item_type === 'work' || i.item_type === 'sub_work')
        .map(i => i.id) || [];

      let links: any[] = [];
      if (workItemIds.length > 0) {
        const { data: linksData, error: linksError } = await supabase
          .from('work_material_links')
          .select('*')
          .in('work_boq_item_id', workItemIds);

        if (linksError) {
          console.error('⚠️ Failed to load links, continuing without them:', linksError);
        } else {
          links = linksData || [];
        }
      }

      // 4. Group items and links by position
      const positionsWithData = positions.map(position => {
        const positionItems = items?.filter(i => i.client_position_id === position.id) || [];
        const positionWorkIds = positionItems
          .filter(i => i.item_type === 'work' || i.item_type === 'sub_work')
          .map(i => i.id);

        const positionLinks = links.filter(l => positionWorkIds.includes(l.work_boq_item_id));

        // Group links by work ID for easy access
        const linksByWorkId: Record<string, any[]> = {};
        positionLinks.forEach(link => {
          if (!linksByWorkId[link.work_boq_item_id]) {
            linksByWorkId[link.work_boq_item_id] = [];
          }
          linksByWorkId[link.work_boq_item_id].push(link);
        });

        // Calculate total cost
        let totalCost = 0;
        positionItems.forEach(item => {
          if (item.item_type === 'work' || item.item_type === 'sub_work') {
            totalCost += item.total_amount || 0;
            // Add linked materials cost
            const workLinks = linksByWorkId[item.id] || [];
            workLinks.forEach(link => {
              const materialItem = positionItems.find(i => i.id === link.material_boq_item_id);
              if (materialItem) {
                totalCost += materialItem.total_amount || 0;
              }
            });
          } else if (item.item_type === 'material' || item.item_type === 'sub_material') {
            // Only add if not linked to any work
            const isLinked = links.some(l => l.material_boq_item_id === item.id);
            if (!isLinked) {
              totalCost += item.total_amount || 0;
            }
          }
        });

        return {
          ...position,
          boq_items: positionItems,
          work_links: linksByWorkId,
          total_position_cost: totalCost
        };
      });

      const queryTime = performance.now() - startTime;
      console.log(`✅ Batch load completed in ${queryTime.toFixed(0)}ms`);
      console.log(`📊 Stats: ${positions.length} positions, ${items?.length || 0} items, ${links.length} links`);

      return {
        data: {
          positions: positionsWithData,
          totalCount: count || 0,
          hasMore: (count || 0) > offset + limit
        },
        message: `Loaded in ${queryTime.toFixed(0)}ms`
      };
    } catch (error) {
      console.error('💥 Exception in getPositionsWithItemsBatch:', error);
      return {
        error: handleSupabaseError(error, 'Batch load positions'),
      };
    }
  }
};