import { useState, useMemo } from "react";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import ChapterCard from "./ChapterCard";
import MangaCardSkeleton from "@/components/ui/manga-card-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PERFORMANCE_CONFIG, smartPreload } from "@/utils/performance";

interface OptimizedChaptersGridProps {
  title?: string;
  showAll?: boolean;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  views_count: number;
  is_premium: boolean;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string;
    author: string;
  };
}

// جلب محسن للفصول
const fetchOptimizedChaptersData = async (page: number = 1): Promise<{data: Chapter[], totalCount: number}> => {
  const pageSize = PERFORMANCE_CONFIG.PAGE_SIZES.CHAPTERS;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("chapters")
    .select(
      `
      id,
      chapter_number,
      title,
      created_at,
      views_count,
      is_premium,
      manga!inner (
        id,
        slug,
        title,
        cover_image_url,
        author
      )
    `,
      { count: "exact" }
    )
    .eq("is_private", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  // تحميل مسبق للصور
  if (data?.length) {
    const imageUrls = data.map(chapter => chapter.manga?.cover_image_url).filter(Boolean);
    smartPreload(imageUrls, 'normal');
  }

  return {
    data: data || [],
    totalCount: count || 0
  };
};

const OptimizedChaptersGrid = ({
  title = "آخر الفصول",
  showAll = false,
}: OptimizedChaptersGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: chaptersResponse,
    isLoading: loading,
    error,
  } = useOptimizedQuery({
    queryKey: ["optimized-chapters-grid", currentPage.toString()],
    queryFn: () => fetchOptimizedChaptersData(currentPage),
    cacheType: 'chapters',
  });

  const chaptersData = chaptersResponse?.data || [];
  const totalCount = chaptersResponse?.totalCount || 0;

  // حساب عدد الصفحات
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / PERFORMANCE_CONFIG.PAGE_SIZES.CHAPTERS);
  }, [totalCount]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold">{title}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {Array.from({ length: PERFORMANCE_CONFIG.LAZY_LOADING.SKELETON_COUNT }).map((_, index) => (
              <MangaCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground">حدث خطأ في تحميل الفصول</p>
          </div>
        </div>
      </section>
    );
  }

  if (!loading && chaptersData.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground">لا توجد فصول متاحة حالياً</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {title}
          </h2>
          {!showAll && totalPages > 1 && (
            <div className="text-sm text-muted-foreground">
              صفحة {currentPage} من {totalPages}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {chaptersData.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              id={chapter.id}
              chapter_number={chapter.chapter_number}
              title={chapter.title}
              created_at={chapter.created_at}
              views_count={chapter.views_count || 0}
              is_premium={chapter.is_premium}
              manga={chapter.manga}
            />
          ))}
        </div>

        {/* التنقل المحسن */}
        {!showAll && totalPages > 1 && (
          <div className="flex items-center justify-center mt-12 gap-4">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2"
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-10 h-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default OptimizedChaptersGrid;