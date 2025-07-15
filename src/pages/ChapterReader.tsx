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
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchChapterDetails();
    }
  }, [id]);

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

  const nextPage = () => {
    if (chapter && currentPageIndex < chapter.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const previousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          navigate(-1);
          break;
        case "ArrowRight":
          nextPage();
          break;
        case "ArrowLeft":
          previousPage();
          break;
        case " ":
          event.preventDefault();
          nextPage();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPageIndex, chapter]);

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
  const currentPage = chapter.pages[currentPageIndex];
  const isLastPage = currentPageIndex === chapter.pages.length - 1;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header - Simple */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-gray-800">
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
            {manga.title} / {chapter.title || `الفصل ${chapter.chapter_number}`}
          </h1>
        </div>

        {/* Right Page Number */}
        <div className="bg-gray-700 px-3 py-1 rounded text-sm font-medium">
          {currentPageIndex + 1}
        </div>
      </div>

      {/* Main Content - Single Page View */}
      <div className="flex-1 flex items-center justify-center bg-black p-4">
        {chapter.pages.length === 0 ? (
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
        ) : (
          <div className="max-w-4xl w-full flex items-center justify-center">
            {currentPage ? (
              <img
                src={currentPage?.url || "/placeholder.svg"}
                alt={`صفحة ${currentPageIndex + 1} من ${chapter.pages.length}`}
                className="max-w-full max-h-[calc(100vh-140px)] object-contain"
                loading="eager"
              />
            ) : (
              <div className="w-96 h-96 bg-gray-800 flex items-center justify-center rounded">
                <p className="text-gray-400">فشل تحميل الصفحة</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-black border-t border-gray-800">
        {/* Previous Button */}
        <Button
          onClick={previousPage}
          disabled={currentPageIndex === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:bg-gray-600 disabled:cursor-not-allowed gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          السابق
        </Button>

        {/* Chapter Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="text-white border-gray-600 hover:bg-gray-700 px-4 py-2"
            >
              الفصل {chapter.chapter_number}
              <ChevronDown className="h-3 w-3 mr-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="w-64 max-h-80 overflow-y-auto bg-gray-900 border-gray-700"
          >
            {allChapters.map((chapterItem) => (
              <DropdownMenuItem
                key={chapterItem.id}
                className={`cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700 p-3 ${
                  chapterItem.id === chapter.id ? "bg-gray-700 text-white" : ""
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

        {/* Next Button or Next Chapter */}
        {!isLastPage ? (
          <Button
            onClick={nextPage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 gap-2"
          >
            التالي
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : nextChapter ? (
          <Link to={`/read/${nextChapter.id}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 gap-2">
              الفصل التالي
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button
            disabled
            className="bg-gray-600 text-gray-300 px-6 py-2 cursor-not-allowed gap-2"
          >
            انتهى
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Page Indicator */}
      <div className="fixed bottom-20 left-4 bg-black/80 text-white text-xs px-2 py-1 rounded">
        {currentPageIndex + 1} / {chapter.pages.length}
      </div>
    </div>
  );
};

export default ChapterReader;
