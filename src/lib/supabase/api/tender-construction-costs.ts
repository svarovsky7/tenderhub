import { supabase } from '../client';
import { handleSupabaseError } from './utils';
import type {
  TenderConstructionCost,
  TenderConstructionCostWithDetails,
  TenderCostGroup,
  TenderCostGroupWithCosts,
  CreateTenderConstructionCostInput,
  UpdateTenderConstructionCostInput,
  CreateTenderCostGroupInput,
  UpdateTenderCostGroupInput,
  TenderConstructionCostFilters,
  TenderCostSummary
} from '../types/construction-costs';

export const tenderConstructionCostsApi = {
  // ========== TENDER COSTS ==========
  
  async getTenderCosts(filters: TenderConstructionCostFilters) {
    console.log('🚀 [getTenderCosts] called with:', filters);
    
    try {
      let query = supabase
        .from('tender_construction_costs')
        .select(`
          *,
          cost:construction_costs(
            *,
            category:construction_cost_categories(*)
          ),
          group:tender_cost_groups(*)
        `)
        .eq('tender_id', filters.tender_id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (filters.group_id !== undefined) {
        query = filters.group_id ? query.eq('group_id', filters.group_id) : query.is('group_id', null);
      }
      
      if (filters.is_included !== undefined) {
        query = query.eq('is_included', filters.is_included);
      }
      
      if (filters.search) {
        // Search in related cost name and description
        query = query.or(`cost.name.ilike.%${filters.search}%,cost.description.ilike.%${filters.search}%`, { foreignTable: 'construction_costs' });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getTenderCosts] completed:', { count: data?.length });
      return data as TenderConstructionCostWithDetails[];
    } catch (error) {
      console.error('❌ [getTenderCosts] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async addCostToTender(input: CreateTenderConstructionCostInput) {
    console.log('🚀 [addCostToTender] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('tender_construction_costs')
        .insert(input)
        .select(`
          *,
          cost:construction_costs(
            *,
            category:construction_cost_categories(*)
          ),
          group:tender_cost_groups(*)
        `)
        .single();
      
      if (error) throw error;
      
      console.log('✅ [addCostToTender] completed:', data);
      return data as TenderConstructionCostWithDetails;
    } catch (error) {
      console.error('❌ [addCostToTender] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async updateTenderCost(input: UpdateTenderConstructionCostInput) {
    console.log('🚀 [updateTenderCost] called with:', input);
    
    try {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('tender_construction_costs')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          cost:construction_costs(
            *,
            category:construction_cost_categories(*)
          ),
          group:tender_cost_groups(*)
        `)
        .single();
      
      if (error) throw error;
      
      console.log('✅ [updateTenderCost] completed:', data);
      return data as TenderConstructionCostWithDetails;
    } catch (error) {
      console.error('❌ [updateTenderCost] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async removeCostFromTender(id: string) {
    console.log('🚀 [removeCostFromTender] called with:', { id });
    
    try {
      const { error } = await supabase
        .from('tender_construction_costs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ [removeCostFromTender] completed');
      return true;
    } catch (error) {
      console.error('❌ [removeCostFromTender] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkAddCostsToTender(costs: CreateTenderConstructionCostInput[]) {
    console.log('🚀 [bulkAddCostsToTender] called with:', { count: costs.length });
    
    try {
      const { data, error } = await supabase
        .from('tender_construction_costs')
        .insert(costs)
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkAddCostsToTender] completed:', { created: data?.length });
      return data as TenderConstructionCost[];
    } catch (error) {
      console.error('❌ [bulkAddCostsToTender] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async updateCostOrder(tenderId: string, costIds: string[]) {
    console.log('🚀 [updateCostOrder] called with:', { tenderId, count: costIds.length });
    
    try {
      const updates = costIds.map((id, index) => ({
        id,
        sort_order: index
      }));
      
      const promises = updates.map(update =>
        supabase
          .from('tender_construction_costs')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('tender_id', tenderId)
      );
      
      await Promise.all(promises);
      
      console.log('✅ [updateCostOrder] completed');
      return true;
    } catch (error) {
      console.error('❌ [updateCostOrder] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== COST GROUPS ==========
  
  async getTenderGroups(tenderId: string, includeInactive = false) {
    console.log('🚀 [getTenderGroups] called with:', { tenderId, includeInactive });
    
    try {
      let query = supabase
        .from('tender_cost_groups')
        .select('*')
        .eq('tender_id', tenderId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getTenderGroups] completed:', { count: data?.length });
      return data as TenderCostGroup[];
    } catch (error) {
      console.error('❌ [getTenderGroups] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getTenderGroupsWithCosts(tenderId: string) {
    console.log('🚀 [getTenderGroupsWithCosts] called with:', { tenderId });
    
    try {
      // Get groups
      const groups = await this.getTenderGroups(tenderId);
      
      // Get all costs for this tender
      const costs = await this.getTenderCosts({ tender_id: tenderId });
      
      // Group costs by group_id
      const groupsWithCosts: TenderCostGroupWithCosts[] = groups.map(group => {
        const groupCosts = costs.filter(cost => cost.group_id === group.id);
        const total_base = groupCosts.reduce((sum, cost) => sum + (cost.total_price || 0), 0);
        const total_with_markup = groupCosts.reduce((sum, cost) => sum + (cost.final_price || 0), 0);
        
        return {
          ...group,
          costs: groupCosts,
          total_base,
          total_with_markup
        };
      });
      
      // Add ungrouped costs as a special group
      const ungroupedCosts = costs.filter(cost => !cost.group_id);
      if (ungroupedCosts.length > 0) {
        const total_base = ungroupedCosts.reduce((sum, cost) => sum + (cost.total_price || 0), 0);
        const total_with_markup = ungroupedCosts.reduce((sum, cost) => sum + (cost.final_price || 0), 0);
        
        groupsWithCosts.push({
          id: 'ungrouped',
          tender_id: tenderId,
          name: 'Без группы',
          description: 'Затраты без группы',
          sort_order: -1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          costs: ungroupedCosts,
          total_base,
          total_with_markup
        });
      }
      
      console.log('✅ [getTenderGroupsWithCosts] completed:', { groupCount: groupsWithCosts.length });
      return groupsWithCosts;
    } catch (error) {
      console.error('❌ [getTenderGroupsWithCosts] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createGroup(input: CreateTenderCostGroupInput) {
    console.log('🚀 [createGroup] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('tender_cost_groups')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [createGroup] completed:', data);
      return data as TenderCostGroup;
    } catch (error) {
      console.error('❌ [createGroup] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async updateGroup(input: UpdateTenderCostGroupInput) {
    console.log('🚀 [updateGroup] called with:', input);
    
    try {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('tender_cost_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [updateGroup] completed:', data);
      return data as TenderCostGroup;
    } catch (error) {
      console.error('❌ [updateGroup] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async deleteGroup(id: string) {
    console.log('🚀 [deleteGroup] called with:', { id });
    
    try {
      const { error } = await supabase
        .from('tender_cost_groups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ [deleteGroup] completed');
      return true;
    } catch (error) {
      console.error('❌ [deleteGroup] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== CALCULATIONS ==========
  
  async getTenderCostSummary(tenderId: string) {
    console.log('🚀 [getTenderCostSummary] called with:', { tenderId });
    
    try {
      const { data, error } = await supabase
        .rpc('calculate_tender_total_costs', {
          p_tender_id: tenderId
        })
        .single();
      
      if (error) throw error;
      
      console.log('✅ [getTenderCostSummary] completed:', data);
      return data as TenderCostSummary;
    } catch (error) {
      console.error('❌ [getTenderCostSummary] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async copyCostsFromTender(sourceTenderId: string, targetTenderId: string) {
    console.log('🚀 [copyCostsFromTender] called with:', { sourceTenderId, targetTenderId });
    
    try {
      const { data, error } = await supabase
        .rpc('copy_costs_to_tender', {
          p_source_tender_id: sourceTenderId,
          p_target_tender_id: targetTenderId
        });
      
      if (error) throw error;
      
      console.log('✅ [copyCostsFromTender] completed:', { copiedCount: data });
      return data as number;
    } catch (error) {
      console.error('❌ [copyCostsFromTender] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== EXPORT/IMPORT ==========
  
  async exportTenderCostsToExcel(tenderId: string) {
    console.log('🚀 [exportTenderCostsToExcel] called with:', { tenderId });
    
    try {
      const costs = await this.getTenderCosts({ tender_id: tenderId });
      const groups = await this.getTenderGroups(tenderId);
      
      // Format data for Excel export
      const exportData = costs.map(item => ({
        'Группа': groups.find(g => g.id === item.group_id)?.name || 'Без группы',
        'Категория': item.cost?.category?.name || '',
        'Код': item.cost?.code || '',
        'Наименование': item.cost?.name || '',
        'Единица': item.cost?.unit || '',
        'Количество': item.quantity,
        'Цена за единицу': item.unit_price,
        'Сумма': item.total_price,
        'Наценка %': item.markup_percent || 0,
        'Итоговая сумма': item.final_price,
        'Поставщик': item.cost?.supplier || '',
        'Примечания': item.notes || ''
      }));
      
      console.log('✅ [exportTenderCostsToExcel] completed:', { rows: exportData.length });
      return exportData;
    } catch (error) {
      console.error('❌ [exportTenderCostsToExcel] failed:', error);
      throw handleSupabaseError(error);
    }
  }
};