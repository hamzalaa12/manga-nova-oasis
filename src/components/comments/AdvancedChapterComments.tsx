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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  Bold,
  Italic,
  Type,
  Heart,
  Laugh,
  ThumbsUp,
  ThumbsDown,
  Angry,
  Frown,
  MoreHorizontal
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
  formatting_style?: any;
  rich_content?: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
    role: string;
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

interface AdvancedChapterCommentsProps {
  chapterId: string;
  mangaId: string;
}

const AdvancedChapterComments = ({ chapterId, mangaId }: AdvancedChapterCommentsProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States for comments
  const [newComment, setNewComment] = useState("");
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);
  const [newCommentFormatting, setNewCommentFormatting] = useState({ bold: false, italic: false });
  
  // States for replies
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [replySpoilers, setReplySpoilers] = useState<Record<string, boolean>>({});
  const [replyFormatting, setReplyFormatting] = useState<Record<string, any>>({});
  
  // States for editing
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [editSpoiler, setEditSpoiler] = useState<Record<string, boolean>>({});
  const [editFormatting, setEditFormatting] = useState<Record<string, any>>({});

  // جلب التعليقات مع التفاعلات
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["advanced-chapter-comments", chapterId],
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
      isSpoiler, 
      formatting 
    }: { 
      content: string; 
      parentId?: string; 
      isSpoiler?: boolean; 
      formatting?: any;
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
          formatting_style: formatting || {},
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
      queryClient.invalidateQueries({ queryKey: ["advanced-chapter-comments", chapterId] });
      setNewComment("");
      setNewCommentSpoiler(false);
      setNewCommentFormatting({ bold: false, italic: false });
      setReplyContents({});
      setReplySpoilers({});
      setReplyFormatting({});
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

  // تفاعل مع التعليق
  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: string }) => {
      if (!user) throw new Error("يجب تسجيل الدخول للتفاعل");

      // حذف التفاعل السابق إن وجد
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

      // إضافة التفاعل الجديد
      const { error } = await supabase
        .from("comment_reactions")
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advanced-chapter-comments", chapterId] });
    },
  });

  // تطبيق التنسيق على النص
  const applyFormatting = (text: string, formatting: any) => {
    let formattedText = text;
    
    if (formatting?.bold) {
      formattedText = `**${formattedText}**`;
    }
    
    if (formatting?.italic) {
      formattedText = `*${formattedText}*`;
    }
    
    return formattedText;
  };

  // مكون التفاعلات
  const ReactionButtons = ({ comment }: { comment: Comment }) => {
    const reactions = [
      { type: 'like', icon: ThumbsUp, label: 'إعجاب', count: comment.reactions?.like || 0 },
      { type: 'dislike', icon: ThumbsDown, label: 'عدم إعجاب', count: comment.reactions?.dislike || 0 },
      { type: 'love', icon: Heart, label: 'حب', count: comment.reactions?.love || 0 },
      { type: 'laugh', icon: Laugh, label: 'ضحك', count: comment.reactions?.laugh || 0 },
      { type: 'angry', icon: Angry, label: 'غضب', count: comment.reactions?.angry || 0 },
      { type: 'sad', icon: Frown, label: 'حزن', count: comment.reactions?.sad || 0 },
    ];

    return (
      <div className="flex items-center gap-1 mt-2">
        {reactions.map(({ type, icon: Icon, label, count }) => (
          <Button
            key={type}
            variant={comment.user_reaction === type ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => reactionMutation.mutate({ commentId: comment.id, reactionType: type })}
            disabled={!user}
          >
            <Icon className="h-3 w-3 mr-1" />
            {count > 0 && <span>{count}</span>}
          </Button>
        ))}
      </div>
    );
  };

  // مكون أدوات التنسيق
  const FormattingTools = ({ 
    formatting, 
    onFormattingChange 
  }: { 
    formatting: any; 
    onFormattingChange: (newFormatting: any) => void; 
  }) => (
    <div className="flex items-center gap-2 p-2 border-t bg-muted/30">
      <Button
        variant={formatting.bold ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormattingChange({ ...formatting, bold: !formatting.bold })}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={formatting.italic ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onFormattingChange({ ...formatting, italic: !formatting.italic })}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 ml-4">
        <Type className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">أدوات التنسيق</span>
      </div>
    </div>
  );

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ 
      content: applyFormatting(newComment, newCommentFormatting), 
      isSpoiler: newCommentSpoiler,
      formatting: newCommentFormatting
    });
  };

  const handleSubmitReply = (parentId: string) => {
    const content = replyContents[parentId] || "";
    if (!content.trim()) return;
    const isSpoiler = replySpoilers[parentId] || false;
    const formatting = replyFormatting[parentId] || {};
    addCommentMutation.mutate({ 
      content: applyFormatting(content, formatting), 
      parentId, 
      isSpoiler,
      formatting
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

  const renderComment = (comment: Comment, isReply = false) => (
    <Card 
      key={comment.id} 
      className={`comment-card bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300 hover:bg-card/70 ${
        isReply ? 'ml-8 border-r-4 border-r-primary/30' : ''
      } ${comment.is_pinned ? 'ring-2 ring-yellow-500/30' : ''}`}
    >
      <CardContent className="p-6">
        {/* رأس التعليق */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {comment.is_pinned && (
              <Pin className="h-4 w-4 text-yellow-500" />
            )}
            <span className="font-semibold text-primary text-lg">
              {comment.profiles?.display_name || "مستخدم"}
            </span>
            <Badge className={`${getRoleColor(comment.profiles?.role as any)} px-3 py-1`} variant="secondary">
              {getRoleDisplayName(comment.profiles?.role as any)}
            </Badge>
            <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {formatDate(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted-foreground">(محرر)</span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user && user.id === comment.user_id && (
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  تعديل
                </DropdownMenuItem>
              )}
              {!isReply && user && (
                <DropdownMenuItem onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                  <Reply className="h-4 w-4 mr-2" />
                  رد
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* محتوى التعليق */}
        <div className="mb-4">
          <SpoilerContent
            content={comment.content}
            isSpoiler={comment.is_spoiler || false}
            className="text-base leading-relaxed"
            onReveal={() => console.log(`Revealed spoiler for comment ${comment.id}`)}
          />
        </div>

        {/* التفاعلات */}
        <ReactionButtons comment={comment} />

        {/* منطقة الرد */}
        {replyingTo === comment.id && (
          <div className="border-t pt-4 mt-4 space-y-4 bg-muted/20 -mx-6 -mb-6 px-6 pb-6">
            <div className="space-y-2">
              <Textarea
                value={replyContents[comment.id] || ""}
                onChange={(e) => {
                  setReplyContents(prev => ({
                    ...prev,
                    [comment.id]: e.target.value
                  }));
                }}
                placeholder="اكتب ردك هنا..."
                className="min-h-[100px] resize-none text-right bg-background/80"
                dir="rtl"
                style={{ 
                  fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                  unicodeBidi: "embed"
                }}
              />
              
              <FormattingTools
                formatting={replyFormatting[comment.id] || { bold: false, italic: false }}
                onFormattingChange={(newFormatting) => 
                  setReplyFormatting(prev => ({ ...prev, [comment.id]: newFormatting }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`reply-spoiler-${comment.id}`}
                  checked={replySpoilers[comment.id] || false}
                  onCheckedChange={(checked) => 
                    setReplySpoilers(prev => ({ ...prev, [comment.id]: !!checked }))
                  }
                />
                <label htmlFor={`reply-spoiler-${comment.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  تحذير من المحتوى المحرق (Spoiler)
                </label>
              </div>
              
              <div className="flex gap-3">
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
                    setReplyFormatting(prev => {
                      const newFormatting = { ...prev };
                      delete newFormatting[comment.id];
                      return newFormatting;
                    });
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!(replyContents[comment.id] || "").trim() || addCommentMutation.isPending}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  نشر الرد
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="bg-gradient-to-br from-background to-muted/30 rounded-xl border border-border/50 backdrop-blur-sm">
      {/* رأس القسم */}
      <div className="p-6 border-b border-border/50">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-3 text-primary">
            <MessageCircle className="h-6 w-6" />
            التعليقات والمناقشات
            <Badge variant="secondary" className="text-sm">
              {comments.length} تعليق
            </Badge>
          </h3>

          {/* منطقة كتابة التعليق الجديد */}
          {user && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="شارك رأيك حول هذا الفصل..."
                  className="min-h-[120px] resize-none text-right text-base bg-background/80 backdrop-blur-sm"
                  dir="rtl"
                  style={{ 
                    fontFamily: "'Noto Sans Arabic', 'Cairo', 'Amiri', sans-serif",
                    unicodeBidi: "embed"
                  }}
                />
                
                <FormattingTools
                  formatting={newCommentFormatting}
                  onFormattingChange={setNewCommentFormatting}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="new-comment-spoiler"
                    checked={newCommentSpoiler}
                    onCheckedChange={(checked) => setNewCommentSpoiler(!!checked)}
                  />
                  <label htmlFor="new-comment-spoiler" className="text-sm cursor-pointer flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    تحذير من المحتوى المحرق (Spoiler)
                  </label>
                </div>

                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  size="lg"
                  className="gap-2 px-6"
                >
                  <Send className="h-4 w-4" />
                  نشر التعليق
                </Button>
              </div>
            </div>
          )}

          {!user && (
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
            <p className="text-muted-foreground">جاري تحميل التعليقات...</p>
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
    </div>
  );
};

export default AdvancedChapterComments;