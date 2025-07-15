import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Home,
  Bookmark,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  parseSlugOrId,
  buildMangaUrl,
  buildChapterUrl,
  generateChapterSlug,
} from "@/lib/slug";

interface Chapter {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string;
  description: string;
  pages: any[];
  views_count: number;
  slug?: string;
}

interface ChapterNav {
  id: string;
  chapter_number: number;
  title: string;
  slug?: string;
}

interface Manga {
  id: string;
  title: string;
  slug?: string;
}

const ChapterReader = () => {
  const { id, mangaSlug, chapterSlug } = useParams<{
    id?: string;
    mangaSlug?: string;
    chapterSlug?: string;
  }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [manga, setManga] = useState<Manga | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterNav[]>([]);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (id || (mangaSlug && chapterSlug)) {
      fetchChapterDetails();
    }
  }, [id, mangaSlug, chapterSlug]);

  // Scroll detection for hiding/showing controls
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show controls when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide controls
        setShowControls(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show controls
        setShowControls(true);
      }

      // Always show controls when at the top
      if (currentScrollY <= 50) {
        setShowControls(true);
      }

      setLastScrollY(currentScrollY);
    };

    // Throttle scroll events
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 10);
    };

    window.addEventListener("scroll", throttledScroll);
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      clearTimeout(timeoutId);
    };
  }, [lastScrollY]);

  const fetchChapterDetails = async () => {
    try {
      let chapterData = null;
      let mangaData = null;

      if (mangaSlug && chapterSlug) {
        // New route: /read/:mangaSlug/:chapterSlug
        console.log("Fetching by slug:", { mangaSlug, chapterSlug });

        // First, find manga by slug
        const mangaQuery = parseSlugOrId(mangaSlug);
        let mangaQueryBuilder = supabase.from("manga").select("*");

        if (mangaQuery.type === "slug") {
          mangaQueryBuilder = mangaQueryBuilder.eq("slug", mangaQuery.value);
        } else {
          mangaQueryBuilder = mangaQueryBuilder.eq("id", mangaQuery.value);
        }

        const { data: foundManga, error: mangaError } =
          await mangaQueryBuilder.single();
        if (mangaError || !foundManga) throw new Error("Manga not found");

        mangaData = foundManga;

        // Then, find chapter by slug within this manga
        const chapterQuery = parseSlugOrId(chapterSlug);
        let chapterQueryBuilder = supabase
          .from("chapters")
          .select("*")
          .eq("manga_id", foundManga.id);

        if (chapterQuery.type === "slug") {
          chapterQueryBuilder = chapterQueryBuilder.eq(
            "slug",
            chapterQuery.value,
          );
        } else {
          chapterQueryBuilder = chapterQueryBuilder.eq(
            "id",
            chapterQuery.value,
          );
        }

        const { data: foundChapter, error: chapterError } =
          await chapterQueryBuilder.single();
        if (chapterError || !foundChapter) throw new Error("Chapter not found");

        chapterData = foundChapter;
      } else if (id) {
        // Old route: /read/:id
        console.log("Fetching by old ID:", id);

        const { type, value } = parseSlugOrId(id);
        let chapterQueryBuilder = supabase.from("chapters").select("*");

        if (type === "slug") {
          chapterQueryBuilder = chapterQueryBuilder.eq("slug", value);
        } else {
          chapterQueryBuilder = chapterQueryBuilder.eq("id", value);
        }

        const { data: foundChapter, error: chapterError } =
          await chapterQueryBuilder.single();
        if (chapterError || !foundChapter) throw new Error("Chapter not found");

        chapterData = foundChapter;

        // Fetch manga details
        const { data: foundManga, error: mangaError } = await supabase
          .from("manga")
          .select("*")
          .eq("id", foundChapter.manga_id)
          .single();

        if (mangaError || !foundManga) throw new Error("Manga not found");
        mangaData = foundManga;

        // Redirect to new URL structure if we have slugs
        if (foundManga.slug && foundChapter.slug) {
          const newUrl = buildChapterUrl(foundChapter, foundManga);
          window.history.replaceState(null, "", newUrl);
        }
      } else {
        throw new Error("No valid parameters provided");
      }

      setChapter(chapterData);
      setManga(mangaData);

      // Fetch all chapters for navigation
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("id, chapter_number, title, slug")
        .eq("manga_id", chapterData.manga_id)
        .order("chapter_number", { ascending: true });

      if (chaptersError) throw chaptersError;
      setAllChapters(chaptersData || []);

      // Track view
      await trackChapterView(chapterData.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error fetching chapter details:", errorMessage);
      console.error("Full error object:", error);
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const nextChapter = getNextChapter();
      const previousChapter = getPreviousChapter();

      switch (event.key) {
        case "Escape":
          navigate(-1);
          break;
        case "ArrowRight":
          if (nextChapter && manga)
            navigate(buildChapterUrl(nextChapter, manga));
          break;
        case "ArrowLeft":
          if (previousChapter && manga)
            navigate(buildChapterUrl(previousChapter, manga));
          break;
        case " ":
          event.preventDefault();
          window.scrollBy(0, window.innerHeight * 0.8);
          break;
        case "h":
          setShowControls(!showControls);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, showControls, chapter, allChapters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!chapter || !manga) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4 text-xl">الفصل غير موجود</p>
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
  const mangaUrl = buildMangaUrl(manga);

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Top Header - Auto-hide based on scroll */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showControls ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-gradient-to-b from-black/95 to-black/70 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left Icons */}
            <div className="flex items-center gap-3">
              <Link to={mangaUrl}>
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors cursor-pointer">
                  <Home className="h-4 w-4 text-white" />
                </div>
              </Link>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors cursor-pointer">
                <Bookmark className="h-4 w-4 text-white" />
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors cursor-pointer">
                <Settings className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Center Title */}
            <div className="text-center flex-1 mx-4">
              <h1 className="text-sm text-gray-300 truncate">
                {manga.title} /{" "}
                {chapter.title || `الفصل ${chapter.chapter_number}`}
              </h1>
            </div>

            {/* Right Chapter Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm font-medium cursor-pointer transition-colors flex items-center gap-1">
                  {chapter.chapter_number}
                  <ChevronDown className="h-3 w-3" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 max-h-80 overflow-y-auto bg-gray-900/95 backdrop-blur border-gray-700"
              >
                {allChapters.map((chapterItem) => (
                  <DropdownMenuItem
                    key={chapterItem.id}
                    className={`cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700/50 p-3 ${
                      chapterItem.id === chapter.id
                        ? "bg-gray-700/70 text-white"
                        : ""
                    }`}
                    onClick={() => {
                      const chapterUrl = buildChapterUrl(chapterItem, manga);
                      navigate(chapterUrl);
                    }}
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

      {/* Main Content - Vertical Scroll */}
      <main className="pt-16 pb-20">
        {chapter.pages.length === 0 ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-gray-400 text-xl mb-4">
                لا توجد صفحات في هذا الفصل
              </p>
              <Link to={mangaUrl}>
                <Button
                  variant="outline"
                  className="text-white border-white/30 hover:bg-white/20"
                >
                  العودة للمانجا
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* All Pages Displayed Vertically */}
            {chapter.pages.map((page, index) => (
              <div key={index} className="relative">
                <img
                  src={page?.url || "/placeholder.svg"}
                  alt={`صفحة ${index + 1} من ${chapter.pages.length}`}
                  className="w-full h-auto object-contain bg-gray-900 reader-page-image"
                  loading={index < 3 ? "eager" : "lazy"}
                  style={{
                    maxHeight: "none",
                    display: "block",
                  }}
                />

                {/* Page Number Indicator - Only on hover */}
                <div className="absolute top-4 right-4 text-white text-sm px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity page-indicator">
                  {index + 1} / {chapter.pages.length}
                </div>
              </div>
            ))}

            {/* End of Chapter Navigation */}
            <div className="py-12 text-center">
              <div className="rounded-lg p-8 mx-4 chapter-end">
                <h3 className="text-xl font-bold mb-4">
                  انتهى الفصل {chapter.chapter_number}
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {nextChapter ? (
                    <Link to={buildChapterUrl(nextChapter, manga)}>
                      <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 gap-2"
                      >
                        الفصل التالي ({nextChapter.chapter_number})
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-gray-400">هذا آخر فصل متاح</p>
                  )}

                  <Link to={mangaUrl}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-white border-white/30 hover:bg-white/20 px-8 py-3"
                    >
                      العودة للمانجا
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Scroll to Top Button - Show when controls are hidden */}
      {!showControls && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default ChapterReader;
