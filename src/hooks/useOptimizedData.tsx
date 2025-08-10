import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PERFORMANCE_CONFIG } from "@/utils/performance";

// Hook محسن لجلب المانجا مع تخزين مؤقت ذكي
export const useOptimizedManga = (page: number = 1, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["manga-optimized", page],
    queryFn: async () => {
      const pageSize = PERFORMANCE_CONFIG.PAGE_SIZES.MANGA;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("manga")
        .select("id, slug, title, cover_image_url, rating, views_count, status, genre, updated_at, manga_type", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], totalCount: count || 0 };
    },
    staleTime: PERFORMANCE_CONFIG.CACHE_TIMES.MANGA,
    gcTime: PERFORMANCE_CONFIG.CACHE_TIMES.MANGA * 3,
    enabled,
  });
};

// Hook محسن لجلب الفصول مع تخزين مؤقت ذكي
export const useOptimizedChapters = (page: number = 1, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["chapters-optimized", page],
    queryFn: async () => {
      const pageSize = PERFORMANCE_CONFIG.PAGE_SIZES.CHAPTERS;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("chapters")
        .select(`
          id, chapter_number, title, created_at, views_count, is_premium,
          manga!inner (id, slug, title, cover_image_url, author)
        `, { count: "exact" })
        .eq("is_private", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], totalCount: count || 0 };
    },
    staleTime: PERFORMANCE_CONFIG.CACHE_TIMES.CHAPTERS,
    gcTime: PERFORMANCE_CONFIG.CACHE_TIMES.CHAPTERS * 3,
    enabled,
  });
};

// Hook للتحميل المسبق للصفحات التالية
export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  const prefetchManga = (page: number) => {
    queryClient.prefetchQuery({
      queryKey: ["manga-optimized", page],
      queryFn: async () => {
        const pageSize = PERFORMANCE_CONFIG.PAGE_SIZES.MANGA;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
          .from("manga")
          .select("id, slug, title, cover_image_url, rating, views_count, status, genre, updated_at, manga_type", { count: "exact" })
          .order("updated_at", { ascending: false })
          .range(from, to);

        if (error) throw error;
        return { data: data || [], totalCount: count || 0 };
      },
      staleTime: PERFORMANCE_CONFIG.CACHE_TIMES.MANGA,
    });
  };

  const prefetchChapters = (page: number) => {
    queryClient.prefetchQuery({
      queryKey: ["chapters-optimized", page],
      queryFn: async () => {
        const pageSize = PERFORMANCE_CONFIG.PAGE_SIZES.CHAPTERS;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await supabase
          .from("chapters")
          .select(`
            id, chapter_number, title, created_at, views_count, is_premium,
            manga!inner (id, slug, title, cover_image_url, author)
          `, { count: "exact" })
          .eq("is_private", false)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;
        return { data: data || [], totalCount: count || 0 };
      },
      staleTime: PERFORMANCE_CONFIG.CACHE_TIMES.CHAPTERS,
    });
  };

  return { prefetchManga, prefetchChapters };
};