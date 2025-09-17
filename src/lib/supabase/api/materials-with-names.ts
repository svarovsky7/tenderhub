import { supabase } from '../client';
import type {
  Material,
  MaterialInsert,
  MaterialUpdate,
  MaterialFilters,
  ApiResponse,
  PaginatedResponse,
} from '../types';
import { handleSupabaseError, applyPagination, type PaginationOptions } from './utils';

// Enhanced Materials API for working with separate name tables
export const materialsWithNamesApi = {
  // Get all materials with names joined
  async getAll(
    filters: MaterialFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Material>> {
    try {
      // Use view that joins with material_names
      let query = supabase
        .from('materials_library_with_names')
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
          error: handleSupabaseError(error, 'Get materials'),
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
        error: handleSupabaseError(error, 'Get materials'),
      };
    }
  },

  // Create material with name
  async create(material: MaterialInsert & { name: string }): Promise<ApiResponse<Material>> {
    try {
      // Start transaction
      const { name, unit, ...materialData } = material as any;

      // First, check if name exists in material_names
      let nameId: string;

      // Check if name already exists
      const { data: existingName, error: checkError } = await supabase
        .from('material_names')
        .select('id')
        .eq('name', name)
        .maybeSingle();

      if (checkError) {
        return {
          error: handleSupabaseError(checkError, 'Check material name'),
        };
      }

      if (existingName) {
        // Name exists, use it
        nameId = existingName.id;
      } else {
        // Name doesn't exist - this should be an error in "configure" mode
        // User should only select existing names from autocomplete
        return {
          error: 'Выбранное наименование не существует в библиотеке. Пожалуйста, выберите существующее наименование из списка или сначала создайте его в режиме "Создать материал".',
        };
      }

      // Create material with name_id
      const { data: newMaterial, error: materialError } = await supabase
        .from('materials_library')
        .insert({ ...materialData, name_id: nameId })
        .select('*')
        .single();

      if (materialError) {
        return {
          error: handleSupabaseError(materialError, 'Create material'),
        };
      }

      // Get the complete material with name
      const { data: completeMaterial, error: fetchError } = await supabase
        .from('materials_library_with_names')
        .select('*')
        .eq('id', newMaterial!.id)
        .maybeSingle();

      if (fetchError) {
        console.warn('⚠️ Warning: Could not fetch created material details:', fetchError);
        // Return basic data if view is not ready - this is NOT an error
        return {
          data: { ...newMaterial!, name, unit } as Material,
          message: 'Материал успешно создан',
        };
      }

      if (!completeMaterial) {
        // View might not be updated yet, return basic data - this is NOT an error
        console.warn('⚠️ View not updated yet, returning basic data');
        return {
          data: { ...newMaterial!, name, unit } as Material,
          message: 'Материал успешно создан',
        };
      }

      return {
        data: completeMaterial,
        message: 'Material created successfully',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create material'),
      };
    }
  },

  // Update material with potential name change
  async update(id: string, updates: MaterialUpdate & { name?: string }): Promise<ApiResponse<Material>> {
    try {
      const { name, unit, ...materialUpdates } = updates as any;

      // If name is being updated
      if (name) {
        // Get current material to find name_id
        const { data: currentMaterial, error: fetchError } = await supabase
          .from('materials_library')
          .select('name_id')
          .eq('id', id)
          .single();

        if (fetchError) {
          return {
            error: handleSupabaseError(fetchError, 'Fetch material'),
          };
        }

        // Check if new name already exists
        const { data: existingName } = await supabase
          .from('material_names')
          .select('id')
          .eq('name', name)
          .maybeSingle();

        if (existingName && existingName.id !== currentMaterial.name_id) {
          // Use existing name
          materialUpdates.name_id = existingName.id;
        } else if (!existingName) {
          // Create new name with unit
          const nameData: { name: string; unit?: string } = { name };
          if (unit) {
            nameData.unit = unit;
          }

          const { data: newName, error: nameError } = await supabase
            .from('material_names')
            .insert(nameData)
            .select('id')
            .single();

          if (nameError) {
            return {
              error: handleSupabaseError(nameError, 'Create material name'),
            };
          }

          materialUpdates.name_id = newName.id;
        }
        // If name exists and is the same as current, no need to update name_id
      }

      // Update material
      const { error: updateError } = await supabase
        .from('materials_library')
        .update(materialUpdates)
        .eq('id', id);

      if (updateError) {
        return {
          error: handleSupabaseError(updateError, 'Update material'),
        };
      }

      // Get updated material with name
      const { data: updatedMaterial, error: fetchError } = await supabase
        .from('materials_library_with_names')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        return {
          error: handleSupabaseError(fetchError, 'Fetch updated material'),
        };
      }

      return {
        data: updatedMaterial,
        message: 'Материал успешно обновлен',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update material'),
      };
    }
  },

  // Delete material (soft delete)
  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await supabase
        .from('materials_library')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete material'),
        };
      }

      return {
        data: null,
        message: 'Материал успешно удален',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete material'),
      };
    }
  },

  // Get all material names for autocomplete
  async getNames(search?: string): Promise<ApiResponse<Array<{ id: string; name: string; unit: string }>>> {
    try {
      let query = supabase
        .from('material_names')
        .select('id, name, unit')
        .order('name');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return {
          error: handleSupabaseError(error, 'Get material names'),
        };
      }

      return {
        data: data || [],
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get material names'),
      };
    }
  },

  // Create only name (for simple mode)
  async createName(name: string, unit?: string): Promise<ApiResponse<{ id: string; name: string; unit?: string }>> {
    try {
      // Check if name already exists
      const { data: existing, error: checkError } = await supabase
        .from('material_names')
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
        .from('material_names')
        .insert(insertData)
        .select('id, name, unit')
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Create material name'),
        };
      }

      return {
        data,
        message: 'Наименование материала создано',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Create material name'),
      };
    }
  },

  // Update name (for simple mode)
  async updateName(id: string, name: string, unit?: string): Promise<ApiResponse<{ id: string; name: string; unit?: string }>> {
    try {
      // Check if new name already exists (excluding current record)
      const { data: existing } = await supabase
        .from('material_names')
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
        .from('material_names')
        .update(updateData)
        .eq('id', id)
        .select('id, name, unit')
        .single();

      if (error) {
        return {
          error: handleSupabaseError(error, 'Update material name'),
        };
      }

      return {
        data,
        message: 'Наименование материала обновлено',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Update material name'),
      };
    }
  },

  // Delete name (for simple mode)
  async deleteName(id: string): Promise<ApiResponse<null>> {
    try {
      // Check if name is used by any materials
      const { data: materials, error: checkError } = await supabase
        .from('materials_library')
        .select('id')
        .eq('name_id', id)
        .limit(1);

      if (checkError) {
        return {
          error: handleSupabaseError(checkError, 'Check material usage'),
        };
      }

      if (materials && materials.length > 0) {
        return {
          error: 'Нельзя удалить наименование, которое используется в материалах',
        };
      }

      // Delete name
      const { error } = await supabase
        .from('material_names')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          error: handleSupabaseError(error, 'Delete material name'),
        };
      }

      return {
        data: null,
        message: 'Наименование материала удалено',
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Delete material name'),
      };
    }
  },

  // Get all names with material count
  async getAllNames(): Promise<ApiResponse<Array<{ id: string; name: string; unit: string; material_count: number }>>> {
    try {
      // Get all names
      const { data: names, error: namesError } = await supabase
        .from('material_names')
        .select('id, name, unit')
        .order('name');

      if (namesError) {
        return {
          error: handleSupabaseError(namesError, 'Get material names'),
        };
      }

      // Get counts for each name
      const { data: materials, error: materialsError } = await supabase
        .from('materials_library')
        .select('name_id');

      if (materialsError) {
        return {
          error: handleSupabaseError(materialsError, 'Get material counts'),
        };
      }

      // Count materials for each name
      const countMap = new Map<string, number>();
      materials?.forEach(m => {
        if (m.name_id) {
          countMap.set(m.name_id, (countMap.get(m.name_id) || 0) + 1);
        }
      });

      // Combine names with counts
      const result = names?.map(n => ({
        ...n,
        material_count: countMap.get(n.id) || 0,
      })) || [];

      return {
        data: result,
      };
    } catch (error) {
      return {
        error: handleSupabaseError(error, 'Get all material names'),
      };
    }
  }
};