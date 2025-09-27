import { Clock, BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getChapterUrl, getMangaSlug } from "@/lib/slug";
import ViewsCounter from "@/components/ViewsCounter";
import LazyImage from "@/components/LazyImage";

interface ChapterCardProps {
  id: string;
  chapter_number: number;
  title?: string;
  created_at: string;
  views_count: number;
  is_premium: boolean;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string;
    author?: string;
  };
}

const ChapterCard = ({
  id,
  chapter_number,
  title,
  created_at,
  views_count,
  is_premium,
  manga,
}: ChapterCardProps) => {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    return "منذ دقائق";
  };

  const chapterUrl = getChapterUrl(getMangaSlug(manga), chapter_number);

  // تحديد إذا كان الفصل جديد (آخر 3 أيام)
  const isNewChapter = () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const chapterDate = new Date(created_at);
    return chapterDate >= threeDaysAgo;
  };

  return (
    <Link to={chapterUrl}>
      <div className="group cursor-pointer bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
        <div className="relative overflow-hidden">
          <LazyImage
            src={manga.cover_image_url || "/placeholder.svg"}
            alt={manga.title}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
            placeholder="/placeholder.svg"
          />

          {/* بادج الفصل مع تأثير جديد */}
          <div className="absolute top-2 right-2">
            <Badge
              variant="default"
              className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white text-xs font-bold shadow-lg border border-red-400/50"
            >
              الفصل رقم {chapter_number}
            </Badge>
          </div>

          {/* بادج جديد مع تأثير نابض - فقط للفصول الحديثة */}
          {isNewChapter() && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold shadow-lg animate-pulse border border-green-400/50"
              >
                جديد
              </Badge>
            </div>
          )}

          {/* بادج مدفوع إن وجد */}
          {is_premium && (
            <div className="absolute top-10 left-2">
              <Badge
                variant="secondary"
                className="bg-yellow-500 text-black text-xs font-bold shadow-lg"
              >
                مدفوع
              </Badge>
            </div>
          )}

          {/* تأثير التدرج المحسن */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90"></div>

          {/* شريط معلومات في الأسفل */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
            <div className="flex items-center justify-between text-white text-xs">
              <ViewsCounter
                viewsCount={views_count}
                type="chapter"
                className="text-white"
              />
              <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2 text-center">
          {/* عنوان المانجا */}
          <h3 className="font-bold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {manga.title}
          </h3>

          {/* عنوان الفصل إن وجد */}
          {title && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {title}
            </p>
          )}

          {/* معلومات إضافية */}
          <div className="flex items-center justify-center text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">الفصل {chapter_number}</span>
            </div>
            {manga.author && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[100px] text-center">
                  {manga.author}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ChapterCard;
