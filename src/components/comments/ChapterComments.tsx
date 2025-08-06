import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, MessageCircle, Send, Trash2, Reply, Flag, Pin, Edit, Eye, EyeOff, Save, X } from "lucide-react";
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
  deleted_by?: string;
  deleted_reason?: string;
  is_spoiler?: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
    role: string;
  };
  replies?: Comment[];
}

interface ChapterCommentsProps {
  chapterId: string;
  mangaId: string;
}

const ChapterComments = ({ chapterId, mangaId }: ChapterCommentsProps) => {
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [replySpoilers, setReplySpoilers] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [editSpoiler, setEditSpoiler] = useState<Record<string, boolean>>({});
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  // جلب التعليقات
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["chapter-comments", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles!comments_user_id_fkey (display_name, role)
        `)
        .eq("chapter_id", chapterId)
        .eq("is_deleted", false)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      // تنظيم التعليقات والردود
      const topLevelComments = data?.filter(c => !c.parent_id) || [];
      const replies = data?.filter(c => c.parent_id) || [];

      return topLevelComments.map(comment => ({
        ...comment,
        replies: replies.filter(r => r.parent_id === comment.id)
      }));
    },
    staleTime: 30 * 1000,
  });

  // نشر تعليق جديد
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId, isSpoiler }: { content: string; parentId?: string; isSpoiler?: boolean }) => {
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
          profiles!comments_user_id_fkey (display_name, role)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
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
    mutationFn: async ({ commentId, content, isSpoiler }: { commentId: string; content: string; isSpoiler?: boolean }) => {
      const { error } = await supabase
        .from("comments")
        .update({ 
          content: content.trim(),
          is_spoiler: isSpoiler || false,
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
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
          deleted_by: user?.id,
          deleted_reason: "حذف بواسطة المستخدم"
        })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
      toast({
        title: "تم الحذف!",
        description: "تم حذف التعليق بنجاح",
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
      queryClient.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
      toast({
        title: "تم تحديث التعليق",
        description: "تم تحديث حالة التثبيت للتعليق",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment, isSpoiler: newCommentSpoiler });
  };

  const handleSubmitReply = (parentId: string) => {
    const content = replyContents[parentId] || "";
    if (!content.trim()) return;
    const isSpoiler = replySpoilers[parentId] || false;
    addCommentMutation.mutate({ content, parentId, isSpoiler });
  };

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

  const toggleSpoilerReveal = (commentId: string) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const canModerateComments = hasPermission(userRole, "can_moderate_comments");
  const canPinComments = hasPermission(userRole, "can_publish_directly");

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

  const renderCommentContent = (comment: Comment) => {
    const isEditing = editingComment === comment.id;
    const isRevealed = revealedSpoilers.has(comment.id);
    const isSpoiler = comment.is_spoiler;

    if (isEditing) {
      return (
        <div className="space-y-3">
          <Textarea
            value={editContent[comment.id] || ""}
            onChange={(e) => setEditContent(prev => ({ ...prev, [comment.id]: e.target.value }))}
            className="min-h-[80px] resize-none text-right"
            dir="rtl"
            style={{ 
              fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
              unicodeBidi: "embed"
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
                تحذير من المحتوى المحرق (Spoiler)
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelEdit(comment.id)}
              >
                <X className="h-4 w-4 ml-1" />
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveEdit(comment.id)}
                disabled={editCommentMutation.isPending}
              >
                <Save className="h-4 w-4 ml-1" />
                حفظ
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (isSpoiler && !isRevealed) {
      return (
        <div 
          className="bg-gray-800 text-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          onClick={() => toggleSpoilerReveal(comment.id)}
        >
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="font-medium text-orange-500">انقر لإظهار المحتوى المحرق</span>
          <EyeOff className="h-4 w-4 text-orange-500" />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {isSpoiler && (
          <div className="flex items-center gap-2 text-orange-500 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>تحذير: محتوى محرق</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-orange-500"
              onClick={() => toggleSpoilerReveal(comment.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div 
          className="text-foreground leading-relaxed whitespace-pre-wrap text-right"
          dir="rtl"
          style={{ 
            fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
            unicodeBidi: "embed"
          }}
        >
          {comment.content}
        </div>
      </div>
    );
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <Card key={comment.id} className={`bg-card border-border ${isReply ? 'ml-8' : ''}`}>
      <CardContent className="p-4">
        {/* رأس التعليق */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {comment.is_pinned && (
              <Pin className="h-4 w-4 text-yellow-500" />
            )}
            <span className="font-semibold text-primary">
              {comment.profiles?.display_name || "مستخدم"}
            </span>
            <Badge className={getRoleColor(comment.profiles?.role as any)} variant="secondary">
              {getRoleDisplayName(comment.profiles?.role as any)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted-foreground">(محرر)</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* تثبيت التعليق */}
            {canPinComments && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => pinCommentMutation.mutate({ 
                  commentId: comment.id, 
                  isPinned: comment.is_pinned 
                })}
              >
                <Pin className={`h-4 w-4 ${comment.is_pinned ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </Button>
            )}

            {/* تعديل التعليق */}
            {user && user.id === comment.user_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleStartEdit(comment)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* الرد على التعليق */}
            {!isReply && user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              >
                <Reply className="h-4 w-4" />
              </Button>
            )}

            {/* الإبلاغ عن التعليق */}
            {user && user.id !== comment.user_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-orange-500"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}

            {/* حذف التعليق */}
            {(user?.id === comment.user_id || canModerateComments) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => deleteCommentMutation.mutate(comment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* محتوى التعليق */}
        <div className="mb-3">
          {renderCommentContent(comment)}
        </div>

        {/* منطقة الرد */}
        {replyingTo === comment.id && (
          <div className="border-t pt-3 space-y-3">
            <Textarea
              value={replyContents[comment.id] || ""}
              onChange={(e) => {
                setReplyContents(prev => ({
                  ...prev,
                  [comment.id]: e.target.value
                }));
              }}
              placeholder="اكتب ردك هنا..."
              className="min-h-[80px] resize-none text-right"
              dir="rtl"
              style={{ 
                fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                unicodeBidi: "embed"
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
                  تحذير من المحتوى المحرق (Spoiler)
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
                  رد
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="bg-background rounded-lg border">
      {/* منطقة كتابة التعليق */}
      <div className="p-6 border-b">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          التعليقات
          <Badge variant="secondary">
            {comments.length}
          </Badge>
        </h3>

        {user ? (
          <div className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="اكتب تعليقك هنا... (Ctrl+Enter للإرسال)"
              className="min-h-[100px] resize-none text-right"
              dir="rtl"
              style={{ 
                fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                unicodeBidi: "embed"
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="new-comment-spoiler"
                  checked={newCommentSpoiler}
                  onCheckedChange={(checked) => setNewCommentSpoiler(!!checked)}
                />
                <label htmlFor="new-comment-spoiler" className="text-sm cursor-pointer">
                  تحذير من المحتوى المحرق (Spoiler)
                </label>
              </div>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {addCommentMutation.isPending ? "جاري النشر..." : "نشر التعليق"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>يجب تسجيل الدخول لكتابة التعليقات</p>
          </div>
        )}
      </div>

      {/* قائمة التعليقات */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted-foreground/20 rounded w-1/4 mb-2"></div>
                <div className="h-16 bg-muted-foreground/20 rounded"></div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد تعليقات بعد</p>
            <p className="text-sm">كن أول من يعلق على هذا الفصل!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {renderComment(comment)}
                {/* عرض الردود */}
                {comment.replies?.map((reply) => renderComment(reply, true))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterComments;
