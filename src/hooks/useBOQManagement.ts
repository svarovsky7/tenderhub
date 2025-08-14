import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { 
  boqApi, 
  clientPositionsApi, 
  workMaterialLinksApi,
  materialsApi,
  worksApi 
} from '../lib/supabase/api';
import type { BOQItem, ClientPosition, Material, Work } from '../lib/supabase/types';

interface BOQStats {
  totalWorks: number;
  totalMaterials: number;
  totalCost: number;
  avgWorkCost: number;
  avgMaterialCost: number;
  costByCategory: Record<string, number>;
  itemsByPosition: Record<string, number>;
}

interface UseBOQManagementOptions {
  tenderId: string | null;
  enableRealtime?: boolean;
  autoRefetchInterval?: number;
}

export const useBOQManagement = (options: UseBOQManagementOptions) => {
  const { tenderId, enableRealtime = false, autoRefetchInterval = 0 } = options;
  const queryClient = useQueryClient();
  
  // Local state for optimistic updates
  const [optimisticItems, setOptimisticItems] = useState<Map<string, BOQItem>>(new Map());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'work' | 'material'>('all');

  // Fetch client positions for the tender
  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['client-positions', tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      console.log('📡 Loading client positions for tender:', tenderId);
      
      const response = await clientPositionsApi.getByTender(tenderId);
      if (response.error) {
        console.error('❌ Error loading positions:', response.error);
        throw new Error(response.error);
      }
      
      console.log('✅ Loaded positions:', response.data?.length);
      return response.data || [];
    },
    enabled: !!tenderId,
    refetchInterval: autoRefetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch BOQ items for the tender
  const { 
    data: boqItems = [], 
    isLoading: boqLoading,
    refetch: refetchBOQ 
  } = useQuery({
    queryKey: ['boq-items', tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      console.log('📡 Loading BOQ items for tender:', tenderId);
      
      const response = await boqApi.getByTender(tenderId);
      if (response.error) {
        console.error('❌ Error loading BOQ items:', response.error);
        throw new Error(response.error);
      }
      
      console.log('✅ Loaded BOQ items:', response.data?.length);
      return response.data || [];
    },
    enabled: !!tenderId,
    refetchInterval: autoRefetchInterval,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch work-material links
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['work-material-links', tenderId],
    queryFn: async () => {
      if (!tenderId) return [];
      console.log('📡 Loading work-material links for tender:', tenderId);
      
      // Get all positions first
      const positionsResponse = await clientPositionsApi.getByTender(tenderId);
      if (positionsResponse.error || !positionsResponse.data) return [];
      
      // Get links for all positions
      const allLinks = [];
      for (const position of positionsResponse.data) {
        const linksResponse = await workMaterialLinksApi.getByPosition(position.id);
        if (linksResponse.data) {
          allLinks.push(...linksResponse.data);
        }
      }
      
      console.log('✅ Loaded links:', allLinks.length);
      return allLinks;
    },
    enabled: !!tenderId && positions.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate BOQ statistics
  const stats = useMemo<BOQStats>(() => {
    console.log('📊 Calculating BOQ statistics...');
    
    const workItems = boqItems.filter(item => item.item_type === 'work');
    const materialItems = boqItems.filter(item => item.item_type === 'material');
    
    const totalWorks = workItems.length;
    const totalMaterials = materialItems.length;
    
    const totalWorksCost = workItems.reduce((sum, item) => 
      sum + (item.quantity * item.unit_rate), 0
    );
    
    const totalMaterialsCost = materialItems.reduce((sum, item) => 
      sum + (item.quantity * item.unit_rate), 0
    );
    
    const totalCost = totalWorksCost + totalMaterialsCost;
    const avgWorkCost = totalWorks > 0 ? totalWorksCost / totalWorks : 0;
    const avgMaterialCost = totalMaterials > 0 ? totalMaterialsCost / totalMaterials : 0;
    
    // Group costs by category (using item_type for now)
    const costByCategory: Record<string, number> = {};
    boqItems.forEach(item => {
      const category = item.item_type;
      costByCategory[category] = (costByCategory[category] || 0) + (item.quantity * item.unit_rate);
    });
    
    // Count items by position
    const itemsByPosition: Record<string, number> = {};
    boqItems.forEach(item => {
      if (item.client_position_id) {
        itemsByPosition[item.client_position_id] = (itemsByPosition[item.client_position_id] || 0) + 1;
      }
    });
    
    return {
      totalWorks,
      totalMaterials,
      totalCost,
      avgWorkCost,
      avgMaterialCost,
      costByCategory,
      itemsByPosition
    };
  }, [boqItems]);

  // Add BOQ item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: Partial<BOQItem>) => {
      console.log('🚀 Adding BOQ item:', data);
      if (!tenderId) throw new Error('No tender selected');
      
      const response = await boqApi.create({
        ...data,
        tender_id: tenderId
      } as any);
      
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onMutate: async (newItem) => {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = { ...newItem, id: tempId } as BOQItem;
      setOptimisticItems(prev => new Map(prev).set(tempId, optimisticItem));
      
      return { tempId };
    },
    onSuccess: (data, variables, context) => {
      console.log('✅ BOQ item added successfully');
      message.success('Элемент успешно добавлен');
      
      // Remove optimistic item
      if (context?.tempId) {
        setOptimisticItems(prev => {
          const next = new Map(prev);
          next.delete(context.tempId);
          return next;
        });
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['boq-items', tenderId] });
    },
    onError: (error, variables, context) => {
      console.error('❌ Error adding BOQ item:', error);
      message.error('Ошибка при добавлении элемента');
      
      // Remove optimistic item
      if (context?.tempId) {
        setOptimisticItems(prev => {
          const next = new Map(prev);
          next.delete(context.tempId);
          return next;
        });
      }
    }
  });

  // Update BOQ item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BOQItem> }) => {
      console.log('🔄 Updating BOQ item:', id, updates);
      const response = await boqApi.update(id, updates);
      
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic update
      const currentItem = boqItems.find(item => item.id === id);
      if (currentItem) {
        const optimisticItem = { ...currentItem, ...updates };
        setOptimisticItems(prev => new Map(prev).set(id, optimisticItem));
      }
      
      return { id };
    },
    onSuccess: () => {
      console.log('✅ BOQ item updated successfully');
      message.success('Элемент успешно обновлен');
      queryClient.invalidateQueries({ queryKey: ['boq-items', tenderId] });
    },
    onError: (error, variables) => {
      console.error('❌ Error updating BOQ item:', error);
      message.error('Ошибка при обновлении элемента');
      
      // Remove optimistic update
      setOptimisticItems(prev => {
        const next = new Map(prev);
        next.delete(variables.id);
        return next;
      });
    }
  });

  // Delete BOQ items mutation
  const deleteItemsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      console.log('🗑️ Deleting BOQ items:', ids);
      
      const results = await Promise.all(
        ids.map(id => boqApi.delete(id))
      );
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} items`);
      }
      
      return results;
    },
    onSuccess: (data, ids) => {
      console.log('✅ BOQ items deleted successfully');
      message.success(`${ids.length} элемент(ов) удалено`);
      queryClient.invalidateQueries({ queryKey: ['boq-items', tenderId] });
      setSelectedItems(new Set());
    },
    onError: (error) => {
      console.error('❌ Error deleting BOQ items:', error);
      message.error('Ошибка при удалении элементов');
    }
  });

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    let items = [...boqItems, ...Array.from(optimisticItems.values())];
    
    // Apply type filter
    if (filterType !== 'all') {
      items = items.filter(item => item.item_type === filterType);
    }
    
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.description?.toLowerCase().includes(search) ||
        item.item_number?.toLowerCase().includes(search)
      );
    }
    
    return items;
  }, [boqItems, optimisticItems, filterType, searchTerm]);

  // Grouped items by client position
  const groupedItems = useMemo(() => {
    const groups = new Map<string, BOQItem[]>();
    
    filteredItems.forEach(item => {
      const positionId = item.client_position_id || 'no-position';
      const group = groups.get(positionId) || [];
      group.push(item);
      groups.set(positionId, group);
    });
    
    return groups;
  }, [filteredItems]);

  // Selection handlers
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Batch operations
  const deleteSelected = useCallback(() => {
    const ids = Array.from(selectedItems);
    if (ids.length > 0) {
      deleteItemsMutation.mutate(ids);
    }
  }, [selectedItems, deleteItemsMutation]);

  // Export functionality
  const exportToExcel = useCallback(async () => {
    console.log('📤 Exporting BOQ to Excel...');
    // Implementation would go here
    message.info('Экспорт в разработке');
  }, [boqItems]);

  return {
    // Data
    positions,
    boqItems: filteredItems,
    groupedItems,
    links,
    stats,
    
    // Loading states
    isLoading: positionsLoading || boqLoading || linksLoading,
    positionsLoading,
    boqLoading,
    linksLoading,
    
    // Selection
    selectedItems,
    toggleItemSelection,
    selectAll,
    clearSelection,
    
    // Filters
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    
    // Mutations
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteSelected,
    isAdding: addItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemsMutation.isPending,
    
    // Actions
    refetch: refetchBOQ,
    exportToExcel
  };
};