import { useState } from "react";
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
import { X } from "lucide-react";
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
    "ميكا",
    "جريمة",
    "حرب",
    "فنون قتالية",
    "سحر",
    "إيسكاي",
    "هارم",
    "ياوي",
    "يوري",
    "جوسي",
    "سينين",
    "شونين",
    "شوجو",
    "زومبي",
    "مصاصي دماء",
    "ديمون",
    "ملائكة",
    "تنانين",
    "ساموراي",
    "نينجا",
    "طبخ",
    "موسيقى",
    "رقص",
    "فضاء",
    "بحار",
    "قراصنة",
    "سفر عبر الزمن",
    "آلات",
    "ألعاب",
    "واقع افتراضي",
    "لعبة البقاء",
    "زومبي أبوكاليبس",
    "مدرسة ثانوية",
    "جامعة",
    "مكان عمل",
    "طبي",
    "شرطة",
    "محامي",
    "طبيب",
    "معلم",
    "طالب",
    "وحوش",
    "سيبر بانك",
    "استيم بانك",
    "ديستوبيا",
    "يوتوبيا",
    "حياة يومية",
    "عائلي",
    "أطفال",
    "كبار السن",
    "فقدان الذا��رة",
    "سفر",
    "حب أول",
    "حب مثلثي",
    "خيانة",
    "انتقام",
    "بطولة",
    "ضعيف إلى قوي",
    "قوة خفية",
    "نظام",
    "تطور",
    "إعادة تجسد",
    "نقل إلى عالم آخر",
    "عالم آخر",
    "تربية وحوش",
    "مافيا",
    "عصابات",
    "شركات",
    "اقتصاد",
    "سياسة",
    "ملوك",
    "أباطرة",
    "نبلاء",
    "فقراء",
    "أغنياء",
    "تجارة",
    "حرفيين",
    "مزارعين",
    "صيادين",
    "جنود",
    "فرسان",
    "سحرة",
    "كهنة",
    "كائنات خرافية",
    "جن",
    "عفاريت",
    "أشباح",
    "أرواح ��ريرة",
    "قوى خاصة",
    "طاقة",
    "تشاكرا",
    "كي",
    "مانا",
    "سيف",
    "قوس",
    "سحر قتالي",
    "دفاع عن النفس",
    "حماية",
    "إنقاذ",
    "مهمة",
    "مغامرة ملحمية",
    "رحلة طويلة",
    "عودة البطل",
    "بحث عن القوة",
    "تدريب قاس",
    "منافسة",
    "حلبة قتال",
  ];

  const addGenre = (genre: string) => {
    if (genre && !genres.includes(genre)) {
      setGenres([...genres, genre]);
      setNewGenre("");
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
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="ابحث عن تصنيف..."
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
              {availableGenres
                .filter(
                  (genre) =>
                    !genres.includes(genre) &&
                    genre.toLowerCase().includes(genreSearch.toLowerCase()),
                )
                .map((genre) => (
                  <Button
                    key={genre}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addGenre(genre);
                      setGenreSearch("");
                    }}
                    className="text-right justify-start h-auto py-2 px-3 text-xs"
                  >
                    {genre}
                  </Button>
                ))}
            </div>
            {availableGenres.filter(
              (genre) =>
                !genres.includes(genre) &&
                genre.toLowerCase().includes(genreSearch.toLowerCase()),
            ).length === 0 && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                {genreSearch
                  ? "لا توجد تصنيفات مطابقة"
                  : "جميع التصنيفات مضافة"}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          يمكنك البحث والنقر على التصنيفات لإضافتها - أكثر من 80 تصنيف متاح
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "جاري الإضافة..." : "إضافة المانجا"}
      </Button>
    </form>
  );
};

export default AddMangaForm;
