import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Heart,
  HeartOff,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  MoreHorizontal,
  Reply,
  Bold,
  Italic,
  Underline,
  Smile,
  Send,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Checkbox } from "@/components/ui/checkbox";

interface Comment {
  id: string;
  chapter_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_spoiler: boolean;
  is_hidden: boolean;
  is_deleted: boolean;
  is_reported: boolean;
  report_count: number;
  like_count: number;
  dislike_count: number;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  edited_by: string | null;
  profiles: {
    display_name: string;
    role: string;
  } | null;
  replies?: Comment[];
  userLike?: "like" | "dislike" | null;
}

interface ChapterCommentsProps {
  chapterId: string;
}

const ChapterComments = ({ chapterId }: ChapterCommentsProps) => {
  const { user, userProfile, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newComment, setNewComment] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!user) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(id);
    }
  }, [user]);

  // جلب التعليقات
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["chapter-comments", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_comments")
        .select(
          `
          *,
          profiles:user_id (display_name, role)
        `,
        )
        .eq("chapter_id", chapterId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // تنظيم التعليقات والردود
      const commentsMap = new Map();
      const rootComments: Comment[] = [];

      // جلب إعجابات المستخدم
      let userLikes: any[] = [];
      if (user) {
        const { data: likesData } = await supabase
          .from("comment_likes")
          .select("comment_id, is_like")
          .eq("user_id", user.id);
        userLikes = likesData || [];
      }

      data.forEach((comment: any) => {
        const userLike = userLikes.find(
          (like) => like.comment_id === comment.id,
        );
        const commentWithLike = {
          ...comment,
          userLike: userLike ? (userLike.is_like ? "like" : "dislike") : null,
          replies: [],
        };

        commentsMap.set(comment.id, commentWithLike);

        if (!comment.parent_id) {
          rootComments.push(commentWithLike);
        }
      });

      // ربط الردود بالتعليقات الأصلية
      data.forEach((comment: any) => {
        if (comment.parent_id) {
          const parent = commentsMap.get(comment.parent_id);
          if (parent) {
            parent.replies.push(commentsMap.get(comment.id));
          }
        }
      });

      return rootComments;
    },
    staleTime: 30 * 1000,
  });

  // نشر تعليق جديد
  const addCommentMutation = useMutation({
    mutationFn: async ({
      content,
      parentId,
      isSpoiler,
    }: {
      content: string;
      parentId?: string;
      isSpoiler: boolean;
    }) => {
      if (!user) {
        throw new Error("يجب تسجيل الدخ��ل لكتابة التعليقات");
      }

      const { data, error } = await supabase
        .from("chapter_comments")
        .insert({
          chapter_id: chapterId,
          user_id: user.id,
          parent_id: parentId || null,
          content: content.trim(),
          is_spoiler: isSpoiler,
        })
        .select()
        .single();

      if (error) {
        console.error("Comment insertion error:", error);
        throw new Error(error.message || "فشل في نشر التعليق");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapter-comments", chapterId],
      });
      setNewComment("");
      setIsSpoiler(false);
      setReplyingTo(null);
      toast({
        title: "تم النشر!",
        description: "تم نشر تعليقك بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في نشر التعليق",
        variant: "destructive",
      });
    },
  });

  // تعديل تعليق
  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (sessionData.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke(
        "manage-comments",
        {
          body: {
            action: "update",
            commentId,
            content: content.trim(),
          },
          headers,
        },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapter-comments", chapterId],
      });
      setEditingComment(null);
      setEditContent("");
      toast({
        title: "تم التحديث!",
        description: "تم تعديل التعليق بنجاح",
      });
    },
  });

  // حذف تعليق
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (sessionData.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke(
        "manage-comments",
        {
          body: {
            action: "delete",
            commentId,
          },
          headers,
        },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapter-comments", chapterId],
      });
      toast({
        title: "تم الحذف!",
        description: "تم حذف التعليق بنجاح",
      });
    },
  });

  // إعجاب/عدم إعجاب
  const likeCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      isLike,
    }: {
      commentId: string;
      isLike: boolean;
    }) => {
      if (!user) {
        throw new Error("يجب تسجيل الدخول");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (sessionData.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke(
        "manage-comments",
        {
          body: {
            action: "like",
            commentId,
            isLike,
          },
          headers,
        },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapter-comments", chapterId],
      });
    },
  });

  // الإبلاغ عن تعليق
  const reportCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      reason,
    }: {
      commentId: string;
      reason: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (sessionData.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke(
        "manage-comments",
        {
          body: {
            action: "report",
            commentId,
            reason,
          },
          headers,
        },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({
        title: "تم الإبلاغ!",
        description: "شكراً لك، سيتم مراجعة التعليق",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      content: newComment,
      parentId: replyingTo || undefined,
      isSpoiler,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // منع أي تداخل مع مفتاح Space
    if (e.key === " ") {
      e.stopPropagation();
    }

    // Enter + Ctrl لإرسال التعليق
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById(
      "comment-textarea",
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setNewComment(before + emoji + after);

      // إعادة تعيين موضع المؤشر
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  const quickEmojis = [
    "😀",
    "😂",
    "😍",
    "😢",
    "😡",
    "😮",
    "👍",
    "👎",
    "❤️",
    "🔥",
    "💯",
    "🎉",
    "😅",
    "🤔",
    "����",
    "💔",
    "🤣",
    "😊",
    "😎",
    "🥺",
    "😤",
    "🤯",
    "🙄",
    "😏",
    "🤩",
    "😇",
    "🤗",
    "😱",
    "🤐",
    "🤨",
    "😴",
    "🥳",
  ];

  const handleEditComment = (commentId: string) => {
    if (!editContent.trim()) return;

    editCommentMutation.mutate({
      commentId,
      content: editContent,
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

  // إغلاق منتقي الإيموجي عند النقر خارجه
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".emoji-picker-container")) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  return (
    <div className="bg-gray-900 text-white rounded-lg">
      {/* منطقة كتابة التعليق */}
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          التعليقات
          <Badge variant="secondary" className="bg-red-600 text-white">
            {comments.length}
          </Badge>
        </h3>

        {user ? (
          <div className="space-y-4">
            <div className="relative emoji-picker-container">
              <Textarea
                id="comment-textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب تعليقك هنا... (Ctrl+Enter للإرسال)"
                className="bg-gray-800 border-gray-600 text-white min-h-[120px] pr-4 pb-12 resize-none"
                dir="rtl"
              />

              {/* أزرار التنسيق والإيموجي */}
              <div className="absolute bottom-2 left-2 flex gap-1">
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>

                  {/* منتقي الإيموجي */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl z-50 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">
                          الإيموجيات
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setShowEmojiPicker(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-8 gap-1 w-64">
                        {quickEmojis.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            className="h-8 w-8 text-lg hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              insertEmoji(emoji);
                            }}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-700"
                  title="نص عريض"
                  onClick={(e) => {
                    e.preventDefault();
                    const textarea = document.getElementById(
                      "comment-textarea",
                    ) as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const before = text.substring(0, start);
                      const after = text.substring(end, text.length);
                      const selectedText = text.substring(start, end);
                      setNewComment(
                        before + "**" + selectedText + "**" + after,
                      );
                      setTimeout(() => {
                        textarea.focus();
                        textarea.selectionStart = start + 2;
                        textarea.selectionEnd = end + 2;
                      }, 0);
                    }
                  }}
                >
                  <Bold className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-700"
                  title="نص مائل"
                  onClick={(e) => {
                    e.preventDefault();
                    const textarea = document.getElementById(
                      "comment-textarea",
                    ) as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const before = text.substring(0, start);
                      const after = text.substring(end, text.length);
                      const selectedText = text.substring(start, end);
                      setNewComment(before + "*" + selectedText + "*" + after);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.selectionStart = start + 1;
                        textarea.selectionEnd = end + 1;
                      }, 0);
                    }
                  }}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </div>

              {/* إشعار الرد */}
              {replyingTo && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <span>الرد على تعليق</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-white hover:bg-blue-700"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="spoiler"
                    checked={isSpoiler}
                    onCheckedChange={setIsSpoiler}
                  />
                  <label htmlFor="spoiler" className="text-sm text-gray-300">
                    تحذير: محتوى محروق
                  </label>
                </div>
              </div>

              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {addCommentMutation.isPending
                  ? "جاري النشر..."
                  : replyingTo
                    ? "إرسال الرد"
                    : "نشر التعليق"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>يجب تسجيل الدخول لكتابة التعليقات</p>
          </div>
        )}
      </div>

      {/* قائمة التعليقات */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد تعليقات بعد</p>
            <p className="text-sm">كن أول من يعلق على هذا الفصل!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                user={user}
                isAdmin={isAdmin}
                onReply={setReplyingTo}
                onEdit={(id, content) => {
                  setEditingComment(id);
                  setEditContent(content);
                }}
                onDelete={(id) => deleteCommentMutation.mutate(id)}
                onLike={(id, isLike) =>
                  likeCommentMutation.mutate({ commentId: id, isLike })
                }
                onReport={(id, reason) =>
                  reportCommentMutation.mutate({ commentId: id, reason })
                }
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// مكون التعليق الفردي
interface CommentItemProps {
  comment: Comment;
  user: any;
  isAdmin: boolean;
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onLike: (id: string, isLike: boolean) => void;
  onReport: (id: string, reason: string) => void;
  formatDate: (date: string) => string;
  level?: number;
}

const CommentItem = ({
  comment,
  user,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onReport,
  formatDate,
  level = 0,
}: CommentItemProps) => {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = user?.id === comment.user_id;
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  // تحويل التنسيق البسيط إلى HTML
  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  };

  return (
    <div
      className={`${level > 0 ? "ml-8 border-l-2 border-gray-700 pl-4" : ""}`}
    >
      <Card className="bg-gray-800 border-gray-700 hover:bg-gray-800/80 transition-colors">
        <CardContent className="p-4">
          {/* رأس التعليق */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-400">
                {comment.profiles?.display_name || "مستخدم"}
              </span>
              {comment.profiles?.role === "admin" && (
                <Badge variant="destructive" className="text-xs">
                  أدمن
                </Badge>
              )}
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
              {comment.edited_at && (
                <span className="text-xs text-gray-500">(تم التعديل)</span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-gray-800 border-gray-600"
              >
                <DropdownMenuItem
                  onClick={() => onReply(comment.id)}
                  className="hover:bg-gray-700"
                >
                  <Reply className="h-4 w-4 mr-2" />
                  رد
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(comment.id, comment.content)}
                    className="hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    تعديل
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600 hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onReport(comment.id, "محتوى مسيء")}
                      className="text-yellow-600 hover:bg-gray-700"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      إبلاغ
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* محتوى التعليق */}
          <div className="mb-3">
            {comment.is_spoiler && !showSpoiler ? (
              <div className="bg-gray-700 rounded p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 font-semibold">
                    تحذير: محتوى محروق
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSpoiler(true)}
                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
                >
                  اضغط لإظهار المحتوى
                </Button>
              </div>
            ) : (
              <div
                className="text-gray-100 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: formatContent(comment.content),
                }}
              />
            )}
          </div>

          {/* أزرار التفاعل */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => onLike(comment.id, true)}
              className={`flex items-center gap-1 transition-colors px-2 py-1 rounded ${
                comment.userLike === "like"
                  ? "text-green-500 bg-green-500/20"
                  : "text-gray-400 hover:text-green-500 hover:bg-green-500/10"
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              {comment.like_count}
            </button>

            <button
              onClick={() => onLike(comment.id, false)}
              className={`flex items-center gap-1 transition-colors px-2 py-1 rounded ${
                comment.userLike === "dislike"
                  ? "text-red-500 bg-red-500/20"
                  : "text-gray-400 hover:text-red-500 hover:bg-red-500/10"
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              {comment.dislike_count}
            </button>

            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
            >
              <Reply className="h-4 w-4" />
              رد
            </button>

            {comment.report_count > 0 && isAdmin && (
              <span className="text-yellow-500 text-xs flex items-center gap-1">
                <Flag className="h-3 w-3" />
                {comment.report_count} بلاغات
              </span>
            )}
          </div>

          {/* الردود */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-blue-400 text-sm hover:underline mb-3 flex items-center gap-1"
              >
                {showReplies ? "إخفاء" : "إظهار"} الردود (
                {comment.replies.length})
                <Reply className="h-3 w-3" />
              </button>

              {showReplies && (
                <div className="space-y-4">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      user={user}
                      isAdmin={isAdmin}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onLike={onLike}
                      onReport={onReport}
                      formatDate={formatDate}
                      level={level + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChapterComments;
