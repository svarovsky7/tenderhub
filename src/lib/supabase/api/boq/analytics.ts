import { supabase } from '../../client';
import type {
  ApiResponse,
  BOQSummary,
} from '../../types';
import { handleSupabaseError } from '../utils';

/**
 * BOQ Analytics Operations
 * Statistics, summaries, and analytical operations for BOQ data
 */
export const boqAnalyticsApi = {
  /**
   * Get BOQ summary for a tender
   * Calculates total items, amounts, and categorization
   */
  async getSummary(tenderId: string): Promise<ApiResponse<BOQSummary>> {
    console.log('🚀 boqAnalyticsApi.getSummary called with:', tenderId);
    
    try {
      console.log('📡 Fetching BOQ items for summary calculation...');
      const { data: boqItems, error } = await supabase
        .from('boq_items')
        .select('total_amount, item_type')
        .eq('tender_id', tenderId);
      
      console.log('📦 BOQ items response:', { itemsCount: boqItems?.length, error });

      if (error) {
        console.error('❌ Failed to fetch BOQ items:', error);
        return {
          error: handleSupabaseError(error, 'Get BOQ summary'),
        };
      }

      console.log('📊 Calculating summary statistics...');
      const totalItems = boqItems?.length || 0;
      const totalAmount = boqItems?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
      const materialsCount = boqItems?.filter(item => item.item_type === 'material').length || 0;
      const worksCount = boqItems?.filter(item => item.item_type === 'work').length || 0;

      const data = {
        tender_id: tenderId,
        total_items: totalItems,
        total_amount: totalAmount,
        materials_count: materialsCount,
        works_count: worksCount,
      };

      console.log('📈 Summary calculated:', data);
      return {
        data,
        message: 'BOQ summary loaded successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getSummary:', error);
      return {
        error: handleSupabaseError(error, 'Get BOQ summary'),
      };
    }
  },

  /**
   * Get BOQ analytics by category
   * Breaks down BOQ data by categories and subcategories
   */
  async getCategoryAnalytics(tenderId: string): Promise<ApiResponse<Array<{
    category: string;
    subcategory: string | null;
    item_count: number;
    total_amount: number;
    avg_amount: number;
  }>>> {
    console.log('🚀 boqAnalyticsApi.getCategoryAnalytics called with:', tenderId);
    
    try {
      console.log('📡 Fetching BOQ items for category analysis...');
      const { data: items, error } = await supabase
        .from('boq_items')
        .select('category, subcategory, total_amount')
        .eq('tender_id', tenderId)
        .not('category', 'is', null);

      console.log('📦 Category items response:', { itemsCount: items?.length, error });

      if (error) {
        console.error('❌ Failed to fetch category items:', error);
        return {
          error: handleSupabaseError(error, 'Get category analytics'),
        };
      }

      console.log('📊 Processing category analytics...');
      const categoryMap = new Map<string, {
        subcategory: string | null,
        amounts: number[],
        totalAmount: number
      }>();

      items?.forEach(item => {
        const key = `${item.category || 'Unknown'}_${item.subcategory || 'None'}`;
        const amount = item.total_amount || 0;
        
        if (categoryMap.has(key)) {
          const existing = categoryMap.get(key)!;
          existing.amounts.push(amount);
          existing.totalAmount += amount;
        } else {
          categoryMap.set(key, {
            subcategory: item.subcategory,
            amounts: [amount],
            totalAmount: amount
          });
        }
      });

      const analytics = Array.from(categoryMap.entries()).map(([key, data]) => {
        const [category] = key.split('_');
        return {
          category,
          subcategory: data.subcategory === 'None' ? null : data.subcategory,
          item_count: data.amounts.length,
          total_amount: data.totalAmount,
          avg_amount: data.totalAmount / data.amounts.length
        };
      }).sort((a, b) => b.total_amount - a.total_amount);

      console.log('📈 Category analytics calculated:', { categoriesCount: analytics.length });
      return {
        data: analytics,
        message: 'Category analytics calculated successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getCategoryAnalytics:', error);
      return {
        error: handleSupabaseError(error, 'Get category analytics'),
      };
    }
  },

  /**
   * Get BOQ cost distribution analysis
   * Analyzes cost patterns and high-value items
   */
  async getCostDistribution(tenderId: string): Promise<ApiResponse<{
    totalCost: number;
    highValueItems: number; // items > 10,000
    mediumValueItems: number; // items 1,000-10,000
    lowValueItems: number; // items < 1,000
    topExpensiveItems: Array<{
      id: string;
      item_number: string;
      description: string;
      total_amount: number;
    }>;
  }>> {
    console.log('🚀 boqAnalyticsApi.getCostDistribution called with:', tenderId);
    
    try {
      console.log('📡 Fetching BOQ items for cost distribution analysis...');
      const { data: items, error } = await supabase
        .from('boq_items')
        .select('id, item_number, description, total_amount')
        .eq('tender_id', tenderId)
        .not('total_amount', 'is', null)
        .order('total_amount', { ascending: false });

      console.log('📦 Cost items response:', { itemsCount: items?.length, error });

      if (error) {
        console.error('❌ Failed to fetch cost items:', error);
        return {
          error: handleSupabaseError(error, 'Get cost distribution'),
        };
      }

      console.log('📊 Calculating cost distribution...');
      const totalCost = items?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
      
      let highValueItems = 0;
      let mediumValueItems = 0;
      let lowValueItems = 0;

      items?.forEach(item => {
        const amount = item.total_amount || 0;
        if (amount > 10000) {
          highValueItems++;
        } else if (amount >= 1000) {
          mediumValueItems++;
        } else {
          lowValueItems++;
        }
      });

      const topExpensiveItems = (items || [])
        .slice(0, 10)
        .map(item => ({
          id: item.id,
          item_number: item.item_number,
          description: item.description,
          total_amount: item.total_amount || 0
        }));

      const distribution = {
        totalCost,
        highValueItems,
        mediumValueItems,
        lowValueItems,
        topExpensiveItems
      };

      console.log('💰 Cost distribution calculated:', {
        totalCost,
        highValueItems,
        mediumValueItems,
        lowValueItems,
        topItemsCount: topExpensiveItems.length
      });

      return {
        data: distribution,
        message: 'Cost distribution calculated successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getCostDistribution:', error);
      return {
        error: handleSupabaseError(error, 'Get cost distribution'),
      };
    }
  },

  /**
   * Get BOQ completion statistics
   * Analyzes completeness of BOQ data
   */
  async getCompletionStats(tenderId: string): Promise<ApiResponse<{
    totalItems: number;
    itemsWithMaterials: number;
    itemsWithWorks: number;
    itemsWithNotes: number;
    itemsWithCategories: number;
    completionPercentage: number;
  }>> {
    console.log('🚀 boqAnalyticsApi.getCompletionStats called with:', tenderId);
    
    try {
      console.log('📡 Fetching BOQ items for completion analysis...');
      const { data: items, error } = await supabase
        .from('boq_items')
        .select('material_id, work_id, notes, category, subcategory')
        .eq('tender_id', tenderId);

      console.log('📦 Completion items response:', { itemsCount: items?.length, error });

      if (error) {
        console.error('❌ Failed to fetch completion items:', error);
        return {
          error: handleSupabaseError(error, 'Get completion stats'),
        };
      }

      console.log('📊 Calculating completion statistics...');
      const totalItems = items?.length || 0;
      
      if (totalItems === 0) {
        console.log('⚠️ No items found for completion analysis');
        return {
          data: {
            totalItems: 0,
            itemsWithMaterials: 0,
            itemsWithWorks: 0,
            itemsWithNotes: 0,
            itemsWithCategories: 0,
            completionPercentage: 0
          },
          message: 'No items found for completion analysis',
        };
      }

      const itemsWithMaterials = items?.filter(item => item.material_id).length || 0;
      const itemsWithWorks = items?.filter(item => item.work_id).length || 0;
      const itemsWithNotes = items?.filter(item => item.notes && item.notes.trim()).length || 0;
      const itemsWithCategories = items?.filter(item => item.category).length || 0;

      // Calculate completion percentage based on having either material or work reference
      const itemsWithReferences = items?.filter(item => item.material_id || item.work_id).length || 0;
      const completionPercentage = totalItems > 0 ? Math.round((itemsWithReferences / totalItems) * 100) : 0;

      const stats = {
        totalItems,
        itemsWithMaterials,
        itemsWithWorks,
        itemsWithNotes,
        itemsWithCategories,
        completionPercentage
      };

      console.log('📈 Completion stats calculated:', stats);
      return {
        data: stats,
        message: 'Completion statistics calculated successfully',
      };
    } catch (error) {
      console.error('💥 Exception in getCompletionStats:', error);
      return {
        error: handleSupabaseError(error, 'Get completion stats'),
      };
    }
  },
};