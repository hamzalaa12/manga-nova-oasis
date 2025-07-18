import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_GENRES } from "@/constants/genres";

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
  artist: string;
  release_year: number;
  rating: number;
}

interface EditMangaDialogProps {
  manga: Manga;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMangaUpdated: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  cover_image_url: z
    .string()
    .url("يجب أن يكون رابط صحيح")
    .optional()
    .or(z.literal("")),
  manga_type: z.enum(["manga", "manhwa", "manhua"]),
  status: z.enum(["ongoing", "completed", "hiatus", "cancelled"]),
  author: z.string().optional(),
  artist: z.string().optional(),
  release_year: z.number().min(1900).max(new Date().getFullYear()).optional(),
  rating: z.number().min(0).max(10).optional(),
});

const EditMangaDialog = ({
  manga,
  open,
  onOpenChange,
  onMangaUpdated,
}: EditMangaDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    manga.genre || [],
  );
  const [newGenre, setNewGenre] = useState("");
  const [genreSearch, setGenreSearch] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: manga.title,
      description: manga.description || "",
      cover_image_url: manga.cover_image_url || "",
      manga_type: manga.manga_type as "manga" | "manhwa" | "manhua",
      status: manga.status as "ongoing" | "completed" | "hiatus" | "cancelled",
      author: manga.author || "",
      artist: manga.artist || "",
      release_year: manga.release_year || undefined,
      rating: manga.rating || undefined,
    },
  });

  // فلترة التصنيفات حسب البحث
  const filteredGenres = useMemo(() => {
    const searchTerm = genreSearch.toLowerCase().trim();
    if (!searchTerm) return AVAILABLE_GENRES;

    return AVAILABLE_GENRES.filter(
      (genre) =>
        genre.toLowerCase().includes(searchTerm) &&
        !selectedGenres.includes(genre),
    );
  }, [genreSearch, selectedGenres]);

  const addGenre = (genre: string) => {
    if (genre && !selectedGenres.includes(genre)) {
      setSelectedGenres([...selectedGenres, genre]);
    }
    setNewGenre("");
    setGenreSearch("");
  };

  const removeGenre = (genre: string) => {
    setSelectedGenres(selectedGenres.filter((g) => g !== genre));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const updateData = {
        ...values,
        genre: selectedGenres,
        cover_image_url: values.cover_image_url || null,
        author: values.author || null,
        artist: values.artist || null,
        release_year: values.release_year || null,
        rating: values.rating || null,
        description: values.description || null,
      };

      const { error } = await supabase
        .from("manga")
        .update(updateData)
        .eq("id", manga.id);

      if (error) throw error;

      toast({
        title: "تم التحديث!",
        description: "تم تحديث المانجا بنجاح",
      });

      onMangaUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث المانجا",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تحرير المانجا</DialogTitle>
          <DialogDescription>قم بتحديث معلومات المانجا</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manga_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النوع *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manga">مانجا</SelectItem>
                        <SelectItem value="manhwa">مانهوا</SelectItem>
                        <SelectItem value="manhua">مانها</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رابط صورة الغلاف</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المؤلف</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرسام</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ongoing">مستمر</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="hiatus">متوقف مؤقتاً</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="release_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سنة الإصدار</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التقييم (0-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* إدارة التصنيفات */}
            <div className="space-y-4">
              <FormLabel>التصنيفات</FormLabel>

              {/* التصنيفات المحددة */}
              <div className="flex flex-wrap gap-2">
                {selectedGenres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {genre}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeGenre(genre)}
                    />
                  </Badge>
                ))}
              </div>

              {/* إضافة تصنيف جديد */}
              <div className="space-y-3">
                {/* صندوق البحث في الت��نيفات */}
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
                        (genre) => !selectedGenres.includes(genre),
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "جاري التحديث..." : "تحديث المانجا"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMangaDialog;
