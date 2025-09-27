import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type RestrictionType = 'comment_ban' | 'read_ban' | 'upload_ban' | 'complete_ban';

export interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: RestrictionType;
  reason: string;
  is_active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useUserRestrictions = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [restrictions, setRestrictions] = useState<UserRestriction[]>([]);

  // Load restrictions for admin users
  const loadAllRestrictions = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_restrictions')
        .select(`
          *,
          profiles!user_restrictions_user_id_fkey (
            display_name,
            email
          ),
          profiles!user_restrictions_created_by_fkey (
            display_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const formattedRestrictions = data.map(restriction => ({
          ...restriction,
          restriction_type: restriction.restriction_type as RestrictionType
        }));
        setRestrictions(formattedRestrictions);
      }
    } catch (error: any) {
      console.error('Error loading restrictions:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل قائمة القيود',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific restriction
  const checkUserRestriction = async (userId: string, restrictionType: RestrictionType): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_user_restriction', {
        user_uuid: userId,
        restriction_type_param: restrictionType
      });

      if (error) {
        console.error('Error checking restriction:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: JSON.stringify(error, null, 2)
        });
        return false;
      }

      return data || false;
    } catch (error: any) {
      console.error('Error in checkUserRestriction:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      return false;
    }
  };

  // Add restriction to user
  const addRestriction = async (
    userId: string, 
    restrictionType: RestrictionType, 
    reason: string,
    expiresAt?: string
  ): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      console.log('Adding restriction:', { userId, restrictionType, reason, expiresAt });

      const { data, error } = await supabase.rpc('add_user_restriction', {
        target_user_id: userId,
        restriction_type_param: restrictionType,
        reason_param: reason,
        expires_at_param: expiresAt || null
      });

      if (error) {
        console.error('Error adding restriction:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: JSON.stringify(error, null, 2)
        });
        throw error;
      }

      await loadAllRestrictions();

      const restrictionNames = {
        comment_ban: 'منع التعليق',
        read_ban: 'منع القراءة', 
        upload_ban: 'منع الرفع',
        complete_ban: 'حظر كامل'
      };

      toast({
        title: 'تم إضافة القيد',
        description: `تم تطبيق ${restrictionNames[restrictionType]} على المستخدم`
      });

      return true;
    } catch (error: any) {
      console.error('Error adding restriction:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: `فشل في إضافة القيد: ${error.message || 'خطأ غير معروف'}`,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Remove restriction from user
  const removeRestriction = async (userId: string, restrictionType: RestrictionType): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      const { data, error } = await supabase.rpc('remove_user_restriction', {
        target_user_id: userId,
        restriction_type_param: restrictionType
      });

      if (error) throw error;

      await loadAllRestrictions();

      const restrictionNames = {
        comment_ban: 'منع التعليق',
        read_ban: 'منع القراءة',
        upload_ban: 'منع الرفع', 
        complete_ban: 'الحظر الكامل'
      };

      toast({
        title: 'تم رفع القيد',
        description: `تم رفع ${restrictionNames[restrictionType]} عن المستخدم`
      });

      return true;
    } catch (error: any) {
      console.error('Error removing restriction:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      toast({
        title: 'خطأ',
        description: `فشل في رفع القيد: ${error.message || 'خطأ غير معروف'}`,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Get user's current restrictions
  const getUserRestrictions = async (userId: string): Promise<RestrictionType[]> => {
    try {
      const { data, error } = await supabase
        .from('user_restrictions')
        .select('restriction_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (error) {
        console.error('Error getting user restrictions:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: JSON.stringify(error, null, 2)
        });
        return [];
      }

      return data?.map(r => r.restriction_type as RestrictionType) || [];
    } catch (error: any) {
      console.error('Error in getUserRestrictions:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      return [];
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadAllRestrictions();
    }
  }, [user, isAdmin]);

  return {
    restrictions,
    loading,
    addRestriction,
    removeRestriction,
    checkUserRestriction,
    getUserRestrictions,
    refreshRestrictions: loadAllRestrictions
  };
};
