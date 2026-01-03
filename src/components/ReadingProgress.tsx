import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReadingProgressProps {
  mangaId: string;
  chapterId: string;
  pageNumber: number;
}

const ReadingProgress = ({ mangaId, chapterId, pageNumber }: ReadingProgressProps) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateProgress = async () => {
      try {
        const { data: existing } = await supabase
          .from('reading_progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('manga_id', mangaId)
          .eq('chapter_id', chapterId)
          .single();

        if (existing) {
          // تحديث التقدم الموجود
          await supabase
            .from('reading_progress')
            .update({
              page_number: pageNumber,
              last_read_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // إنشاء تقدم جديد
          await supabase
            .from('reading_progress')
            .insert({
              user_id: user.id,
              manga_id: mangaId,
              chapter_id: chapterId,
              page_number: pageNumber,
              last_read_at: new Date().toISOString()
            });
        }
      } catch (error: any) {
        console.error('خطأ في تحديث تقدم القراءة:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          mangaId,
          chapterId,
          pageNumber,
          userId: user?.id,
          errorString: String(error),
          errorObject: error
        });
      }
    };

    updateProgress();
  }, [user, mangaId, chapterId, pageNumber]);

  return null; // مكون صامت لا يعرض شيئاً
};

export default ReadingProgress;
