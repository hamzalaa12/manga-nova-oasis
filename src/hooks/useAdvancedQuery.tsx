import { useQuery, UseQueryOptions } from '@tanstack/react-query';

// Enhanced query hook with advanced caching strategies
export const useAdvancedQuery = <T = unknown>(
  queryKey: (string | number | boolean)[],
  queryFn: () => Promise<T>,
  options?: {
    staleTime?: number;
    gcTime?: number;
    priority?: 'high' | 'normal' | 'low';
    prefetch?: boolean;
  }
) => {
  const priority = options?.priority || 'normal';
  
  // Different caching strategies based on priority
  const cacheConfig = {
    high: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000,    // 30 minutes
    },
    normal: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 15 * 60 * 1000,    // 15 minutes
    },
    low: {
      staleTime: 2 * 60 * 1000,  // 2 minutes
      gcTime: 5 * 60 * 1000,     // 5 minutes
    }
  };

  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime || cacheConfig[priority].staleTime,
    gcTime: options?.gcTime || cacheConfig[priority].gcTime,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  } as UseQueryOptions<T>);
};

// Hook for prefetching data
export const usePrefetch = () => {
  const prefetchData = async (
    queryKey: (string | number | boolean)[],
    queryFn: () => Promise<any>,
    priority: 'high' | 'normal' | 'low' = 'low'
  ) => {
    // Implement prefetching logic here
    // This would typically use React Query's prefetchQuery
    return queryFn();
  };

  return { prefetchData };
};
