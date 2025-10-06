import { supabase } from '../client';
import type {
  Tender,
  TenderInsert,
  TenderUpdate,
  TenderFilters,
  ApiResponse,
  PaginatedResponse,
  TenderWithSummary,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

// TENDER API
export const tendersApi = {
  // Get all tenders with optional filtering and pagination
  async getAll(
    filters: TenderFilters & { includeVersions?: boolean } = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<TenderWithSummary>> {
    try {
      // Get tenders with commercial costs from client_positions and saved commercial value
      let query = supabase
        .from('tenders')
        .select(`
          *,
          client_positions (
            total_materials_cost,
            total_works_cost,
            total_commercial_materials_cost,
            total_commercial_works_cost
          ),
          tender_markup_percentages (
            commercial_total_value,
            commercial_total_calculated_at,
            is_active
          )
        `, { count: 'exact' });

      // Apply filters
      // Note: status field removed from schema

      // By default, filter out child versions - only show main tenders (without parent_version_id)
      // Unless explicitly requested to include versions
      if (!filters.includeVersions) {
        query = query.is('parent_version_id', null);
      }

      if (filters.client_name) {
        query = query.ilike('client_name', `%${filters.client_name}%`);
      }
      
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      
      if (filters.search) {
        // Build search conditions array
        const searchConditions = [
          `title.ilike.%${filters.search}%`,
          `description.ilike.%${filters.search}%`,
          `tender_number.ilike.%${filters.search}%`,
          `client_name.ilike.%${filters.search}%`
        ];

        // Add version search if the search term is numeric
        if (!isNaN(Number(filters.search)) && filters.search.trim() !== '') {
          searchConditions.push(`version.eq.${Number(filters.search)}`);
        }

        // Apply all search conditions with OR
        query = query.or(searchConditions.join(','));
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);
      
      // Order by created_at descending
      const { data, error, count } = await paginatedQuery.order('created_at', { ascending: false });

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tenders'),
        };
      }



      // Process tenders with saved commercial value or calculate if needed
      const tendersWithCommercialValue = (data || []).map((tender: any) => {
        const clientPositions = tender.client_positions || [];
        const markupData = tender.tender_markup_percentages?.find((m: any) => m.is_active);

        // First try to use saved commercial value
        if (markupData?.commercial_total_value) {
          console.log('✅ Using saved commercial value for tender:', tender.id, '=', markupData.commercial_total_value);
          const { client_positions, tender_markup_percentages, ...tenderData } = tender;
          return {
            ...tenderData,
            commercial_total_value: markupData.commercial_total_value,
            commercial_total_calculated_at: markupData.commercial_total_calculated_at
          } as TenderWithSummary;
        }

        // If no saved value, calculate from base costs
        const baseMaterials = clientPositions.reduce((sum: number, pos: any) =>
          sum + parseFloat(pos.total_materials_cost || 0), 0);
        const baseWorks = clientPositions.reduce((sum: number, pos: any) =>
          sum + parseFloat(pos.total_works_cost || 0), 0);
        const baseTotal = baseMaterials + baseWorks;

        console.log('⚠️ No saved commercial value for tender:', tender.id, '- using base costs:', baseTotal);
        const { client_positions, tender_markup_percentages, ...tenderData } = tender;
        return {
          ...tenderData,
          commercial_total_value: baseTotal
        } as TenderWithSummary;
      });

      const { page = 1, limit = 20 } = pagination;
      
      return {
        data: tendersWithCommercialValue,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tenders'),
      };
    }
  },

  // Get tender by ID
  async getById(id: string): Promise<ApiResponse<TenderWithSummary>> {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select(`
          *,
          client_positions (
            total_materials_cost,
            total_works_cost,
            total_commercial_materials_cost,
            total_commercial_works_cost
          ),
          tender_markup_percentages (
            commercial_total_value,
            commercial_total_calculated_at,
            is_active
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get tender'),
        };
      }

      // Get saved commercial value or calculate from base costs
      const clientPositions = (data as any).client_positions || [];
      const markupData = (data as any).tender_markup_percentages?.find((m: any) => m.is_active);

      let totalCommercialValue: number;
      let commercialCalculatedAt: string | undefined;

      // First try to use saved commercial value
      if (markupData?.commercial_total_value) {
        totalCommercialValue = markupData.commercial_total_value;
        commercialCalculatedAt = markupData.commercial_total_calculated_at;
        console.log('✅ Using saved commercial value:', totalCommercialValue);
      } else {
        // If no saved value, calculate from base costs
        const baseMaterials = clientPositions.reduce((sum: number, pos: any) =>
          sum + parseFloat(pos.total_materials_cost || 0), 0);
        const baseWorks = clientPositions.reduce((sum: number, pos: any) =>
          sum + parseFloat(pos.total_works_cost || 0), 0);
        totalCommercialValue = baseMaterials + baseWorks;
        console.log('⚠️ No saved commercial value for tender:', id, '- using base costs:', totalCommercialValue);
      }

      // Remove client_positions and tender_markup_percentages from the result
      const { client_positions, tender_markup_percentages, ...tenderData } = data as any;
      const tenderWithCommercialValue = {
        ...tenderData,
        commercial_total_value: totalCommercialValue,
        commercial_total_calculated_at: commercialCalculatedAt
      } as TenderWithSummary;

      return {
        data: tenderWithCommercialValue,
        message: 'Tender loaded successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get tender'),
      };
    }
  },

  // Create new tender
  async create(tender: TenderInsert): Promise<ApiResponse<Tender>> {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .insert(tender)
        .select()
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create tender'),
        };
      }

      return {
        data,
        message: 'Tender created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create tender'),
      };
    }
  },

  // Update tender
  async update(id: string, updates: TenderUpdate): Promise<ApiResponse<Tender>> {
    console.log('🔄 tendersApi.update called with ID:', id);
    console.log('🔍 Updates being sent:');
    console.log('  Version:', updates.version);
    console.log('  Area SP:', updates.area_sp);
    console.log('  Area Client:', updates.area_client);
    console.log('  USD Rate:', updates.usd_rate);
    console.log('  EUR Rate:', updates.eur_rate);
    console.log('  CNY Rate:', updates.cny_rate);
    console.log('  Upload Folder:', updates.upload_folder);
    console.log('  BSM Link:', updates.bsm_link);
    console.log('  TZ Clarification Link:', updates.tz_clarification_link);
    console.log('  QA Form Link:', updates.qa_form_link);
    
    try {
      // First perform the update
      const { error: updateError } = await supabase
        .from('tenders')
        .update(updates)
        .eq('id', id);

      console.log('📦 Supabase update response:', { updateError });

      if (updateError) {
        return {
          error: handleSupabaseError(updateError, 'Update tender'),
        };
      }

      // Then fetch the updated record
      const { data: fetchedData, error: fetchError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id);

      console.log('📦 Raw fetched data:', fetchedData);
      
      // Handle array response
      const data = Array.isArray(fetchedData) ? fetchedData[0] : fetchedData;
      
      console.log('📦 Fetched updated tender:');
      console.log('  ID:', data?.id);
      console.log('  Title:', data?.title); 
      console.log('  USD Rate:', data?.usd_rate);
      console.log('  EUR Rate:', data?.eur_rate);
      console.log('  CNY Rate:', data?.cny_rate);
      if (fetchError) console.log('  Error:', fetchError);

      if (fetchError) {
        return {
          error: handleSupabaseError(fetchError, 'Fetch updated tender'),
        };
      }

      return {
        data,
        message: 'Tender updated successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update tender'),
      };
    }
  },

  // Delete tender
  async delete(id: string): Promise<ApiResponse<null>> {
    console.log('🔥 tendersApi.delete called with ID:', id);
    
    try {
      // First check if tender exists
      console.log('🔍 Checking if tender exists...');
      const { data: existingTender, error: checkError } = await supabase
        .from('tenders')
        .select('id,title')
        .eq('id', id)
        .single();
      
      console.log('📋 Existing tender check result:', { existingTender, checkError });
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking tender existence:', checkError);
        return {
          error: handleSupabaseError(checkError, 'Check tender existence'),
        };
      }
      
      if (!existingTender) {
        console.warn('⚠️ Tender not found for deletion:', id);
        return {
          error: 'Тендер не найден',
        };
      }
      
      console.log('✅ Tender found, proceeding with deletion:', existingTender);

      // Check for related records
      console.log('🔗 Checking for related client positions...');
      const { data: positions, error: positionsError } = await supabase
        .from('client_positions')
        .select('id')
        .eq('tender_id', id);
      
      console.log('📍 Related positions:', { positions, positionsError });
      
      console.log('🔗 Checking for related BOQ items...');
      const { data: boqItems, error: boqError } = await supabase
        .from('boq_items')
        .select('id')
        .eq('tender_id', id);
      
      console.log('📋 Related BOQ items:', { boqItems, boqError });

      // First delete related version mappings
      console.log('🗑️ Deleting version mappings...');
      const { error: mappingError } = await supabase
        .from('tender_version_mappings')
        .delete()
        .or(`old_tender_id.eq.${id},new_tender_id.eq.${id}`);

      if (mappingError) {
        console.error('❌ Error deleting version mappings:', mappingError);
      }

      // Delete BOQ item version mappings
      console.log('🗑️ Deleting BOQ item version mappings...');
      const { error: boqMappingError } = await supabase
        .from('boq_item_version_mappings')
        .delete()
        .or(`old_tender_id.eq.${id},new_tender_id.eq.${id}`);

      if (boqMappingError) {
        console.error('❌ Error deleting BOQ item version mappings:', boqMappingError);
      }

      // Then delete DOP positions (they reference parent positions)
      console.log('🗑️ Deleting DOP positions...');
      const { error: dopError } = await supabase
        .from('client_positions')
        .delete()
        .eq('tender_id', id)
        .eq('is_additional', true);

      if (dopError) {
        console.error('❌ Error deleting DOP positions:', dopError);
        // Continue with deletion even if there's an error
      } else {
        console.log('✅ DOP positions deleted successfully');
      }

      // Perform the deletion
      console.log('🗑️ Performing tender deletion...');
      const { error } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id);

      console.log('📤 Delete operation result:', { error });

      if (error) {
        console.error('❌ Supabase delete error:', error);
        return {
          error: handleSupabaseError(error, 'Delete tender'),
        };
      }

      console.log('✅ Tender deleted successfully:', id);
      return {
        data: null,
        message: 'Tender deleted successfully',
      };
    } catch (error) {
      console.error('💥 Exception in tender delete:', error);
      return {
        error: handleSupabaseError(error, 'Delete tender'),  
      };
    }
  },
};

// Legacy function for backward compatibility
export const getTenders = async () => {
  const result = await tendersApi.getAll();
  return result.data || [];
};