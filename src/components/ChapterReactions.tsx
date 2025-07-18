import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Reaction {
  type: "sad" | "angry" | "surprised" | "love" | "laugh" | "like";
  count: number;
  userReacted: boolean;
}

interface ChapterReactionsProps {
  chapterId: string;
}

const reactionEmojis = {
  sad: "😢",
  angry: "😡",
  surprised: "😮",
  love: "❤️",
  laugh: "😂",
  like: "👍",
};

const reactionLabels = {
  sad: "حزين",
  angry: "غاضب",
  surprised: "متفاجئ",
  love: "أحب",
  laugh: "مضحك",
  like: "أعجبني",
};

const ChapterReactions = ({ chapterId }: ChapterReactionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string>("");

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
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      <h3 className="text-lg font-bold text-center mb-6">تفاعلات</h3>

      <div className="grid grid-cols-6 gap-4">
        {reactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => handleReaction(reaction.type)}
            className={`relative flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
              reaction.userReacted
                ? "border-blue-500 bg-blue-500/20 scale-105"
                : "border-gray-600 bg-gray-800 hover:border-gray-500 hover:scale-105"
            }`}
            disabled={reactionMutation.isPending}
          >
            <span className="text-3xl mb-2">
              {reactionEmojis[reaction.type]}
            </span>
            <span className="text-xl font-bold">{reaction.count}</span>
            <span className="text-xs text-gray-400 mt-1">
              {reactionLabels[reaction.type]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChapterReactions;
