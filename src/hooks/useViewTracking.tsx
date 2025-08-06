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
    } catch (error) {
      console.error('Error tracking manga view:', error);
    }
  }, []);

  const trackChapterView = useCallback(async (chapterId: string, mangaId: string) => {
    if (!chapterId || sessionViews.current.has(`chapter-${chapterId}`)) return;

    sessionViews.current.add(`chapter-${chapterId}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Track both chapter and manga views
      const requests = [
        fetch('/api/track-view', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mangaId: chapterId,
            type: 'chapter'
          })
        }),
        fetch('/api/track-view', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mangaId: mangaId,
            type: 'manga'
          })
        })
      ];

      const responses = await Promise.allSettled(requests);

      // If fetch fails, try supabase functions as fallback
      responses.forEach(async (response, index) => {
        if (response.status === 'rejected' || !response.value.ok) {
          try {
            const body = index === 0
              ? { mangaId: chapterId, type: 'chapter' }
              : { mangaId: mangaId, type: 'manga' };

            await supabase.functions.invoke('track-view', {
              body,
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
          } catch (fallbackError) {
            console.error('Fallback view tracking failed:', fallbackError);
          }
        }
      });
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
