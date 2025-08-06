import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronDown,
  Info,
  Eye,
  Bookmark,
  Settings,
  Menu,
  Flag,
  Grid,
  Book,
  Download,
  Share,
  Star,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  parseMangaIdentifier,
  getChapterUrl,
  getMangaUrl,
  getMangaSlug,
} from "@/lib/slug";
import ViewsCounter from "@/components/ViewsCounter";
import AdvancedComments from "@/components/AdvancedComments";
import ReportDialog from "@/components/ReportDialog";
import SEO from "@/components/SEO";
import { generatePageMeta, generateStructuredData } from "@/utils/seo";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useViewTracking } from "@/hooks/useViewTracking";

interface Chapter {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string;
  description: string;
  pages: any[];
  views_count: number;
  created_at?: string;
}

interface ChapterNav {
  id: string;
  chapter_number: number;
  title: string;
}

interface Manga {
  id: string;
  slug: string;
  title: string;
  author?: string;
  status?: string;
  description?: string;
}

type ReadingMode = "full" | "single";

const ChapterReader = () => {
  const {
    slug,
    chapter: chapterParam,
    id,
  } = useParams<{ slug?: string; chapter?: string; id?: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [manga, setManga] = useState<Manga | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterNav[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>("full");
  const [currentPage, setCurrentPage] = useState(0);
  const { updateReadingProgress } = useReadingHistory();
  const { trackChapterView, trackMangaView } = useViewTracking();

  useEffect(() => {
    if (slug && chapterParam) {
      fetchChapterBySlugAndNumber();
    } else if (id) {
      fetchChapterDetails();
    }
  }, [slug, chapterParam, id]);

  const fetchChapterDetails = async () => {
    setError(null);
    try {
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      const { data: mangaData, error: mangaError } = await supabase
        .from("manga")
        .select("*")
        .eq("id", chapterData.manga_id)
        .single();

      if (mangaError) throw mangaError;
      setManga(mangaData);

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("manga_id", chapterData.manga_id)
        .order("chapter_number", { ascending: true });

      if (chaptersError) throw chaptersError;
      setAllChapters(chaptersData || []);

      // Track chapter view after we have all the data
      setTimeout(() => {
        trackChapterViewOld(id);
      }, 100);
    } catch (error: any) {
      console.error("Error fetching chapter details:", error);
      setError('فشل في تحميل الفصل. يرجى المحاولة مرة أخرى.');
      setChapter(null);
      setManga(null);
    } finally {
      setLoading(false);
    }
  };

  const trackChapterViewOld = async (chapterId: string) => {
    if (!chapterId) {
      console.warn('Cannot track chapter view: chapterId is null or empty');
      return;
    }

    try {
      console.log("📖 Tracking chapter view for ID:", chapterId);

      if (manga && manga.id) {
        await trackChapterView(chapterId, manga.id);
      } else {
        console.warn('Cannot track chapter view: manga data not available');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user && manga && chapter && manga.id && chapter.id) {
        try {
          const progressSaved = await updateReadingProgress(manga.id, chapterId, 1, true);
          if (progressSaved) {
            console.log('✅ Reading progress saved via hook');
          } else {
            console.warn('⚠️ Reading progress update failed - user may not be logged in or have insufficient permissions');
          }
        } catch (progressError) {
          console.error('❌ Error updating reading progress:', progressError);
          console.error('❌ Reading progress error details:', {
            message: progressError?.message || 'Unknown error',
            code: progressError?.code,
            details: progressError?.details,
            hint: progressError?.hint,
            mangaId: manga.id,
            chapterId: chapterId,
            errorType: typeof progressError,
            errorString: String(progressError),
            errorJSON: (() => {
              try {
                return JSON.stringify(progressError, null, 2);
              } catch (e) {
                return 'Could not stringify error: ' + String(e);
              }
            })()
          });
        }
      } else {
        console.log('Skipping reading progress update:', {
          hasUser: !!sessionData.session?.user,
          hasManga: !!manga,
          hasChapter: !!chapter,
          mangaId: manga?.id,
          chapterId: chapter?.id
        });
      }
    } catch (error: any) {
      console.error("�� Error tracking chapter view:", {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        chapterId,
        mangaId: manga?.id,
        errorType: typeof error,
        errorString: String(error),
        errorJSON: JSON.stringify(error, null, 2)
      });
    }
  };

  const fetchChapterBySlugAndNumber = async () => {
    if (!slug || !chapterParam) return;

    setError(null);
    try {
      const chapterNumber = parseFloat(chapterParam);
      const identifier = parseMangaIdentifier(slug);

      let mangaQuery = supabase.from("manga").select("*");

      if (identifier.type === "slug") {
        mangaQuery = mangaQuery.eq("slug", identifier.value);
      } else {
        mangaQuery = mangaQuery.eq("id", identifier.value);
      }

      const { data: mangaData, error: mangaError } = await mangaQuery.single();

      if (mangaError) throw mangaError;
      setManga(mangaData);

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", mangaData.id)
        .eq("chapter_number", chapterNumber)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("manga_id", mangaData.id)
        .order("chapter_number", { ascending: true });

      if (chaptersError) throw chaptersError;
      setAllChapters(chaptersData || []);

      // Track chapter view after we have all the data
      setTimeout(() => {
        trackChapterViewOld(chapterData.id);
      }, 100);
    } catch (error: any) {
      console.error("Error fetching chapter by slug and number:", error);
      setError('فشل في تحميل الفصل. تحقق من رابط الصفحة.');
      setChapter(null);
      setManga(null);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentChapterIndex = () => {
    return allChapters.findIndex((ch) => ch.id === chapter?.id);
  };

  const getPreviousChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  };

  const getNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;
  };

  // Scroll detection
  useEffect(() => {
    let hasTrackedCompletion = false;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      setShowNavigation(scrollY > 100);

      const scrollPercentage = (scrollY + windowHeight) / documentHeight;
      if (scrollPercentage > 0.9 && !hasTrackedCompletion && chapter && manga && chapter.pages.length > 0) {
        hasTrackedCompletion = true;
        updateReadingProgress(manga.id, chapter.id, chapter.pages.length, true)
          .then((success) => {
            if (success) {
              console.log('📖 Chapter marked as completed via scroll');
            } else {
              console.warn('⚠️ Reading progress update failed - user may not be logged in or have insufficient permissions');
            }
          })
          .catch((error) => {
            console.error('❌ Error in scroll completion tracking:', error);
            console.error('❌ Error details:', {
              message: error?.message || 'Unknown error',
              code: error?.code,
              details: error?.details,
              hint: error?.hint,
              mangaId: manga.id,
              chapterId: chapter.id,
              errorType: typeof error,
              errorString: String(error),
              errorJSON: (() => {
                try {
                  return JSON.stringify(error, null, 2);
                } catch (e) {
                  return 'Could not stringify error: ' + String(e);
                }
              })()
            });
          });
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [chapter, manga, updateReadingProgress]);

  // Keyboard navigation and click-to-scroll
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          navigate(-1);
          break;
        case "ArrowLeft":
          const next = getNextChapter();
          if (next && manga) {
            navigate(getChapterUrl(getMangaSlug(manga), next.chapter_number));
          }
          break;
        case "ArrowRight":
          const prev = getPreviousChapter();
          if (prev && manga) {
            navigate(getChapterUrl(getMangaSlug(manga), prev.chapter_number));
          }
          break;
        case " ": // Space key
          event.preventDefault();
          window.scrollBy({
            top: window.innerHeight * 0.8,
            behavior: 'smooth'
          });
          break;
      }
    };

    const handleClick = (event: MouseEvent) => {
      // Only handle clicks on the reading area (not on buttons or other interactive elements)
      const target = event.target as HTMLElement;
      const isInteractiveElement = target.closest('button, select, a, [role="button"], [tabindex]');
      const isMainArea = target.closest('main');

      if (isMainArea && !isInteractiveElement) {
        event.preventDefault();
        window.scrollBy({
          top: window.innerHeight * 0.8,
          behavior: 'smooth'
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [navigate, manga, chapter, allChapters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111119] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-xl font-bold">جاري تحميل الفصل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111119] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-[20px] border-b-2 border-red-800"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!chapter || !manga) {
    return (
      <div className="min-h-screen bg-[#111119] flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4 text-xl">الفصل غير موجود</p>
          <p className="text-gray-400 mb-6">تأكد من صحة الرابط</p>
          <Link to="/">
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-[20px] border-b-2 border-red-800">
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const previousChapter = getPreviousChapter();
  const nextChapter = getNextChapter();

  return (
    <article
      itemScope
      itemType="http://schema.org/CreativeWork"
      className="min-h-screen bg-[#111119] text-white"
    >
      {/* SEO Meta Tags */}
      {chapter && manga && (() => {
        const pageMeta = generatePageMeta('chapter', {
          ...chapter,
          manga: manga
        });
        const pageStructuredData = generateStructuredData('chapter', {
          ...chapter,
          manga: manga
        });

        return (
          <SEO
            title={pageMeta?.title}
            description={pageMeta?.description}
            keywords={pageMeta?.keywords}
            image={pageMeta?.image}
            url={pageMeta?.url}
            canonical={pageMeta?.canonical}
            type={pageMeta?.type}
            structuredData={pageStructuredData}
          />
        );
      })()}

      {/* Header Section */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-4 text-center overflow-hidden">
        <h1
          itemProp="name"
          className="text-[21px] font-bold leading-[31.5px] text-white mb-2"
        >
          {manga.title} الفصل {chapter.chapter_number}
        </h1>
        <div className="text-[13px] leading-[19.5px] text-center">
          <span>جميع الفصول موجودة في </span>
          <Link
            to={getMangaUrl(getMangaSlug(manga))}
            className="text-red-500 hover:text-red-400 font-medium text-[13px] transition-colors duration-100"
          >
            {manga.title}
          </Link>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-5 overflow-hidden rounded-[3px] bg-gray-800/20 p-2.5 text-center">
        <div
          itemScope
          itemType="http://schema.org/BreadcrumbList"
          className="text-[13px] leading-[19.5px] text-center"
        >
          <span
            itemProp="itemListElement"
            itemScope
            itemType="http://schema.org/ListItem"
            className="inline"
          >
            <Link
              itemProp="item"
              to="/"
              className="hover:text-red-400 transition-colors duration-100"
            >
              <span itemProp="name">الرئيسية</span>
            </Link>
          </span>
          <span> › </span>
          <span
            itemProp="itemListElement"
            itemScope
            itemType="http://schema.org/ListItem"
            className="inline"
          >
            <Link
              itemProp="item"
              to={getMangaUrl(getMangaSlug(manga))}
              className="hover:text-red-400 transition-colors duration-100"
            >
              <span itemProp="name">{manga.title}</span>
            </Link>
          </span>
          <span> › </span>
          <span
            itemProp="itemListElement"
            itemScope
            itemType="http://schema.org/ListItem"
            className="inline"
          >
            <span itemProp="name">{manga.title} الفصل {chapter.chapter_number}</span>
          </span>
        </div>
      </div>

      {/* Top Control Bar */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-5 overflow-hidden">
        <div className="flex justify-between items-center flex-wrap gap-2">
          {/* Chapter Selector */}
          <div className="relative">
            <Select
              value={chapter.id}
              onValueChange={(value) => {
                const selectedChapter = allChapters.find(ch => ch.id === value);
                if (selectedChapter && manga) {
                  navigate(getChapterUrl(getMangaSlug(manga), selectedChapter.chapter_number));
                }
              }}
            >
              <SelectTrigger className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] px-2.5 py-1 min-w-[140px]">
                <SelectValue placeholder="اختيار الفصل" />
              </SelectTrigger>
              <SelectContent className="bg-[#161d1d] border-gray-700 max-h-72">
                {allChapters.map((chapterItem) => (
                  <SelectItem
                    key={chapterItem.id}
                    value={chapterItem.id}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    الفصل {chapterItem.chapter_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reading Mode Selector */}
          <div className="relative">
            <Select
              value={readingMode}
              onValueChange={(value: ReadingMode) => setReadingMode(value)}
            >
              <SelectTrigger className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] px-2.5 py-1 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161d1d] border-gray-700">
                <SelectItem value="full" className="text-white hover:bg-gray-700">
                  كل الصفحات
                </SelectItem>
                <SelectItem value="single" className="text-white hover:bg-gray-700">
                  صفحة واحدة
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2 ltr:flex-row">
            {/* Previous Button */}
            {previousChapter && manga ? (
              <Link
                to={getChapterUrl(getMangaSlug(manga), previousChapter.chapter_number)}
                rel="prev"
                className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-red-600 transition-colors duration-100"
              >
                <ArrowRight className="h-4 w-4 inline ml-1" />
                <span>السابق</span>
              </Link>
            ) : (
              <div className="bg-gray-700 border-2 border-gray-600 rounded-[20px] text-gray-400 text-[13px] font-bold leading-[25px] px-4 py-1 cursor-not-allowed">
                <ArrowRight className="h-4 w-4 inline ml-1" />
                <span>السابق</span>
              </div>
            )}

            {/* Next Button */}
            {nextChapter && manga ? (
              <Link
                to={getChapterUrl(getMangaSlug(manga), nextChapter.chapter_number)}
                rel="next"
                className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-red-600 transition-colors duration-100"
              >
                <span>التالي</span>
                <ArrowLeft className="h-4 w-4 inline mr-1" />
              </Link>
            ) : (
              <div className="bg-gray-700 border-2 border-gray-600 rounded-[20px] text-gray-400 text-[13px] font-bold leading-[25px] px-4 py-1 cursor-not-allowed">
                <span>التالي</span>
                <ArrowLeft className="h-4 w-4 inline mr-1" />
              </div>
            )}
          </div>

          {/* Report Button */}
          <ReportDialog
            type="chapter"
            targetId={chapter.id}
            variant="outline"
            className="bg-gray-700 border-2 border-gray-600 rounded-[20px] text-gray-300 text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-gray-600"
          >
            الإبلاغ عن فصل
          </ReportDialog>

          {/* Page Counter for Single Mode */}
          {readingMode === "single" && chapter.pages.length > 0 && (
            <div className="relative">
              <Select
                value={currentPage.toString()}
                onValueChange={(value) => setCurrentPage(parseInt(value))}
              >
                <SelectTrigger className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] px-2.5 py-1 min-w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161d1d] border-gray-700">
                  {chapter.pages.map((_, index) => (
                    <SelectItem
                      key={index}
                      value={index.toString()}
                      className="text-white hover:bg-gray-700"
                    >
                      {index + 1}/{chapter.pages.length}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Chapter Content */}
      <div itemProp="description" className="mx-auto mr-[1%]">
        <main className="max-w-[1142px] mx-auto px-2.5 mb-2.5 text-center relative">
          {chapter.pages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="text-center">
                <p className="text-gray-400 text-xl mb-4">
                  لا توجد صفحات في هذا الفصل
                </p>
                <p className="text-gray-500">يرجى المحاولة لاحقاً</p>
              </div>
            </div>
          ) : readingMode === "single" ? (
            // Single Page Mode
            <div className="relative cursor-pointer" data-reading-area="true">
              {chapter.pages[currentPage] && (
                <img
                  src={chapter.pages[currentPage]?.url || "/placeholder.svg"}
                  alt={`صفحة ${currentPage + 1} من ${chapter.pages.length}`}
                  className="w-full max-w-full object-contain mx-auto select-none"
                  loading="eager"
                  draggable={false}
                />
              )}
            </div>
          ) : (
            // Full Pages Mode
            <div className="space-y-2.5 cursor-pointer" data-reading-area="true">
              {chapter.pages.map((page, index) => (
                <div key={index} className="relative">
                  <img
                    src={page?.url || "/placeholder.svg"}
                    alt={`صفحة ${index + 1} من ${chapter.pages.length}`}
                    className="w-full max-w-full object-contain mx-auto select-none"
                    loading={index < 3 ? "eager" : "lazy"}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Bottom Control Bar */}
        <div className="max-w-[1142px] mx-auto px-2.5 mb-5 overflow-hidden">
          <div className="flex justify-between items-center flex-wrap gap-2">
            {/* Chapter Selector */}
            <div className="relative">
              <Select
                value={chapter.id}
                onValueChange={(value) => {
                  const selectedChapter = allChapters.find(ch => ch.id === value);
                  if (selectedChapter && manga) {
                    navigate(getChapterUrl(getMangaSlug(manga), selectedChapter.chapter_number));
                  }
                }}
              >
                <SelectTrigger className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] px-2.5 py-1 min-w-[140px]">
                  <SelectValue placeholder="اختيار الفصل" />
                </SelectTrigger>
                <SelectContent className="bg-[#161d1d] border-gray-700 max-h-72">
                  {allChapters.map((chapterItem) => (
                    <SelectItem
                      key={chapterItem.id}
                      value={chapterItem.id}
                      className="text-white hover:bg-gray-700 cursor-pointer"
                    >
                      الفصل {chapterItem.chapter_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 ltr:flex-row">
              {/* Previous Button */}
              {previousChapter && manga ? (
                <Link
                  to={getChapterUrl(getMangaSlug(manga), previousChapter.chapter_number)}
                  rel="prev"
                  className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-red-600 transition-colors duration-100"
                >
                  <ArrowRight className="h-4 w-4 inline ml-1" />
                  <span>السابق</span>
                </Link>
              ) : null}

              {/* Next Button */}
              {nextChapter && manga ? (
                <Link
                  to={getChapterUrl(getMangaSlug(manga), nextChapter.chapter_number)}
                  rel="next"
                  className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-red-600 transition-colors duration-100"
                >
                  <span>التالي</span>
                  <ArrowLeft className="h-4 w-4 inline mr-1" />
                </Link>
              ) : null}
            </div>

            {/* Report Button */}
            <ReportDialog
              type="chapter"
              targetId={chapter.id}
              variant="outline"
              className="bg-gray-700 border-2 border-gray-600 rounded-[20px] text-gray-300 text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-gray-600"
            >
              الإبلاغ عن فصل
            </ReportDialog>

            {/* Page Counter for Single Mode */}
            {readingMode === "single" && chapter.pages.length > 0 && (
              <div className="relative">
                <Select
                  value={currentPage.toString()}
                  onValueChange={(value) => setCurrentPage(parseInt(value))}
                >
                  <SelectTrigger className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] px-2.5 py-1 min-w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161d1d] border-gray-700">
                    {chapter.pages.map((_, index) => (
                      <SelectItem
                        key={index}
                        value={index.toString()}
                        className="text-white hover:bg-gray-700"
                      >
                        {index + 1}/{chapter.pages.length}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Metadata (Hidden by default, similar to original) */}
        <div className="hidden max-w-[1142px] mx-auto mb-6 text-center">
          <p className="mb-3.5 mt-0 text-center">
            <strong className="font-bold">
              {manga.title} الفصل {chapter.chapter_number}
            </strong>
            <span> - </span>
            <strong className="font-bold">موقع مانجا</strong>
            <span>, مانجا </span>
            <strong className="font-bold">{manga.title}</strong>
            <span> مترجمة</span>
          </p>
        </div>
      </div>

      {/* Additional metadata section (hidden by default like in the original) */}
      <div className="hidden bg-[#222222] rounded-[3px] text-[13px] leading-[19.5px] mb-4 max-w-[1142px] mx-auto px-2.5">
        <p className="text-[13px] font-bold leading-[19.5px] mb-0 mt-0">
          <span>
            الوسوم: قراءة {manga.title} الفصل {chapter.chapter_number}, مانجا{" "}
            {manga.title} الفصل {chapter.chapter_number}, الفصل {manga.title}{" "}
            الفصل {chapter.chapter_number} اونلاين, الفصل {manga.title} الفصل{" "}
            {chapter.chapter_number} بجوده عاليه,
          </span>
          {chapter.created_at && (
            <time
              dateTime={new Date(chapter.created_at).toISOString()}
              itemProp="datePublished"
              className="inline text-[13px] font-bold leading-[19.5px]"
            >
              {new Date(chapter.created_at).toLocaleDateString('ar')}
            </time>
          )}
          <span>, </span>
          <span
            itemProp="author"
            className="inline text-[13px] font-bold leading-[19.5px]"
          >
            {manga.author || "مجهول"}
          </span>
        </p>
      </div>

      {/* Comments Section */}
      {chapter && (
        <div className="bg-background py-8">
          <div className="container mx-auto px-4">
            <AdvancedComments chapterId={chapter.id} mangaId={manga.id} />
          </div>
        </div>
      )}


      {/* ViewsCounter */}
      <ViewsCounter type="chapter" id={chapter.id} />
    </article>
  );
};

export default ChapterReader;
