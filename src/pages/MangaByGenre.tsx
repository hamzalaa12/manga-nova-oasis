import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Search, Filter, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MangaCard from "@/components/MangaCard";
import { generateSlug } from "@/lib/slug";

interface Manga {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image_url: string;
  manga_type: string;
  status: string;
  genre: string[];
  author: string;
  rating: number;
  views_count: number;
  created_at: string;
}

const MangaByGenre = () => {
  const { genre } = useParams<{ genre: string }>();
  const [manga, setManga] = useState<Manga[]>([]);
  const [filteredManga, setFilteredManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "rating">(
    "latest",
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const genreNames: { [key: string]: string } = {
    action: "أكشن",
    romance: "رومانسية",
    comedy: "كوميديا",
    adventure: "مغامرات",
    fantasy: "فانتازيا",
    drama: "دراما",
    horror: "رعب",
    mystery: "غموض",
    scifi: "خيال ع��مي",
    sports: "رياضة",
  };

  const currentGenreName = genreNames[genre as string] || "تصنيف غير معروف";

  useEffect(() => {
    fetchMangaByGenre();
  }, [genre]);

  useEffect(() => {
    filterAndSortManga();
  }, [manga, searchTerm, sortBy, typeFilter]);

  const fetchMangaByGenre = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("manga")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter by genre
      const filtered = (data || []).filter(
        (item) =>
          genre &&
          item.genre?.some(
            (g) =>
              g.toLowerCase().includes(genre.toLowerCase()) ||
              genreNames[genre]?.toLowerCase().includes(g.toLowerCase()),
          ),
      );

      setManga(filtered);
    } catch (error) {
      console.error("Error fetching manga by genre:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortManga = () => {
    let filtered = [...manga];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.author?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.manga_type === typeFilter);
    }

    // Sort
    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "latest":
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        break;
    }

    setFilteredManga(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Tag className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">{currentGenreName}</h1>
          </div>
          <p className="text-muted-foreground">
            {loading ? "جاري التحميل..." : `${filteredManga.length} قصة متاحة`}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن المانجا أو المؤلف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">الأحدث</SelectItem>
                <SelectItem value="popular">الأكثر شعبية</SelectItem>
                <SelectItem value="rating">الأعلى تقييماً</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="manga">مانجا</SelectItem>
                <SelectItem value="manhwa">مانهوا</SelectItem>
                <SelectItem value="manhua">مانها</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل القصص...</p>
          </div>
        ) : filteredManga.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== "all"
                ? "جرب تغيير معايير ال��حث أو الفلترة"
                : `لا توجد قصص من تصنيف ${currentGenreName} حالياً`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredManga.map((item) => (
              <MangaCard
                key={item.id}
                id={item.id}
                slug={item.slug || generateSlug(item.title)}
                title={item.title}
                cover={item.cover_image_url}
                rating={item.rating || 0}
                views={item.views_count?.toString() || "0"}
                status={item.status}
                genre={item.genre?.[0] || ""}
                lastUpdate={new Date(item.created_at).toLocaleDateString(
                  "ar-SA",
                )}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MangaByGenre;
