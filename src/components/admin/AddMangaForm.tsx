import { useState, useMemo, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Search, Upload, Image, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { createSlug } from "@/lib/slug";
import { AVAILABLE_GENRES } from "@/constants/genres";

interface AddMangaFormProps {
  onSuccess: () => void;
}

const AddMangaForm = ({ onSuccess }: AddMangaFormProps) => {
  const { toast } = useToast();
  const { uploadAvatar, uploading: imageUploading } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageMethod, setCoverImageMethod] = useState<'url' | 'upload'>('url');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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

  // فلترة التصنيفات حسب البحث
  const filteredGenres = useMemo(() => {
    const searchTerm = genreSearch.toLowerCase().trim();
    if (!searchTerm) return AVAILABLE_GENRES;

    return AVAILABLE_GENRES.filter(
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

  const handleImageUpload = async (file: File) => {
    try {
      // Create custom upload function for manga covers
      const uploadCoverImage = async (file: File): Promise<string | null> => {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'خطأ',
            description: 'يجب أن يكون الملف ��ورة',
            variant: 'destructive'
          });
          return null;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'خطأ',
            description: 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت',
            variant: 'destructive'
          });
          return null;
        }

        try {
          // Upload to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `manga_cover_${Date.now()}.${fileExt}`;
          const filePath = `manga-covers/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-content')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.warn('Supabase storage upload failed, using base64 fallback:', uploadError);
            // Fallback to base64
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            });
          } else {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('user-content')
              .getPublicUrl(filePath);
            return publicUrlData.publicUrl;
          }
        } catch (storageError) {
          console.warn('Storage failed, using base64 fallback:', storageError);
          // Fallback to base64
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });
        }
      };

      const imageUrl = await uploadCoverImage(file);
      if (imageUrl) {
        setFormData({ ...formData, coverImageUrl: imageUrl });
        setPreviewImage(imageUrl);
        toast({
          title: 'تم رفع الصورة',
          description: 'تم رفع صورة الغلاف بنجاح'
        });
      }
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في رفع صورة الغلاف',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, coverImageUrl: "" });
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        toast({
          title: 'خطأ',
          description: 'يجب أن يكون الملف صورة',
          variant: 'destructive'
        });
      }
    }
  };

  const generateUniqueSlug = async (title: string): Promise<string> => {
    const baseSlug = createSlug(title);
    let finalSlug = baseSlug;
    let counter = 0;

    // التأكد من أن الـ slug فريد
    while (true) {
      const { data: existing } = await supabase
        .from("manga")
        .select("id")
        .eq("slug", finalSlug);

      if (!existing || existing.length === 0) {
        break; // الـ slug متاح
      }

      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    return finalSlug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // إنشاء slug فريد للمانجا
      const slug = await generateUniqueSlug(formData.title);

      const { error } = await supabase.from("manga").insert([
        {
          title: formData.title,
          slug: slug,
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
          صورة الغلاف
        </label>

        <Tabs value={coverImageMethod} onValueChange={(value) => setCoverImageMethod(value as 'url' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              رابط الصورة
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              رفع صورة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3">
            <Input
              value={formData.coverImageUrl}
              onChange={(e) => {
                setFormData({ ...formData, coverImageUrl: e.target.value });
                setPreviewImage(e.target.value);
              }}
              placeholder="https://example.com/cover.jpg"
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-3">
            {/* منطقة السحب والإفلات */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Image className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">اسحب ال��ورة هنا أو اضغط للاختيار</p>
                <p className="text-xs text-muted-foreground">
                  الحد الأقصى: 5 ميجابايت • أنواع مدعومة: JPG, PNG, GIF, WebP
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {imageUploading ? "جاري الرفع..." : "اختيار صورة"}
              </Button>

              {formData.coverImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearImage}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  حذف
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </TabsContent>
        </Tabs>

        {/* معاينة الصورة */}
        {(previewImage || formData.coverImageUrl) && (
          <div className="mt-3">
            <div className="relative inline-block">
              <img
                src={previewImage || formData.coverImageUrl}
                alt="معاينة صورة الغلاف"
                className="w-32 h-48 object-cover rounded-lg border"
                onError={() => {
                  setPreviewImage(null);
                  toast({
                    title: 'خطأ',
                    description: 'فشل في تحميل الصورة',
                    variant: 'destructive'
                  });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearImage}
                className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
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
                {AVAILABLE_GENRES.filter(
                  (genre) => !genres.includes(genre),
                ).map((genre) => (
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
