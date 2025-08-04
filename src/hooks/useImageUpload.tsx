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
        description: 'يجب تس��يل الدخول أولاً',
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
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // تحقق من وجود bucket أو إنشاؤه
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'user-content');

      if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('user-content', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        });

        if (bucketError && !bucketError.message.includes('already exists')) {
          console.error('Error creating bucket:', bucketError);
        }
      }

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // إذا فشل الرفع، جرب bucket بديل
        if (uploadError.message.includes('not found')) {
          // استخدم bucket افتراضي أو حاول إنشاء واحد آخر
          const fallbackPath = `public/${fileName}`;
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('user-content')
            .upload(fallbackPath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (fallbackError) {
            throw fallbackError;
          }
        } else {
          throw uploadError;
        }
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

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
