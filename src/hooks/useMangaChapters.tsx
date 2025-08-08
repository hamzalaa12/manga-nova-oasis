import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  is_private: boolean;
}

interface UseMangaChaptersProps {
  mangaId: string;
  enabled?: boolean;
}

const fetchMangaChapters = async (mangaId: string): Promise<Chapter[]> => {
  if (!mangaId) throw new Error('Manga ID is required');
  
  const { data, error } = await supabase
    .from('chapters')
    .select('id, chapter_number, title, created_at, is_private')
    .eq('manga_id', mangaId)
    .eq('is_private', false)
    .order('chapter_number', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const useMangaChapters = ({ mangaId, enabled = true }: UseMangaChaptersProps) => {
  return useQuery({
    queryKey: ['manga-chapters', mangaId],
    queryFn: () => fetchMangaChapters(mangaId),
    enabled: enabled && !!mangaId,
    staleTime: 10 * 60 * 1000, // 10 minutes - chapters don't change often
    gcTime: 30 * 60 * 1000,    // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for prefetching chapters
export const usePrefetchMangaChapters = () => {
  const prefetchChapters = async (mangaId: string) => {
    if (!mangaId) return;
    
    // This would typically use React Query's prefetchQuery
    try {
      await fetchMangaChapters(mangaId);
    } catch (error) {
      // Silent error for prefetching
    }
  };

  return { prefetchChapters };
};
