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
  const [showUI, setShowUI] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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
      await trackChapterView(id);
    } catch (error) {
      console.error("Error fetching chapter details:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackChapterView = async (chapterId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if user is logged in
      if (sessionData.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      await supabase.functions.invoke("track-view", {
        body: {
          mangaId: chapterId,
          type: "chapter",
        },
        headers,
      });
    } catch (error) {
      console.error("Error tracking chapter view:", error);
      // Don't fail the page load if view tracking fails
    }
  };

  const fetchChapterBySlugAndNumber = async () => {
    if (!slug || !chapterParam) return;

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
      await trackChapterView(chapterData.id);
    } catch (error) {
      console.error("Error fetching chapter by slug and number:", error);
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

  // Scroll detection for auto-hide UI
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;

    if (currentScrollY < 50) {
      // Near top of page, always show UI
      setShowUI(true);
      setScrollDirection("up");
    } else if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
      // Only update if scrolled more than 10px to avoid jitter
      if (currentScrollY > lastScrollY.current) {
        // Scrolling down - hide UI
        setScrollDirection("down");
        setShowUI(false);
      } else {
        // Scrolling up - show UI
        setScrollDirection("up");
        setShowUI(true);
      }
    }

    lastScrollY.current = currentScrollY;

    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Show UI after user stops scrolling for 2 seconds
    scrollTimeout.current = setTimeout(() => {
      setShowUI(true);
    }, 2000);
  }, []);

  // Scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleScroll]);

  // Touch/click events to toggle UI visibility
  const handleUIToggle = useCallback(() => {
    setShowUI(!showUI);
  }, [showUI]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          navigate(-1);
          break;
        case " ": // Spacebar to toggle UI
          event.preventDefault();
          handleUIToggle();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, handleUIToggle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  if (!chapter || !manga) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">الفصل غير موجود</p>
          <Link to="/">
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  const previousChapter = getPreviousChapter();
  const nextChapter = getNextChapter();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Title Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm transition-transform duration-300 ease-in-out ${
          showUI ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left Action Icons - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Info className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Bookmark className="h-3 w-3 lg:h-4 lg:w-4" />
              </Button>
            </div>

            {/* Center Title */}
            <div className="text-center flex-1 px-2">
              <Link
                to={`/manga/${manga.id}`}
                className="hover:text-blue-400 transition-colors"
              >
                <h1 className="text-sm sm:text-lg font-bold text-white hover:text-blue-400 truncate">
                  {manga.title} - {chapter.chapter_number}
                </h1>
              </Link>
            </div>

            {/* Right Breadcrumb - Simplified on mobile */}
            <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">
              {chapter.chapter_number} / {manga.title} /{" "}
              <Link to="/" className="hover:text-white">
                الرئيسية
              </Link>
            </div>

            {/* Mobile home button */}
            <div className="sm:hidden">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 transition-transform duration-300 ease-in-out ${
          showUI ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Left Navigation */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to={getMangaUrl(getMangaSlug(manga))}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  <span className="hidden sm:inline">العودة</span>
                  <span className="sm:hidden">←</span>
                </Button>
              </Link>

              {/* Next Chapter Button - Hidden on mobile nav */}
              {nextChapter && manga && (
                <Link
                  to={getChapterUrl(
                    getMangaSlug(manga),
                    nextChapter.chapter_number,
                  )}
                  className="hidden sm:block"
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                  >
                    التالي →
                  </Button>
                </Link>
              )}
            </div>

            {/* Center Chapter Info - Simplified on mobile */}
            <div className="text-center flex-1 px-2">
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                الفصل {chapter.chapter_number}
                {chapter.title && (
                  <span className="hidden sm:inline">: {chapter.title}</span>
                )}
              </p>
            </div>

            {/* Right Chapter Selector */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-4 py-2 rounded min-w-[40px] sm:min-w-[60px] text-xs sm:text-sm"
                  >
                    {chapter.chapter_number}
                    <ChevronDown className="h-3 w-3 mr-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 max-h-64 overflow-y-auto bg-gray-800 border-gray-700"
                >
                  {allChapters.map((chapterItem) => (
                    <DropdownMenuItem
                      key={chapterItem.id}
                      className={`cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700 ${
                        chapterItem.id === chapter.id
                          ? "bg-gray-700 text-white"
                          : ""
                      }`}
                      onClick={() =>
                        manga &&
                        navigate(
                          getChapterUrl(
                            getMangaSlug(manga),
                            chapterItem.chapter_number,
                          ),
                        )
                      }
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          الفصل {chapterItem.chapter_number}
                        </span>
                        {chapterItem.title && (
                          <span className="text-xs text-gray-400">
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

      {/* Main Content - Vertical Layout */}
      <main
        className={`transition-all duration-300 ease-in-out ${
          showUI ? "pt-32 pb-20" : "pt-4 pb-4"
        }`}
      >
        {/* Click overlay for UI toggle */}
        <div
          className="fixed inset-0 z-10"
          onClick={handleUIToggle}
          style={{ pointerEvents: showUI ? "none" : "auto" }}
        />

        {chapter.pages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <p className="text-gray-400">لا توجد صفحات في هذا الفصل</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            {/* All Pages Displayed Vertically */}
            {chapter.pages.map((page, index) => (
              <div key={index} className="mb-1 sm:mb-2">
                <img
                  src={page?.url || "/placeholder.svg"}
                  alt={`صفحة ${index + 1}`}
                  className="w-full max-w-full object-contain bg-gray-900 rounded-sm sm:rounded-md"
                  loading={index < 3 ? "eager" : "lazy"}
                  onClick={handleUIToggle}
                  style={{ cursor: showUI ? "default" : "pointer" }}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation - Fixed and Minimal */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm transition-transform duration-300 ease-in-out ${
          showUI ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Next Chapter Button */}
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-6 py-2 rounded-lg font-medium text-xs sm:text-sm w-full sm:w-auto"
                  >
                    التالي →
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled
                  className="bg-gray-600 text-gray-300 px-3 sm:px-6 py-2 rounded-lg font-medium cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto"
                >
                  التالي →
                </Button>
              )}
            </div>

            {/* Chapter Selector */}
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-2 sm:px-4 py-2 rounded-lg min-w-[50px] sm:min-w-[60px] font-medium text-xs sm:text-sm"
                  >
                    {chapter.chapter_number}
                    <ChevronDown className="h-3 w-3 mr-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 max-h-64 overflow-y-auto bg-gray-800 border-gray-700 mb-2"
                >
                  {allChapters.map((chapterItem) => (
                    <DropdownMenuItem
                      key={chapterItem.id}
                      className={`cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700 ${
                        chapterItem.id === chapter.id
                          ? "bg-gray-700 text-white"
                          : ""
                      }`}
                      onClick={() =>
                        manga &&
                        navigate(
                          getChapterUrl(
                            getMangaSlug(manga),
                            chapterItem.chapter_number,
                          ),
                        )
                      }
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          الفصل {chapterItem.chapter_number}
                        </span>
                        {chapterItem.title && (
                          <span className="text-xs text-gray-400">
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
    </div>
  );
};

export default ChapterReader;
