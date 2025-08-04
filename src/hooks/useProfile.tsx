import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useProfile = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const updateProfile = async (updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // إعادة تحميل بيانات الملف الشخصي
      await refreshProfile();

      toast({
        title: 'تم تحديث الملف الشخصي',
        description: 'تم حفظ التغييرات بنجاح'
      });

      return true;
    } catch (error) {
      console.error('خطأ في تحديث الملف الشخصي:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الملف الشخصي',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'تم تغيير كلمة المرور',
        description: 'تم تغيير كلمة المرور بنجاح'
      });
    } catch (error) {
      console.error('خطأ في تغيير كلمة المرور:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير كلمة المرور',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    updateProfile,
    changePassword,
    loading
  };
};
