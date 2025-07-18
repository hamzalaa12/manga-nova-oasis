import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Search, Filter } from "lucide-react";
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

const MangaByType = () => {
  const { type } = useParams<{ type: string }>();
  const [manga, setManga] = useState<Manga[]>([]);
  const [filteredManga, setFilteredManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "popular" | "rating">(
    "latest",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  // قائمة شاملة من التصنيفات العربية فقط
  const arabicGenres = [
    // التصنيفات الأساسية
    "أكشن",
    "مغامرة",
    "كوميديا",
    "دراما",
    "خيال",
    "رومانسي",
    "رعب",
    "غموض",
    "نفسي",
    "خارق للطبيعة",
    "شريحة من الحياة",
    "رياضة",
    "تاريخي",
    "مدرسي",
    "خيال علمي",
    "فانتازيا",
    "إثارة",
    "تشويق",
    "حربي",
    "عسكري",
    "فنون قتالية",

    // التصنيفات الثقافية والتقليدية
    "ساموراي",
    "نينجا",
    "ميكا",
    "روبوت",
    "فضاء",
    "س��يبر بانك",
    "ستيم بانك",
    "ديستوبيا",
    "يوتوبيا",
    "مصاصي دماء",
    "مستذئبين",
    "شياطين",
    "ملائكة",
    "سحر",
    "شعوذة",
    "كيمياء",
    "طب",
    "هندسة",
    "تكنولوجيا",
    "حاسوب",
    "ألعاب",

    // التكنولوجيا والمستقبل
    "واقع افتراضي",
    "واقع معزز",
    "ذكاء اصطناعي",
    "آلات",
    "أندرويد",
    "سايبورغ",
    "زومبي",
    "أشباح",
    "أرواح شريرة",
    "عوالم موازية",
    "سفر عبر الوقت",
    "سفر عبر الأبعاد",

    // القوى والقتال
    "قوى خارقة",
    "محاربين",
    "سحرة",
    "مشعوذين",
    "كهنة",
    "آلهة",
    "أساطير",
    "ملاحم",
    "بطولات",
    "مهام",
    "بحث عن الكنز",
    "قراصنة",
    "بحارة",
    "طيران",

    // الحياة اليومية والهو��يات
    "طبخ",
    "تسوق",
    "موضة",
    "جمال",
    "صحة",
    "لياقة",
    "يوغا",
    "تأمل",
    "موسيقى",
    "رقص",
    "مسرح",
    "سينما",
    "تلفزيون",
    "راديو",
    "كتب",
    "شعر",

    // العلوم والأكاديمية
    "أدب",
    "فلسفة",
    "علم نفس",
    "اجتماع",
    "سياسة",
    "اقتصاد",
    "قانون",
    "عدالة",
    "جريمة",
    "تحقيق",
    "بوليسي",
    "جاسوسية",
    "مخابرات",
    "سري",

    // المشاعر والعلاقات
    "مؤامرة",
    "خيانة",
    "انتقام",
    "شرف",
    "كرامة",
    "صداقة",
    "ولاء",
    "حب",
    "زواج",
    "عائلة",
    "أطفال",
    "مراهقين",
    "شباب",
    "كبار السن",
    "أجيال",

    // تصنيفات إضافية
    "طبيعة",
    "بيئة",
    "حيوانات",
    "نباتات",
    "طقس",
    "فصول السنة",
    "سفر",
    "سياحة",
    "تاريخ قديم",
    "حضارات",
    "أثار",
    "متاحف",
    "فن",
    "رسم",
    "نحت",
    "تصوير",
    "رياضة قتالية",
    "كرة قدم",
    "كرة سلة",
    "تنس",
    "سباحة",
    "جري",
    "دراجات",
    "صيد",
    "قنص",
    "بناء",
    "هندسة معمارية",
    "ديكور",
    "تصميم",
    "برمجة",
    "تطوير",
    "تجارة",
    "استثمار",
    "بنوك",
    "عملات",
    "أسهم",
    "بورصة",
    "شركات",
    "أعمال",
    "صحافة",
    "إعلام",
    "تقارير",
    "أخبار",
    "توثيق",
    "بحث",
    "دراسة",
    "تعليم",
  ];

  const typeNames = {
    manga: "مانجا يابانية",
    manhwa: "مانهوا كورية",
    manhua: "مانها صينية",
  };

  const currentTypeName =
    typeNames[type as keyof typeof typeNames] || "جميع القصص";

  useEffect(() => {
    fetchMangaByType();
  }, [type]);

  useEffect(() => {
    filterAndSortManga();
  }, [manga, searchTerm, sortBy, statusFilter, genreFilter]);

  useEffect(() => {
    // استخدام قائمة التصنيفات العربية مع إضافة التصنيفات الموجودة في قاعدة البيانات (فلت��ة التصنيفات الإنجليزية)
    const dbGenres = manga
      .flatMap((item) => item.genre || [])
      .filter(
        (genre) =>
          // فقط التصنيفات العربية أو التي تحتوي على أحرف عربية
          /[\u0600-\u06FF]/.test(genre) || arabicGenres.includes(genre),
      );
    const allGenres = [...new Set([...arabicGenres, ...dbGenres])]
      .filter(Boolean)
      .sort();
    setAvailableGenres(allGenres);
  }, [manga, arabicGenres]);

  const fetchMangaByType = async () => {
    try {
      setLoading(true);

      let query = supabase.from("manga").select("*");

      if (
        type &&
        type !== "all" &&
        ["manga", "manhwa", "manhua"].includes(type)
      ) {
        query = query.eq("manga_type", type as "manga" | "manhwa" | "manhua");
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setManga(data || []);
    } catch (error) {
      console.error("Error fetching manga:", error);
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
          item.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.genre?.some((g) =>
            g.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Genre filter - البحث في التصنيفات العربية فقط
    if (genreFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.genre?.some(
          (genre) =>
            genre.toLowerCase().includes(genreFilter.toLowerCase()) ||
            genreFilter.toLowerCase().includes(genre.toLowerCase()),
        ),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
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
          <h1 className="text-4xl font-bold mb-2">{currentTypeName}</h1>
          <p className="text-muted-foreground">
            {loading ? "جاري التحميل..." : `${filteredManga.length} قصة متاحة`}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن المانجا، المؤلف، أو النوع..."
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="ongoing">مستمرة</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="hiatus">متوقفة</SelectItem>
                <SelectItem value="cancelled">ملغية</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {availableGenres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
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
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || genreFilter !== "all"
                ? "جرب تغيير معايير البحث أو الفلترة"
                : "لا توجد قصص من هذا النوع حالياً"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredManga.map((item) => (
              <MangaCard
                key={item.id}
                id={item.id}
                slug={item.slug}
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

export default MangaByType;
