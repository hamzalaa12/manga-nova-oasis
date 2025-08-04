import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { UserRole } from '@/types/user';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  is_banned?: boolean;
  ban_reason?: string;
  ban_expires_at?: string;
}

export interface BanInfo {
  id: string;
  user_id: string;
  ban_type: string;
  reason: string;
  is_active: boolean;
  expires_at: string | null;
  banned_by: string;
  created_at: string;
}

export const useUserManagement = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bans, setBans] = useState<BanInfo[]>([]);

  useEffect(() => {
    if (user && isAdmin) {
      loadUsers();
      loadBans();
    }
  }, [user, isAdmin]);

  const loadUsers = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_bans!user_bans_user_id_fkey (
            id,
            ban_type,
            reason,
            is_active,
            expires_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithBanInfo = data?.map(profile => ({
        ...profile,
        is_banned: profile.user_bans?.some((ban: any) => ban.is_active),
        ban_reason: profile.user_bans?.find((ban: any) => ban.is_active)?.reason,
        ban_expires_at: profile.user_bans?.find((ban: any) => ban.is_active)?.expires_at
      })) || [];

      setUsers(usersWithBanInfo);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل قائمة المستخدمين',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBans = async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('user_bans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBans(data || []);
    } catch (error) {
      console.error('Error loading bans:', error);
    }
  };

  const changeUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      // محاولة استخدام RPC أولاً
      const { error: rpcError } = await supabase.rpc('change_user_role', {
        user_uuid: userId,
        role_name: newRole
      });

      if (rpcError) {
        // إذا فشل RPC، استخدم update مباشرة
        console.warn('RPC failed, trying direct update:', rpcError);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: newRole,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          throw updateError;
        }
      }

      await loadUsers();

      toast({
        title: 'تم تحديث الرتبة',
        description: 'تم تغيير رتبة المستخدم بنجاح'
      });

      return true;
    } catch (error) {
      console.error('Error changing user role:', error);
      toast({
        title: 'خطأ',
        description: `فشل في تغيير رتبة المستخدم: ${error.message || 'خطأ غير معروف'}`,
        variant: 'destructive'
      });
      return false;
    }
  };

  const banUser = async (
    userId: string, 
    reason: string, 
    banType: 'temporary' | 'permanent' = 'temporary',
    expiresAt?: string
  ): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      const { error } = await supabase
        .from('user_bans')
        .insert({
          user_id: userId,
          banned_by: user.id,
          reason,
          ban_type: banType,
          expires_at: expiresAt || null,
          is_active: true
        });

      if (error) throw error;

      await loadUsers();
      await loadBans();

      toast({
        title: 'تم حظر المستخدم',
        description: `تم حظر المستخدم ${banType === 'permanent' ? 'نهائياً' : 'مؤقتاً'}`
      });

      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حظر المستخدم',
        variant: 'destructive'
      });
      return false;
    }
  };

  const unbanUser = async (userId: string): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      const { error } = await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      await loadUsers();
      await loadBans();

      toast({
        title: 'تم رفع الحظر',
        description: 'تم رفع الحظر عن المستخدم بنجاح'
      });

      return true;
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في رفع الحظر عن المستخدم',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      // Delete user profile (this should cascade to delete related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      await loadUsers();

      toast({
        title: 'تم حذف المستخدم',
        description: 'تم حذف حساب المستخدم وجميع بياناته'
      });

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المستخدم',
        variant: 'destructive'
      });
      return false;
    }
  };

  const getUserStats = async (userId: string) => {
    try {
      const [
        { count: commentsCount },
        { count: favoritesCount },
        { count: chaptersRead }
      ] = await Promise.all([
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('reading_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('completed', true)
      ]);

      return {
        commentsCount: commentsCount || 0,
        favoritesCount: favoritesCount || 0,
        chaptersRead: chaptersRead || 0
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        commentsCount: 0,
        favoritesCount: 0,
        chaptersRead: 0
      };
    }
  };

  return {
    users,
    bans,
    loading,
    changeUserRole,
    banUser,
    unbanUser,
    deleteUser,
    getUserStats,
    refreshUsers: loadUsers,
    refreshBans: loadBans
  };
};
