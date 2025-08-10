import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { PERFORMANCE_CONFIG } from '@/utils/performance';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  cacheType?: 'manga' | 'chapters' | 'profiles' | 'static';
}

export const useOptimizedQuery = <T,>({
  queryKey,
  queryFn,
  cacheType = 'manga',
  ...options
}: OptimizedQueryOptions<T>) => {
  const cacheTime = PERFORMANCE_CONFIG.CACHE_TIMES[cacheType.toUpperCase() as keyof typeof PERFORMANCE_CONFIG.CACHE_TIMES] || PERFORMANCE_CONFIG.CACHE_TIMES.MANGA;
  
  return useQuery({
    queryKey,
    queryFn,
    staleTime: cacheTime,
    gcTime: cacheTime * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: PERFORMANCE_CONFIG.NETWORK.RETRY_COUNT,
    ...options,
  });
};