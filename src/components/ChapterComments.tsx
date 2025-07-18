import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  chapter_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    role: string;
  } | null;
}

interface ChapterCommentsProps {
  chapterId: string;
}

const ChapterComments = ({ chapterId }: ChapterCommentsProps) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

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
      return data || [];
    },
    staleTime: 30 * 1000,
  });

  // نشر تعليق جديد
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) {
        throw new Error("يجب تسجيل الدخول لكتابة التعليقات");
      }

      console.log("Inserting comment with data:", {
        chapter_id: chapterId,
        user_id: user.id,
        content: content.trim(),
      });

      const { data, error } = await supabase
        .from("chapter_comments")
        .insert({
          chapter_id: chapterId,
          user_id: user.id,
          content: content.trim(),
        })
        .select(
          `
          *,
          profiles:user_id (display_name, role)
        `,
        )
        .single();

      if (error) {
        console.error("Error inserting comment:", {
          error: JSON.stringify(error, null, 2),
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        let errorMessage = "فشل في نشر التعليق";
        if (error.code === "23503") {
          errorMessage = "الفصل غير موجود";
        } else if (error.code === "42501") {
          errorMessage = "ليس لديك صلاحية للتعليق";
        } else if (error.message) {
          errorMessage = `خطأ: ${error.message}`;
        }

        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapter-comments", chapterId],
      });
      setNewComment("");
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

  // حذف تعليق
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("chapter_comments")
        .update({ is_deleted: true })
        .eq("id", commentId);

      if (error) throw error;
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

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmitComment();
    }
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
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب تعليقك هنا... (Ctrl+Enter للإرسال)"
              className="bg-gray-800 border-gray-600 text-white min-h-[100px] resize-none"
              dir="rtl"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {addCommentMutation.isPending
                  ? "جاري النشر..."
                  : "نشر التع��يق"}
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
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id} className="bg-gray-800 border-gray-700">
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
                    </div>

                    {(user?.id === comment.user_id || isAdmin) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-700 text-red-400 hover:text-red-300"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* محتوى التعليق */}
                  <div className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterComments;
