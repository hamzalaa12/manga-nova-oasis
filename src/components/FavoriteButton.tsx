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

      if (!mangaId) {
        throw new Error("معرف المانجا مطلوب");
      }

      console.log("Toggle favorite for manga:", mangaId, "User:", user.id, "Current state:", isFavorite);

      // Verify manga exists
      const { data: mangaExists, error: mangaCheckError } = await supabase
        .from("manga")
        .select("id")
        .eq("id", mangaId)
        .single();

      if (mangaCheckError || !mangaExists) {
        console.error("Manga not found:", mangaCheckError);
        throw new Error("المانجا غير موجودة");
      }

      if (isFavorite) {
        // حذف من المفضلة
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("manga_id", mangaId);

        if (error) {
          console.error("Error removing from favorites:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            error
          });
          throw new Error(`Failed to remove from favorites: ${error.message || JSON.stringify(error)}`);
        }
        console.log("Successfully removed from favorites");
        return false;
      } else {
        // إضافة للمفضلة
        const { error } = await supabase.from("user_favorites").insert({
          user_id: user.id,
          manga_id: mangaId,
        });

        if (error) {
          console.error("Error adding to favorites:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            error
          });
          throw new Error(`Failed to add to favorites: ${error.message || JSON.stringify(error)}`);
        }
        console.log("Successfully added to favorites");
        return true;
      }
    },
    onSuccess: (newFavoriteState) => {
      console.log("Mutation success, new state:", newFavoriteState);

      // تحديث البيانات فورياً
      queryClient.setQueryData(
        ["is-favorite", user?.id, mangaId],
        newFavoriteState,
      );

      // إعادة تحميل قائمة المفضلة في الملف الشخصي
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });

      toast({
        title: newFavoriteState ? "تمت الإضافة!" : "تم الحذف!",
        description: newFavoriteState
          ? "تم إضافة المانجا للمفضلة"
          : "تم حذف المانجا من المفضلة",
      });
    },
    onError: (error: any) => {
      console.error("Favorite toggle error:", {
        message: error.message,
        stack: error.stack,
        error: error
      });

      let errorMessage = "فشل في تحديث المفضلة";

      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.code) {
        errorMessage = `Database error (${error.code}): ${error.message || 'Unknown error'}`;
      }

      toast({
        title: "خطأ",
        description: errorMessage,
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
