import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Component لإعادة توجيه الروابط القديمة بـ ID إلى الروابط الجديدة بـ slug
 */
const MangaRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToSlug = async () => {
      if (!id) {
        navigate("/404", { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase
          .from("manga")
          .select("slug")
          .eq("id", id)
          .single();

        if (error || !data) {
          navigate("/404", { replace: true });
          return;
        }

        // إعادة توجيه للرابط الجديد بـ slug
        navigate(`/manga/${data.slug}`, { replace: true });
      } catch (error) {
        console.error("Error redirecting:", error);
        navigate("/404", { replace: true });
      }
    };

    redirectToSlug();
  }, [id, navigate]);

  // عرض loading أثناء إعادة التوجيه
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">جاري إعادة التوجيه...</p>
      </div>
    </div>
  );
};

export default MangaRedirect;
