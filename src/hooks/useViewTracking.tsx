import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useViewTracking = () => {
  const { user } = useAuth();

  const trackMangaView = async (mangaId: string) => {
    try {
      console.log('🔍 Tracking manga view for:', mangaId);

      // Use RPC function for reliable tracking
      console.log('📞 Calling RPC: track_manga_view with params:', { manga_uuid: mangaId });
      const { error } = await supabase.rpc('track_manga_view', {
        manga_uuid: mangaId
      });

      if (error) {
        console.log('🚨 Error tracking manga view:');
        console.log('  Message:', error?.message || 'No message');
        console.log('  Code:', error?.code || 'No code');
        console.log('  Details:', error?.details || 'No details');
        console.log('  Hint:', error?.hint || 'No hint');
        console.log('  Full error object:', error);
        console.log('  Stringified:', JSON.stringify(error, null, 2));
        console.log('  Error type:', typeof error);
        console.log('  Error constructor:', error?.constructor?.name || 'Unknown');
        
        // Fallback: get current count and increment
        try {
          const { data: currentData, error: fetchError } = await supabase
            .from('manga')
            .select('views_count')
            .eq('id', mangaId)
            .single();

          if (fetchError) throw fetchError;

          const currentCount = currentData?.views_count || 0;
          const { error: updateError } = await supabase
            .from('manga')
            .update({ views_count: currentCount + 1 })
            .eq('id', mangaId);

          if (updateError) {
            console.error('Fallback update failed:', {
              message: updateError?.message || 'Unknown error',
              code: updateError?.code,
              details: updateError?.details,
              hint: updateError?.hint,
              error: updateError
            });
          } else {
            console.log('✅ Manga view tracked via fallback');
          }
        } catch (fallbackError: any) {
          console.error('Fallback failed:', {
            message: fallbackError?.message || 'Unknown error',
            code: fallbackError?.code,
            details: fallbackError?.details,
            hint: fallbackError?.hint,
            error: fallbackError
          });
        }
      } else {
        console.log('✅ Manga view tracked successfully');
      }
    } catch (error: any) {
      console.error('Error in trackMangaView:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stringified: JSON.stringify(error, null, 2),
        error: error
      });
    }
  };

  const trackChapterView = async (chapterId: string) => {
    try {
      console.log('🔍 Tracking chapter view for:', chapterId);

      // Use RPC function for reliable tracking
      console.log('📞 Calling RPC: track_chapter_view with params:', { chapter_uuid: chapterId });
      const { error } = await supabase.rpc('track_chapter_view', {
        chapter_uuid: chapterId
      });

      if (error) {
        console.error('Error tracking chapter view:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          stringified: JSON.stringify(error, null, 2),
          error: error
        });
        
        // Fallback: get current count and increment
        try {
          const { data: currentData, error: fetchError } = await supabase
            .from('chapters')
            .select('views_count')
            .eq('id', chapterId)
            .single();

          if (fetchError) throw fetchError;

          const currentCount = currentData?.views_count || 0;
          const { error: updateError } = await supabase
            .from('chapters')
            .update({ views_count: currentCount + 1 })
            .eq('id', chapterId);

          if (updateError) {
            console.error('Fallback update failed:', {
              message: updateError?.message || 'Unknown error',
              code: updateError?.code,
              details: updateError?.details,
              hint: updateError?.hint,
              error: updateError
            });
          } else {
            console.log('✅ Chapter view tracked via fallback');
          }
        } catch (fallbackError: any) {
          console.error('Fallback failed:', {
            message: fallbackError?.message || 'Unknown error',
            code: fallbackError?.code,
            details: fallbackError?.details,
            hint: fallbackError?.hint,
            error: fallbackError
          });
        }
      } else {
        console.log('✅ Chapter view tracked successfully');
      }
    } catch (error: any) {
      console.error('Error in trackChapterView:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stringified: JSON.stringify(error, null, 2),
        error: error
      });
    }
  };

  const getViewsCount = async (id: string, type: 'manga' | 'chapter') => {
    try {
      const table = type === 'manga' ? 'manga' : 'chapters';
      const { data, error } = await supabase
        .from(table)
        .select('views_count')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error getting ${type} views:`, {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: error
        });
        return 0;
      }

      return data?.views_count || 0;
    } catch (error: any) {
      console.error(`Error in getViewsCount for ${type}:`, {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: error
      });
      return 0;
    }
  };

  return {
    trackMangaView,
    trackChapterView,
    getViewsCount
  };
};
