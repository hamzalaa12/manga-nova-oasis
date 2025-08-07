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

  const loadReadingHistory = async (): Promise<boolean> => {
    if (!user) return false;

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
          chapters (
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

      if (data) {
        const formattedHistory = data.map(item => ({
          ...item,
          chapter: item.chapters
        }));
        setReadingHistory(formattedHistory);
      }
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || 'خطأ غير معروف';

      toast({
        title: 'خطأ',
        description: `فشل في تحميل سجل القراءة: ${errorMessage}`,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadReadingStats = async (): Promise<boolean> => {
    if (!user) return false;

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
          chapters (
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
        recentActivity: recentData ? recentData.map(item => ({
          ...item,
          chapter: item.chapters
        })) : []
      });
      return true;
    } catch (error: any) {
      // Silent error handling for stats
      return false;
    }
  };

  const updateReadingProgress = async (
    mangaId: string,
    chapterId: string,
    pageNumber: number,
    completed: boolean = false
  ): Promise<boolean> => {
    if (!user) {
      console.warn('Cannot update reading progress: user not logged in');
      return false;
    }

    try {

      // First verify that the user has a profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        return false;
      }

      if (!profileData) {
        return false;
      }


      // Then verify that the manga and chapter exist
      const { data: chapterData, error: chapterCheckError } = await supabase
        .from('chapters')
        .select('id, manga_id')
        .eq('id', chapterId)
        .eq('manga_id', mangaId)
        .single();

      if (chapterCheckError) {
        return false;
      }

      if (!chapterData) {
        return false;
      }


      const upsertData = {
        user_id: user.id,
        manga_id: mangaId,
        chapter_id: chapterId,
        page_number: pageNumber,
        completed,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };


      const { error, data: upsertResult } = await supabase
        .from('reading_progress')
        .upsert(upsertData, {
          onConflict: 'user_id,chapter_id'
        });

      if (error) {
        throw error;
      }


      // Reload data in background (silently)
      loadReadingHistory().catch(() => {});
      loadReadingStats().catch(() => {});

      return true;
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        mangaId,
        chapterId,
        userId: user?.id,
        errorType: typeof error,
        errorString: String(error),
        errorJSON: (() => {
          try {
            return JSON.stringify(error, null, 2);
          } catch {
            return 'Could not stringify error';
          }
        })()
      };

      console.error('Error updating reading progress:', errorDetails);
      console.error('Raw error object:', error);

      // Return false to indicate failure
      return false;
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
        title: '��م مسح السجل',
        description: 'تم مسح سجل القراءة بنجاح'
      });
    } catch (error: any) {
      console.error('Error clearing reading history:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        errorString: String(error),
        errorObject: error
      });
      toast({
        title: 'خطأ',
        description: 'فشل في مسح سجل القرا��ة',
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
