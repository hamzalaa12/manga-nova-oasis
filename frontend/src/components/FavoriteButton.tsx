import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';

interface FavoriteButtonProps {
  mangaId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const FavoriteButton = ({ mangaId, variant = 'outline', size = 'default' }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      if (user) {
        const result = await isFavorite(mangaId);
        setIsFav(result);
      }
    };
    checkFavorite();
  }, [user, mangaId, isFavorite]);

  const handleToggleFavorite = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isFav) {
        await removeFromFavorites(mangaId);
        setIsFav(false);
      } else {
        await addToFavorites(mangaId);
        setIsFav(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Button
      variant={isFav ? 'default' : variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={loading}
      className="gap-2"
    >
      <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
      {isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
    </Button>
  );
};

export default FavoriteButton;