import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RestrictionType } from './useUserRestrictions';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [restrictions, setRestrictions] = useState<RestrictionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkUserRestrictions();
    } else {
      setRestrictions([]);
      setLoading(false);
    }
  }, [user]);

  const checkUserRestrictions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_restrictions')
        .select('restriction_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (error) {
        console.error('Error checking user restrictions:', error);
        setRestrictions([]);
      } else {
        const userRestrictions = data?.map(r => r.restriction_type as RestrictionType) || [];
        setRestrictions(userRestrictions);
      }
    } catch (error) {
      console.error('Error in checkUserRestrictions:', error);
      setRestrictions([]);
    } finally {
      setLoading(false);
    }
  };

  const canComment = () => {
    return !restrictions.includes('comment_ban') && !restrictions.includes('complete_ban');
  };

  const canRead = () => {
    return !restrictions.includes('read_ban') && !restrictions.includes('complete_ban');
  };

  const canUpload = () => {
    return !restrictions.includes('upload_ban') && !restrictions.includes('complete_ban');
  };

  const hasRestriction = (restrictionType: RestrictionType) => {
    return restrictions.includes(restrictionType);
  };

  const isCompletelyBanned = () => {
    return restrictions.includes('complete_ban');
  };

  return {
    restrictions,
    loading,
    canComment,
    canRead,
    canUpload,
    hasRestriction,
    isCompletelyBanned,
    refreshRestrictions: checkUserRestrictions
  };
};
