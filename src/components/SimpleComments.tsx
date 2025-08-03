import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { getRoleDisplayName, getRoleColor, hasPermission } from "@/types/user";

interface Comment {
  id: string;
  chapter_id: string;
  manga_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
    role: string;
  };
}

interface SimpleCommentsProps {
  chapterId: string;
  mangaId?: string;
}

const SimpleComments = ({ chapterId, mangaId }: SimpleCommentsProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  // جلب التعليقات
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["simple-comments", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles!comments_user_id_fkey (display_name, role)
        `)
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

      const { data, error } = await supabase
        .from("comments")
        .insert({
          chapter_id: chapterId,
          manga_id: mangaId || "",
          user_id: user.id,
          content: content.trim(),
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
      queryClient.invalidateQueries({ queryKey: ["simple-comments", chapterId] });
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
      queryClient.invalidateQueries({ queryKey: ["simple-comments", chapterId] });
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

  const canModerateComments = hasPermission(userRole, "can_moderate_comments");

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
    <div className="bg-background rounded-lg border max-w-4xl mx-auto">
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
              placeholder="اكتب تعليقك هنا..."
              className="min-h-[100px] resize-none"
              dir="rtl"
            />

            <div className="flex justify-end">
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
              <Card key={comment.id} className="bg-card border-border">
                <CardContent className="p-4">
                  {/* رأس التعليق */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">
                        {comment.profiles?.display_name || "مستخدم"}
                      </span>
                      <Badge 
                        className={getRoleColor(comment.profiles?.role as any)} 
                        variant="secondary"
                      >
                        {getRoleDisplayName(comment.profiles?.role as any)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>

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

                  {/* محتوى التعليق */}
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap">
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

export default SimpleComments;