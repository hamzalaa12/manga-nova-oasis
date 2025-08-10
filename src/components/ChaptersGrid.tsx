import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ChapterCard from "./ChapterCard";
import MangaCardSkeleton from "@/components/ui/manga-card-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, Filter, SortAsc, SortDesc } from "lucide-react";

interface ChaptersGridProps {
  title?: string;
  showAll?: boolean;
  enableFilters?: boolean;
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
    rating?: number;
  };
}

type SortOption = "latest" | "oldest" | "popular" | "rating";

// Enhanced fetch function with better error handling and performance
const fetchChaptersData = async (
  showAll: boolean, 
  page: number = 1,
  sortBy: SortOption = "latest"
): Promise<{data: Chapter[], totalCount: number}> => {
  const pageSize = showAll ? 12 : 24;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Optimized query with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Determine sort order
    let orderBy: { column: string; ascending: boolean };
    switch (sortBy) {
      case "oldest":
        orderBy = { column: "created_at", ascending: true };
        break;
      case "popular":
        orderBy = { column: "views_count", ascending: false };
        break;
      case "latest":
      default:
        orderBy = { column: "created_at", ascending: false };
        break;
    }

    // Separate queries to avoid complex joins that might timeout
    const [chaptersResponse, countResponse] = await Promise.all([
      supabase
        .from("chapters")
        .select(`
          id,
          chapter_number,
          title,
          created_at,
          views_count,
          is_premium,
          manga_id
        `)
        .eq("is_private", false)
        .order(orderBy.column, { ascending: orderBy.ascending })
        .range(from, to),

      supabase
        .from("chapters")
        .select("id", { count: "exact", head: true })
        .eq("is_private", false)
    ]);

    clearTimeout(timeoutId);

    if (chaptersResponse.error) throw chaptersResponse.error;
    if (countResponse.error) throw countResponse.error;

    // Get manga details for the chapters
    const chapters = chaptersResponse.data || [];
    const mangaIds = [...new Set(chapters.map(ch => ch.manga_id))];

    let mangaData: any[] = [];
    if (mangaIds.length > 0) {
      const { data: mangaResponse, error: mangaError } = await supabase
        .from("manga")
        .select("id, slug, title, cover_image_url, author, rating")
        .in("id", mangaIds);

      if (!mangaError) {
        mangaData = mangaResponse || [];
      }
    }

    // Combine chapter and manga data
    const enrichedChapters = chapters.map(chapter => {
      const manga = mangaData.find(m => m.id === chapter.manga_id);
      return {
        ...chapter,
        manga: manga || {
          id: chapter.manga_id,
          slug: 'unknown',
          title: 'Unknown Manga',
          cover_image_url: '/placeholder.svg',
          author: 'Unknown',
          rating: 0
        }
      };
    });

    return {
      data: enrichedChapters,
      totalCount: countResponse.count || 0
    };
  } catch (error: any) {
    const errorMessage = error?.message || error?.code || String(error);

    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('طلب التحميل انتهت صلاحيته. يرجى المحاولة مرة أخرى.');
    }

    if (errorMessage.includes('Failed to fetch')) {
      throw new Error('فشل في الاتصال بالخادم. تحقق من اتصالك بالإنترنت.');
    }

    if (errorMessage.includes('timeout')) {
      throw new Error('انتهت مهلة الاستعلام. يرجى المحاولة مرة أخرى.');
    }

    console.error('Error fetching chapters:', errorMessage);
    throw new Error(errorMessage);
  }
};

const ChaptersGrid = ({
  title = "آخر الفصول",
  showAll = false,
  enableFilters = false
}: ChaptersGridProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [filterPremium, setFilterPremium] = useState<"all" | "free" | "premium">("all");

  const {
    data: chaptersResponse,
    isLoading: loading,
    error,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ["chapters-grid", showAll, currentPage, sortBy],
    queryFn: () => fetchChaptersData(showAll, currentPage, sortBy),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000, // 15 minutes in memory
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('timeout') || error?.message?.includes('Failed to fetch')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(2000 * 2 ** attemptIndex, 10000),
  });

  const chaptersData = chaptersResponse?.data || [];
  const totalCount = chaptersResponse?.totalCount || 0;

  // Client-side filtering for search and premium filter
  const filteredChapters = useMemo(() => {
    let filtered = chaptersData;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(chapter => 
        chapter.manga.title.toLowerCase().includes(searchLower) ||
        chapter.title?.toLowerCase().includes(searchLower) ||
        chapter.manga.author.toLowerCase().includes(searchLower)
      );
    }

    // Premium filter
    if (filterPremium !== "all") {
      filtered = filtered.filter(chapter => 
        filterPremium === "premium" ? chapter.is_premium : !chapter.is_premium
      );
    }

    return filtered;
  }, [chaptersData, searchTerm, filterPremium]);

  if (error) {
    const errorMessage = error?.message || error?.code || String(error);
    console.error("Error fetching chapters:", errorMessage);
  }

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold">{title}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {Array.from({ length: 18 }).map((_, index) => (
              <MangaCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    const errorMessage = error?.message || error?.code || 'خطأ غير معروف';
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground mb-4">حدث خطأ في تحميل الفصول</p>
            <p className="text-sm text-red-400 mb-4">{errorMessage}</p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2"
              >
                {isFetching ? 'جاري المحاولة...' : 'إعادة المحاولة'}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                إعادة تحميل الصفحة
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const itemsPerPage = showAll ? 12 : 24;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header with title and page info */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {title}
          </h2>
          {!showAll && totalPages > 1 && (
            <div className="text-sm text-muted-foreground">
              صفحة {currentPage} من {totalPages} • {totalCount} فصل
            </div>
          )}
        </div>

        {/* Enhanced filters and search */}
        {enableFilters && (
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-border/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في الفصول والمانجا..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <SelectValue placeholder="ترتيب حسب" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">الأحدث</SelectItem>
                  <SelectItem value="oldest">الأقدم</SelectItem>
                  <SelectItem value="popular">الأكثر مشاهدة</SelectItem>
                  <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                </SelectContent>
              </Select>

              {/* Premium filter */}
              <Select value={filterPremium} onValueChange={(value: "all" | "free" | "premium") => setFilterPremium(value)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="نوع المحتوى" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع ��لفصول</SelectItem>
                  <SelectItem value="free">مجاني فقط</SelectItem>
                  <SelectItem value="premium">مدفوع فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filters display */}
            {(searchTerm || filterPremium !== "all") && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
                {searchTerm && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="h-7 px-2 text-xs"
                  >
                    بحث: {searchTerm} ×
                  </Button>
                )}
                {filterPremium !== "all" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFilterPremium("all")}
                    className="h-7 px-2 text-xs"
                  >
                    {filterPremium === "premium" ? "مدفوع" : "مجاني"} ×
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results count */}
        {enableFilters && filteredChapters.length !== chaptersData.length && (
          <div className="text-sm text-muted-foreground mb-4">
            عرض {filteredChapters.length} من أصل {chaptersData.length} فصل
          </div>
        )}

        {/* Chapters grid */}
        {(!loading && (enableFilters ? filteredChapters : chaptersData).length === 0) ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold mb-2">
              {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد فصول متاحة حالياً"}
            </h2>
            <p className="text-muted-foreground">
              {searchTerm ? "جرب البحث بكلمات أخرى" : "تحقق مرة أخرى لاحقاً للحصول على فصول جديدة"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {(enableFilters ? filteredChapters : chaptersData).map((chapter) => (
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
        )}

        {/* Enhanced pagination */}
        {!showAll && totalPages > 1 && !enableFilters && (
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
