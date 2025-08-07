import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  AlertTriangle, 
  MessageCircle, 
  Send, 
  Trash2, 
  Reply, 
  Pin, 
  Edit, 
  Save, 
  X,
  Flag,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  Angry,
  Frown,
  MoreHorizontal,
  Shield,
  Crown,
  Star,
  UserX,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import SpoilerContent from "@/components/ui/spoiler-content";
import { getRoleDisplayName, getRoleColor, hasPermission } from "@/types/user";

interface Comment {
  id: string;
  chapter_id: string;
  manga_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  is_pinned: boolean;
  is_deleted: boolean;
  is_spoiler?: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
    role: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  reactions?: {
    like: number;
    dislike: number;
    love: number;
    laugh: number;
    angry: number;
    sad: number;
  };
  user_reaction?: string;
}

interface ImprovedChapterCommentsProps {
  chapterId: string;
  mangaId: string;
}

const ImprovedChapterComments = ({ chapterId, mangaId }: ImprovedChapterCommentsProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States for comments
  const [newComment, setNewComment] = useState("");
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);
  
  // States for replies
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [replySpoilers, setReplySpoilers] = useState<Record<string, boolean>>({});
  
  // States for editing
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [editSpoiler, setEditSpoiler] = useState<Record<string, boolean>>({});

  // States for reporting
  const [reportingComment, setReportingComment] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  // جلب التعليقات مع التفاعلات
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["improved-chapter-comments", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles!comments_user_id_fkey (display_name, role, avatar_url)
        `)
        .eq("chapter_id", chapterId)
        .eq("is_deleted", false)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      // جلب التفاعلات لكل تعليق
      const commentsWithReactions = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: reactions } = await supabase
            .from("comment_reactions")
            .select("reaction_type, user_id")
            .eq("comment_id", comment.id);

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
            user_reaction: userReaction
          };
        })
      );

      // تنظيم التعليقات والردود
      const topLevelComments = commentsWithReactions.filter(c => !c.parent_id);
      const replies = commentsWithReactions.filter(c => c.parent_id);

      return topLevelComments.map(comment => ({
        ...comment,
        replies: replies.filter(r => r.parent_id === comment.id)
      }));
    },
    staleTime: 30 * 1000,
  });

  // نشر تعليق جديد
  const addCommentMutation = useMutation({
    mutationFn: async ({ 
      content, 
      parentId, 
      isSpoiler 
    }: { 
      content: string; 
      parentId?: string; 
      isSpoiler?: boolean; 
    }) => {
      if (!user) {
        throw new Error("يجب تسجيل الدخول لكتابة التعليقات");
      }

      const { data, error } = await supabase
        .from("comments")
        .insert({
          chapter_id: chapterId,
          manga_id: mangaId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
          is_spoiler: isSpoiler || false,
        })
        .select(`
          *,
          profiles!comments_user_id_fkey (display_name, role, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improved-chapter-comments", chapterId] });
      setNewComment("");
      setNewCommentSpoiler(false);
      setReplyContents({});
      setReplySpoilers({});
      setReplyingTo(null);
      toast({
        title: "تم النشر!",
        description: "تم نشر تعليقك بنجاح",
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
    mutationFn: async ({ commentId, content, isSpoiler }: { commentId: string; content: string; isSpoiler: boolean }) => {
      const { error } = await supabase
        .from("comments")
        .update({ 
          content: content.trim(),
          is_spoiler: isSpoiler,
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improved-chapter-comments", chapterId] });
      setEditingComment(null);
      setEditContent({});
      setEditSpoiler({});
      toast({
        title: "تم التحديث!",
        description: "تم تحديث تعليقك بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث التعليق",
        variant: "destructive",
      });
    },
  });

  // حذف تعليق
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("comments")
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improved-chapter-comments", chapterId] });
      toast({
        title: "تم الحذف!",
        description: "تم حذف التعليق بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف التعليق",
        variant: "destructive",
      });
    },
  });

  // تثبيت تعليق
  const pinCommentMutation = useMutation({
    mutationFn: async ({ commentId, isPinned }: { commentId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("comments")
        .update({ is_pinned: !isPinned })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improved-chapter-comments", chapterId] });
      toast({
        title: "تم تحديث التعليق",
        description: "تم تحديث حالة التثبيت للتعليق",
      });
    },
  });

  // الإبلاغ عن تعليق
  const reportCommentMutation = useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason: string }) => {
      if (!user) throw new Error("يجب تسجيل الدخول للإبلاغ");

      const { error } = await supabase
        .from("comment_reports")
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reason: reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setReportingComment(null);
      setReportReason("");
      toast({
        title: "تم الإبلاغ",
        description: "تم إرسال بلاغك للمراجعة",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال البلاغ",
        variant: "destructive",
      });
    },
  });

  // تفاعل مع التعليق (محسن)
  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: string }) => {
      if (!user) throw new Error("يجب تسجيل الدخول للتفاعل");

      // التحقق من وجود تفاعل سابق
      const { data: existingReaction } = await supabase
        .from("comment_reactions")
        .select("id, reaction_type")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .single();

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // إزالة التفاعل إذا كان نفس النوع
          await supabase
            .from("comment_reactions")
            .delete()
            .eq("id", existingReaction.id);
        } else {
          // تحديث نوع التفاعل
          await supabase
            .from("comment_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", existingReaction.id);
        }
      } else {
        // إضافة تفاعل جديد
        await supabase
          .from("comment_reactions")
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["improved-chapter-comments", chapterId] });
    },
  });

  // فحص الصلاحيات
  const canEditComment = (comment: Comment) => {
    if (!user) return false;
    // يمكن للمستخدم تعديل تعليقه أو للمشرفين تعديل أي تعليق
    return comment.user_id === user.id || hasPermission(userRole, "can_moderate_comments");
  };

  const canDeleteComment = (comment: Comment) => {
    if (!user) return false;
    // يمكن للمستخدم حذف تعليقه أو للمشرفين حذف أي تعليق
    return comment.user_id === user.id || 
           hasPermission(userRole, "can_moderate_comments") ||
           hasPermission(userRole, "can_delete_comments");
  };

  const canPinComment = () => {
    return hasPermission(userRole, "can_pin_comments") || 
           hasPermission(userRole, "can_moderate_comments");
  };

  // معالجة التعديل
  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent({ [comment.id]: comment.content });
    setEditSpoiler({ [comment.id]: comment.is_spoiler || false });
  };

  const handleSaveEdit = (commentId: string) => {
    const content = editContent[commentId];
    const isSpoiler = editSpoiler[commentId];
    if (!content?.trim()) return;
    editCommentMutation.mutate({ commentId, content, isSpoiler });
  };

  const handleCancelEdit = (commentId: string) => {
    setEditingComment(null);
    setEditContent(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
    setEditSpoiler(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
  };

  // معالجة الإبلاغ
  const handleReport = () => {
    if (!reportReason.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سبب البلاغ",
        variant: "destructive"
      });
      return;
    }

    if (reportingComment) {
      reportCommentMutation.mutate({ 
        commentId: reportingComment, 
        reason: reportReason 
      });
    }
  };

  // مكون التف��علات المحسن
  const ReactionButtons = ({ comment }: { comment: Comment }) => {
    const reactions = [
      { type: 'like', icon: ThumbsUp, label: 'إعجاب', count: comment.reactions?.like || 0, color: 'text-blue-600' },
      { type: 'love', icon: Heart, label: 'حب', count: comment.reactions?.love || 0, color: 'text-red-500' },
      { type: 'laugh', icon: Laugh, label: 'ضحك', count: comment.reactions?.laugh || 0, color: 'text-yellow-500' },
      { type: 'angry', icon: Angry, label: 'غضب', count: comment.reactions?.angry || 0, color: 'text-red-600' },
      { type: 'sad', icon: Frown, label: 'حزن', count: comment.reactions?.sad || 0, color: 'text-gray-500' },
    ];

    return (
      <div className="flex items-center gap-1 mt-3">
        {reactions.map(({ type, icon: Icon, label, count, color }) => {
          const isActive = comment.user_reaction === type;
          return (
            <Button
              key={type}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs gap-1 transition-all duration-200 ${
                isActive ? `${color} bg-opacity-10` : 'hover:bg-muted'
              }`}
              onClick={() => reactionMutation.mutate({ commentId: comment.id, reactionType: type })}
              disabled={!user}
              title={label}
            >
              <Icon className={`h-4 w-4 ${isActive ? color : ''}`} />
              {count > 0 && <span className="min-w-[16px] text-center">{count}</span>}
            </Button>
          );
        })}
      </div>
    );
  };

  // مكون أيقونة الرتبة
  const RoleIcon = ({ role }: { role: string }) => {
    switch (role) {
      case 'site_admin':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'moderator':
        return <Star className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ 
      content: newComment, 
      isSpoiler: newCommentSpoiler
    });
  };

  const handleSubmitReply = (parentId: string) => {
    const content = replyContents[parentId] || "";
    if (!content.trim()) return;
    const isSpoiler = replySpoilers[parentId] || false;
    addCommentMutation.mutate({ 
      content, 
      parentId, 
      isSpoiler
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    if (diffMinutes > 0) return `منذ ${diffMinutes} دقيقة`;
    return "الآن";
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingComment === comment.id;

    return (
      <Card 
        key={comment.id} 
        className={`comment-card bg-card backdrop-blur-sm border transition-all duration-300 hover:shadow-md ${
          isReply ? 'ml-8 border-r-4 border-r-primary/30' : ''
        } ${comment.is_pinned ? 'ring-2 ring-yellow-500/30 bg-yellow-50/5' : ''}`}
      >
        <CardContent className="p-6">
          {/* رأس التعليق */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              {/* صورة الملف الشخصي */}
              <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                <AvatarImage 
                  src={comment.profiles?.avatar_url} 
                  alt={comment.profiles?.display_name || "مستخدم"} 
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(comment.profiles?.display_name || "م").charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {comment.is_pinned && (
                    <Pin className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="font-semibold text-primary text-base">
                    {comment.profiles?.display_name || "مستخدم"}
                  </span>
                  <RoleIcon role={comment.profiles?.role || ""} />
                  <Badge className={`${getRoleColor(comment.profiles?.role as any)} text-xs`} variant="secondary">
                    {getRoleDisplayName(comment.profiles?.role as any)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatDate(comment.created_at)}</span>
                  {comment.updated_at !== comment.created_at && (
                    <div className="flex items-center gap-1">
                      <Edit className="h-3 w-3" />
                      <span>(محرر)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* قائمة الخيارات */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isReply && user && (
                  <DropdownMenuItem 
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    رد على التعليق
                  </DropdownMenuItem>
                )}

                {canEditComment(comment) && (
                  <DropdownMenuItem onClick={() => handleStartEdit(comment)}>
                    <Edit className="h-4 w-4 mr-2" />
                    تعديل التعليق
                  </DropdownMenuItem>
                )}

                {canPinComment() && !isReply && (
                  <DropdownMenuItem 
                    onClick={() => pinCommentMutation.mutate({ 
                      commentId: comment.id, 
                      isPinned: comment.is_pinned 
                    })}
                  >
                    <Pin className="h-4 w-4 mr-2" />
                    {comment.is_pinned ? 'إلغاء التثبيت' : 'تثبيت التعليق'}
                  </DropdownMenuItem>
                )}

                {user && user.id !== comment.user_id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setReportingComment(comment.id)}
                      className="text-orange-600 focus:text-orange-600"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      الإبلاغ عن التعليق
                    </DropdownMenuItem>
                  </>
                )}

                {canDeleteComment(comment) && (
                  <>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          حذف التعليق
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* محتوى التعليق */}
          <div className="mb-4">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent[comment.id] || ""}
                  onChange={(e) => setEditContent(prev => ({ ...prev, [comment.id]: e.target.value }))}
                  className="min-h-[100px] resize-none text-right comment-textarea"
                  dir="rtl"
                  style={{
                    fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                    unicodeBidi: "plaintext",
                    whiteSpace: "pre-wrap",
                    wordSpacing: "normal"
                  }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-spoiler-${comment.id}`}
                      checked={editSpoiler[comment.id] || false}
                      onCheckedChange={(checked) =>
                        setEditSpoiler(prev => ({ ...prev, [comment.id]: !!checked }))
                      }
                    />
                    <label htmlFor={`edit-spoiler-${comment.id}`} className="text-sm cursor-pointer">
                      تحذير من المحتوى المحرق
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelEdit(comment.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={editCommentMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      حفظ
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <SpoilerContent
                content={comment.content}
                isSpoiler={comment.is_spoiler || false}
                className="text-base leading-relaxed"
                onReveal={() => console.log(`Revealed spoiler for comment ${comment.id}`)}
              />
            )}
          </div>

          {/* التفاعلات */}
          {!isEditing && <ReactionButtons comment={comment} />}

          {/* منطقة الرد */}
          {replyingTo === comment.id && (
            <div className="border-t pt-4 mt-4 space-y-4 bg-muted/10 -mx-6 -mb-6 px-6 pb-6">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>{user?.user_metadata?.display_name?.charAt(0) || "أ"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={replyContents[comment.id] || ""}
                    onChange={(e) => {
                      setReplyContents(prev => ({
                        ...prev,
                        [comment.id]: e.target.value
                      }));
                    }}
                    placeholder="اكتب ردك هنا..."
                    className="min-h-[80px] resize-none text-right comment-textarea"
                    dir="rtl"
                    style={{
                      fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                      unicodeBidi: "plaintext",
                      whiteSpace: "pre-wrap",
                      wordSpacing: "normal"
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`reply-spoiler-${comment.id}`}
                        checked={replySpoilers[comment.id] || false}
                        onCheckedChange={(checked) => 
                          setReplySpoilers(prev => ({ ...prev, [comment.id]: !!checked }))
                        }
                      />
                      <label htmlFor={`reply-spoiler-${comment.id}`} className="text-sm cursor-pointer">
                        تحذير من المحتوى المحرق
                      </label>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContents(prev => {
                            const newContents = { ...prev };
                            delete newContents[comment.id];
                            return newContents;
                          });
                          setReplySpoilers(prev => {
                            const newSpoilers = { ...prev };
                            delete newSpoilers[comment.id];
                            return newSpoilers;
                          });
                        }}
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!(replyContents[comment.id] || "").trim() || addCommentMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        نشر الرد
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div
      className="bg-gradient-to-br from-background to-muted/20 rounded-xl border backdrop-blur-sm"
      data-comments-area="true"
    >
      {/* رأس القسم */}
      <div className="p-6 border-b">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-3 text-primary">
            <MessageCircle className="h-6 w-6" />
            التعليقات والمناقشات
            <Badge variant="secondary" className="text-sm">
              {comments.length} تعليق
            </Badge>
          </h3>

          {/* منطقة كتابة التعليق الجديد */}
          {user ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(user.user_metadata?.display_name || "أ").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="شارك رأيك حول هذا الفصل..."
                    className="min-h-[120px] resize-none text-right text-base comment-textarea"
                    dir="rtl"
                    onKeyDown={(e) => {
                      // منع التداخل مع اختصارات لوحة المفاتيح للصفحة
                      e.stopPropagation();
                    }}
                    onKeyUp={(e) => {
                      // منع التداخل مع اختصارات لوحة المفاتيح للصفحة
                      e.stopPropagation();
                    }}
                    style={{
                      fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                      unicodeBidi: "plaintext",
                      whiteSpace: "pre-wrap",
                      wordSpacing: "normal"
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="new-comment-spoiler"
                        checked={newCommentSpoiler}
                        onCheckedChange={(checked) => setNewCommentSpoiler(!!checked)}
                      />
                      <label htmlFor="new-comment-spoiler" className="text-sm cursor-pointer flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        تحذير من المحتوى المحر��
                      </label>
                    </div>

                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      size="lg"
                      className="gap-2 px-6"
                    >
                      <Send className="h-4 w-4" />
                      {addCommentMutation.isPending ? "جاري النشر..." : "نشر التعليق"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-muted/50 rounded-lg border border-dashed">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">يجب تسجيل الدخول للمشاركة في التعليقات</p>
            </div>
          )}
        </div>
      </div>

      {/* قائمة التعليقات */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل التعليق��ت...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">لا توجد تعليقات بعد</p>
            <p className="text-sm">كن أول من يشارك رأيه حول هذا الفصل!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-4">
                {renderComment(comment)}
                {/* الردود */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="space-y-4">
                    {comment.replies.map((reply) => renderComment(reply, true))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نموذج الإبلاغ */}
      <Dialog open={!!reportingComment} onOpenChange={() => setReportingComment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              الإبلاغ عن التعليق
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">سبب البلاغ:</label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="اذكر سبب الإبلاغ بالتفصيل..."
                className="text-right"
                dir="rtl"
                rows={4}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setReportingComment(null);
                  setReportReason("");
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleReport}
                disabled={!reportReason.trim() || reportCommentMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {reportCommentMutation.isPending ? "جاري الإرسال..." : "إرسال البلاغ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImprovedChapterComments;
