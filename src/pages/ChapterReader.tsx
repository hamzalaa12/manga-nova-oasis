import { useState, useEffect } from "react";
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
        .select("id, title")
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          navigate(-1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

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
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left Action Icons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>

            {/* Center Title */}
            <div className="text-center flex-1">
              <Link
                to={`/manga/${manga.id}`}
                className="hover:text-blue-400 transition-colors"
              >
                <h1 className="text-lg font-bold text-white hover:text-blue-400">
                  {manga.title} - {chapter.chapter_number}
                </h1>
              </Link>
            </div>

            {/* Right Breadcrumb */}
            <div className="text-sm text-gray-400">
              {chapter.chapter_number} / {manga.title} /{" "}
              <Link to="/" className="hover:text-white">
                الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Navigation */}
            <div className="flex items-center gap-4">
              <Link to={getMangaUrl(getMangaSlug(manga))}>
                <Button variant="ghost" size="sm" className="hover:bg-white/10">
                  <ArrowRight className="h-4 w-4 ml-1" />
                  العودة
                </Button>
              </Link>

              {/* Next Chapter Button */}
              {nextChapter && (
                <Link to={`/read/${nextChapter.id}`}>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    التالي →
                  </Button>
                </Link>
              )}
            </div>

            {/* Center Chapter Info */}
            <div className="text-center">
              <p className="text-sm text-gray-400">
                الفصل {chapter.chapter_number}
                {chapter.title && `: ${chapter.title}`}
              </p>
            </div>

            {/* Right Chapter Selector */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded min-w-[60px]"
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
                      onClick={() => navigate(`/read/${chapterItem.id}`)}
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
      <main className="pt-32 pb-20">
        {chapter.pages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <p className="text-gray-400">لا توجد صفحات في هذا الفصل</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* All Pages Displayed Vertically */}
            {chapter.pages.map((page, index) => (
              <div key={index} className="mb-2">
                <img
                  src={page?.url || "/placeholder.svg"}
                  alt={`صفحة ${index + 1}`}
                  className="w-full max-w-full object-contain bg-gray-900"
                  loading={index < 3 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation - Fixed and Minimal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Next Chapter Button */}
            <div>
              {nextChapter ? (
                <Link to={`/read/${nextChapter.id}`}>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    التالي →
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled
                  className="bg-gray-600 text-gray-300 px-6 py-2 rounded-lg font-medium cursor-not-allowed"
                >
                  التالي →
                </Button>
              )}
            </div>

            {/* Chapter Selector */}
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg min-w-[60px] font-medium"
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
                      onClick={() => navigate(`/read/${chapterItem.id}`)}
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
