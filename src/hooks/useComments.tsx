import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { UserRole } from '@/types/user';

export interface Comment {
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
  deleted_by: string | null;
  deleted_reason: string | null;
  user: {
    id: string;
    display_name: string | null;
    email: string | null;
    role: UserRole;
    avatar_url: string | null;
  };
  replies?: Comment[];
  reply_count?: number;
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

export const useComments = (mangaId: string, chapterId?: string) => {
  const { user, userRole, isAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
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
      canEdit: true, // يمكن تعديل التعل��قات الخاصة
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
        .order('created_at', { ascending: false });

      if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      } else {
        query = query.is('chapter_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // تنظيم التعليقات حسب الهيكل الهرمي
      const organizedComments = organizeComments(data || []);
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

  const organizeComments = (commentData: any[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // تحويل البيانات إلى كائنات التعليقات مع إضافة الصلاحيات
    commentData.forEach(item => {
      const comment: Comment = {
        ...item,
        replies: [],
        reply_count: 0,
        can_edit: canEditComment(item),
        can_delete: canDeleteComment(item),
        can_pin: permissions.canPin,
        can_report: !!user && item.user_id !== user.id
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
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const canEditComment = (comment: any): boolean => {
    if (!user) return false;
    // يمكن للمستخدم تعديل تعليقه الخاص أو للإدارة تعديل أي تعليق
    return comment.user_id === user.id || permissions.canModerate;
  };

  const canDeleteComment = (comment: any): boolean => {
    if (!user) return false;
    // يمكن للمستخدم حذف تعليقه الخاص أو للمديرين حذف أي تعليق
    return comment.user_id === user.id || permissions.canDelete;
  };

  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
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

    // فلت��ة الكلمات المحظورة
    if (containsBannedWords(content)) {
      toast({
        title: 'تحذير',
        description: 'يحتوي التعليق على كلمات غير مناسبة',
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
          parent_id: parentId || null
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

  const editComment = async (commentId: string, newContent: string): Promise<boolean> => {
    if (!user) return false;

    if (!newContent.trim()) {
      toast({
        title: 'خطأ',
        description: 'لا يمكن أن يكون التعليق فارغاً',
        variant: 'destructive'
      });
      return false;
    }

    if (containsBannedWords(newContent)) {
      toast({
        title: 'تحذير',
        description: 'يحتوي التعليق على كلمات غير مناسبة',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: newContent.trim(),
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

  // فلترة الكلمات المحظورة (مبسطة)
  const containsBannedWords = (text: string): boolean => {
    const bannedWords = [
      'كلمة محظورة1', 'كلمة محظورة2', // يمكن إضافة المزيد هنا
      // يمكن تحسين هذا ليكون أكثر تطوراً
    ];
    
    const lowerText = text.toLowerCase();
    return bannedWords.some(word => lowerText.includes(word.toLowerCase()));
  };

  return {
    comments,
    loading,
    permissions,
    addComment,
    editComment,
    deleteComment,
    pinComment,
    refreshComments: loadComments
  };
};
