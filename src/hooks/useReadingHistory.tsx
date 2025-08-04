import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ReadingProgressItem {
  id: string;
  chapter_id: string;
  manga_id: string;
  page_number: number;
  completed: boolean;
  last_read_at: string;
  created_at: string;
  updated_at: string;
  manga: {
    title: string;
    slug: string;
    cover_image_url: string;
    author: string;
  };
  chapter: {
    chapter_number: number;
    title: string;
  };
}

export interface ReadingStats {
  totalMangaRead: number;
  totalChaptersRead: number;
  totalReadingTime: number;
  favoriteGenres: string[];
  recentActivity: ReadingProgressItem[];
}

export const useReadingHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [readingHistory, setReadingHistory] = useState<ReadingProgressItem[]>([]);
  const [stats, setStats] = useState<ReadingStats>({
    totalMangaRead: 0,
    totalChaptersRead: 0,
    totalReadingTime: 0,
    favoriteGenres: [],
    recentActivity: []
  });

  useEffect(() => {
    if (user) {
      loadReadingHistory();
      loadReadingStats();
    }
  }, [user]);

  const loadReadingHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select(`
          *,
          manga (
            title,
            slug,
            cover_image_url,
            author
          ),
          chapters!reading_progress_chapter_id_fkey (
            chapter_number,
            title
          )
        `)
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setReadingHistory(data || []);
    } catch (error: any) {
      console.error('Error loading reading history:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
        error: error
      });

      toast({
        title: 'خطأ',
        description: `فشل في تحميل سجل القراءة: ${error?.message || 'خطأ غير معروف'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReadingStats = async () => {
    if (!user) return;

    try {
      // Get total manga read
      const { count: mangaCount } = await supabase
        .from('reading_progress')
        .select('manga_id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get total chapters read
      const { count: chaptersCount } = await supabase
        .from('reading_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      // Get recent activity
      const { data: recentData } = await supabase
        .from('reading_progress')
        .select(`
          *,
          manga (
            title,
            slug,
            cover_image_url,
            author
          ),
          chapters!reading_progress_chapter_id_fkey (
            chapter_number,
            title
          )
        `)
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false })
        .limit(10);

      // Get favorite genres (most read)
      const { data: genreData } = await supabase
        .from('reading_progress')
        .select(`
          manga (
            genre
          )
        `)
        .eq('user_id', user.id);

      const genreCounts: { [key: string]: number } = {};
      genreData?.forEach(item => {
        if (item.manga?.genre) {
          item.manga.genre.forEach((genre: string) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        }
      });

      const favoriteGenres = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([genre]) => genre);

      setStats({
        totalMangaRead: mangaCount || 0,
        totalChaptersRead: chaptersCount || 0,
        totalReadingTime: 0, // Will be implemented later
        favoriteGenres,
        recentActivity: recentData || []
      });
    } catch (error) {
      console.error('Error loading reading stats:', error);
    }
  };

  const updateReadingProgress = async (
    mangaId: string,
    chapterId: string,
    pageNumber: number,
    completed: boolean = false
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          manga_id: mangaId,
          chapter_id: chapterId,
          page_number: pageNumber,
          completed,
          last_read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,manga_id,chapter_id'
        });

      if (error) {
        throw error;
      }

      // Reload data
      loadReadingHistory();
      loadReadingStats();
    } catch (error: any) {
      console.error('Error updating reading progress:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        mangaId,
        chapterId,
        userId: user?.id,
        error: error
      });

      // لا نعرض toast هنا لأن هذا يحدث في الخلفية
      // فقط نسجل الخطأ
    }
  };

  const clearReadingHistory = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reading_progress')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setReadingHistory([]);
      setStats({
        totalMangaRead: 0,
        totalChaptersRead: 0,
        totalReadingTime: 0,
        favoriteGenres: [],
        recentActivity: []
      });

      toast({
        title: 'تم مسح السجل',
        description: 'تم مسح سجل القراءة بنجاح'
      });
    } catch (error) {
      console.error('Error clearing reading history:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في مسح سجل القراءة',
        variant: 'destructive'
      });
    }
  };

  return {
    readingHistory,
    stats,
    loading,
    updateReadingProgress,
    clearReadingHistory,
    refreshHistory: loadReadingHistory,
    refreshStats: loadReadingStats
  };
};
