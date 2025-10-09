import { supabase } from '../client';
import type {
  Work,
  WorkInsert,
  WorkUpdate,
  WorkFilters,
  ApiResponse,
  PaginatedResponse,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

// Enhanced Works API for working with separate name tables
export const worksWithNamesApi = {
  // Get all works with names joined
  async getAll(
    filters: WorkFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Work>> {
    try {
      // Use view that joins with work_names
      let query = supabase
        .from('works_library_with_names')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply pagination
      const paginatedQuery = applyPagination(query, pagination);

      const { data, error, count } = await paginatedQuery.order('name');

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get works'),
        };
      }

      const { page = 1, limit = 20 } = pagination;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get works'),
      };
    }
  },

  // Create work with name
  async create(work: WorkInsert & { name: string }): Promise<ApiResponse<Work>> {
    try {
      // Start transaction
      const { name, unit, ...workData } = work as any;

      // First, check if name exists in work_names
      let nameId: string;

      // Check if name already exists
      const { data: existingName, error: checkError } = await supabase
        .from('work_names')
        .select('id')
        .eq('name', name)
        .maybeSingle();

      if (checkError) {
        return {
          error: handleSupabaseError(checkError, 'Check work name'),
        };
      }

      if (existingName) {
        // Name exists, use it
        nameId = existingName.id;
      } else {
        // Name doesn't exist - this should be an error in "configure" mode
        // User should only select existing names from autocomplete
        return {
          error: 'Выбранное наименование не существует в библиотеке. Пожалуйста, выберите существующее наименование из списка или сначала создайте его в режиме "Создать работу".',
        };
      }

      // Create work with name_id
      const { data: newWorks, error: workError } = await supabase
        .from('works_library')
        .insert({ ...workData, name_id: nameId })
        .select('*');

      if (workError) {
        return {
          error: handleSupabaseError(workError, 'Create work'),
        };
      }

      // Get first work from array
      const newWork = newWorks?.[0];

      // If insert succeeded but data wasn't returned, construct response from input
      if (!newWork) {
        console.warn('⚠️ Work created but data not returned, using fallback');
        return {
          data: { ...workData, name_id: nameId, name, unit } as Work,
          message: 'Работа успешно создана',
        };
      }

      // Get the complete work with name
      const { data: completeWork, error: fetchError } = await supabase
        .from('works_library_with_names')
        .select('*')
        .eq('id', newWork.id)
        .maybeSingle();

      if (fetchError) {
        console.warn('⚠️ Warning: Could not fetch created work details:', fetchError);
        // Return basic data if view is not ready - this is NOT an error
        return {
          data: { ...newWork, name, unit } as Work,
          message: 'Работа успешно создана',
        };
      }

      if (!completeWork) {
        // View might not be updated yet, return basic data - this is NOT an error
        console.warn('⚠️ View not updated yet, returning basic data');
        return {
          data: { ...newWork, name, unit } as Work,
          message: 'Работа успешно создана',
        };
      }

      return {
        data: completeWork,
        message: 'Работа успешно создана',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create work'),
      };
    }
  },

  // Update work with potential name change
  async update(id: string, updates: WorkUpdate & { name?: string }): Promise<ApiResponse<Work>> {
    try {
      const { name, unit, ...workUpdates } = updates as any;

      // If name is being updated
      if (name) {
        // Get current work to find name_id
        const { data: currentWork, error: fetchError } = await supabase
          .from('works_library')
          .select('name_id')
          .eq('id', id)
          .single();

        if (fetchError) {
          return {
            error: handleSupabaseError(fetchError, 'Fetch work'),
          };
        }

        // Check if new name already exists
        const { data: existingName } = await supabase
          .from('work_names')
          .select('id')
          .eq('name', name)
          .maybeSingle();

        if (existingName && existingName.id !== currentWork.name_id) {
          // Use existing name
          workUpdates.name_id = existingName.id;
        } else if (!existingName) {
          // Create new name with unit
          const nameData: { name: string; unit?: string } = { name };
          if (unit) {
            nameData.unit = unit;
          }

          const { data: newName, error: nameError } = await supabase
            .from('work_names')
            .insert(nameData)
            .select('id')
            .single();

          if (nameError) {
            return {
              error: handleSupabaseError(nameError, 'Create work name'),
            };
          }

          workUpdates.name_id = newName.id;
        }
        // If name exists and is the same as current, no need to update name_id
      }

      // Update work
      const { error: updateError } = await supabase
        .from('works_library')
        .update(workUpdates)
        .eq('id', id);

      if (updateError) {
        return {
          error: handleSupabaseError(updateError, 'Update work'),
        };
      }

      // Get updated work with name
      const { data: updatedWork, error: fetchError } = await supabase
        .from('works_library_with_names')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        return {
          error: handleSupabaseError(fetchError, 'Fetch updated work'),
        };
      }

      return {
        data: updatedWork,
        message: 'Работа успешно обновлена',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update work'),
      };
    }
  },

  // Delete work (soft delete)
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('works_library')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete work'),
        };
      }

      return {
        data: null,
        message: 'Работа успешно удалена',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete work'),
      };
    }
  },

  // Get all work names for autocomplete
  async getNames(search?: string): Promise<ApiResponse<Array<{ id: string; name: string; unit: string }>>> {
    try {
      let query = supabase
        .from('work_names')
        .select('id, name, unit')
        .order('name');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get work names'),
        };
      }

      return {
        data: data || [],
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get work names'),
      };
    }
  },

  // Create only name (for simple mode)
  async createName(name: string, unit?: string): Promise<ApiResponse<{ id: string; name: string; unit?: string }>> {
    try {
      // Check if name already exists
      const { data: existing, error: checkError } = await supabase
        .from('work_names')
        .select('id, name, unit')
        .eq('name', name)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found

      // If we found an existing record, return it
      if (existing) {
        return {
          data: existing,
          message: 'Наименование уже существует',
        };
      }

      // Prepare insert data
      const insertData: { name: string; unit?: string } = { name };
      if (unit) {
        insertData.unit = unit;
      }

      // Create new name
      const { data, error } = await supabase
        .from('work_names')
        .insert(insertData)
        .select('id, name, unit')
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create work name'),
        };
      }

      return {
        data,
        message: 'Наименование работы создано',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create work name'),
      };
    }
  },

  // Update name (for simple mode)
  async updateName(id: string, name: string, unit?: string): Promise<ApiResponse<{ id: string; name: string; unit?: string }>> {
    try {
      // Check if new name already exists (excluding current record)
      const { data: existing } = await supabase
        .from('work_names')
        .select('id, name, unit')
        .eq('name', name)
        .neq('id', id)
        .maybeSingle();

      // If we found an existing record with different ID, return error
      if (existing) {
        return {
          error: 'Наименование уже существует',
        };
      }

      // Prepare update data
      const updateData: { name: string; unit?: string } = { name };
      if (unit !== undefined) {
        updateData.unit = unit;
      }

      // Update name
      const { data, error } = await supabase
        .from('work_names')
        .update(updateData)
        .eq('id', id)
        .select('id, name, unit')
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update work name'),
        };
      }

      return {
        data,
        message: 'Наименование работы обновлено',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update work name'),
      };
    }
  },

  // Delete name (for simple mode)
  async deleteName(id: string): Promise<ApiResponse<null>> {
    try {
      // Check if name is used by any works
      const { data: works, error: checkError } = await supabase
        .from('works_library')
        .select('id')
        .eq('name_id', id)
        .limit(1);

      if (checkError) {
        return {
          error: handleSupabaseError(checkError, 'Check work usage'),
        };
      }

      if (works && works.length > 0) {
        return {
          error: 'Нельзя удалить наименование, которое используется в работах',
        };
      }

      // Delete name
      const { error } = await supabase
        .from('work_names')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete work name'),
        };
      }

      return {
        data: null,
        message: 'Наименование работы удалено',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete work name'),
      };
    }
  },

  // Get all names with work count
  async getAllNames(): Promise<ApiResponse<Array<{ id: string; name: string; unit: string; work_count: number }>>> {
    try {
      // Get all names
      const { data: names, error: namesError } = await supabase
        .from('work_names')
        .select('id, name, unit')
        .order('name');

      if (namesError) {
        return {
          error: handleSupabaseError(namesError, 'Get work names'),
        };
      }

      // Get counts for each name
      const { data: works, error: worksError } = await supabase
        .from('works_library')
        .select('name_id');

      if (worksError) {
        return {
          error: handleSupabaseError(worksError, 'Get work counts'),
        };
      }

      // Count works for each name
      const countMap = new Map<string, number>();
      works?.forEach(w => {
        if (w.name_id) {
          countMap.set(w.name_id, (countMap.get(w.name_id) || 0) + 1);
        }
      });

      // Combine names with counts
      const result = names?.map(n => ({
        ...n,
        work_count: countMap.get(n.id) || 0,
      })) || [];

      return {
        data: result,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get all work names'),
      };
    }
  }
};