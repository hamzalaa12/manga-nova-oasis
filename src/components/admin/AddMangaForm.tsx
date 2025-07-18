import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddMangaFormProps {
  onSuccess: () => void;
}

const AddMangaForm = ({ onSuccess }: AddMangaFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    mangaType: "",
    status: "ongoing",
    author: "",
    artist: "",
    releaseYear: new Date().getFullYear(),
  });
  const [genres, setGenres] = useState<string[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [genreSearch, setGenreSearch] = useState("");

  // قائمة شاملة بـ 90+ تصنيف
  const availableGenres = [
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
    "ساموراي",
    "نينجا",
    "ميكا",
    "روبوت",
    "فضاء",
    "سايبر بانك",
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
    "مؤامرة",
    "خيانة",
    "انتقام",
    "عدالة",
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
  ];

  // فلترة التصنيفات حسب البحث
  const filteredGenres = useMemo(() => {
    const searchTerm = genreSearch.toLowerCase().trim();
    if (!searchTerm) return availableGenres;

    return availableGenres.filter(
      (genre) =>
        genre.toLowerCase().includes(searchTerm) && !genres.includes(genre),
    );
  }, [genreSearch, genres]);

  const addGenre = (genre: string) => {
    if (genre && !genres.includes(genre)) {
      setGenres([...genres, genre]);
      setNewGenre("");
      setGenreSearch("");
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setGenres(genres.filter((genre) => genre !== genreToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("manga").insert([
        {
          title: formData.title,
          description: formData.description,
          cover_image_url: formData.coverImageUrl,
          manga_type: formData.mangaType as any,
          status: formData.status as any,
          genre: genres,
          author: formData.author,
          artist: formData.artist,
          release_year: formData.releaseYear,
        },
      ]);

      if (error) throw error;

      toast({
        title: "تم بنجاح!",
        description: "تم إضافة المانجا بنجاح",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">العنوان *</label>
          <Input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">النوع *</label>
          <Select
            value={formData.mangaType}
            onValueChange={(value) =>
              setFormData({ ...formData, mangaType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manga">مانجا</SelectItem>
              <SelectItem value="manhwa">مانهوا</SelectItem>
              <SelectItem value="manhua">مانها</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">الوصف</label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          رابط صورة الغلاف
        </label>
        <Input
          value={formData.coverImageUrl}
          onChange={(e) =>
            setFormData({ ...formData, coverImageUrl: e.target.value })
          }
          placeholder="https://example.com/cover.jpg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">المؤلف</label>
          <Input
            value={formData.author}
            onChange={(e) =>
              setFormData({ ...formData, author: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">الرسام</label>
          <Input
            value={formData.artist}
            onChange={(e) =>
              setFormData({ ...formData, artist: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">سنة الإصدار</label>
          <Input
            type="number"
            value={formData.releaseYear}
            onChange={(e) =>
              setFormData({
                ...formData,
                releaseYear: parseInt(e.target.value),
              })
            }
            min="1900"
            max={new Date().getFullYear() + 1}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">الحالة</label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ongoing">مستمر</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="hiatus">متوقف مؤقتاً</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">التصنيفات</label>

        {/* عرض التصنيفات المختارة */}
        <div className="flex flex-wrap gap-2 mb-3">
          {genres.map((genre) => (
            <Badge key={genre} variant="secondary" className="text-sm">
              {genre}
              <X
                className="h-3 w-3 mr-1 cursor-pointer"
                onClick={() => removeGenre(genre)}
              />
            </Badge>
          ))}
        </div>

        {/* صندوق البحث في التصنيفات */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              placeholder="ابحث عن تصنيف..."
              className="pr-10"
            />
          </div>

          {/* قائمة التصنيفات المفلترة */}
          {genreSearch && (
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-background">
              {filteredGenres.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredGenres.slice(0, 12).map((genre) => (
                    <Button
                      key={genre}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addGenre(genre)}
                      className="justify-start text-right h-8"
                    >
                      {genre}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد تصنيفات مطابقة للبحث
                </p>
              )}
            </div>
          )}

          {/* طريقة الاختيار التقليدية */}
          <div className="flex gap-2">
            <Select value={newGenre} onValueChange={setNewGenre}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="أو اختر من القائمة الكاملة" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {availableGenres
                  .filter((genre) => !genres.includes(genre))
                  .map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => addGenre(newGenre)}
              disabled={!newGenre}
            >
              إضافة
            </Button>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "جاري الإضافة..." : "إضافة المانجا"}
      </Button>
    </form>
  );
};

export default AddMangaForm;
