import { supabase } from '../client';
import type {
  ApiResponse,
  TenderHierarchy,
  TenderSummary,
  ClientPositionWithItems,
  ClientPositionInsert,
  BOQItemInsert,
  HierarchyLoadOptions,
  ClientPositionSummary,
  BOQItemWithPosition,
} from '../types';
import { handleSupabaseError } from './utils';

// HIERARCHY API - For complete tender structure management
export const hierarchyApi = {
  /**
   * Get complete tender hierarchy with positions and BOQ items
   * Optimized for displaying full tender structure
   */
  async getTenderHierarchy(
    tenderId: string,
    options: HierarchyLoadOptions = {}
  ): Promise<ApiResponse<TenderHierarchy[]>> {
    try {
      const { 
        // include_items = true, 
        limit, 
        offset = 0
        // positions_only = false 
      } = options;

      // Get tender hierarchy by joining client_positions and boq_items
      let query = supabase
        .from('client_positions')
        .select(`
          *,
          boq_items!client_position_id(*)
        `)
        .eq('tender_id', tenderId);

      // Apply performance pagination if specified
      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query.order('position_number');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tender hierarchy'),
        };
      }

      return {
        data: data || [],
        message: 'Tender hierarchy loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender hierarchy'),
      };
    }
  },

  /**
   * Get tender summary with aggregated totals
   * Fast overview of tender financial structure
   */
  async getTenderSummary(tenderId: string): Promise<ApiResponse<TenderSummary>> {
    try {
      // Get tender with basic aggregated data
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', tenderId)
        .single();

      if (tenderError) {
        return {
          error: handleSupabaseError(tenderError, 'Get tender summary'),
        };
      }

      // Get positions count
      const { count: positionsCount } = await supabase
        .from('client_positions')
        .select('*', { count: 'exact', head: true })
        .eq('tender_id', tenderId);

      // Get BOQ items summary  
      const { data: boqItems, error: boqError } = await supabase
        .from('boq_items')
        .select('total_amount, item_type')
        .eq('tender_id', tenderId);

      const data = {
        ...tender,
        positions_count: positionsCount || 0,
        total_items: boqItems?.length || 0,
        total_amount: boqItems?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0,
        materials_count: boqItems?.filter(item => item.item_type === 'material').length || 0,
        works_count: boqItems?.filter(item => item.item_type === 'work').length || 0,
      };

      const error = boqError;

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tender summary'),
        };
      }

      return {
        data,
        message: 'Tender summary loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender summary'),
      };
    }
  },

  /**
   * Get structured tender data with nested client positions and BOQ items
   * Optimized for React component tree rendering
   */
  async getTenderWithPositions(
    tenderId: string,
    options: HierarchyLoadOptions = {}
  ): Promise<ApiResponse<any>> {
    try {
      // Get tender basic info
      const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', tenderId)
        .single();

      if (tenderError) {
        return {
          error: handleSupabaseError(tenderError, 'Get tender'),
        };
      }

      // Get positions with their BOQ items
      const { data: positions, error: positionsError } = await supabase
        .from('client_positions')
        .select('*')
        .eq('tender_id', tenderId)
        .order('position_number');

      if (positionsError) {
        return {
          error: handleSupabaseError(positionsError, 'Get client positions'),
        };
      }

      const positionsWithItems: ClientPositionWithItems[] = [];

      if (options.include_items !== false) {
        // Load BOQ items for each position
        for (const position of positions || []) {
          const { data: boqItems } = await supabase
            .from('boq_items')
            .select(`
              *,
              material:materials_library(*),
              work_item:works_library(*)
            `)
            .eq('client_position_id', position.id)
            .order('sub_number')
            .order('sort_order');
          
          positionsWithItems.push({
            ...position,
            description: (position as any).description || '',
            priority: (position as any).priority || 1,
            boq_items: boqItems || [],
            items_count: boqItems?.length || 0,
            materials_count: boqItems?.filter(item => item.item_type === 'material').length || 0,
            works_count: boqItems?.filter(item => item.item_type === 'work').length || 0,
          } as any);
        }
      } else {
        // Just positions without items
        positionsWithItems.push(...(positions?.map((pos: any) => ({
          ...pos,
          boq_items: [],
          items_count: pos.items_count || 0,
          materials_count: pos.materials_count || 0,
          works_count: pos.works_count || 0,
        })) || []));
      }

      // Get summary
      const summaryResult = await this.getTenderSummary(tenderId);

      const result: any = {
        ...tender,
        client_positions: positionsWithItems,
        summary: summaryResult.data || undefined,
      };

      return {
        data: result,
        message: 'Tender with full hierarchy loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender with positions'),
      };
    }
  },

  /**
   * Create complete tender structure from template or import
   * Handles bulk creation of positions and BOQ items
   */
  async createTenderStructure(
    tenderId: string,
    structure: {
      positions: ClientPositionInsert[];
      itemsByPosition: Record<string, BOQItemInsert[]>;
    }
  ): Promise<ApiResponse<{ positionsCreated: number; itemsCreated: number }>> {
    try {
      // Create positions first - ensure all positions have the correct tender_id
      const positionsWithTenderId = structure.positions.map(pos => ({
        ...pos,
        tender_id: tenderId,
      }));

      const { data: createdPositions, error: positionsError } = await supabase
        .from('client_positions')
        .insert(positionsWithTenderId)
        .select();

      if (positionsError) {
        return {
          error: handleSupabaseError(positionsError, 'Bulk create client positions'),
        };
      }

      let totalItemsCreated = 0;

      // Create BOQ items for each position
      for (const position of createdPositions || []) {
        const positionKey = structure.positions.findIndex(p => p.title === position.title).toString();
        const items = structure.itemsByPosition[positionKey];
        
        if (items && items.length > 0) {
          // Use the database function for optimized bulk insert
          const { data: itemsCreated, error: itemsError } = await supabase.rpc('bulk_insert_boq_items_to_position', {
            p_client_position_id: position.id,
            p_items: items,
          });

          if (itemsError) {
            return {
              error: `Failed to create items for position ${position.title}: ${handleSupabaseError(itemsError, 'Bulk create BOQ items in position')}`,
            };
          }
          totalItemsCreated += itemsCreated || 0;
        }
      }

      return {
        data: {
          positionsCreated: createdPositions?.length || 0,
          itemsCreated: totalItemsCreated,
        },
        message: `Tender structure created: ${createdPositions?.length || 0} positions, ${totalItemsCreated} items`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create tender structure'),
      };
    }
  },

  /**
   * Clone tender structure to a new tender
   * Copies all positions and BOQ items with new IDs
   */
  async cloneTenderStructure(
    sourceTenderId: string,
    targetTenderId: string
  ): Promise<ApiResponse<{ positionsCreated: number; itemsCreated: number }>> {
    try {
      // Get source structure
      const sourceResult = await this.getTenderWithPositions(sourceTenderId, { include_items: true });
      if (sourceResult.error) {
        return {
          error: sourceResult.error,
        };
      }

      // Prepare positions for cloning
      const positions: ClientPositionInsert[] = sourceResult.data!.client_positions!.map((pos: any) => ({
        tender_id: targetTenderId,
        title: pos.title,
        description: pos.description,
        category: pos.category,
        priority: pos.priority,
        status: 'active' as const,
      }));

      // Prepare items by position
      const itemsByPosition: Record<string, BOQItemInsert[]> = {};
      
      sourceResult.data!.client_positions!.forEach((pos: any, index: any) => {
        if (pos.boq_items && pos.boq_items.length > 0) {
          itemsByPosition[index.toString()] = pos.boq_items.map((item: any) => ({
            tender_id: targetTenderId,
            item_type: item.item_type,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_rate: item.unit_rate,
            material_id: item.material_id,
            work_id: item.work_id,
            category: item.category,
            notes: item.notes,
            markup_percentage: item.markup_percentage,
          }));
        }
      });

      // Create the structure
      return await this.createTenderStructure(targetTenderId, {
        positions,
        itemsByPosition,
      });
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Clone tender structure'),
      };
    }
  },

  /**
   * Search across entire tender hierarchy
   * Full-text search through positions and BOQ items
   */
  async searchInTender(
    tenderId: string,
    searchTerm: string,
    filters: {
      includePositions?: boolean;
      includeItems?: boolean;
      itemTypes?: ('work' | 'material')[];
    } = {}
  ): Promise<ApiResponse<{
    positions: ClientPositionSummary[];
    items: BOQItemWithPosition[];
  }>> {
    try {
      const {
        includePositions = true,
        includeItems = true,
        itemTypes = ['work', 'material']
      } = filters;

      const results = {
        positions: [] as ClientPositionSummary[],
        items: [] as BOQItemWithPosition[],
      };

      // Search in positions
      if (includePositions) {
        const { data: positions, error: positionsError } = await supabase
          .from('client_positions')
          .select('*')
          .eq('tender_id', tenderId)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .order('position_number')
          .limit(100);
        
        if (!positionsError) {
          results.positions = positions || [];
        }
      }

      // Search in BOQ items
      if (includeItems) {
        let query = supabase
          .from('boq_items')
          .select('*')
          .eq('tender_id', tenderId)
          .or(`description.ilike.%${searchTerm}%,item_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);

        if (itemTypes.length > 0) {
          query = query.in('item_type', itemTypes);
        }

        const { data: items, error: itemsError } = await query
          .order('client_position_id', { nullsFirst: false })
          .order('sub_number')
          .limit(100);
        
        if (!itemsError) {
          results.items = items || [] as any;
        }
      }

      return {
        data: results,
        message: `Found ${results.positions.length} positions and ${results.items.length} items`,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Search in tender'),
      };
    }
  },

  /**
   * Export tender hierarchy for reporting or backup
   * Returns complete structure in a format suitable for Excel/PDF export
   */
  async exportTenderStructure(tenderId: string): Promise<ApiResponse<{
    tender: any;
    hierarchy: TenderHierarchy[];
    summary: TenderSummary;
  }>> {
    try {
      // Get all data in parallel
      const [tenderResult, hierarchyResult, summaryResult] = await Promise.all([
        supabase.from('tenders').select('*').eq('id', tenderId).single(),
        this.getTenderHierarchy(tenderId),
        this.getTenderSummary(tenderId),
      ]);

      // Check for errors
      if (tenderResult.error) return { error: handleSupabaseError(tenderResult.error, 'Get tender') };
      if (hierarchyResult.error) return { error: hierarchyResult.error };
      if (summaryResult.error) return { error: summaryResult.error };

      return {
        data: {
          tender: tenderResult.data!,
          hierarchy: hierarchyResult.data!,
          summary: summaryResult.data!,
        },
        message: 'Tender structure exported successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Export tender structure'),
      };
    }
  },
};