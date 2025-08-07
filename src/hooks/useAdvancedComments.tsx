import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { UserRole } from '@/types/user';

export interface AdvancedComment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  manga_id: string;
  chapter_id: string | null;
  parent_id: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  is_spoiler: boolean;
  formatting_style: any;
  rich_content: any;
  deleted_by: string | null;
  deleted_reason: string | null;
  user: {
    id: string;
    display_name: string | null;
    email: string | null;
    role: UserRole;
    avatar_url: string | null;
  };
  replies?: AdvancedComment[];
  reply_count?: number;
  reactions: {
    like: number;
    dislike: number;
    love: number;
    laugh: number;
    angry: number;
    sad: number;
  };
  user_reaction?: string | null;
  can_edit: boolean;
  can_delete: boolean;
  can_pin: boolean;
  can_report: boolean;
}

export interface CommentPermissions {
  canComment: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  canBan: boolean;
  canModerate: boolean;
}

export const useAdvancedComments = (mangaId: string, chapterId?: string) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<AdvancedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<CommentPermissions>({
    canComment: false,
    canEdit: false,
    canDelete: false,
    canPin: false,
    canBan: false,
    canModerate: false
  });

  useEffect(() => {
    loadComments();
    updatePermissions();
  }, [mangaId, chapterId, user, userRole]);

  const updatePermissions = () => {
    if (!user) {
      setPermissions({
        canComment: false,
        canEdit: false,
        canDelete: false,
        canPin: false,
        canBan: false,
        canModerate: false
      });
      return;
    }

    const role = userRole as UserRole;
    const newPermissions: CommentPermissions = {
      canComment: true, // جميع المستخدمين يمكنهم التعليق
      canEdit: true, // يمكن تعديل التعليقات الخاصة
      canDelete: ['elite_fighter', 'tribe_leader', 'admin', 'site_admin'].includes(role),
      canPin: ['tribe_leader', 'admin', 'site_admin'].includes(role),
      canBan: ['elite_fighter', 'tribe_leader', 'admin', 'site_admin'].includes(role),
      canModerate: ['admin', 'site_admin'].includes(role)
    };

    setPermissions(newPermissions);
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comments')
        .select(`
          *,
          user:profiles!comments_user_id_fkey (
            id,
            display_name,
            email,
            role,
            avatar_url
          )
        `)
        .eq('manga_id', mangaId)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true });

      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      } else {
        query = query.is('chapter_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // جلب التفاعلات لكل تعليق
      const commentsWithReactions = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: reactions } = await supabase
            .from('comment_reactions')
            .select('reaction_type, user_id')
            .eq('comment_id', comment.id);

          // حساب عدد كل نوع تفاعل
          const reactionCounts = {
            like: 0,
            dislike: 0,
            love: 0,
            laugh: 0,
            angry: 0,
            sad: 0
          };

          let userReaction = null;

          (reactions || []).forEach((reaction) => {
            if (reactionCounts.hasOwnProperty(reaction.reaction_type)) {
              reactionCounts[reaction.reaction_type as keyof typeof reactionCounts]++;
            }
            if (user && reaction.user_id === user.id) {
              userReaction = reaction.reaction_type;
            }
          });

          return {
            ...comment,
            reactions: reactionCounts,
            user_reaction: userReaction,
            can_edit: canEditComment(comment),
            can_delete: canDeleteComment(comment),
            can_pin: permissions.canPin,
            can_report: !!user && comment.user_id !== user.id
          };
        })
      );

      // تنظيم التعليقات حسب الهيكل الهرمي
      const organizedComments = organizeComments(commentsWithReactions);
      setComments(organizedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل التعليقات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const organizeComments = (commentData: any[]): AdvancedComment[] => {
    const commentMap = new Map<string, AdvancedComment>();
    const rootComments: AdvancedComment[] = [];

    // تحويل البيانات إلى كائنات التعليقات
    commentData.forEach(item => {
      const comment: AdvancedComment = {
        ...item,
        replies: [],
        reply_count: 0
      };
      commentMap.set(item.id, comment);
    });

    // تنظيم التعليقات الهرمية
    commentMap.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
          parent.reply_count = (parent.reply_count || 0) + 1;
        }
      } else {
        rootComments.push(comment);
      }
    });

    // ترتيب التعليقات المثبتة أولاً
    return rootComments.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  };

  const canEditComment = (comment: any): boolean => {
    if (!user) return false;
    return comment.user_id === user.id || permissions.canModerate;
  };

  const canDeleteComment = (comment: any): boolean => {
    if (!user) return false;
    return comment.user_id === user.id || permissions.canDelete;
  };

  const addComment = async (
    content: string, 
    parentId?: string, 
    isSpoiler: boolean = false,
    formatting: any = {}
  ): Promise<boolean> => {
    if (!user || !permissions.canComment) {
      toast({
        title: 'خطأ',
        description: 'ليس لديك صلاحية للتعليق',
        variant: 'destructive'
      });
      return false;
    }

    if (!content.trim()) {
      toast({
        title: 'خطأ',
        description: 'لا يمكن أن يكون التعليق فارغاً',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: content.trim(),
          user_id: user.id,
          manga_id: mangaId,
          chapter_id: chapterId || null,
          parent_id: parentId || null,
          is_spoiler: isSpoiler,
          formatting_style: formatting
        });

      if (error) throw error;

      await loadComments();
      
      toast({
        title: 'تم إضافة التعليق',
        description: 'تم إضافة تعليقك بنجاح'
      });

      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة التعليق',
        variant: 'destructive'
      });
      return false;
    }
  };

  const addReaction = async (commentId: string, reactionType: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'خطأ',
        description: 'يجب تسجيل الدخول للتفاعل',
        variant: 'destructive'
      });
      return false;
    }

    try {
      // حذف التفاعل السابق إن وجد
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      // إضافة التفاعل الجديد
      const { error } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType
        });

      if (error) throw error;

      await loadComments();
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة التفاعل',
        variant: 'destructive'
      });
      return false;
    }
  };

  const editComment = async (
    commentId: string, 
    newContent: string,
    isSpoiler: boolean = false,
    formatting: any = {}
  ): Promise<boolean> => {
    if (!user) return false;

    if (!newContent.trim()) {
      toast({
        title: 'خطأ',
        description: 'لا يمكن أن يكون التعليق فارغاً',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: newContent.trim(),
          is_spoiler: isSpoiler,
          formatting_style: formatting,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      await loadComments();
      
      toast({
        title: 'تم تحديث التعليق',
        description: 'تم تحديث تعليقك بنجاح'
      });

      return true;
    } catch (error) {
      console.error('Error editing comment:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث التعليق',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteComment = async (commentId: string, reason?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      await loadComments();
      
      toast({
        title: 'تم حذف التعليق',
        description: 'تم حذف التعليق بنجاح'
      });

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف التعليق',
        variant: 'destructive'
      });
      return false;
    }
  };

  const pinComment = async (commentId: string, pinned: boolean = true): Promise<boolean> => {
    if (!permissions.canPin) return false;

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          is_pinned: pinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      await loadComments();
      
      toast({
        title: pinned ? 'تم تثبيت التعليق' : 'تم إلغاء تثبيت التعليق',
        description: `تم ${pinned ? 'تثبيت' : 'إلغاء تثبيت'} التعليق بنجاح`
      });

      return true;
    } catch (error) {
      console.error('Error pinning comment:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة التثبيت',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    comments,
    loading,
    permissions,
    addComment,
    addReaction,
    editComment,
    deleteComment,
    pinComment,
    refreshComments: loadComments
  };
};