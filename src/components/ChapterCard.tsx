import { Clock, BookOpen, User, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getChapterUrl, getMangaSlug } from "@/lib/slug";
import ViewsCounter from "@/components/ViewsCounter";
import AdvancedImageLoader from "@/components/AdvancedImageLoader";
import { memo, useMemo } from "react";

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
    rating?: number;
  };
}

const ChapterCard = memo(({
  id,
  chapter_number,
  title,
  created_at,
  views_count,
  is_premium,
  manga,
}: ChapterCardProps) => {
  const timeAgo = useMemo(() => {
    const date = new Date(created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    return "منذ دقائق";
  }, [created_at]);

  const chapterUrl = useMemo(() =>
    getChapterUrl(getMangaSlug(manga), chapter_number),
    [manga, chapter_number]
  );

  // Memoize expensive calculations
  const isNewChapter = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const chapterDate = new Date(created_at);
    return chapterDate >= threeDaysAgo;
  }, [created_at]);

  const isPopular = useMemo(() => views_count > 1000, [views_count]);

  return (
    <Link to={chapterUrl}>
      <div className="group cursor-pointer bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-2 transform-gpu">
        <div className="relative overflow-hidden">
          <AdvancedImageLoader
            src={manga.cover_image_url || "/placeholder.svg"}
            alt={manga.title}
            className="w-full h-48 group-hover:scale-110 transition-transform duration-500 ease-out"
            priority={false}
          />

          {/* Enhanced gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover:from-black/95 transition-all duration-300"></div>

          {/* Top badges row */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div className="flex flex-col gap-2">
              {/* Chapter number badge */}
              <Badge
                variant="default"
                className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white text-xs font-bold shadow-lg border-0 backdrop-blur-sm"
              >
                الفصل {chapter_number}
              </Badge>
              
              {/* Premium badge */}
              {is_premium && (
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold shadow-lg border-0"
                >
                  مدفوع
                </Badge>
              )}
            </div>
            
            <div className="flex flex-col gap-2 items-end">
              {/* New chapter badge */}
              {isNewChapter && (
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold shadow-lg animate-pulse border-0"
                >
                  جديد
                </Badge>
              )}
              
              {/* Popular badge */}
              {isPopular && (
                <Badge
                  variant="secondary"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-lg border-0"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  رائج
                </Badge>
              )}
            </div>
          </div>

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-4">
            <div className="flex items-center justify-between text-white text-xs">
              <ViewsCounter
                viewsCount={views_count}
                type="chapter"
                className="text-white"
              />
              <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 text-center">
          {/* Manga title */}
          <h3 className="font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {manga.title}
          </h3>

          {/* Chapter title */}
          {title && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {title}
            </p>
          )}

          {/* Enhanced metadata section */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span className="font-medium">الفصل {chapter_number}</span>
            </div>
            
            {/* Rating display */}
            {manga.rating && (
              <div className="flex items-center justify-center gap-1 text-xs text-yellow-500">
                <Star className="h-3 w-3 fill-current" />
                <span className="font-medium">{manga.rating.toFixed(1)}</span>
              </div>
            )}
            
            {/* Author info */}
            {manga.author && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[120px]">
                  {manga.author}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

ChapterCard.displayName = "ChapterCard";

export default ChapterCard;
