import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  MessageCircle, 
  Send, 
  Trash2, 
  Heart, 
  MoreHorizontal, 
  User,
  Shield,
  Crown,
  Star,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Edit
} from "lucide-react";
import { Link } from "react-router-dom";
import ReportDialog from "./ReportDialog";
import {
  UserRole,
  getRoleDisplayName,
  getRoleColor,
} from "@/types/user";

interface Comment {
  id: string;
  chapter_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  parent_id?: string;
  profiles: {
    display_name: string;
    role: UserRole;
    avatar_url?: string;
    is_verified?: boolean;
  } | null;
  user_reaction?: 'like' | 'dislike' | null;
}

interface NewChapterCommentsProps {
  chapterId: string;
}

const NewChapterComments = ({ chapterId }: NewChapterCommentsProps) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'popular'>('latest');



  // جلب التعليقات
  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ["chapter-comments", chapterId, sortBy],
    queryFn: async () => {
      let orderField = "created_at";
      let ascending = false;
      
      if (sortBy === 'oldest') {
        ascending = true;
      } else if (sortBy === 'popular') {
        orderField = "likes_count";
      }

      const { data, error } = await supabase
        .from("chapter_comments")
        .select(
          `
          *,
          profiles:user_id (display_name, role, avatar_url, is_verified)
        `,
        )
        .eq("chapter_id", chapterId)
        .eq("is_deleted", false)
        .is("parent_id", null) // Only top-level comments first
        .order(orderField, { ascending });

      if (error) throw error;

      // Get user reactions for each comment
      if (user && data) {
        const commentIds = data.map(c => c.id);
        const { data: reactions } = await supabase
          .from("comment_reactions")
          .select("comment_id, reaction_type")
          .eq("user_id", user.id)
          .in("comment_id", commentIds);

        return data.map(comment => ({
          ...comment,
          user_reaction: reactions?.find(r => r.comment_id === comment.id)?.reaction_type || null
        }));
      }

      return data || [];
    },
    staleTime: 30 * 1000,
  });

  // جلب الردود للتعليقات
  const { data: replies = [] } = useQuery({
    queryKey: ["comment-replies", chapterId],
    queryFn: async () => {
      if (comments.length === 0) return [];

      const commentIds = comments.map(c => c.id);
      const { data, error } = await supabase
        .from("chapter_comments")
        .select(
          `
          *,
          profiles:user_id (display_name, role, avatar_url, is_verified)
        `,
        )
        .eq("chapter_id", chapterId)
        .eq("is_deleted", false)
        .in("parent_id", commentIds)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get user reactions for replies
      if (user && data) {
        const replyIds = data.map(r => r.id);
        const { data: reactions } = await supabase
          .from("comment_reactions")
          .select("comment_id, reaction_type")
          .eq("user_id", user.id)
          .in("comment_id", replyIds);

        return data.map(reply => ({
          ...reply,
          user_reaction: reactions?.find(r => r.comment_id === reply.id)?.reaction_type || null
        }));
      }

      return data || [];
    },
    enabled: comments.length > 0,
  });

  // نشر تعليق جديد
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) {
        throw new Error("يجب تسجيل الدخول لكتابة التعليقات");
      }

      const { data, error } = await supabase
        .from("chapter_comments")
        .insert({
          chapter_id: chapterId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
        })
        .select(
          `
          *,
          profiles:user_id (display_name, role, avatar_url, is_verified)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["comment-replies", chapterId] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      toast({
        title: "تم النشر!",
        description: "تم إضافة تعليقك بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في نشر التعليق",
        variant: "destructive",
      });
    },
  });

  // تعديل تعليق
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from("chapter_comments")
        .update({ 
          content: content.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["comment-replies", chapterId] });
      setEditingComment(null);
      setEditContent("");
      toast({
        title: "تم التحديث!",
        description: "تم تعديل تعليقك بنجاح",
      });
    },
  });

  // حذف تعليق
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("chapter_comments")
        .update({ is_deleted: true })
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["comment-replies", chapterId] });
      toast({
        title: "تم الحذف!",
        description: "تم حذف التعليق بنجاح",
      });
    },
  });

  // تفاعل مع التعليق (إعجاب/عدم إعجاب)
  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: 'like' | 'dislike' | null }) => {
      if (!user) throw new Error("يجب تسجيل الدخول للتفاعل");

      // Remove existing reaction first
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      // Add new reaction if not null
      if (reactionType) {
        const { error } = await supabase
          .from("comment_reactions")
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["comment-replies", chapterId] });
    },
  });

  const handleReaction = (commentId: string, currentReaction: 'like' | 'dislike' | null, newReaction: 'like' | 'dislike') => {
    const reactionType = currentReaction === newReaction ? null : newReaction;
    reactionMutation.mutate({ commentId, reactionType });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'leader':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'elite_fighter':
        return <Star className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `منذ ${diffMinutes} دقيقة`;
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      return `منذ ${diffDays} يوم`;
    } else {
      return date.toLocaleDateString("ar");
    }
  };

  const CommentComponent = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'mr-8 border-r-2 border-muted pr-4' : ''} space-y-3`}>
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage 
            src={comment.profiles?.avatar_url} 
            alt={comment.profiles?.display_name} 
          />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {comment.profiles?.display_name || "مستخدم محذوف"}
            </span>
            
            {comment.profiles?.role && (
              <Badge 
                className={`${getRoleColor(comment.profiles.role)} text-white text-xs px-2 py-0.5`}
              >
                {getRoleIcon(comment.profiles.role)}
                <span className="mr-1">{getRoleDisplayName(comment.profiles.role)}</span>
              </Badge>
            )}

            {comment.profiles?.is_verified && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            <span className="text-muted-foreground text-sm">
              {formatDate(comment.created_at)}
              {comment.is_edited && <span className="mr-1">(معدل)</span>}
            </span>
          </div>

          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                dir="rtl"
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => editCommentMutation.mutate({ 
                    commentId: comment.id, 
                    content: editContent 
                  })}
                  disabled={!editContent.trim() || editCommentMutation.isPending}
                >
                  حفظ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent("");
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-foreground whitespace-pre-wrap" dir="rtl">
                {comment.content}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${comment.user_reaction === 'like' ? 'text-blue-500 bg-blue-500/10' : 'text-muted-foreground'}`}
                onClick={() => handleReaction(comment.id, comment.user_reaction, 'like')}
                disabled={!user}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                {comment.likes_count || 0}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${comment.user_reaction === 'dislike' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground'}`}
                onClick={() => handleReaction(comment.id, comment.user_reaction, 'dislike')}
                disabled={!user}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                {comment.dislikes_count || 0}
              </Button>
            </div>

            {!isReply && user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                <Reply className="h-4 w-4 mr-1" />
                رد
              </Button>
            )}

            <div className="mr-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user?.id === comment.user_id && (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        تعديل
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  
                  {user && user.id !== comment.user_id && (
                    <ReportDialog
                      targetId={comment.id}
                      targetType="comment"
                      triggerElement={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Flag className="h-4 w-4 mr-2" />
                          إبلاغ
                        </DropdownMenuItem>
                      }
                    />
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Reply form */}
          {replyingTo === comment.id && user && (
            <div className="space-y-2 mt-3 p-3 bg-muted/20 rounded-lg">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="اكتب ردك هنا..."
                dir="rtl"
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate({ 
                    content: replyContent, 
                    parentId: comment.id 
                  })}
                  disabled={!replyContent.trim() || addCommentMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  نشر الرد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {!isReply && (
        <div className="space-y-3">
          {replies
            .filter(reply => reply.parent_id === comment.id)
            .map((reply) => (
              <CommentComponent key={reply.id} comment={reply} isReply={true} />
            ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            التعليقات ({comments.length})
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                ترتيب: {sortBy === 'latest' ? 'الأحدث' : sortBy === 'oldest' ? 'الأقدم' : 'الأكثر إعجاباً'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('latest')}>
                الأحدث أولاً
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                الأقدم أولاً
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('popular')}>
                الأكثر إعجاباً
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Comment Form */}
        {user ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={currentUserProfile?.avatar_url || user.user_metadata?.avatar_url}
                  alt="Your avatar"
                />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={`مرحباً ${currentUserProfile?.display_name || 'صديق'}، شاركنا رأيك في هذا الفصل...`}
                  dir="rtl"
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {newComment.length}/500 حرف
                  </span>
                  <Button
                    onClick={() => addCommentMutation.mutate({ content: newComment })}
                    disabled={!newComment.trim() || newComment.length > 500 || addCommentMutation.isPending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {addCommentMutation.isPending ? "جاري النشر..." : "نشر التعليق"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">انضم للمناقشة</h3>
              <p className="text-muted-foreground mb-4">
                سجل الدخول لتتمكن من كتابة التعليقات والتفاعل مع المجتمع
              </p>
              <Link to="/auth">
                <Button>تسجيل الدخول</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Comments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 p-4 border rounded-lg">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">لا توجد تعليقات بعد</h3>
            <p className="text-muted-foreground">
              كن أول من يعلق على هذا الفصل!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentComponent key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewChapterComments;
