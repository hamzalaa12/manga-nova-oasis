import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          created_at,
          manga:manga_id (
            id,
            title,
            cover_image_url,
            slug,
            author,
            rating
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('خطأ في جلب المفضلة:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (mangaId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          manga_id: mangaId
        });

      if (error) throw error;

      toast({
        title: 'تمت الإضافة للمفضلة',
        description: 'تم إضافة المانجا لقائمة المفضلة'
      });

      fetchFavorites();
    } catch (error) {
      console.error('خطأ في إضافة للمفضلة:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة المانجا للمفضلة',
        variant: 'destructive'
      });
    }
  };

  const removeFromFavorites = async (mangaId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('manga_id', mangaId);

      if (error) throw error;

      toast({
        title: 'تم الحذف من المفضلة',
        description: 'تم حذف المانجا من قائمة المفضلة'
      });

      fetchFavorites();
    } catch (error) {
      console.error('خطأ في حذف من المفضلة:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المانجا من المفضلة',
        variant: 'destructive'
      });
    }
  };

  const isFavorite = async (mangaId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('خطأ في فحص المفضلة:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  return {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    refetch: fetchFavorites
  };
};