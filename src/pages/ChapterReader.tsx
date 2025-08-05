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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useUserPermissions } from "@/hooks/useUserPermissions\";s\";rPermissions";

interface Chapter {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string;
  description: string;
  pages: any[];
  views_count: number;
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
}

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
  const { updateReadingProgress } = useReadingHistory();
  const { trackChapterView, trackMangaView } = useViewTracking();
  const { canRead, isCompletelyBanned } = useUserPermissions();

  useEffect(() => {
    if (slug && chapterParam) {
      // New format: /read/manga-slug/chapter-number
      fetchChapterBySlugAndNumber();
    } else if (id) {
      // Old format: /read/chapter-id (for backward compatibility)
      fetchChapterDetails();
    }
  }, [slug, chapterParam, id]);

  const fetchChapterDetails = async () => {
    setError(null);
    try {
      // Fetch chapter details
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", id)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      // Fetch manga details
      const { data: mangaData, error: mangaError } = await supabase
        .from("manga")
        .select("id, slug, title")
        .eq("id", chapterData.manga_id)
        .single();

      if (mangaError) throw mangaError;
      setManga(mangaData);

      // Fetch all chapters for navigation
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("manga_id", chapterData.manga_id)
        .order("chapter_number", { ascending: true });

      if (chaptersError) throw chaptersError;
      setAllChapters(chaptersData || []);

      // Track view using the new system
      await trackChapterViewOld(id);
    } catch (error: any) {
      console.error("Error fetching chapter details:", {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        chapterId: id,
        error: error
      });

      // إظهار رسالة خطأ للم��تخدم
      setError('فشل في تحميل الفصل. يرجى المحاولة مرة أخرى.');
      setChapter(null);
      setManga(null);
    } finally {
      setLoading(false);
    }
  };

  const trackChapterViewOld = async (chapterId: string) => {
    try {
      console.log("📖 Tracking chapter view for ID:", chapterId);

      // Track chapter view using new system
      await trackChapterView(chapterId);

      // Track manga view as well
      if (manga) {
        await trackMangaView(manga.id);
      }

      // Save reading progress for logged users
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user && manga && chapter) {
        try {
          await updateReadingProgress(manga.id, chapterId, 1, true);
          console.log('✅ Reading progress saved via hook');
        } catch (hookError) {
          console.error('Hook failed, trying direct save:', hookError);

          // نسخ احتياطي مباشر
          const { error: progressError } = await supabase
            .from('reading_progress')
            .upsert({
              user_id: sessionData.session.user.id,
              manga_id: manga.id,
              chapter_id: chapterId,
              page_number: 1,
              completed: true,
              last_read_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,manga_id,chapter_id'
            });

          if (progressError) {
            console.error('Error saving reading progress:', progressError);
          } else {
            console.log('✅ Reading progress saved directly');
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Error tracking chapter view:", {
        message: error?.message || 'Unknown error',
        chapterId,
        error: error
      });
      // Don't fail the page load if view tracking fails
    }
  };



  const fetchChapterBySlugAndNumber = async () => {
    if (!slug || !chapterParam) return;

    setError(null);
    try {
      const chapterNumber = parseFloat(chapterParam);
      const identifier = parseMangaIdentifier(slug);

      // First, find the manga by slug or ID
      let mangaQuery = supabase.from("manga").select("id, slug, title");

      if (identifier.type === "slug") {
        mangaQuery = mangaQuery.eq("slug", identifier.value);
      } else {
        mangaQuery = mangaQuery.eq("id", identifier.value);
      }

      const { data: mangaData, error: mangaError } = await mangaQuery.single();

      if (mangaError) throw mangaError;
      setManga(mangaData);

      // Then find the chapter by manga_id and chapter_number
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("manga_id", mangaData.id)
        .eq("chapter_number", chapterNumber)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      // Fetch all chapters for navigation
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title")
        .eq("manga_id", mangaData.id)
        .order("chapter_number", { ascending: true });

      if (chaptersError) throw chaptersError;
      setAllChapters(chaptersData || []);

      // Track chapter view
      await trackChapterViewOld(chapterData.id);
    } catch (error: any) {
      console.error("Error fetching chapter by slug and number:", {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: error
      });

      // إظهار رسالة خطأ للمستخدم
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

  // Scroll detection for navigation visibility and completion tracking
  useEffect(() => {
    let hasTrackedCompletion = false;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show navigation when scrolled down more than 100px
      setShowNavigation(scrollY > 100);

      // Track completion when user reaches 90% of the page
      const scrollPercentage = (scrollY + windowHeight) / documentHeight;
      if (scrollPercentage > 0.9 && !hasTrackedCompletion && chapter && manga) {
        hasTrackedCompletion = true;
        updateReadingProgress(manga.id, chapter.id, chapter.pages.length, true);
        console.log('📖 Chapter marked as completed via scroll');
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [chapter, manga, updateReadingProgress]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          navigate(-1);
          break;
        case "ArrowLeft":
          // التالي (للغ�� العربية)
          const next = getNextChapter();
          if (next && manga) {
            navigate(getChapterUrl(getMangaSlug(manga), next.chapter_number));
          }
          break;
        case "ArrowRight":
          // السابق (للغة العربية)
          const prev = getPreviousChapter();
          if (prev && manga) {
            navigate(getChapterUrl(getMangaSlug(manga), prev.chapter_number));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, manga, chapter, allChapters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>جاري تحميل الفصل...</p>
        </div>
      </div>
    );
  }

  // Check if user is banned from reading
  if (!canRead()) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold mb-2">تم منعك من القراءة</h2>
          <p className="text-gray-300 mb-4">
            {isCompletelyBanned()
              ? "تم حظرك بشكل كامل من استخدام الموقع"
              : "تم منعك من قراءة المحتوى مؤقتاً"}
          </p>
          <Link to="/">
            <Button
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-red-500 text-6xl mb-4">⚠���</div>
          <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!chapter || !manga) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4 text-xl">الفصل غير موجود</p>
          <p className="text-gray-400 mb-6">تأكد من صحة الرابط</p>
          <Link to="/">
            <Button
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
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
    <div className="min-h-screen bg-black text-white">
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

      {/* شريط التنقل العلوي - يظهر عند التمرير */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md shadow-lg transition-transform duration-300 ${
          showNavigation ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* الجهة اليسرى - أيقونات الإجراءات */}
            <div className="flex items-center gap-3">
              <Link to={getMangaUrl(getMangaSlug(manga))}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 border border-white/20 rounded-full w-10 h-10 p-0"
                  title="معلومات المانجا"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </Link>

              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                <span className="text-white text-sm font-medium">
                  {getCurrentChapterIndex() + 1} / {allChapters.length}
                </span>
              </div>
            </div>

            {/* الوسط - عنوان المانجا والفصل */}
            <div className="text-center flex-1 px-4">
              <h1 className="text-lg font-bold text-white truncate">
                <Link
                  to={getMangaUrl(getMangaSlug(manga))}
                  className="hover:text-blue-300 transition-colors"
                >
                  {manga.title}
                </Link>
                {" - الفصل "}
                {chapter.chapter_number}
              </h1>
              <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
                <Link
                  to="/"
                  className="hover:text-white transition-colors"
                >
                  ال��ئيسية
                </Link>
                <span>/</span>
                <Link
                  to={getMangaUrl(getMangaSlug(manga))}
                  className="hover:text-white transition-colors"
                >
                  {manga.title}
                </Link>
                <span>/</span>
                <span>الفصل {chapter.chapter_number}</span>
              </div>
            </div>

            {/* الجهة اليمنى - م��تقي الفصول */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 border border-white/20 rounded-full w-10 h-10 p-0"
                title="القائمة"
              >
                <Menu className="h-4 w-4" />
              </Button>

              {/* زر الإبلاغ */}
              <ReportDialog
                type="chapter"
                targetId={chapter.id}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 border border-white/20 rounded-full w-10 h-10 p-0"
              >
                <Flag className="h-4 w-4" />
              </ReportDialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium border border-gray-600"
                  >
                    {chapter.chapter_number}
                    <ChevronDown className="h-4 w-4 mr-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 max-h-72 overflow-y-auto bg-gray-900 border-gray-700 shadow-xl"
                >
                  {allChapters.map((chapterItem) => (
                    <DropdownMenuItem
                      key={chapterItem.id}
                      className={`cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700 p-3 ${
                        chapterItem.id === chapter.id
                          ? "bg-blue-600 text-white"
                          : ""
                      }`}
                      onClick={() =>
                        navigate(
                          getChapterUrl(
                            getMangaSlug(manga),
                            chapterItem.chapter_number,
                          ),
                        )
                      }
                    >
                      <div className="flex flex-col w-full">
                        <span className="font-medium">
                          الفصل {chapterItem.chapter_number}
                        </span>
                        {chapterItem.title && (
                          <span className="text-xs text-gray-400 mt-1">
                            {chapterItem.title}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي - صفحات الفصل */}
      <main className="pt-4 pb-4">
        {chapter.pages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center">
              <p className="text-gray-400 text-xl mb-4">
                لا توجد صفحات في هذا الفصل
              </p>
              <p className="text-gray-500">يرجى المحاولة لاحقا��</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4">
            {/* عرض جميع الصفحات عمودياً */}
            <div className="space-y-1">
              {chapter.pages.map((page, index) => (
                <div key={index} className="relative group">
                  <img
                    src={page?.url || "/placeholder.svg"}
                    alt={`صفحة ${index + 1} من ${chapter.pages.length}`}
                    className="w-full max-w-full object-contain bg-gray-900 rounded-lg shadow-lg transition-transform duration-200 group-hover:scale-[1.01]"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  {/* رقم الصفحة */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {index + 1} / {chapter.pages.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* التعليقات */}
      {chapter && (
        <div className="bg-background py-8">
          <div className="container mx-auto px-4">
            <AdvancedComments chapterId={chapter.id} mangaId={manga.id} />
          </div>
        </div>
      )}

      {/* شريط التنقل السفلي - يظهر عند التمرير */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md shadow-lg transition-transform duration-300 ${
          showNavigation ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* الفصل السابق */}
            <div className="flex-1">
              {previousChapter && manga ? (
                <Link
                  to={getChapterUrl(
                    getMangaSlug(manga),
                    previousChapter.chapter_number,
                  )}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 px-4 py-2 rounded-lg font-medium w-full"
                  >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    السابق
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="bg-gray-800 border-gray-700 text-gray-500 px-4 py-2 rounded-lg font-medium cursor-not-allowed w-full"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  السابق
                </Button>
              )}
            </div>

            {/* معلومات الفصل الحالي */}
            <div className="text-center px-4">
              <div className="text-sm font-medium text-white">
                {getCurrentChapterIndex() + 1}
              </div>
            </div>

            {/* الفصل التالي */}
            <div className="flex-1">
              {nextChapter && manga ? (
                <Link
                  to={getChapterUrl(
                    getMangaSlug(manga),
                    nextChapter.chapter_number,
                  )}
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium w-full"
                  >
                    التالي
                    <ArrowLeft className="h-4 w-4 mr-2" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled
                  className="bg-gray-800 text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed w-full"
                >
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterReader;
