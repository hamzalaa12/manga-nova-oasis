import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  BookOpen,
  Eye,
  Maximize,
  Minimize,
  RotateCcw,
  Download,
  Share2,
  Bookmark,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  parseMangaIdentifier,
  getChapterUrl,
  getMangaUrl,
  getMangaSlug,
} from "@/lib/slug";
import ViewsCounter from "@/components/ViewsCounter";
import ImprovedChapterComments from "@/components/comments/ImprovedChapterComments";
import ReportDialog from "@/components/ReportDialog";
import OptimizedImage from "@/components/OptimizedImage";
import SEO from "@/components/SEO";
import { generatePageMeta, generateStructuredData } from "@/utils/seo";
import { useReadingHistory } from "@/hooks/useReadingHistory";
import { useViewTracking } from "@/hooks/useViewTracking";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";
import ChapterReaderSkeleton from "@/components/ChapterReaderSkeleton";

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

type ReadingMode = "full" | "single" | "double";
type ReadingDirection = "rtl" | "ltr";

interface ReaderSettings {
  mode: ReadingMode;
  direction: ReadingDirection;
  zoom: number;
  autoScroll: boolean;
  scrollSpeed: number;
  showPageNumbers: boolean;
  darkMode: boolean;
  imageQuality: "low" | "medium" | "high";
}

const defaultSettings: ReaderSettings = {
  mode: "full",
  direction: "rtl",
  zoom: 100,
  autoScroll: false,
  scrollSpeed: 50,
  showPageNumbers: true,
  darkMode: true,
  imageQuality: "medium"
};

