import { Clock, BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getChapterUrl, getMangaSlug } from "@/lib/slug";
import ViewsCounter from "@/components/ViewsCounter";

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

  return (
    <Link to={chapterUrl}>
      <div className="group cursor-pointer bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
        <div className="relative overflow-hidden">
          <img
            src={manga.cover_image_url || "/placeholder.svg"}
            alt={manga.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* بادج الفصل */}
          <div className="absolute top-2 right-2">
            <Badge
              variant="default"
              className="bg-primary text-primary-foreground text-xs font-bold"
            >
              الفصل {chapter_number}
            </Badge>
          </div>

          {/* بادج مدفوع إن وجد */}
          {is_premium && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="bg-yellow-500 text-black text-xs font-bold"
              >
                مدفوع
              </Badge>
            </div>
          )}

          {/* تأثير التدرج */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          {/* معلومات في الأسفل */}
          <div className="absolute bottom-2 left-2 right-2 text-white">
            <div className="flex items-center justify-between text-xs">
              <ViewsCounter
                viewsCount={views_count}
                type="chapter"
                className="text-white"
              />
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {/* عنوان المانجا */}
          <h3 className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {manga.title}
          </h3>

          {/* عنوان الفصل إن وجد */}
          {title && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {title}
            </p>
          )}

          {/* معلومات إضافية */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span>الفصل {chapter_number}</span>
            </div>
            {manga.author && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{manga.author}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ChapterCard;
