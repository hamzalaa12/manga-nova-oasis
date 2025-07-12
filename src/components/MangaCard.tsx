import { Star, Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MangaCardProps {
  title: string;
  cover: string;
  rating: number;
  views: string;
  status: string;
  genre: string;
  lastUpdate: string;
}

const MangaCard = ({ title, cover, rating, views, status, genre, lastUpdate }: MangaCardProps) => {
  return (
    <div className="manga-card group cursor-pointer">
      {/* Cover Image */}
      <div className="relative overflow-hidden">
        <img 
          src={cover} 
          alt={title}
          className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="text-white text-center p-4">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-4 w-4 text-yellow-400 mr-1" />
              <span className="text-sm">{rating}</span>
            </div>
            <div className="flex items-center justify-center text-sm">
              <Eye className="h-4 w-4 mr-1" />
              <span>{views}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <Badge 
          variant={status === 'مكتمل' ? 'default' : 'secondary'} 
          className="absolute top-2 right-2"
        >
          {status}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span className="bg-accent/20 text-accent px-2 py-1 rounded text-xs">
            {genre}
          </span>
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{lastUpdate}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">{views} مشاهدة</span>
        </div>
      </div>
    </div>
  );
};

export default MangaCard;