import { supabase } from '../client';
import { PostgrestError } from '@supabase/supabase-js';

// Типы данных
export interface CostNode {
  id: string;
  parent_id: string | null;
  kind: 'group' | 'item';
  name: string;
  code?: string;
  unit_id?: string;
  location_id?: string;
  sort_order: number;
  path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Дополнительные поля для UI
  children?: CostNode[];
  unit?: { id: string; code: string; title: string };
  location?: { id: string; code?: string; title?: string };
}

export interface CreateCostNodeDto {
  parent_id?: string | null;
  kind: 'group' | 'item';
  name: string;
  code?: string;
  unit_id?: string;
  location_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCostNodeDto {
  parent_id?: string | null;
  name?: string;
  code?: string;
  unit_id?: string | null;
  location_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// Получение всех узлов дерева
export async function getCostNodesTree(): Promise<{ data: CostNode[] | null; error: PostgrestError | null }> {
  console.log('🚀 [getCostNodesTree] Fetching cost nodes tree');
  
  const { data, error } = await supabase
    .from('cost_nodes')
    .select(`
      *,
      unit:units(id, code, title),
      location:location(id, code, title)
    `)
    .order('path');

  if (error) {
    console.error('❌ [getCostNodesTree] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [getCostNodesTree] Fetched nodes:', data?.length);
  
  // Преобразуем плоский список в дерево
  const tree = buildTree(data || []);
  return { data: tree, error: null };
}

// Получение узлов первого уровня
export async function getRootCostNodes(): Promise<{ data: CostNode[] | null; error: PostgrestError | null }> {
  console.log('🚀 [getRootCostNodes] Fetching root nodes');
  
  const { data, error } = await supabase
    .from('cost_nodes')
    .select(`
      *,
      unit:units(id, code, title),
      location:location(id, code, title)
    `)
    .is('parent_id', null)
    .order('sort_order');

  if (error) {
    console.error('❌ [getRootCostNodes] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [getRootCostNodes] Fetched root nodes:', data?.length);
  return { data, error: null };
}

// Получение дочерних узлов
export async function getChildCostNodes(parentId: string): Promise<{ data: CostNode[] | null; error: PostgrestError | null }> {
  console.log('🚀 [getChildCostNodes] Fetching children for:', parentId);
  
  const { data, error } = await supabase
    .from('cost_nodes')
    .select(`
      *,
      unit:units(id, code, title),
      location:location(id, code, title)
    `)
    .eq('parent_id', parentId)
    .order('sort_order');

  if (error) {
    console.error('❌ [getChildCostNodes] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [getChildCostNodes] Fetched children:', data?.length);
  return { data, error: null };
}

// Получение одного узла
export async function getCostNode(id: string): Promise<{ data: CostNode | null; error: PostgrestError | null }> {
  console.log('🚀 [getCostNode] Fetching node:', id);
  
  const { data, error } = await supabase
    .from('cost_nodes')
    .select(`
      *,
      unit:units(id, code, title),
      location:location(id, code, title)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ [getCostNode] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [getCostNode] Fetched node:', data?.name);
  return { data, error: null };
}

// Создание узла
export async function createCostNode(node: CreateCostNodeDto): Promise<{ data: CostNode | null; error: PostgrestError | null }> {
  console.log('🚀 [createCostNode] Creating node:', node);
  
  const { data, error } = await supabase
    .from('cost_nodes')
    .insert({
      ...node,
      is_active: node.is_active ?? true,
      sort_order: node.sort_order ?? 100
    })
    .select(`
      *,
      unit:units(id, code, title),
      location:location(id, code, title)
    `)
    .single();

  if (error) {
    console.error('❌ [createCostNode] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [createCostNode] Created node:', data?.name);
  return { data, error: null };
}

// Обновление узла
export async function updateCostNode(id: string, updates: UpdateCostNodeDto): Promise<{ data: CostNode | null; error: PostgrestError | null }> {
  console.log('🚀 [updateCostNode] Updating node:', id, updates);
  
  const { data, error } = await supabase
    .from('cost_nodes')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      unit:units(id, code, title),
      location:location(id, code, title)
    `)
    .single();

  if (error) {
    console.error('❌ [updateCostNode] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [updateCostNode] Updated node:', data?.name);
  return { data, error: null };
}

// Удаление узла (каскадно удалит всех потомков)
export async function deleteCostNode(id: string): Promise<{ error: PostgrestError | null }> {
  console.log('🚀 [deleteCostNode] Deleting node:', id);
  
  const { error } = await supabase
    .from('cost_nodes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ [deleteCostNode] Error:', error);
    return { error };
  }

  console.log('✅ [deleteCostNode] Deleted node');
  return { error: null };
}

// Перемещение узла
export async function moveCostNode(
  nodeId: string, 
  newParentId: string | null, 
  newSortOrder?: number
): Promise<{ data: CostNode | null; error: PostgrestError | null }> {
  console.log('🚀 [moveCostNode] Moving node:', { nodeId, newParentId, newSortOrder });
  
  const updates: UpdateCostNodeDto = {
    parent_id: newParentId,
    ...(newSortOrder !== undefined && { sort_order: newSortOrder })
  };

  return updateCostNode(nodeId, updates);
}

// Получение единиц измерения
export async function getUnits(): Promise<{ data: any[] | null; error: PostgrestError | null }> {
  console.log('🚀 [getUnits] Fetching units');
  
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('title');

  if (error) {
    console.error('❌ [getUnits] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [getUnits] Fetched units:', data?.length);
  return { data, error: null };
}

// Получение локализаций
export async function getLocations(): Promise<{ data: any[] | null; error: PostgrestError | null }> {
  console.log('🚀 [getLocations] Fetching locations');
  
  const { data, error } = await supabase
    .from('location')
    .select('*')
    .order('title');

  if (error) {
    console.error('❌ [getLocations] Error:', error);
    return { data: null, error };
  }

  console.log('✅ [getLocations] Fetched locations:', data?.length);
  return { data, error: null };
}

// Вспомогательная функция для построения дерева
function buildTree(nodes: CostNode[]): CostNode[] {
  const nodeMap = new Map<string, CostNode>();
  const rootNodes: CostNode[] = [];

  // Создаем Map для быстрого доступа
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Строим дерево
  nodes.forEach(node => {
    const currentNode = nodeMap.get(node.id)!;
    if (node.parent_id === null) {
      rootNodes.push(currentNode);
    } else {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(currentNode);
      }
    }
  });

  return rootNodes;
}

// Импорт данных из Excel
export async function importCostNodesFromExcel(data: any[]): Promise<{ 
  success: number; 
  failed: number; 
  errors: string[] 
}> {
  console.log('🚀 [importCostNodesFromExcel] Importing nodes:', data.length);
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      const node: CreateCostNodeDto = {
        kind: row.type === 'Категория' ? 'group' : 'item',
        name: row.name,
        code: row.code,
        parent_id: row.parent_id || null,
        sort_order: row.sort_order || 100,
        is_active: row.is_active !== false
      };

      // Если это элемент, добавляем единицу измерения и локализацию
      if (node.kind === 'item') {
        if (row.unit_code) {
          // Находим или создаем единицу измерения
          const { data: unit } = await supabase
            .from('units')
            .select('id')
            .eq('code', row.unit_code)
            .single();
          
          if (unit) {
            node.unit_id = unit.id;
          }
        }

        if (row.location_title) {
          // Находим или создаем локализацию
          const { data: location } = await supabase
            .from('location')
            .select('id')
            .eq('title', row.location_title)
            .single();
          
          if (location) {
            node.location_id = location.id;
          }
        }
      }

      const { error } = await createCostNode(node);
      
      if (error) {
        failed++;
        errors.push(`Строка ${row.row_number || 'unknown'}: ${error.message}`);
      } else {
        success++;
      }
    } catch (err: any) {
      failed++;
      errors.push(`Строка ${row.row_number || 'unknown'}: ${err.message}`);
    }
  }

  console.log('✅ [importCostNodesFromExcel] Import complete:', { success, failed });
  return { success, failed, errors };
}