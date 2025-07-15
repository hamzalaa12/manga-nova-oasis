import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { buildChapterUrl } from "@/lib/slug";

/**
 * Component لإعادة توجيه الروابط القديمة للفصول بـ ID إلى الروابط الجديدة بـ slug
 */
const ChapterRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToSlug = async () => {
      if (!id) {
        navigate("/404", { replace: true });
        return;
      }

      try {
        // جلب بيانات الفصل
        const { data: chapterData, error: chapterError } = await supabase
          .from("chapters")
          .select("id, slug, manga_id")
          .eq("id", id)
          .single();

        if (chapterError || !chapterData) {
          navigate("/404", { replace: true });
          return;
        }

        // جلب بيانات المانجا
        const { data: mangaData, error: mangaError } = await supabase
          .from("manga")
          .select("id, slug")
          .eq("id", chapterData.manga_id)
          .single();

        if (mangaError || !mangaData) {
          navigate("/404", { replace: true });
          return;
        }

        // إعادة توجيه للرابط الجديد بـ slug
        if (mangaData.slug && chapterData.slug) {
          const newUrl = buildChapterUrl(chapterData, mangaData);
          navigate(newUrl, { replace: true });
        } else {
          // إذا لم تكن slugs متوفرة، استخدم الـ ID القديم
          navigate(`/read/${id}`, { replace: true });
        }
      } catch (error) {
        console.error("Error redirecting chapter:", error);
        navigate("/404", { replace: true });
      }
    };

    redirectToSlug();
  }, [id, navigate]);

  // عرض loading أثناء إعادة التوجيه
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">جاري إعادة التوجيه...</p>
      </div>
    </div>
  );
};

export default ChapterRedirect;
