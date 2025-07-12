import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

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
}

const ChapterReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [manga, setManga] = useState<Manga | null>(null);
  const [allChapters, setAllChapters] = useState<ChapterNav[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchChapterDetails();
    }
  }, [id]);

  const fetchChapterDetails = async () => {
    try {
      // Fetch chapter details
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', id)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      // Fetch manga details
      const { data: mangaData, error: mangaError } = await supabase
        .from('manga')
        .select('id, title')
        .eq('id', chapterData.manga_id)
        .single();

      if (mangaError) throw mangaError;
      setManga(mangaData);

      // Fetch all chapters for navigation
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, chapter_number, title')
        .eq('manga_id', chapterData.manga_id)
        .order('chapter_number', { ascending: true });

      if (chaptersError) throw chaptersError;
      setAllChapters(chaptersData || []);

      // Update views count
      await supabase
        .from('chapters')
        .update({ views_count: (chapterData.views_count || 0) + 1 })
        .eq('id', id);

    } catch (error) {
      console.error('Error fetching chapter details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentChapterIndex = () => {
    return allChapters.findIndex(ch => ch.id === chapter?.id);
  };

  const getPreviousChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  };

  const getNextChapter = () => {
    const currentIndex = getCurrentChapterIndex();
    return currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          navigate(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={`/manga/${manga.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4 ml-1" />
                  العودة
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <h1 className="font-medium">{manga.title}</h1>
              <p className="text-sm text-gray-400">
                الفصل {chapter.chapter_number}
                {chapter.title && `: ${chapter.title}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {chapter.pages.length} صفحة
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Vertical Layout */}
      <main className="pt-16 pb-20">
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
                  src={page?.url || '/placeholder.svg'}
                  alt={`صفحة ${index + 1}`}
                  className="w-full max-w-full object-contain bg-gray-900"
                  loading={index < 3 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation - Chapter Navigation Only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {previousChapter ? (
                <Link to={`/read/${previousChapter.id}`}>
                  <Button variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4 ml-1" />
                    الفصل السابق
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronRight className="h-4 w-4 ml-1" />
                  الفصل السابق
                </Button>
              )}
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-400">
                الفصل {chapter.chapter_number}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {nextChapter ? (
                <Link to={`/read/${nextChapter.id}`}>
                  <Button variant="outline" size="sm">
                    الفصل التالي
                    <ChevronLeft className="h-4 w-4 mr-1" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  الفصل التالي
                  <ChevronLeft className="h-4 w-4 mr-1" />
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