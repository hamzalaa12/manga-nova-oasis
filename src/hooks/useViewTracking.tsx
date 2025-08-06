import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useViewTracking = () => {
  const [viewedItems] = useState(() => new Set<string>());
  const sessionViews = useRef(new Set<string>());

  const trackMangaView = useCallback(async (mangaId: string) => {
    if (!mangaId || sessionViews.current.has(`manga-${mangaId}`)) return;

    sessionViews.current.add(`manga-${mangaId}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/track-view', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mangaId,
          type: 'manga'
        })
      });

      if (!response.ok) {
        // Try using supabase functions as fallback
        await supabase.functions.invoke('track-view', {
          body: { mangaId, type: 'manga' },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }
    } catch (error: any) {
      console.error('Error tracking manga view:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        mangaId,
        errorString: String(error),
        errorObject: error
      });
    }
  }, []);

  const trackChapterView = useCallback(async (chapterId: string, mangaId: string) => {
    if (!chapterId || sessionViews.current.has(`chapter-${chapterId}`)) return;

    sessionViews.current.add(`chapter-${chapterId}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Track manga view (chapters contribute to manga views for now)
      await supabase.functions.invoke('track-view', {
        body: { mangaId: mangaId, type: 'manga' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // Also increment chapter views count directly
      // First get the current count, then increment it
      const { data: currentChapter, error: fetchError } = await supabase
        .from('chapters')
        .select('views_count')
        .eq('id', chapterId)
        .single();

      if (fetchError) {
        console.error('Error fetching current chapter views:', fetchError);
        return;
      }

      const newViewsCount = (currentChapter?.views_count || 0) + 1;

      const { error: chapterError } = await supabase
        .from('chapters')
        .update({
          views_count: newViewsCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId);

      if (chapterError) {
        console.error('Error updating chapter views:', {
          message: chapterError?.message || 'Unknown error',
          code: chapterError?.code,
          details: chapterError?.details,
          hint: chapterError?.hint,
          chapterId,
          errorString: String(chapterError),
          errorObject: chapterError
        });
      }
    } catch (error: any) {
      console.error('Error tracking chapter view:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        chapterId,
        mangaId,
        errorString: String(error),
        errorObject: error
      });
    }
  }, []);

  return {
    trackMangaView,
    trackChapterView,
    viewedItems
  };
};
