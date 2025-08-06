import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useViewTracking = () => {
  const [viewedItems] = useState(() => new Set<string>());
  const sessionViews = useRef(new Set<string>());

  const trackMangaView = useCallback(async (mangaId: string) => {
    if (!mangaId || sessionViews.current.has(`manga-${mangaId}`)) return;
    
    sessionViews.current.add(`manga-${mangaId}`);
    
    try {
      await supabase.rpc('track_manga_view', { manga_uuid: mangaId });
    } catch (error) {
      console.error('Error tracking manga view:', error);
    }
  }, []);

  const trackChapterView = useCallback(async (chapterId: string) => {
    if (!chapterId || sessionViews.current.has(`chapter-${chapterId}`)) return;
    
    sessionViews.current.add(`chapter-${chapterId}`);
    
    try {
      await supabase.rpc('track_chapter_view', { chapter_uuid: chapterId });
    } catch (error) {
      console.error('Error tracking chapter view:', error);
    }
  }, []);

  return {
    trackMangaView,
    trackChapterView,
    viewedItems
  };
};