import { supabase } from '../../client';
import type { ApiResponse } from '../../types';
import { handleSupabaseError } from '../utils';

/**
 * Currency exchange rate update results
 */
export interface CurrencyUpdateResult {
  updated_items_count: number;
  updated_usd_items: number;
  updated_eur_items: number;
  updated_cny_items: number;
  tender_id: string;
  updated_rates: {
    usd_rate?: number | null;
    eur_rate?: number | null;
    cny_rate?: number | null;
  };
}

/**
 * BOQ Currency Operations
 * Handles currency exchange rate updates for BOQ items
 */
export const boqCurrencyApi = {
  /**
   * Update currency rates for all BOQ items in a tender
   * This function calls the PostgreSQL stored procedure to update currency_rate
   * field in boq_items table based on tender's current exchange rates
   */
  async updateCurrencyRatesForTender(
    tenderId: string,
    options?: {
      usd_rate?: number | null;
      eur_rate?: number | null;
      cny_rate?: number | null;
    }
  ): Promise<ApiResponse<CurrencyUpdateResult>> {
    console.log('🚀 [boqCurrencyApi.updateCurrencyRatesForTender] starting:', { 
      tenderId, 
      options 
    });
    
    try {
      // Validate tender ID
      if (!tenderId || tenderId.trim() === '') {
        console.error('❌ [boqCurrencyApi.updateCurrencyRatesForTender] Invalid tender ID:', tenderId);
        return {
          error: 'Tender ID is required',
        };
      }

      // If no specific rates provided, get current rates from tender
      let { usd_rate, eur_rate, cny_rate } = options || {};
      
      if (!options) {
        console.log('🔍 [boqCurrencyApi.updateCurrencyRatesForTender] No rates provided, fetching from tender...');
        
        const { data: tender, error: tenderError } = await supabase
          .from('tenders')
          .select('usd_rate, eur_rate, cny_rate')
          .eq('id', tenderId)
          .single();

        if (tenderError || !tender) {
          console.error('❌ [boqCurrencyApi.updateCurrencyRatesForTender] Failed to fetch tender rates:', tenderError);
          return {
            error: handleSupabaseError(tenderError || new Error('Tender not found'), 'Fetch tender rates'),
          };
        }

        usd_rate = tender.usd_rate;
        eur_rate = tender.eur_rate;
        cny_rate = tender.cny_rate;
        
        console.log('📦 [boqCurrencyApi.updateCurrencyRatesForTender] Fetched rates from tender:', {
          usd_rate,
          eur_rate,
          cny_rate
        });
      }

      console.log('📡 [boqCurrencyApi.updateCurrencyRatesForTender] Calling update_boq_currency_rates function...');
      console.log('🔍 [boqCurrencyApi.updateCurrencyRatesForTender] Parameters:', {
        p_tender_id: tenderId,
        p_usd_rate: usd_rate,
        p_eur_rate: eur_rate,
        p_cny_rate: cny_rate
      });
      
      // Call PostgreSQL function to update currency rates
      const { data, error } = await supabase.rpc('update_boq_currency_rates', {
        p_tender_id: tenderId,
        p_usd_rate: usd_rate || null,
        p_eur_rate: eur_rate || null,
        p_cny_rate: cny_rate || null
      });

      console.log('📦 [boqCurrencyApi.updateCurrencyRatesForTender] Database response:', { data, error });

      if (error) {
        console.error('❌ [boqCurrencyApi.updateCurrencyRatesForTender] Database error:', error);
        return {
          error: handleSupabaseError(error, 'Update BOQ currency rates'),
        };
      }

      // Extract result from array (PostgreSQL functions return arrays)
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result) {
        console.error('❌ [boqCurrencyApi.updateCurrencyRatesForTender] No result returned from function');
        return {
          error: 'No result returned from currency update function',
        };
      }

      const updateResult: CurrencyUpdateResult = {
        updated_items_count: result.updated_items_count || 0,
        updated_usd_items: result.updated_usd_items || 0,
        updated_eur_items: result.updated_eur_items || 0,
        updated_cny_items: result.updated_cny_items || 0,
        tender_id: tenderId,
        updated_rates: {
          usd_rate,
          eur_rate,
          cny_rate
        }
      };

      console.log('✅ [boqCurrencyApi.updateCurrencyRatesForTender] success:', updateResult);

      return {
        data: updateResult,
        message: `Updated currency rates for ${updateResult.updated_items_count} BOQ items`,
      };
      
    } catch (error) {
      console.error('💥 [boqCurrencyApi.updateCurrencyRatesForTender] error:', error);
      return {
        error: handleSupabaseError(error, 'Update BOQ currency rates'),
      };
    }
  },

  /**
   * Get currency rate statistics for a tender
   * Shows how many items use each currency type
   */
  async getCurrencyStatsForTender(tenderId: string): Promise<ApiResponse<{
    total_items: number;
    rub_items: number;
    usd_items: number;
    eur_items: number;
    cny_items: number;
    currencies_used: string[];
  }>> {
    console.log('🚀 [boqCurrencyApi.getCurrencyStatsForTender] starting:', tenderId);
    
    try {
      if (!tenderId || tenderId.trim() === '') {
        return { error: 'Tender ID is required' };
      }

      console.log('📡 [boqCurrencyApi.getCurrencyStatsForTender] Fetching currency statistics...');
      
      const { data, error } = await supabase
        .from('boq_items')
        .select('currency_type')
        .eq('tender_id', tenderId);

      if (error) {
        console.error('❌ [boqCurrencyApi.getCurrencyStatsForTender] Database error:', error);
        return {
          error: handleSupabaseError(error, 'Fetch currency statistics'),
        };
      }

      const items = data || [];
      const stats = {
        total_items: items.length,
        rub_items: items.filter(item => !item.currency_type || item.currency_type === 'RUB').length,
        usd_items: items.filter(item => item.currency_type === 'USD').length,
        eur_items: items.filter(item => item.currency_type === 'EUR').length,
        cny_items: items.filter(item => item.currency_type === 'CNY').length,
        currencies_used: [...new Set(items.map(item => item.currency_type || 'RUB'))].sort()
      };

      console.log('✅ [boqCurrencyApi.getCurrencyStatsForTender] success:', stats);

      return {
        data: stats,
        message: 'Currency statistics retrieved successfully',
      };
      
    } catch (error) {
      console.error('💥 [boqCurrencyApi.getCurrencyStatsForTender] error:', error);
      return {
        error: handleSupabaseError(error, 'Get currency statistics'),
      };
    }
  }
};