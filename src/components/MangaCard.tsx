import { Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getMangaUrl, getMangaSlug } from "@/lib/slug";
import ViewsCounter from "@/components/ViewsCounter";

interface MangaCardProps {
  id?: string;
  slug?: string;
  title: string;
  cover: string;
  rating: number;
  views: number;
  status: string;
  genre: string;
  lastUpdate: string;
}

const MangaCard = ({
  id,
  slug,
  title,
  cover,
  rating,
  views,
  status,
  genre,
  lastUpdate,
}: MangaCardProps) => {
  const CardContent = (
    <div className="group cursor-pointer bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative overflow-hidden">
        <img
          src={cover}
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2">
          <Badge
            variant={status === "مستمر" ? "default" : "secondary"}
            className="text-xs"
          >
            {status}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2">
          <Badge
            variant="outline"
            className="text-xs bg-background/80 backdrop-blur-sm"
          >
            {genre}
          </Badge>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{rating}</span>
          </div>
          <ViewsCounter viewsCount={views} type="manga" className="text-xs" />
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{lastUpdate}</span>
        </div>
      </div>
    </div>
  );

  const mangaSlug = getMangaSlug({ slug, title, id });

  return mangaSlug ? (
    <Link to={getMangaUrl(mangaSlug)}>{CardContent}</Link>
  ) : (
    CardContent
  );
};

export default MangaCard;
