import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Settings,
  Menu,
  X,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

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
  title: string;
  slug?: string;
}

const ChapterReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [manga, setManga] = useState<Manga | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterNav[]>([]);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  useEffect(() => {
    if (id) {
      fetchChapterDetails();
    }
  }, [id]);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const resetAutoHideTimer = () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
      setShowControls(true);
      const timer = setTimeout(() => setShowControls(false), 3000);
      setAutoHideTimer(timer);
    };

    const handleMouseMove = () => resetAutoHideTimer();
    const handleClick = () => resetAutoHideTimer();
    const handleKeyDown = () => resetAutoHideTimer();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    // Initial timer
    resetAutoHideTimer();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  }, [autoHideTimer]);

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
        .select("id, title, slug")
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

      // Track view
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
          if (nextChapter) navigate(`/read/${nextChapter.id}`);
          break;
        case "ArrowLeft":
          if (previousChapter) navigate(`/read/${previousChapter.id}`);
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
  const mangaUrl = manga.slug ? `/manga/${manga.slug}` : `/manga/${manga.id}`;

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Top Header - Auto-hide */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showControls ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <Link to={mangaUrl}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  عودة
                </Button>
              </Link>

              {/* Center Title */}
              <div className="text-center flex-1 mx-4">
                <h1 className="text-lg font-medium text-white truncate">
                  {manga.title}
                </h1>
                <p className="text-sm text-gray-300">
                  الفصل {chapter.chapter_number}
                  {chapter.title && ` - ${chapter.title}`}
                </p>
              </div>

              {/* Controls Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowControls(!showControls)}
                className="text-white hover:bg-white/20"
              >
                {showControls ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Auto-hide */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showControls ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-gradient-to-t from-black/90 to-transparent backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Previous Chapter */}
              <div className="flex-1">
                {previousChapter ? (
                  <Link to={`/read/${previousChapter.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white border-white/30 hover:bg-white/20 gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      السابق
                    </Button>
                  </Link>
                ) : (
                  <div className="w-20"></div>
                )}
              </div>

              {/* Chapter Selector */}
              <div className="flex-1 flex justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white border-white/30 hover:bg-white/20 min-w-[120px] gap-2"
                    >
                      الفصل {chapter.chapter_number}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
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
                        onClick={() => navigate(`/read/${chapterItem.id}`)}
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

              {/* Next Chapter */}
              <div className="flex-1 flex justify-end">
                {nextChapter ? (
                  <Link to={`/read/${nextChapter.id}`}>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      التالي
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <div className="w-20"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20">
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
          <div className="max-w-5xl mx-auto">
            {/* Chapter Pages */}
            {chapter.pages.map((page, index) => (
              <div key={index} className="relative">
                <img
                  src={page?.url || "/placeholder.svg"}
                  alt={`صفحة ${index + 1} من ${chapter.pages.length}`}
                  className="w-full h-auto object-contain bg-gray-900"
                  loading={index < 2 ? "eager" : "lazy"}
                  style={{
                    maxHeight: "none",
                    display: "block",
                  }}
                />

                {/* Page Number Indicator - Only on hover */}
                <div className="absolute top-4 right-4 bg-black/60 text-white text-sm px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                  {index + 1} / {chapter.pages.length}
                </div>
              </div>
            ))}

            {/* End of Chapter Navigation */}
            <div className="py-12 text-center">
              <div className="bg-gray-900/50 rounded-lg p-8 mx-4">
                <h3 className="text-xl font-bold mb-4">
                  انتهى الفصل {chapter.chapter_number}
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {nextChapter ? (
                    <Link to={`/read/${nextChapter.id}`}>
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

      {/* Keyboard Shortcuts Help - Hidden by default */}
      <div
        className={`fixed bottom-20 right-4 z-40 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-black/80 backdrop-blur text-white text-xs p-3 rounded-lg border border-white/20">
          <div className="font-medium mb-2">اختصارات لوحة المفاتيح:</div>
          <div className="space-y-1">
            <div>← / → : التنقل بين الفصول</div>
            <div>Space : تمرير الصفحة</div>
            <div>H : إخفاء/إظهار الأدوات</div>
            <div>Esc : العودة</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterReader;
