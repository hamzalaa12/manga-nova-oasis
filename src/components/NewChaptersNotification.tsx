import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { X, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMangaUrl, getMangaSlug, getChapterUrl } from "@/lib/slug";

interface RecentChapter {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string;
  };
}

const fetchRecentChapters = async (): Promise<RecentChapter[]> => {
  // جلب آخر 5 فصول أضيفت في آخر 24 ساعة
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data, error } = await supabase
    .from("chapters")
    .select(
      `
      id,
      chapter_number,
      title,
      created_at,
      manga!inner (
        id,
        slug,
        title,
        cover_image_url
      )
    `,
    )
    .gte("created_at", twentyFourHoursAgo.toISOString())
    .eq("is_private", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
};

const NewChaptersNotification = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  const { data: recentChapters = [], isLoading } = useQuery({
    queryKey: ["recent-chapters"],
    queryFn: fetchRecentChapters,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
  });

  useEffect(() => {
    // التحقق من LocalStorage لمعرفة إذا تم عرض الإشعار اليوم
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem("chapters-notification-shown");

    if (lastShown !== today && recentChapters.length > 0) {
      setIsVisible(true);
      setHasBeenShown(false);
    } else {
      setIsVisible(false);
    }
  }, [recentChapters]);

  const handleClose = () => {
    setIsVisible(false);
    // حفظ أنه تم عرض الإشعار اليوم
    const today = new Date().toDateString();
    localStorage.setItem("chapters-notification-shown", today);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    if (diffMinutes > 0) return `منذ ${diffMinutes} دقيقة`;
    return "الآن";
  };

  if (isLoading || !isVisible || recentChapters.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-lg animate-slide-down relative overflow-hidden">
      {/* خلفية مُزخرفة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]"></div>
      </div>

      <div className="container mx-auto px-4 py-3 relative z-10">
        <div className="flex items-center justify-between">
          {/* أيقونة وعنوان */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">آخر الفصول</h3>
              <p className="text-white/80 text-sm">فصول جديدة أُضيفت مؤخراً</p>
            </div>
          </div>

          {/* قائمة الفصول */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            {recentChapters.slice(0, 4).map((chapter) => (
              <Link
                key={chapter.id}
                to={getChapterUrl(
                  getMangaSlug(chapter.manga),
                  chapter.chapter_number,
                )}
                className="group"
              >
                <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all duration-300 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <img
                    src={chapter.manga.cover_image_url || "/placeholder.svg"}
                    alt={chapter.manga.title}
                    className="w-8 h-8 object-cover rounded border border-white/20"
                  />
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-yellow-500 text-black text-xs px-2 py-1"
                      >
                        جديد
                      </Badge>
                      <span className="font-medium text-sm">
                        الفصل رقم {chapter.chapter_number}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 truncate max-w-[120px]">
                      {chapter.manga.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(chapter.created_at)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* زر الإغلاق */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20 p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* عداد إضافي للفصول */}
        {recentChapters.length > 4 && (
          <div className="text-center mt-2">
            <span className="text-sm text-white/80">
              + {recentChapters.length - 4} فصول أخرى جديدة
            </span>
          </div>
        )}
      </div>

      {/* تأثير الإضاءة */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );
};

export default NewChaptersNotification;
