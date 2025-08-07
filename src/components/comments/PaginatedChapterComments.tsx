import { useState, useEffect, useCallback } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  AlertTriangle, 
  MessageCircle, 
  Send, 
  Trash2, 
  Reply, 
  Flag, 
  Pin, 
  Edit, 
  Save, 
  X,
  Shield,
  AlertCircle,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  Angry,
  MoreHorizontal,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
  ChevronDown
} from "lucide-react";
import SpoilerContent from "@/components/ui/spoiler-content";
import { getRoleDisplayName, getRoleColor, hasPermission } from "@/types/user";
import { 
  moderateContent, 
  validateCommentContent, 
  cleanContent, 
  detectSpam, 
  scoreCommentQuality 
} from "@/utils/contentModeration";

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
  };
  replies?: Comment[];
  reactions?: {
    like: number;
    dislike: number;
    love: number;
    laugh: number;
    angry: number;
  };
  user_reaction?: string;
  _count?: {
    replies: number;
  };
}

interface PaginatedChapterCommentsProps {
  chapterId: string;
  mangaId: string;
}

const COMMENTS_PER_PAGE = 10;
const REPLIES_PER_PAGE = 5;

const PaginatedChapterComments = ({ chapterId, mangaId }: PaginatedChapterCommentsProps) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // حالات التعليقات
  const [newComment, setNewComment] = useState("");
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<Record<string, string>>({});
  const [replySpoilers, setReplySpoilers] = useState<Record<string, boolean>>({});
  
  // حالات الفلترة والترتيب
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular" | "pinned">("pinned");
  const [filterType, setFilterType] = useState<"all" | "spoilers" | "no_spoilers">("all");
  
  // حالات التحميل والأداء
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [contentWarnings, setContentWarnings] = useState<Record<string, string[]>>({});
  const [userCommentHistory, setUserCommentHistory] = useState<string[]>([]);

  // جلب التعليقات مع التصفح اللا نهائي
  const {
    data: commentsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch: refetchComments
  } = useInfiniteQuery({
    queryKey: ["paginated-comments", chapterId, sortBy, filterType, searchTerm],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("comments")
        .select(`
          *,
          profiles!comments_user_id_fkey (display_name, role),
          _count:comments!parent_id (count)
        `)
        .eq("chapter_id", chapterId)
        .eq("is_deleted", false)
        .is("parent_id", null); // فقط التعليقات الرئيسية

      // تطبيق الفلاتر
      if (filterType === "spoilers") {
        query = query.eq("is_spoiler", true);
      } else if (filterType === "no_spoilers") {
        query = query.eq("is_spoiler", false);
      }

      // تطبيق الترتيب
      switch (sortBy) {
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "popular":
          // يمكن إضافة ترتيب حسب عدد التفاعلات
          query = query.order("created_at", { ascending: false });
          break;
        case "pinned":
          query = query.order("is_pinned", { ascending: false })
                      .order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      // تطبيق التصفح
      query = query.range(pageParam * COMMENTS_PER_PAGE, (pageParam + 1) * COMMENTS_PER_PAGE - 1);

      const { data, error } = await query;
      if (error) throw error;

      // جلب التفاعلات لكل تعليق
      const commentsWithReactions = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: reactions } = await supabase
            .from("comment_reactions")
            .select("reaction_type, user_id")
            .eq("comment_id", comment.id);

          const reactionCounts = {
            like: 0,
            dislike: 0,
            love: 0,
            laugh: 0,
            angry: 0
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
            replies: [] // سيتم تحميل الردود عند الطلب
          };
        })
      );

      // فلترة البحث
      let filteredComments = commentsWithReactions;
      if (searchTerm) {
        filteredComments = commentsWithReactions.filter(comment =>
          comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comment.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return {
        comments: filteredComments,
        nextPage: filteredComments.length === COMMENTS_PER_PAGE ? pageParam + 1 : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30 * 1000,
  });

  // تحميل الردود لتعليق معين
  const loadReplies = useCallback(async (commentId: string) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));

    try {
      const { data: replies, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles!comments_user_id_fkey (display_name, role)
        `)
        .eq("parent_id", commentId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(REPLIES_PER_PAGE);

      if (error) throw error;

      // جلب التفاعلات للردود
      const repliesWithReactions = await Promise.all(
        (replies || []).map(async (reply) => {
          const { data: reactions } = await supabase
            .from("comment_reactions")
            .select("reaction_type, user_id")
            .eq("comment_id", reply.id);

          const reactionCounts = {
            like: 0,
            dislike: 0,
            love: 0,
            laugh: 0,
            angry: 0
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
            ...reply,
            reactions: reactionCounts,
            user_reaction: userReaction
          };
        })
      );

      // تحديث cache
      queryClient.setQueryData(
        ["paginated-comments", chapterId, sortBy, filterType, searchTerm],
        (oldData: any) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              comments: page.comments.map((comment: Comment) =>
                comment.id === commentId
                  ? { ...comment, replies: repliesWithReactions }
                  : comment
              )
            }))
          };
        }
      );

      setExpandedComments(prev => new Set([...prev, commentId]));
    } catch (error) {
      console.error("Error loading replies:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الردود",
        variant: "destructive"
      });
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  }, [commentId, sortBy, filterType, searchTerm, queryClient, user, toast]);

  // تجميع جميع التعليقات من الصفحات
  const allComments = commentsData?.pages.flatMap(page => page.comments) || [];

  // تفاعل مع التعليق
  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: string }) => {
      if (!user) throw new Error("يجب ت��جيل الدخول للتفاعل");

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
      refetchComments();
    },
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
          profiles!comments_user_id_fkey (display_name, role)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchComments();
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

  // معالجة نشر التعليق
  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "خطأ",
        description: "لا يمكن أن يكون التعليق فارغاً",
        variant: "destructive"
      });
      return;
    }

    // فحص المحتوى
    const moderation = moderateContent(newComment);
    const validation = validateCommentContent(newComment);
    const isSpam = detectSpam(newComment, userCommentHistory);

    if (moderation.severity === 'severe' || isSpam || !validation.isValid) {
      toast({
        title: "خطأ في التعليق",
        description: "التعليق يحتوي على محتوى غير مناسب",
        variant: "destructive"
      });
      return;
    }

    setUserCommentHistory(prev => [...prev, newComment].slice(-10));
    addCommentMutation.mutate({ 
      content: cleanContent(newComment), 
      isSpoiler: newCommentSpoiler 
    });
  };

  // معالجة الرد
  const handleSubmitReply = (parentId: string) => {
    const content = replyContents[parentId] || "";
    if (!content.trim()) {
      toast({
        title: "خطأ",
        description: "لا يمكن أن يكون الرد فارغاً",
        variant: "destructive"
      });
      return;
    }

    const moderation = moderateContent(content);
    const validation = validateCommentContent(content);

    if (moderation.severity === 'severe' || !validation.isValid) {
      toast({
        title: "خطأ في الرد",
        description: "الرد يحتوي على محتوى غير مناسب",
        variant: "destructive"
      });
      return;
    }

    const isSpoiler = replySpoilers[parentId] || false;
    addCommentMutation.mutate({ 
      content: cleanContent(content), 
      parentId, 
      isSpoiler 
    });
  };

  // تبديل عرض الردود
  const toggleReplies = (commentId: string) => {
    if (expandedComments.has(commentId)) {
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      loadReplies(commentId);
    }
  };

  // مكون التفاعلات
  const ReactionButtons = ({ comment }: { comment: Comment }) => {
    const reactions = [
      { type: 'like', icon: ThumbsUp, label: 'إعجاب', count: comment.reactions?.like || 0 },
      { type: 'dislike', icon: ThumbsDown, label: 'عدم إعجاب', count: comment.reactions?.dislike || 0 },
      { type: 'love', icon: Heart, label: 'حب', count: comment.reactions?.love || 0 },
      { type: 'laugh', icon: Laugh, label: 'ضحك', count: comment.reactions?.laugh || 0 },
      { type: 'angry', icon: Angry, label: 'غضب', count: comment.reactions?.angry || 0 },
    ];

    return (
      <div className="flex items-center gap-1 mt-3">
        {reactions.map(({ type, icon: Icon, label, count }) => (
          <Button
            key={type}
            variant={comment.user_reaction === type ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs gap-1"
            onClick={() => reactionMutation.mutate({ commentId: comment.id, reactionType: type })}
            disabled={!user}
          >
            <Icon className="h-3 w-3" />
            {count > 0 && <span>{count}</span>}
          </Button>
        ))}
      </div>
    );
  };

  // عرض التعليق
  const renderComment = (comment: Comment, isReply = false) => (
    <Card 
      key={comment.id} 
      className={`comment-card transition-all duration-200 hover:shadow-md ${
        isReply ? 'ml-8 border-l-4 border-l-primary/30' : ''
      } ${comment.is_pinned ? 'ring-2 ring-yellow-500/30 bg-yellow-50/20' : ''}`}
    >
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
              {new Date(comment.created_at).toLocaleDateString('ar-SA')}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isReply && user && (
                <DropdownMenuItem onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                  <Reply className="h-4 w-4 mr-2" />
                  رد
                </DropdownMenuItem>
              )}
              {user && user.id !== comment.user_id && (
                <DropdownMenuItem className="text-red-600">
                  <Flag className="h-4 w-4 mr-2" />
                  إبلاغ
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* محتوى التعليق */}
        <div className="mb-3">
          <SpoilerContent
            content={comment.content}
            isSpoiler={comment.is_spoiler || false}
            onReveal={() => console.log(`Revealed spoiler for comment ${comment.id}`)}
          />
        </div>

        {/* التفاعلات */}
        <ReactionButtons comment={comment} />

        {/* زر عرض الردود */}
        {!isReply && comment._count && comment._count.replies > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleReplies(comment.id)}
              className="text-primary"
              disabled={loadingReplies[comment.id]}
            >
              {loadingReplies[comment.id] ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${
                  expandedComments.has(comment.id) ? 'rotate-180' : ''
                }`} />
              )}
              {expandedComments.has(comment.id) ? 'إخفاء الردود' : `عرض الردود (${comment._count.replies})`}
            </Button>
          </div>
        )}

        {/* عرض الردود */}
        {expandedComments.has(comment.id) && comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        {/* منطقة الرد */}
        {replyingTo === comment.id && (
          <div className="border-t pt-4 mt-4 space-y-3 bg-muted/20 -mx-4 -mb-4 px-4 pb-4">
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

  const canModerateComments = hasPermission(userRole, "can_moderate_comments");

  return (
    <div className="bg-background rounded-xl border shadow-sm">
      {/* رأس القسم مع أدوات البحث والفلترة */}
      <div className="p-6 border-b">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              التعليقات والمناقشات
              <Badge variant="secondary">
                {allComments.length}
              </Badge>
            </h3>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchComments()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* أدوات البحث والفلترة */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث في التعليقات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pinned">المثبتة أولاً</SelectItem>
                <SelectItem value="newest">الأحدث أولاً</SelectItem>
                <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                <SelectItem value="popular">الأكثر شعبية</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التعليقات</SelectItem>
                <SelectItem value="spoilers">المحتوية على محروق</SelectItem>
                <SelectItem value="no_spoilers">بدون محروق</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* منطقة كتابة التعليق الجديد */}
          {user ? (
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    // فحص فوري للمحتوى
                    if (e.target.value.length > 10) {
                      const moderation = moderateContent(e.target.value);
                      const validation = validateCommentContent(e.target.value);
                      
                      const warnings = [];
                      if (moderation.detectedWords.length > 0) {
                        warnings.push(`كلمات محتملة المشاكل: ${moderation.detectedWords.join(', ')}`);
                      }
                      if (validation.warnings.length > 0) {
                        warnings.push(...validation.warnings);
                      }
                      
                      setContentWarnings(prev => ({
                        ...prev,
                        new: warnings
                      }));
                    } else {
                      setContentWarnings(prev => {
                        const newWarnings = {...prev};
                        delete newWarnings.new;
                        return newWarnings;
                      });
                    }
                  }}
                  placeholder="شارك رأيك حول هذا الفصل..."
                  className="min-h-[100px] resize-none text-right pr-3 pb-8"
                  dir="rtl"
                  maxLength={2000}
                />
                <div className="absolute bottom-2 left-3 text-xs text-muted-foreground flex items-center gap-2">
                  <span>{newComment.length}/2000</span>
                  {newComment.length > 10 && (
                    <>
                      {scoreCommentQuality(newComment) >= 80 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Shield className="h-3 w-3 mr-1" />
                          جودة عالية
                        </Badge>
                      )}
                      {scoreCommentQuality(newComment) < 60 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          يحتاج تحسين
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* تحذيرات المحتوى */}
              {contentWarnings.new && contentWarnings.new.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-600">
                    <p className="font-medium mb-1">تحذيرات:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {contentWarnings.new.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

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
        ) : allComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد تعليقات تطابق المعايير المحددة</p>
            <p className="text-sm">جرب تغيير معايير البحث أو الفلترة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allComments.map((comment) => renderComment(comment))}
            
            {/* زر تحميل المزيد */}
            {hasNextPage && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      جاري التحميل...
                    </>
                  ) : (
                    "تحميل المزيد"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginatedChapterComments;
