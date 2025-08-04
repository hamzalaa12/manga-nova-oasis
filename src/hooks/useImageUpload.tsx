import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useImageUpload = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return null;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'خطأ',
        description: 'يجب أن يكون الملف صورة',
        variant: 'destructive'
      });
      return null;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت',
        variant: 'destructive'
      });
      return null;
    }

    setUploading(true);
    try {
      // تحويل الصورة إلى base64 كحل بديل
      const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      };

      let avatarUrl: string;

      try {
        // محاولة رفع الصورة إلى Supabase Storage أولاً
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-content')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.warn('Supabase storage upload failed, using base64 fallback:', uploadError);
          // استخدام base64 كبديل
          avatarUrl = await convertToBase64(file);
        } else {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('user-content')
            .getPublicUrl(filePath);
          avatarUrl = publicUrlData.publicUrl;
        }
      } catch (storageError) {
        console.warn('Storage failed, using base64 fallback:', storageError);
        // استخدام base64 كبديل
        avatarUrl = await convertToBase64(file);
      }

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh profile data
      await refreshProfile();

      toast({
        title: 'تم رفع الصورة',
        description: 'تم تحديث صورتك الشخصية بنجاح'
      });

      return avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في رفع الصورة الشخصية',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول أولاً',
        variant: 'destructive'
      });
      return false;
    }

    try {
      // Update user profile to remove avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Refresh profile data
      await refreshProfile();

      toast({
        title: 'تم حذف الصورة',
        description: 'تم حذف صورتك الشخصية'
      });

      return true;
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الصورة الشخصية',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    uploadAvatar,
    removeAvatar,
    uploading
  };
};
