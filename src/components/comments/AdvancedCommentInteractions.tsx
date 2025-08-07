import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  Angry,
  Smile,
  Frown,
  Zap,
  Fire,
  Star,
  Award,
  Gift,
  Eye,
  Share2,
  Bookmark,
  Copy,
  ExternalLink,
  Users,
  TrendingUp,
  Clock,
  Calendar,
  MessageSquare,
  MoreHorizontal
} from "lucide-react";

interface Reaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface CommentStats {
  total_reactions: number;
  total_replies: number;
  total_views: number;
  average_rating: number;
  engagement_score: number;
  last_activity: string;
}

interface AdvancedCommentInteractionsProps {
  commentId: string;
  chapterId: string;
  mangaId: string;
  commentContent: string;
  authorId: string;
  onReactionChange?: () => void;
}

const AdvancedCommentInteractions = ({
  commentId,
  chapterId,
  mangaId,
  commentContent,
  authorId,
  onReactionChange
}: AdvancedCommentInteractionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // أنواع التفاعلات المتقدمة
  const reactionTypes = [
    { 
      type: 'like', 
      icon: ThumbsUp, 
      label: 'إعجاب', 
      color: 'text-blue-500 hover:text-blue-600',
      bgColor: 'hover:bg-blue-50',
      description: 'يعجبني هذا التعليق'
    },
    { 
      type: 'love', 
      icon: Heart, 
      label: 'حب', 
      color: 'text-red-500 hover:text-red-600',
      bgColor: 'hover:bg-red-50',
      description: 'أحب هذا التعليق'
    },
    { 
      type: 'laugh', 
      icon: Laugh, 
      label: 'ضحك', 
      color: 'text-yellow-500 hover:text-yellow-600',
      bgColor: 'hover:bg-yellow-50',
      description: 'مضحك جداً'
    },
    { 
      type: 'wow', 
      icon: Zap, 
      label: 'مذهل', 
      color: 'text-purple-500 hover:text-purple-600',
      bgColor: 'hover:bg-purple-50',
      description: 'مذهل ومدهش'
    },
    { 
      type: 'fire', 
      icon: Fire, 
      label: 'نار', 
      color: 'text-orange-500 hover:text-orange-600',
      bgColor: 'hover:bg-orange-50',
      description: 'تعليق رائع'
    },
    { 
      type: 'star', 
      icon: Star, 
      label: 'نجمة', 
      color: 'text-amber-500 hover:text-amber-600',
      bgColor: 'hover:bg-amber-50',
      description: 'تعليق مميز'
    },
    { 
      type: 'sad', 
      icon: Frown, 
      label: 'حزين', 
      color: 'text-gray-500 hover:text-gray-600',
      bgColor: 'hover:bg-gray-50',
      description: 'هذا يجعلني حزيناً'
    },
    { 
      type: 'angry', 
      icon: Angry, 
      label: 'غاضب', 
      color: 'text-red-600 hover:text-red-700',
      bgColor: 'hover:bg-red-50',
      description: 'غير موافق بشدة'
    }
  ];

  // جلب التفاعلات مع تفاصيل المستخدمين
  const { data: reactions = [], isLoading: reactionsLoading } = useQuery({
    queryKey: ["comment-reactions-detailed", commentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comment_reactions")
        .select(`
          *,
          profiles!comment_reactions_user_id_fkey (display_name, avatar_url)
        `)
        .eq("comment_id", commentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });

  // جلب إحصائيات التعليق
  const { data: stats } = useQuery({
    queryKey: ["comment-stats", commentId],
    queryFn: async () => {
      // جمع الإحصائيات من مصادر مختلفة
      const [reactionsCount, repliesCount, viewsCount] = await Promise.all([
        supabase
          .from("comment_reactions")
          .select("*", { count: 'exact', head: true })
          .eq("comment_id", commentId),
        supabase
          .from("comments")
          .select("*", { count: 'exact', head: true })
          .eq("parent_id", commentId),
        supabase
          .from("comment_views")
          .select("*", { count: 'exact', head: true })
          .eq("comment_id", commentId)
      ]);

      const totalReactions = reactionsCount.count || 0;
      const totalReplies = repliesCount.count || 0;
      const totalViews = viewsCount.count || 0;

      // حساب نقاط التفاعل
      const engagementScore = (totalReactions * 2) + (totalReplies * 3) + totalViews;

      return {
        total_reactions: totalReactions,
        total_replies: totalReplies,
        total_views: totalViews,
        engagement_score: engagementScore,
        last_activity: new Date().toISOString()
      };
    },
    staleTime: 60 * 1000,
  });

  // جلب حالة الإشارة المرجعية
  const { data: bookmarkStatus } = useQuery({
    queryKey: ["comment-bookmark", commentId, user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("comment_bookmarks")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .single();

      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    setIsBookmarked(!!bookmarkStatus);
  }, [bookmarkStatus]);

  // تسجيل مشاهدة التعليق
  useEffect(() => {
    if (user) {
      const recordView = async () => {
        await supabase
          .from("comment_views")
          .upsert({
            comment_id: commentId,
            user_id: user.id,
            viewed_at: new Date().toISOString()
          }, {
            onConflict: 'comment_id,user_id'
          });
      };

      recordView();
    }
  }, [commentId, user]);

  // إضافة/إزالة تفاعل
  const reactionMutation = useMutation({
    mutationFn: async ({ reactionType }: { reactionType: string }) => {
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
            reaction_type: reactionType
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comment-reactions-detailed", commentId] });
      queryClient.invalidateQueries({ queryKey: ["comment-stats", commentId] });
      onReactionChange?.();
      
      toast({
        title: "تم التفاعل",
        description: "تم تسجيل تفاعلك بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في التفاعل",
        variant: "destructive",
      });
    },
  });

  // إضافة/إزالة إشارة مرجعية
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");

      if (isBookmarked) {
        await supabase
          .from("comment_bookmarks")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("comment_bookmarks")
          .insert({
            comment_id: commentId,
            user_id: user.id
          });
      }
    },
    onSuccess: () => {
      setIsBookmarked(!isBookmarked);
      queryClient.invalidateQueries({ queryKey: ["comment-bookmark", commentId, user?.id] });
      
      toast({
        title: isBookmarked ? "تم إلغاء الحفظ" : "تم الحفظ",
        description: isBookmarked ? "تم إلغاء حفظ التعليق" : "تم حفظ التعليق في المفضلة",
      });
    },
  });

  // حساب عدد كل نوع تفاعل
  const reactionCounts = reactionTypes.reduce((acc, reactionType) => {
    acc[reactionType.type] = reactions.filter(r => r.reaction_type === reactionType.type).length;
    return acc;
  }, {} as Record<string, number>);

  // الحصول على تفاعل المستخدم الحالي
  const userReaction = user ? reactions.find(r => r.user_id === user.id)?.reaction_type : null;

  // نسخ رابط التعليق
  const copyCommentLink = () => {
    const link = `${window.location.origin}/chapter/${chapterId}#comment-${commentId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رابط التعليق إلى الحافظة",
    });
  };

  // مشاركة التعليق
  const shareComment = async () => {
    const link = `${window.location.origin}/chapter/${chapterId}#comment-${commentId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'تعليق مميز',
          text: commentContent.substring(0, 100) + '...',
          url: link
        });
      } catch (error) {
        copyCommentLink();
      }
    } else {
      copyCommentLink();
    }
  };

  // تنسيق الأرقام الكبيرة
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'م';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'ك';
    return num.toString();
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* شريط التفاعلات الأساسي */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {reactionTypes.slice(0, 4).map((reaction) => {
              const Icon = reaction.icon;
              const count = reactionCounts[reaction.type] || 0;
              const isActive = userReaction === reaction.type;

              return (
                <Tooltip key={reaction.type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`h-8 px-2 gap-1 transition-all duration-200 ${
                        isActive ? reaction.color : 'text-muted-foreground hover:text-foreground'
                      } ${reaction.bgColor}`}
                      onClick={() => reactionMutation.mutate({ reactionType: reaction.type })}
                      disabled={!user}
                    >
                      <Icon className="h-3 w-3" />
                      {count > 0 && <span className="text-xs">{formatNumber(count)}</span>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{reaction.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* المزيد من التفاعلات */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-2">
                <div className="grid grid-cols-4 gap-1">
                  {reactionTypes.slice(4).map((reaction) => {
                    const Icon = reaction.icon;
                    const count = reactionCounts[reaction.type] || 0;
                    const isActive = userReaction === reaction.type;

                    return (
                      <Tooltip key={reaction.type}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            size="sm"
                            className={`h-10 w-10 p-0 ${reaction.color} ${reaction.bgColor}`}
                            onClick={() => reactionMutation.mutate({ reactionType: reaction.type })}
                            disabled={!user}
                          >
                            <div className="flex flex-col items-center">
                              <Icon className="h-4 w-4" />
                              {count > 0 && <span className="text-xs">{count}</span>}
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{reaction.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* أدوات إضافية */}
          <div className="flex items-center gap-1">
            {/* إحصائيات سريعة */}
            {stats && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{formatNumber(stats.total_views)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>عدد المشاهدات</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{formatNumber(stats.total_replies)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>عدد الردود</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{formatNumber(stats.engagement_score)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>نقاط التفاعل</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* الإشارة المرجعية */}
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => bookmarkMutation.mutate()}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isBookmarked ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* مشاركة */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={shareComment}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>مشاركة التعليق</p>
              </TooltipContent>
            </Tooltip>

            {/* تفاصيل التفاعلات */}
            {reactions.length > 0 && (
              <Dialog open={showReactionDetails} onOpenChange={setShowReactionDetails}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {formatNumber(reactions.length)}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>التفاعلات مع التعليق</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {reactionTypes.map((reactionType) => {
                      const Icon = reactionType.icon;
                      const typeReactions = reactions.filter(r => r.reaction_type === reactionType.type);
                      
                      if (typeReactions.length === 0) return null;

                      return (
                        <div key={reactionType.type} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${reactionType.color}`} />
                            <span className="font-medium">{reactionType.label}</span>
                            <Badge variant="secondary">{typeReactions.length}</Badge>
                          </div>
                          <div className="space-y-1 pl-6">
                            {typeReactions.slice(0, 5).map((reaction) => (
                              <div key={reaction.id} className="text-sm text-muted-foreground">
                                {reaction.profiles?.display_name || 'مستخدم'}
                              </div>
                            ))}
                            {typeReactions.length > 5 && (
                              <div className="text-xs text-muted-foreground">
                                و {typeReactions.length - 5} آخرين
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* عرض ملخص التفاعلات إذا وجدت */}
        {reactions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center -space-x-1">
              {reactionTypes
                .filter(type => reactionCounts[type.type] > 0)
                .slice(0, 3)
                .map((reactionType) => {
                  const Icon = reactionType.icon;
                  return (
                    <div
                      key={reactionType.type}
                      className={`w-5 h-5 rounded-full bg-white border flex items-center justify-center ${reactionType.color}`}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                  );
                })}
            </div>
            <span>
              {reactions.length === 1 
                ? `${reactions[0].profiles?.display_name || 'شخص واحد'} تفاعل مع هذا التعليق`
                : `${formatNumber(reactions.length)} أشخاص تفاعلوا مع هذا التعليق`
              }
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AdvancedCommentInteractions;
