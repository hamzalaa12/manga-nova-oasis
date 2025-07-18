import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Reaction {
  type:
    | "sad"
    | "angry"
    | "surprised"
    | "love"
    | "laugh"
    | "like"
    | "fire"
    | "wow"
    | "cry"
    | "party";
  count: number;
  userReacted: boolean;
}

interface ChapterReactionsProps {
  chapterId: string;
}

const reactionEmojis = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
  fire: "🔥",
  party: "🎉",
  cry: "😭",
  surprised: "🤯",
};

const reactionLabels = {
  like: "أ��جبني",
  love: "أحب",
  laugh: "مضحك",
  wow: "رائع",
  sad: "حزين",
  angry: "غاضب",
  fire: "نار",
  party: "احتفال",
  cry: "باكي",
  surprised: "صادم",
};

const reactionColors = {
  like: "from-blue-500 to-blue-600",
  love: "from-red-500 to-pink-600",
  laugh: "from-yellow-500 to-orange-600",
  wow: "from-purple-500 to-purple-600",
  sad: "from-blue-400 to-blue-500",
  angry: "from-red-600 to-red-700",
  fire: "from-orange-500 to-red-600",
  party: "from-pink-500 to-purple-600",
  cry: "from-blue-500 to-cyan-600",
  surprised: "from-green-500 to-teal-600",
};

const ChapterReactions = ({ chapterId }: ChapterReactionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string>("");
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  useEffect(() => {
    // إنشاء session ID للمستخدمين غير المسجلين
    if (!user) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(id);
    }
  }, [user]);

  // جلب التفاعلات
  const { data: reactions = [] } = useQuery({
    queryKey: ["chapter-reactions", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_reactions")
        .select("reaction_type, user_id, session_id")
        .eq("chapter_id", chapterId);

      if (error) throw error;

      // تجميع التفاعلات
      const reactionCounts: Record<
        string,
        { count: number; userReacted: boolean }
      > = {};

      Object.keys(reactionEmojis).forEach((type) => {
        const typeReactions = data.filter((r) => r.reaction_type === type);
        const userReacted = user
          ? typeReactions.some((r) => r.user_id === user.id)
          : typeReactions.some((r) => r.session_id === sessionId);

        reactionCounts[type] = {
          count: typeReactions.length,
          userReacted,
        };
      });

      return Object.entries(reactionCounts).map(([type, data]) => ({
        type: type as keyof typeof reactionEmojis,
        count: data.count,
        userReacted: data.userReacted,
      }));
    },
    staleTime: 30 * 1000, // 30 ثانية
  });

  // طفرة إضافة/إزالة التفاعل
  const reactionMutation = useMutation({
    mutationFn: async ({
      reactionType,
      action,
    }: {
      reactionType: string;
      action: "add" | "remove";
    }) => {
      if (action === "add") {
        // إزالة التفاعلات الأخرى أولاً
        if (user) {
          await supabase
            .from("chapter_reactions")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("chapter_reactions")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("session_id", sessionId);
        }

        // إضافة التفاعل الجديد
        const { error } = await supabase.from("chapter_reactions").insert({
          chapter_id: chapterId,
          user_id: user?.id || null,
          session_id: user ? null : sessionId,
          reaction_type: reactionType,
        });

        if (error) throw error;
      } else {
        // إزالة التفاعل
        if (user) {
          await supabase
            .from("chapter_reactions")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("user_id", user.id)
            .eq("reaction_type", reactionType);
        } else {
          await supabase
            .from("chapter_reactions")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("session_id", sessionId)
            .eq("reaction_type", reactionType);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapter-reactions", chapterId],
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل التفاعل",
        variant: "destructive",
      });
    },
  });

  const handleReaction = (reactionType: keyof typeof reactionEmojis) => {
    const reaction = reactions.find((r) => r.type === reactionType);
    const action = reaction?.userReacted ? "remove" : "add";

    reactionMutation.mutate({ reactionType, action });

    // إضافة تأثير بصري فوري
    if (!reaction?.userReacted) {
      toast({
        title: "تم التفاعل!",
        description: `تم إضافة ${reactionLabels[reactionType]}`,
        duration: 2000,
      });
    }
  };

  // حساب إجمالي التفاعلات
  const totalReactions = reactions.reduce(
    (sum, reaction) => sum + reaction.count,
    0,
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl shadow-2xl">
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            تفاعلات الفصل
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {totalReactions > 0
              ? `${totalReactions} تفاعل`
              : "كن أول من يتفاعل!"}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {reactions.map((reaction) => (
            <button
              key={reaction.type}
              onClick={() => handleReaction(reaction.type)}
              onMouseEnter={() => setHoveredReaction(reaction.type)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`
                relative group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 transform
                ${
                  reaction.userReacted
                    ? `border-transparent bg-gradient-to-br ${reactionColors[reaction.type]} scale-105 shadow-lg`
                    : "border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:scale-105 hover:shadow-lg"
                }
                ${hoveredReaction === reaction.type ? "animate-pulse" : ""}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              disabled={reactionMutation.isPending}
            >
              {/* تأثير الوهج للتفاعل النشط */}
              {reaction.userReacted && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br opacity-20 animate-pulse" />
              )}

              <span
                className={`
                text-4xl mb-2 transition-transform duration-200
                ${hoveredReaction === reaction.type ? "scale-125" : ""}
                ${reaction.userReacted ? "animate-bounce" : ""}
              `}
              >
                {reactionEmojis[reaction.type]}
              </span>

              <span
                className={`
                text-lg font-bold transition-colors duration-200
                ${reaction.userReacted ? "text-white" : "text-gray-300"}
              `}
              >
                {reaction.count}
              </span>

              <span
                className={`
                text-xs mt-1 transition-colors duration-200
                ${reaction.userReacted ? "text-white/90" : "text-gray-400"}
              `}
              >
                {reactionLabels[reaction.type]}
              </span>

              {/* مؤشر التحميل */}
              {reactionMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* تولتيب عند التمرير */}
              <div
                className={`
                absolute -top-12 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded
                transition-opacity duration-200 pointer-events-none z-10
                ${hoveredReaction === reaction.type ? "opacity-100" : "opacity-0"}
              `}
              >
                {reaction.userReacted ? "إلغاء" : "إضافة"}{" "}
                {reactionLabels[reaction.type]}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            </button>
          ))}
        </div>

        {/* إحصائيات إضافية */}
        {totalReactions > 0 && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                التفاعلات الأكثر شيوعاً:
              </p>
              <div className="flex justify-center gap-2">
                {reactions
                  .filter((r) => r.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 3)
                  .map((reaction, index) => (
                    <span
                      key={reaction.type}
                      className="flex items-center gap-1 text-sm"
                    >
                      <span className="text-lg">
                        {reactionEmojis[reaction.type]}
                      </span>
                      <span className="text-gray-300">{reaction.count}</span>
                      {index === 0 && (
                        <span className="text-yellow-500">👑</span>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* رسالة تشجيعية للمستخدمين الجدد */}
        {totalReactions === 0 && (
          <div className="mt-6 text-center p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <p className="text-blue-300 text-sm">
              شاركنا رأيك في هذا الفصل! تفاعلك يساعد الآخرين في اكتشاف أفضل
              المحتوى 🌟
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterReactions;
