import { supabase } from '../client';
import { handleSupabaseError } from './utils';
import type {
  ConstructionCost,
  ConstructionCostCategory,
  ConstructionCostWithCategory,
  CreateConstructionCostInput,
  UpdateConstructionCostInput,
  CreateCostCategoryInput,
  UpdateCostCategoryInput,
  ConstructionCostFilters,
  ConstructionCostHistory,
  CostPriceTrend,
  CategoryWithChildren
} from '../types/construction-costs';

export const constructionCostsApi = {
  // ========== CATEGORIES ==========
  
  async getCategories(includeInactive = false) {
    console.log('🚀 [getCategories] called with:', { includeInactive });
    
    try {
      let query = supabase
        .from('construction_cost_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getCategories] completed:', { count: data?.length });
      return data as ConstructionCostCategory[];
    } catch (error) {
      console.error('❌ [getCategories] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getCategoryTree(includeInactive = false) {
    console.log('🚀 [getCategoryTree] called with:', { includeInactive });
    
    try {
      const categories = await this.getCategories(includeInactive);
      
      // Build tree structure
      const categoryMap = new Map<string, CategoryWithChildren>();
      const rootCategories: CategoryWithChildren[] = [];
      
      // First pass: create all nodes
      categories.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });
      
      // Second pass: build tree
      categories.forEach(cat => {
        const node = categoryMap.get(cat.id)!;
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
          }
        } else {
          rootCategories.push(node);
        }
      });
      
      console.log('✅ [getCategoryTree] completed:', { rootCount: rootCategories.length });
      return rootCategories;
    } catch (error) {
      console.error('❌ [getCategoryTree] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createCategory(input: CreateCostCategoryInput) {
    console.log('🚀 [createCategory] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('construction_cost_categories')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [createCategory] completed:', data);
      return data as ConstructionCostCategory;
    } catch (error) {
      console.error('❌ [createCategory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async updateCategory(input: UpdateCostCategoryInput) {
    console.log('🚀 [updateCategory] called with:', input);
    
    try {
      const { id, ...updates } = input;
      
      const { data, error } = await supabase
        .from('construction_cost_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [updateCategory] completed:', data);
      return data as ConstructionCostCategory;
    } catch (error) {
      console.error('❌ [updateCategory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async deleteCategory(id: string) {
    console.log('🚀 [deleteCategory] called with:', { id });
    
    try {
      const { error } = await supabase
        .from('construction_cost_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ [deleteCategory] completed');
      return true;
    } catch (error) {
      console.error('❌ [deleteCategory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== COSTS ==========
  
  async getCosts(filters: ConstructionCostFilters = {}) {
    console.log('🚀 [getCosts] called with:', filters);
    
    try {
      let query = supabase
        .from('construction_costs')
        .select(`
          *,
          category:construction_cost_categories(*)
        `)
        .order('name', { ascending: true });
      
      // Apply filters
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      if (filters.supplier) {
        query = query.eq('supplier', filters.supplier);
      }
      
      if (filters.min_price !== undefined) {
        query = query.gte('base_price', filters.min_price);
      }
      
      if (filters.max_price !== undefined) {
        query = query.lte('base_price', filters.max_price);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('✅ [getCosts] completed:', { count: data?.length });
      return data as ConstructionCostWithCategory[];
    } catch (error) {
      console.error('❌ [getCosts] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getCostById(id: string) {
    console.log('🚀 [getCostById] called with:', { id });
    
    try {
      const { data, error } = await supabase
        .from('construction_costs')
        .select(`
          *,
          category:construction_cost_categories(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      console.log('✅ [getCostById] completed:', data);
      return data as ConstructionCostWithCategory;
    } catch (error) {
      console.error('❌ [getCostById] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async createCost(input: CreateConstructionCostInput) {
    console.log('🚀 [createCost] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('construction_costs')
        .insert(input)
        .select(`
          *,
          category:construction_cost_categories(*)
        `)
        .single();
      
      if (error) throw error;
      
      // Add to price history
      if (data) {
        await this.addPriceHistory({
          cost_id: data.id,
          price: data.base_price,
          price_date: data.price_date || new Date().toISOString().split('T')[0],
          supplier: data.supplier,
          notes: 'Initial price'
        });
      }
      
      console.log('✅ [createCost] completed:', data);
      return data as ConstructionCostWithCategory;
    } catch (error) {
      console.error('❌ [createCost] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async updateCost(input: UpdateConstructionCostInput) {
    console.log('🚀 [updateCost] called with:', input);
    
    try {
      const { id, ...updates } = input;
      
      // Get current price for comparison
      const currentCost = await this.getCostById(id);
      const priceChanged = updates.base_price && updates.base_price !== currentCost.base_price;
      
      const { data, error } = await supabase
        .from('construction_costs')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          category:construction_cost_categories(*)
        `)
        .single();
      
      if (error) throw error;
      
      // Add to price history if price changed
      if (priceChanged && data) {
        await this.addPriceHistory({
          cost_id: data.id,
          price: data.base_price,
          price_date: new Date().toISOString().split('T')[0],
          supplier: data.supplier,
          notes: 'Price update'
        });
      }
      
      console.log('✅ [updateCost] completed:', data);
      return data as ConstructionCostWithCategory;
    } catch (error) {
      console.error('❌ [updateCost] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async deleteCost(id: string) {
    console.log('🚀 [deleteCost] called with:', { id });
    
    try {
      const { error } = await supabase
        .from('construction_costs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ [deleteCost] completed');
      return true;
    } catch (error) {
      console.error('❌ [deleteCost] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async bulkCreateCosts(costs: CreateConstructionCostInput[]) {
    console.log('🚀 [bulkCreateCosts] called with:', { count: costs.length });
    
    try {
      const { data, error } = await supabase
        .from('construction_costs')
        .insert(costs)
        .select();
      
      if (error) throw error;
      
      console.log('✅ [bulkCreateCosts] completed:', { created: data?.length });
      return data as ConstructionCost[];
    } catch (error) {
      console.error('❌ [bulkCreateCosts] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== PRICE HISTORY ==========
  
  async getPriceHistory(costId: string, daysBack = 90) {
    console.log('🚀 [getPriceHistory] called with:', { costId, daysBack });
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      const { data, error } = await supabase
        .from('construction_cost_history')
        .select('*')
        .eq('cost_id', costId)
        .gte('price_date', startDate.toISOString().split('T')[0])
        .order('price_date', { ascending: false });
      
      if (error) throw error;
      
      console.log('✅ [getPriceHistory] completed:', { count: data?.length });
      return data as ConstructionCostHistory[];
    } catch (error) {
      console.error('❌ [getPriceHistory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async addPriceHistory(input: {
    cost_id: string;
    price: number;
    price_date: string;
    supplier?: string | null;
    notes?: string | null;
  }) {
    console.log('🚀 [addPriceHistory] called with:', input);
    
    try {
      const { data, error } = await supabase
        .from('construction_cost_history')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ [addPriceHistory] completed:', data);
      return data as ConstructionCostHistory;
    } catch (error) {
      console.error('❌ [addPriceHistory] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getPriceTrends(costId: string, daysBack = 90) {
    console.log('🚀 [getPriceTrends] called with:', { costId, daysBack });
    
    try {
      const { data, error } = await supabase
        .rpc('get_cost_price_trends', {
          p_cost_id: costId,
          p_days_back: daysBack
        });
      
      if (error) throw error;
      
      console.log('✅ [getPriceTrends] completed:', { count: data?.length });
      return data as CostPriceTrend[];
    } catch (error) {
      console.error('❌ [getPriceTrends] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  // ========== SEARCH ==========
  
  async searchCosts(searchTerm: string, limit = 20) {
    console.log('🚀 [searchCosts] called with:', { searchTerm, limit });
    
    try {
      const { data, error } = await supabase
        .from('construction_costs')
        .select(`
          *,
          category:construction_cost_categories(*)
        `)
        .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(limit);
      
      if (error) throw error;
      
      console.log('✅ [searchCosts] completed:', { count: data?.length });
      return data as ConstructionCostWithCategory[];
    } catch (error) {
      console.error('❌ [searchCosts] failed:', error);
      throw handleSupabaseError(error);
    }
  },

  async getSuppliers() {
    console.log('🚀 [getSuppliers] called');
    
    try {
      const { data, error } = await supabase
        .from('construction_costs')
        .select('supplier')
        .not('supplier', 'is', null)
        .order('supplier');
      
      if (error) throw error;
      
      const uniqueSuppliers = [...new Set(data?.map(item => item.supplier).filter(Boolean))];
      
      console.log('✅ [getSuppliers] completed:', { count: uniqueSuppliers.length });
      return uniqueSuppliers as string[];
    } catch (error) {
      console.error('❌ [getSuppliers] failed:', error);
      throw handleSupabaseError(error);
    }
  }
};