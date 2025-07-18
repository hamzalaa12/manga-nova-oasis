import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface FavoriteButtonProps {
  mangaId: string;
  className?: string;
}

const FavoriteButton = ({ mangaId, className = "" }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // التحقق من وجود المانجا في المفضلة
  const { data: isFavorite = false, isLoading } = useQuery({
    queryKey: ["is-favorite", user?.id, mangaId],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("manga_id", mangaId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // تبديل حالة المفضلة
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("يجب تسجيل الدخول لإضافة المفضلة");
      }

      if (isFavorite) {
        // حذف من المفضلة
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("manga_id", mangaId);

        if (error) throw error;
        return false;
      } else {
        // إضافة للمفضلة
        const { error } = await supabase.from("user_favorites").insert({
          user_id: user.id,
          manga_id: mangaId,
        });

        if (error) throw error;
        return true;
      }
    },
    onSuccess: (newFavoriteState) => {
      queryClient.setQueryData(
        ["is-favorite", user?.id, mangaId],
        newFavoriteState,
      );
      queryClient.invalidateQueries({ queryKey: ["user-favorites", user?.id] });

      toast({
        title: newFavoriteState ? "تمت الإضافة!" : "تم الحذف!",
        description: newFavoriteState
          ? "تم إضافة المانجا للمفضلة"
          : "تم حذف المانجا من المفضلة",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث المفضلة",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={() => {
          toast({
            title: "تسجيل الدخول مطلوب",
            description: "يجب تسجيل الدخول لإضافة المفضلة",
            variant: "destructive",
          });
        }}
      >
        <Heart className="h-4 w-4 ml-2" />
        إضافة للمفضلة
      </Button>
    );
  }

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      className={`${className} ${isFavorite ? "bg-red-500 hover:bg-red-600" : ""}`}
      onClick={() => toggleFavoriteMutation.mutate()}
      disabled={isLoading || toggleFavoriteMutation.isPending}
    >
      <Heart className={`h-4 w-4 ml-2 ${isFavorite ? "fill-current" : ""}`} />
      {isLoading ? "..." : isFavorite ? "في المفضلة" : "إضافة للمفضلة"}
    </Button>
  );
};

export default FavoriteButton;