const ChapterReader = () => {
  const {
    slug,
    chapter: chapterParam,
    id,
  } = useParams<{ slug?: string; chapter?: string; id?: string }>();
  const navigate = useNavigate();
  
  // Core state
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [manga, setManga] = useState<Manga | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterNav[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Reader state
  const [currentPage, setCurrentPage] = useState(0);
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('readerSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  
  // Auto-scroll
  const [autoScrollInterval, setAutoScrollInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const readerRef = useRef<HTMLDivElement>(null);
  const hasTrackedCompletion = useRef(false);
  
  // Hooks
  const { updateReadingProgress } = useReadingHistory();
  const { trackChapterView } = useViewTracking();

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [settings]);

  // Load chapter data
  useEffect(() => {
    setLoading(true);
    setChapter(null);
    setCurrentPage(0);

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

      // Track view
      setTimeout(() => {
        trackChapterView(id!, chapterData.manga_id).catch(() => {});
      }, 100);
    } catch (error: any) {
      console.error("Error fetching chapter details:", error);
      setError('فشل في تحميل الفصل. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterBySlugAndNumber = async () => {
    if (!slug || !chapterParam) return;

    setError(null);
    try {
      const chapterNumber = parseFloat(chapterParam);
      const identifier = parseMangaIdentifier(slug);

      let mangaQuery = supabase.from("manga").select(`
        *,
        chapters!chapters_manga_id_fkey (
          id,
          chapter_number,
          title,
          description,
          pages,
          views_count,
          created_at
        )
      `);

      if (identifier.type === "slug") {
        mangaQuery = mangaQuery.eq("slug", identifier.value);
      } else {
        mangaQuery = mangaQuery.eq("id", identifier.value);
      }

      const { data: mangaWithChapters, error: mangaError } = await mangaQuery.single();

      if (mangaError) throw mangaError;

      const { chapters: allChaptersData, ...mangaData } = mangaWithChapters;
      setManga(mangaData);

      const chapterData = allChaptersData.find(ch => ch.chapter_number === chapterNumber);
      if (!chapterData) {
        throw new Error('الفصل غير موجود');
      }

      setChapter({ ...chapterData, manga_id: mangaData.id });

      const sortedChapters = allChaptersData
        .map(ch => ({ id: ch.id, chapter_number: ch.chapter_number, title: ch.title }))
        .sort((a, b) => a.chapter_number - b.chapter_number);
      setAllChapters(sortedChapters);

      // Track view
      setTimeout(() => {
        trackChapterView(chapterData.id, mangaData.id).catch(() => {});
      }, 500);

    } catch (error: any) {
      console.error("Error fetching chapter by slug and number:", error);
      setError('فشل في تحميل الفصل. تحقق من رابط الصفحة.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation helpers
  const getCurrentChapterIndex = () => {
    return allChapters.findIndex((ch) => ch.id === chapter?.id);
  };

  const getPreviousChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  };

  const getNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
  };

  // Auto-scroll functionality
  const startAutoScroll = useCallback(() => {
    if (autoScrollInterval) return;
    
    const interval = setInterval(() => {
      window.scrollBy({
        top: settings.scrollSpeed,
        behavior: 'smooth'
      });
    }, 100);
    
    setAutoScrollInterval(interval);
  }, [settings.scrollSpeed, autoScrollInterval]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
  }, [autoScrollInterval]);

  useEffect(() => {
    if (settings.autoScroll) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    
    return () => stopAutoScroll();
  }, [settings.autoScroll, startAutoScroll, stopAutoScroll]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    setShowNavigation(scrollY > 100);

    const scrollPercentage = (scrollY + windowHeight) / documentHeight;
    if (scrollPercentage > 0.9 && !hasTrackedCompletion.current && chapter && manga) {
      hasTrackedCompletion.current = true;
      updateReadingProgress(manga.id, chapter.id, chapter.pages.length, true)
        .catch(() => {});
    }
  }, [chapter, manga, updateReadingProgress]);

  const throttledScroll = useThrottledScroll(handleScroll, 150);

  useEffect(() => {
    hasTrackedCompletion.current = false;
    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => window.removeEventListener("scroll", throttledScroll);
  }, [throttledScroll, chapter?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
                      target.tagName === 'TEXTAREA' ||
                      target.isContentEditable ||
                      target.closest('input, textarea, [contenteditable="true"]');

      if (isTyping) return;

      switch (event.key) {
        case "Escape":
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            navigate(-1);
          }
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
        case "ArrowUp":
          if (settings.mode === "single" && currentPage > 0) {
            setCurrentPage(currentPage - 1);
          }
          break;
        case "ArrowDown":
          if (settings.mode === "single" && chapter && currentPage < chapter.pages.length - 1) {
            setCurrentPage(currentPage + 1);
          }
          break;
        case " ":
          event.preventDefault();
          window.scrollBy({
            top: window.innerHeight * 0.8,
            behavior: 'smooth'
          });
          break;
        case "f":
          toggleFullscreen();
          break;
        case "s":
          setShowSettings(!showSettings);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, manga, chapter, allChapters, settings.mode, currentPage, isFullscreen, showSettings]);

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Settings handlers
  const updateSetting = <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <ChapterReaderSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111119] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700"
          >
            إعادة المحاولة
          </Button>
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
            <Button className="bg-red-600 hover:bg-red-700">
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
    <div 
      ref={readerRef}
      className={`min-h-screen ${settings.darkMode ? 'bg-[#111119]' : 'bg-white'} text-white relative`}
      style={{ zoom: `${settings.zoom}%` }}
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

      {/* Enhanced floating controls */}
      {showNavigation && (
        <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
          {/* Settings dropdown */}
          <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="backdrop-blur-sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
              <div className="p-4 space-y-4">
                <h3 className="font-semibold">إعدادات القراءة</h3>
                
                {/* Reading mode */}
                <div className="space-y-2">
                  <Label>نمط القراءة</Label>
                  <Select value={settings.mode} onValueChange={(value: ReadingMode) => updateSetting('mode', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">جميع الصفحات</SelectItem>
                      <SelectItem value="single">صفحة واحدة</SelectItem>
                      <SelectItem value="double">صفحتان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Zoom */}
                <div className="space-y-2">
                  <Label>التكبير: {settings.zoom}%</Label>
                  <Slider
                    value={[settings.zoom]}
                    onValueChange={([value]) => updateSetting('zoom', value)}
                    min={50}
                    max={200}
                    step={10}
                  />
                </div>

                {/* Image quality */}
                <div className="space-y-2">
                  <Label>جودة الصور</Label>
                  <Select value={settings.imageQuality} onValueChange={(value: "low" | "medium" | "high") => updateSetting('imageQuality', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DropdownMenuSeparator />

                {/* Auto-scroll */}
                <div className="flex items-center justify-between">
                  <Label>التمرير التلقائي</Label>
                  <Switch
                    checked={settings.autoScroll}
                    onCheckedChange={(checked) => updateSetting('autoScroll', checked)}
                  />
                </div>

                {settings.autoScroll && (
                  <div className="space-y-2">
                    <Label>سرعة التمرير</Label>
                    <Slider
                      value={[settings.scrollSpeed]}
                      onValueChange={([value]) => updateSetting('scrollSpeed', value)}
                      min={10}
                      max={100}
                      step={10}
                    />
                  </div>
                )}

                <DropdownMenuSeparator />

                {/* Page numbers */}
                <div className="flex items-center justify-between">
                  <Label>عرض أرقام الصفحات</Label>
                  <Switch
                    checked={settings.showPageNumbers}
                    onCheckedChange={(checked) => updateSetting('showPageNumbers', checked)}
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle */}
          <Button size="sm" variant="secondary" onClick={toggleFullscreen} className="backdrop-blur-sm">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          {/* Bookmark */}
          <Button size="sm" variant="secondary" onClick={() => setIsBookmarked(!isBookmarked)} className="backdrop-blur-sm">
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-4 text-center pt-4">
        <h1 className="text-[21px] font-bold leading-[31.5px] text-white mb-2">
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

      {/* Top control bar */}
      <div className="max-w-[1142px] mx-auto px-2.5 mb-5">
        <div className="flex justify-between items-center flex-wrap gap-2">
          {/* Chapter selector */}
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

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {previousChapter ? (
              <Link
                to={getChapterUrl(getMangaSlug(manga), previousChapter.chapter_number)}
                className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-red-600 transition-colors duration-100 flex items-center gap-1"
              >
                <ArrowRight className="h-4 w-4" />
                السابق
              </Link>
            ) : (
              <div className="bg-gray-700 border-2 border-gray-600 rounded-[20px] text-gray-400 text-[13px] font-bold leading-[25px] px-4 py-1 cursor-not-allowed flex items-center gap-1">
                <ArrowRight className="h-4 w-4" />
                السابق
              </div>
            )}

            {nextChapter ? (
              <Link
                to={getChapterUrl(getMangaSlug(manga), nextChapter.chapter_number)}
                className="bg-[#161d1d] border-2 border-red-500 rounded-[20px] text-white text-[13px] font-bold leading-[25px] px-4 py-1 hover:bg-red-600 transition-colors duration-100 flex items-center gap-1"
              >
                التالي
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : (
              <div className="bg-gray-700 border-2 border-gray-600 rounded-[20px] text-gray-400 text-[13px] font-bold leading-[25px] px-4 py-1 cursor-not-allowed flex items-center gap-1">
                التالي
                <ArrowLeft className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Page counter for single mode */}
          {settings.mode === "single" && chapter.pages.length > 0 && (
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
          )}
        </div>
      </div>

      {/* Chapter content */}
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
        ) : settings.mode === "single" ? (
          // Single page mode
          <div className="relative">
            {settings.showPageNumbers && (
              <div className="text-center mb-4 text-muted-foreground">
                صفحة {currentPage + 1} من {chapter.pages.length}
              </div>
            )}
            <OptimizedImage
              src={chapter.pages[currentPage]?.url}
              alt={`صفحة ${currentPage + 1} من ${chapter.pages.length}`}
              priority={true}
              quality={settings.imageQuality}
              enableZoom={true}
            />
            <div className="flex justify-center gap-4 mt-4">
              <Button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                variant="outline"
              >
                <ChevronRight className="h-4 w-4" />
                السابقة
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(chapter.pages.length - 1, currentPage + 1))}
                disabled={currentPage === chapter.pages.length - 1}
                variant="outline"
              >
                التالية
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : settings.mode === "double" ? (
          // Double page mode
          <div className="space-y-4">
            {Array.from({ length: Math.ceil(chapter.pages.length / 2) }, (_, pairIndex) => {
              const leftPageIndex = pairIndex * 2;
              const rightPageIndex = leftPageIndex + 1;
              const leftPage = chapter.pages[leftPageIndex];
              const rightPage = chapter.pages[rightPageIndex];

              return (
                <div key={pairIndex} className="flex gap-4 justify-center">
                  {settings.direction === "rtl" ? (
                    <>
                      {rightPage && (
                        <div className="flex-1 max-w-md">
                          {settings.showPageNumbers && (
                            <div className="text-center mb-2 text-sm text-muted-foreground">
                              صفحة {rightPageIndex + 1}
                            </div>
                          )}
                          <OptimizedImage
                            src={rightPage.url}
                            alt={`صفحة ${rightPageIndex + 1}`}
                            quality={settings.imageQuality}
                            enableZoom={true}
                          />
                        </div>
                      )}
                      <div className="flex-1 max-w-md">
                        {settings.showPageNumbers && (
                          <div className="text-center mb-2 text-sm text-muted-foreground">
                            صفحة {leftPageIndex + 1}
                          </div>
                        )}
                        <OptimizedImage
                          src={leftPage.url}
                          alt={`صفحة ${leftPageIndex + 1}`}
                          quality={settings.imageQuality}
                          enableZoom={true}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 max-w-md">
                        {settings.showPageNumbers && (
                          <div className="text-center mb-2 text-sm text-muted-foreground">
                            صفحة {leftPageIndex + 1}
                          </div>
                        )}
                        <OptimizedImage
                          src={leftPage.url}
                          alt={`صفحة ${leftPageIndex + 1}`}
                          quality={settings.imageQuality}
                          enableZoom={true}
                        />
                      </div>
                      {rightPage && (
                        <div className="flex-1 max-w-md">
                          {settings.showPageNumbers && (
                            <div className="text-center mb-2 text-sm text-muted-foreground">
                              صفحة {rightPageIndex + 1}
                            </div>
                          )}
                          <OptimizedImage
                            src={rightPage.url}
                            alt={`صفحة ${rightPageIndex + 1}`}
                            quality={settings.imageQuality}
                            enableZoom={true}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Full pages mode
          <div className="space-y-2.5">
            {chapter.pages.map((page, index) => (
              <div key={index} className="relative">
                {settings.showPageNumbers && (
                  <div className="text-center mb-2 text-sm text-muted-foreground">
                    صفحة {index + 1} من {chapter.pages.length}
                  </div>
                )}
                <OptimizedImage
                  src={page?.url}
                  alt={`صفحة ${index + 1} من ${chapter.pages.length}`}
                  priority={index < 2}
                  quality={settings.imageQuality}
                  enableZoom={true}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Comments section */}
      {chapter && (
        <div className="bg-background py-8">
          <div className="container mx-auto px-4">
            <details className="group">
              <summary className="cursor-pointer text-lg font-semibold text-white hover:text-red-400 transition-colors text-center">
                عرض التعليقات
                <span className="ml-2 group-open:rotate-180 transition-transform inline-block">▼</span>
              </summary>
              <div className="mt-4">
                <ImprovedChapterComments chapterId={chapter.id} mangaId={manga.id} />
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Views counter */}
      {chapter && <ViewsCounter viewsCount={chapter.views_count} type="chapter" />}
    </div>
  );
};

export default ChapterReader;
