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

      // Use Supabase functions directly
      await supabase.functions.invoke('track-view', {
        body: { mangaId, type: 'manga' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

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
    if (!chapterId || !mangaId) {
      console.warn('Cannot track chapter view: missing chapterId or mangaId', { chapterId, mangaId });
      return;
    }

    if (sessionViews.current.has(`chapter-${chapterId}`)) {
      return;
    }

    sessionViews.current.add(`chapter-${chapterId}`);

    // تشغيل التتبع في الخلفية دون انتظار لتحسين الأداء
    const performTracking = async () => {
      try {
        // تتبع مشاهدة المانجا
        await supabase.functions.invoke('track-view', {
          body: { mangaId, type: 'manga' }
        });
      } catch {}

      try {
        // تحديث عداد مشاهدات الفصل
        const { data } = await supabase
          .from('chapters')
          .select('views_count')
          .eq('id', chapterId)
          .single();

        const newCount = (data?.views_count || 0) + 1;
        
        await supabase
          .from('chapters')
          .update({ 
            views_count: newCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', chapterId);
      } catch {}
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        performTracking();
      });
    } else {
      setTimeout(() => {
        performTracking();
      }, 100);
    }
  }, []);

  return {
    trackMangaView,
    trackChapterView,
    viewedItems
  };
};
