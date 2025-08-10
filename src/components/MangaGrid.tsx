import { useState, useEffect } from "react";
import MangaCard from "./MangaCard";
import MangaCardSkeleton from "@/components/ui/manga-card-skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOptimizedManga, usePrefetchData } from "@/hooks/useOptimizedData";

interface MangaGridProps {
  title?: string;
  showAll?: boolean;
}

interface Manga {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string;
  rating: number;
  views_count: number;
  status: string;
  genre: string[];
  updated_at: string;
  manga_type: string;
}

// استخدام Hook محسن للبيانات

const MangaGrid = ({
  title = "الأحدث والأكثر شعبية",
  showAll = false,
}: MangaGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { prefetchManga } = usePrefetchData();

  const {
    data: mangaResponse,
    isLoading: loading,
    error,
  } = useOptimizedManga(showAll ? 1 : currentPage, true);

  const mangaData = mangaResponse?.data || [];
  const totalCount = mangaResponse?.totalCount || 0;

  // تحميل مسبق للصفحة التالية
  useEffect(() => {
    if (!showAll && mangaData.length > 0) {
      const nextPage = currentPage + 1;
      const totalPages = Math.ceil(totalCount / 36);
      if (nextPage <= totalPages) {
        // تأخير بسيط لتجنب التحميل الزائد
        const timer = setTimeout(() => {
          prefetchManga(nextPage);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPage, totalCount, mangaData.length, showAll, prefetchManga]);

  if (error) {
    console.error("Error fetching manga:", error);
  }

  const formatLastUpdate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    return "منذ دقائق";
  };

  const getStatusInArabic = (status: string) => {
    switch (status) {
      case "ongoing":
        return "مستمر";
      case "completed":
        return "مكتمل";
      case "hiatus":
        return "متوقف مؤقتاً";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

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
            <p className="text-muted-foreground">حدث خطأ في تحميل البيانات</p>
          </div>
        </div>
      </section>
    );
  }

  if (!loading && mangaData.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground">لا توجد مانجا متاحة حالياً</p>
          </div>
        </div>
      </section>
    );
  }

  // حساب البيانات المعروضة حسب الصفحة الحالية
  const itemsPerPage = 36;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const displayData = mangaData; // البيانات مقسمة بالفعل حسب الصفحة من الخادم

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // التمرير لأعلى الصفحة
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">{title}</h2>
          {!showAll && totalPages > 1 && (
            <div className="text-sm text-muted-foreground">
              صفحة {currentPage} من {totalPages}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {displayData.map((manga) => (
            <MangaCard
              key={manga.id}
              id={manga.id}
              slug={manga.slug}
              title={manga.title}
              cover={manga.cover_image_url || "/placeholder.svg"}
              rating={manga.rating}
              views={manga.views_count}
              status={getStatusInArabic(manga.status)}
              genre={manga.genre?.[0] || manga.manga_type}
              lastUpdate={formatLastUpdate(manga.updated_at)}
            />
          ))}
        </div>

        {/* أزرار التنقل بين ا��صفحات */}
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

export default MangaGrid;
