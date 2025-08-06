import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { UserRole, getRoleDisplayName } from '@/types/user';

export const useRoleUpdate = () => {
  const { toast } = useToast();

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      console.log(`Starting role update for user ${userId} to ${newRole}`);

      // الطريقة الأبسط: استخدام supabase مباشرة بدون checks معقدة
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        console.error('Role update error:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: JSON.stringify(error, null, 2)
        });
        
        // إذا فشل، جرب مع RPC
        const { error: rpcError } = await supabase.rpc('change_user_role', {
          user_uuid: userId,
          role_name: newRole
        });

        if (rpcError) {
          console.error('RPC error:', {
            message: rpcError?.message || 'Unknown error',
            code: rpcError?.code,
            details: rpcError?.details,
            hint: rpcError?.hint,
            error: JSON.stringify(rpcError, null, 2)
          });
          throw new Error(rpcError.message || 'فشل في تحديث الرتبة');
        }
      }

      console.log('Role update completed successfully');
      
      toast({
        title: 'تم تحديث الرتبة',
        description: `تم تغيير الرتبة إلى ${getRoleDisplayName(newRole)} بنجاح`
      });

      return true;
    } catch (error: any) {
      console.error('Final role update error:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: JSON.stringify(error, null, 2)
      });
      
      toast({
        title: 'خطأ',
        description: `فشل في تحديث الرتبة: ${error.message || 'خطأ غير معروف'}`,
        variant: 'destructive'
      });

      return false;
    }
  };

  return { updateUserRole };
};
