import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChapterCard from "./ChapterCard";
import MangaCardSkeleton from "@/components/ui/manga-card-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChaptersGridProps {
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

const fetchChaptersData = async (showAll: boolean): Promise<Chapter[]> => {
  // الحصول على الفصول من آخر 7 أيام أولاً، ثم الباقي
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
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
    )
    .eq("is_private", false)
    .order("created_at", { ascending: false })
    .limit(showAll ? 100 : 24);

  if (error) throw error;

  // ترتيب الفصول: الحديثة أولاً (آخر 7 أيام) ثم الباقي
  const sortedData = (data || []).sort((a, b) => {
    const aDate = new Date(a.created_at);
    const bDate = new Date(b.created_at);
    const aIsRecent = aDate >= sevenDaysAgo;
    const bIsRecent = bDate >= sevenDaysAgo;

    // الفصول الحديثة أولاً
    if (aIsRecent && !bIsRecent) return -1;
    if (!aIsRecent && bIsRecent) return 1;

    // ضمن نفس الفئة، الأحدث أولاً
    return bDate.getTime() - aDate.getTime();
  });

  return sortedData;
};

const ChaptersGrid = ({
  title = "آخر الفصول",
  showAll = false,
}: ChaptersGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = showAll ? 100 : 36;

  const {
    data: chaptersData = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["chapters-grid", showAll],
    queryFn: () => fetchChaptersData(showAll),
    staleTime: 2 * 60 * 1000, // 2 دقائق (أقل من المانجا لأن الفصول تتحدث أكثر)
    gcTime: 5 * 60 * 1000, // 5 دقائق
  });

  if (error) {
    console.error("Error fetching chapters:", error);
  }

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold">{title}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {Array.from({ length: showAll ? 18 : 12 }).map((_, index) => (
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

  // حساب البيانات المعروضة حسب الصفحة الحالية
  const totalPages = Math.ceil(chaptersData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayData = showAll
    ? chaptersData
    : chaptersData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // التمرير لأعلى الصفحة
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          {displayData.map((chapter) => (
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

        {/* أزرار التنقل بين الصفحات */}
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

export default ChaptersGrid;
