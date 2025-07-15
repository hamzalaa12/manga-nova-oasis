import { useState, useEffect } from "react";
import MangaCard from "./MangaCard";
import { supabase } from "@/integrations/supabase/client";

interface MangaGridProps {
  title?: string;
  showAll?: boolean;
}

interface Manga {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string;
  rating: number;
  views_count: number;
  status: string;
  genre: string[];
  updated_at: string;
  manga_type: string;
}

const MangaGrid = ({
  title = "الأحدث والأكثر شعبية",
  showAll = false,
}: MangaGridProps) => {
  const [mangaData, setMangaData] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManga();
  }, []);

  const fetchManga = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(showAll ? 100 : 12);

      if (error) throw error;
      setMangaData(data || []);
    } catch (error) {
      console.error("Error fetching manga:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatLastUpdate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `من�� ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    return "منذ دقائق";
  };

  const getStatusInArabic = (status: string) => {
    switch (status) {
      case "ongoing":
        return "مستمر";
      case "completed":
        return "مكتمل";
      case "hiatus":
        return "متوقف مؤقتاً";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">جاري التحميل...</div>
        </div>
      </section>
    );
  }

  if (mangaData.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground">لا توجد مانجا متاحة حالياً</p>
          </div>
        </div>
      </section>
    );
  }

  const displayData = showAll ? mangaData : mangaData.slice(0, 6);

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">{title}</h2>
          {!showAll && mangaData.length > 6 && (
            <button className="text-primary hover:text-primary-glow transition-colors">
              عرض الكل ←
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {displayData.map((manga) => (
            <MangaCard
              key={manga.id}
              id={manga.id}
              slug={manga.slug}
              title={manga.title}
              cover={manga.cover_image_url || "/placeholder.svg"}
              rating={manga.rating}
              views={formatViews(manga.views_count)}
              status={getStatusInArabic(manga.status)}
              genre={manga.genre?.[0] || manga.manga_type}
              lastUpdate={formatLastUpdate(manga.updated_at)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MangaGrid;
