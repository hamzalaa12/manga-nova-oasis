import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { UserRole, getRoleDisplayName } from '@/types/user';

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
    if (!isAdmin) {
      console.log('loadUsers: User is not admin, skipping');
      return;
    }

    console.log('Loading users...');
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

      if (error) {
        const errorMessage = error?.message || error?.code || 'Unknown error';
        console.error('Error loading users from database:', errorMessage);
        throw error;
      }

      console.log(`Loaded ${data?.length || 0} users from database`);

      const usersWithBanInfo = data?.map(profile => ({
        ...profile,
        is_banned: profile.user_bans?.some((ban: any) => ban.is_active),
        ban_reason: profile.user_bans?.find((ban: any) => ban.is_active)?.reason,
        ban_expires_at: profile.user_bans?.find((ban: any) => ban.is_active)?.expires_at
      })) || [];

      console.log('Processed users with ban info:', usersWithBanInfo.length);
      const filteredUsers = usersWithBanInfo.filter(user => 
        user.role && ['user', 'beginner_fighter', 'elite_fighter', 'tribe_leader', 'admin', 'site_admin'].includes(user.role)
      ) as UserProfile[];
      setUsers(filteredUsers);
    } catch (error: any) {
      console.error('Error loading users:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
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
    if (!isAdmin || !user) {
      console.error('changeUserRole: User not admin or not logged in');
      return false;
    }

    console.log(`Changing user ${userId} role to ${newRole}`);

    try {
      // First verify the current user has permission
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!adminUser || !['admin', 'site_admin'].includes(adminUser.role)) {
        throw new Error('ليس لديك صلاحية لتغيير الأدوار');
      }

      console.log('Admin verification passed, proceeding with role update');

      // Try direct update first
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select('*');

      if (updateError) {
        console.error('Direct update failed:', updateError);
        
        // Try RPC as fallback
        const { error: rpcError } = await supabase.rpc('change_user_role', {
          user_uuid: userId,
          role_name: newRole
        });

        if (rpcError) {
          console.error('RPC also failed:', rpcError);
          throw new Error(`فشل في تحديث الرتبة: ${rpcError.message}`);
        }
        
        console.log('RPC update succeeded as fallback');
      } else {
        console.log('Direct update succeeded:', updateData);
      }

      // Verify the update worked
      const { data: verifiedUser, error: verifyError } = await supabase
        .from('profiles')
        .select('role, display_name, email')
        .eq('user_id', userId)
        .single();

      if (verifyError) {
        console.error('Verification failed:', verifyError);
      } else {
        console.log('Role update verified:', verifiedUser);
        if (verifiedUser.role !== newRole) {
          throw new Error(`فشل في حفظ التحديث. الرتبة الحالية: ${verifiedUser.role}`);
        }
      }

      // Update local state immediately
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.user_id === userId
            ? { ...u, role: newRole, updated_at: new Date().toISOString() }
            : u
        )
      );

      // Reload data after a delay
      setTimeout(async () => {
        await loadUsers();
      }, 1500);

      toast({
        title: 'تم تحديث الرتبة',
        description: `تم تغيير رتبة المستخدم إلى ${getRoleDisplayName(newRole)} بنجاح`
      });

      return true;
    } catch (error: any) {
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
      console.log('Attempting to delete user:', userId);

      // Use RPC function for complete user deletion
      const { data, error } = await supabase.rpc('delete_user_completely', {
        user_uuid: userId
      });

      if (error) {
        console.error('RPC deletion failed:', error);

        // Fallback: try manual deletion
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error('Auth deletion also failed:', deleteError);
          throw new Error(`فشل في حذف المستخدم: ${deleteError.message}`);
        }

        console.log('User deleted via auth admin');
      } else {
        console.log('User deleted via RPC:', data);
      }

      // Update local state immediately
      setUsers(prevUsers => prevUsers.filter(u => u.user_id !== userId));

      // Reload users to ensure consistency
      setTimeout(async () => {
        await loadUsers();
      }, 1000);

      toast({
        title: 'تم حذف المستخدم',
        description: 'تم حذف حساب المستخدم وجميع بياناته نهائياً'
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'خطأ',
        description: `فشل في حذف المستخدم: ${error.message || 'خطأ غير معروف'}`,
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
