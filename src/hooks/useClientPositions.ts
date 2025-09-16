import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientPositionsApi } from '../lib/supabase/api';
import type {
  ClientPositionFilters,
  PaginationOptions,
  ClientPositionSummary,
  ClientPositionInsert,
  ClientPositionUpdate
} from '../lib/supabase/types';

// Query keys factory

// Контроль логирования
const ENABLE_DETAILED_LOGGING = false;
const debugLog = (message: string, ...args: any[]) => {
  if (ENABLE_DETAILED_LOGGING) {
    console.log(message, ...args);
  }
};

export const clientPositionKeys = {
  all: ['client-positions'] as const,
  lists: () => [...clientPositionKeys.all, 'list'] as const,
  list: (tenderId: string, filters?: ClientPositionFilters, pagination?: PaginationOptions) =>
    [...clientPositionKeys.lists(), tenderId, filters, pagination] as const,
  optimized: (tenderId: string, filters?: ClientPositionFilters, pagination?: PaginationOptions) =>
    [...clientPositionKeys.all, 'optimized', tenderId, filters, pagination] as const,
  infinite: (tenderId: string, filters?: ClientPositionFilters) =>
    [...clientPositionKeys.all, 'infinite', tenderId, filters] as const,
  detail: (id: string) => [...clientPositionKeys.all, 'detail', id] as const,
  withAdditional: (tenderId: string) => [...clientPositionKeys.all, 'with-additional', tenderId] as const,
};

/**
 * Hook for fetching paginated client positions with caching
 */
export function useClientPositions(
  tenderId: string,
  filters: ClientPositionFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 50 },
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  return useQuery({
    queryKey: clientPositionKeys.list(tenderId, filters, pagination),
    queryFn: async () => {
      const result = await clientPositionsApi.getByTenderId(tenderId, filters, pagination);

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    enabled: !!tenderId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Hook for fetching optimized client positions with BOQ aggregations
 */
export function useClientPositionsOptimized(
  tenderId: string,
  filters: ClientPositionFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 50 },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: clientPositionKeys.optimized(tenderId, filters, pagination),
    queryFn: async () => {
      const result = await clientPositionsApi.getByTenderIdOptimized(tenderId, filters, pagination);

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    enabled: !!tenderId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 minutes (longer cache for aggregated data)
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook for infinite scrolling client positions
 */
export function useClientPositionsInfinite(
  tenderId: string,
  filters: ClientPositionFilters = {},
  options?: {
    enabled?: boolean;
    pageSize?: number;
  }
) {
  const pageSize = options?.pageSize ?? 50;

  return useInfiniteQuery({
    queryKey: clientPositionKeys.infinite(tenderId, filters),
    queryFn: async ({ pageParam }) => {
      debugLog('📄 Fetching infinite client positions page:', { tenderId, filters, pageParam });

      const result = await clientPositionsApi.getByTenderIdInfinite(
        tenderId,
        pageParam,
        pageSize,
        filters
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!tenderId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    initialPageParam: undefined as { position_number: number; id: string } | undefined,
  });
}

/**
 * Hook for fetching single client position
 */
export function useClientPosition(
  id: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: clientPositionKeys.detail(id),
    queryFn: async () => {
      const result = await clientPositionsApi.getById(id);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    enabled: !!id && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching positions with additional works
 */
export function useClientPositionsWithAdditional(
  tenderId: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: clientPositionKeys.withAdditional(tenderId),
    queryFn: async () => {
      const result = await clientPositionsApi.getPositionsWithAdditional(tenderId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    enabled: !!tenderId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for creating client position
 */
export function useCreateClientPosition(tenderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionData: ClientPositionInsert) => {
      const result = await clientPositionsApi.create(positionData);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: () => {
      // Invalidate and refetch positions queries for this tender
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.lists()
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.optimized(tenderId)
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.infinite(tenderId)
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.withAdditional(tenderId)
      });
    },
  });
}

/**
 * Hook for updating client position
 */
export function useUpdateClientPosition(tenderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ClientPositionUpdate }) => {
      debugLog('🔄 Updating client position:', { id, updates });
      const result = await clientPositionsApi.update(id, updates);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: (updatedPosition) => {
      // Update the detail cache
      queryClient.setQueryData(
        clientPositionKeys.detail(updatedPosition.id),
        updatedPosition
      );

      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.lists()
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.optimized(tenderId)
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.infinite(tenderId)
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.withAdditional(tenderId)
      });
    },
  });
}

/**
 * Hook for deleting client position
 */
export function useDeleteClientPosition(tenderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await clientPositionsApi.delete(id);

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (_, deletedId) => {
      // Remove from detail cache
      queryClient.removeQueries({
        queryKey: clientPositionKeys.detail(deletedId)
      });

      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.lists()
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.optimized(tenderId)
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.infinite(tenderId)
      });
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.withAdditional(tenderId)
      });
    },
  });
}

/**
 * Hook for bulk updating commercial costs
 */
export function useUpdateCommercialCosts(tenderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      materialsCost,
      worksCost
    }: {
      id: string;
      materialsCost: number;
      worksCost: number;
    }) => {
      debugLog('🔄 Updating commercial costs:', { id, materialsCost, worksCost });
      const result = await clientPositionsApi.updateCommercialCosts(id, materialsCost, worksCost);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: (updatedPosition) => {
      // Update relevant caches
      queryClient.setQueryData(
        clientPositionKeys.detail(updatedPosition.id),
        updatedPosition
      );

      // Invalidate list queries to reflect updated costs
      queryClient.invalidateQueries({
        queryKey: clientPositionKeys.optimized(tenderId)
      });
    },
  });
}

/**
 * Hook for prefetching positions (useful for performance optimization)
 */
export function usePrefetchClientPositions() {
  const queryClient = useQueryClient();

  return {
    prefetchPositions: (
      tenderId: string,
      filters: ClientPositionFilters = {},
      pagination: PaginationOptions = { page: 1, limit: 50 }
    ) => {
      queryClient.prefetchQuery({
        queryKey: clientPositionKeys.list(tenderId, filters, pagination),
        queryFn: async () => {
          const result = await clientPositionsApi.getByTenderId(tenderId, filters, pagination);
          if (result.error) throw new Error(result.error);
          return result;
        },
        staleTime: 5 * 60 * 1000,
      });
    },

    prefetchOptimizedPositions: (
      tenderId: string,
      filters: ClientPositionFilters = {},
      pagination: PaginationOptions = { page: 1, limit: 50 }
    ) => {
      queryClient.prefetchQuery({
        queryKey: clientPositionKeys.optimized(tenderId, filters, pagination),
        queryFn: async () => {
          const result = await clientPositionsApi.getByTenderIdOptimized(tenderId, filters, pagination);
          if (result.error) throw new Error(result.error);
          return result;
        },
        staleTime: 10 * 60 * 1000,
      });
    }
  };
}