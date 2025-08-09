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
    if (!user) {
      console.error('No user found for profile update');
      return false;
    }

    setLoading(true);
    try {
      console.log('Updating profile for user:', user.id, 'with data:', updates);

      // First, let's verify the user exists in profiles table
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', user.id)
        .single();

      if (checkError) {
        console.error('Error checking existing profile:', {
          message: checkError?.message || 'Unknown error',
          code: checkError?.code,
          details: checkError?.details,
          hint: checkError?.hint,
          error: checkError
        });
        throw new Error('لم يتم العثور على الملف الشخصي');
      }

      console.log('Existing profile found:', existingProfile);

      // Update the profile
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select('*');

      if (error) {
        console.error('Update profile error:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: error
        });
        throw error;
      }

      console.log('Profile update result:', data);

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (verifyError) {
        const errorMessage = verifyError?.message || verifyError?.code || 'Unknown error';
      console.error('Verification error:', errorMessage);
      } else {
        console.log('Updated profile verified:', verifyData);
      }

      // إعادة تحميل بيانات الملف الشخصي
      await refreshProfile();

      toast({
        title: 'تم تحديث الملف الشخصي',
        description: 'تم ��فظ التغييرات بنجاح'
      });

      return true;
    } catch (error: any) {
      console.error('خطأ في تحديث الملف ال��خصي:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: `فشل في تحديث الملف الشخصي: ${error.message || 'خطأ غير معروف'}`,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
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

      return true;
    } catch (error) {
      console.error('خطأ في تغيير كلمة المرور:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير كلمة المرور',
        variant: 'destructive'
      });
      return false;
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
