import { useState, useEffect } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload, Link, FolderOpen, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddChapterFormProps {
  onSuccess: () => void;
}

interface Manga {
  id: string;
  title: string;
  manga_type: string;
}

interface PageItem {
  type: "url" | "file";
  url?: string;
  file?: File;
  preview?: string;
}

const AddChapterForm = ({ onSuccess }: AddChapterFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    mangaId: "",
    chapterNumber: "",
    title: "",
    description: "",
  });
  const [pages, setPages] = useState<PageItem[]>([{ type: "url", url: "" }]);

  useEffect(() => {
    fetchMangaList();
  }, []);

  const fetchMangaList = async () => {
    try {
      const { data, error } = await supabase
        .from("manga")
        .select("id, slug, title, manga_type")
        .order("title");

      if (error) throw error;
      setMangaList(data || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل قائمة المانجا",
        variant: "destructive",
      });
    }
  };

  const filteredMangaList = mangaList.filter(manga => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const title = manga.title.toLowerCase();
    const type = manga.manga_type.toLowerCase();

    return title.includes(query) || type.includes(query);
  });

  const selectedManga = mangaList.find(manga => manga.id === formData.mangaId);

  const addPage = () => {
    setPages([...pages, { type: "url", url: "" }]);
  };

  const removePage = (index: number) => {
    if (pages.length > 1) {
      setPages(pages.filter((_, i) => i !== index));
    }
  };

  const updatePageUrl = (index: number, url: string) => {
    const newPages = [...pages];
    newPages[index] = { ...newPages[index], type: "url", url };
    setPages(newPages);
  };

  const updatePageFile = (index: number, file: File | null) => {
    const newPages = [...pages];
    if (file) {
      const preview = URL.createObjectURL(file);
      newPages[index] = { type: "file", file, preview };
    } else {
      newPages[index] = { type: "url", url: "" };
    }
    setPages(newPages);
  };

  const togglePageType = (index: number) => {
    const newPages = [...pages];
    const currentPage = newPages[index];
    if (currentPage.type === "url") {
      newPages[index] = { type: "file" };
    } else {
      newPages[index] = { type: "url", url: "" };
    }
    setPages(newPages);
  };

  const handleMultipleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const newPages: PageItem[] = fileArray.map((file) => ({
      type: "file",
      file,
      preview: URL.createObjectURL(file),
    }));

    setPages(newPages);

    toast({
      title: "تم تحديد الملفات",
      description: `تم تحديد ${fileArray.length} صفحة`,
    });
  };

  const uploadFile = async (file: File, index: number): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${index}.${fileExt}`;
    const filePath = `${formData.mangaId}/${formData.chapterNumber}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chapter-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("chapter-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Process pages - upload files and get URLs
      const pageUrls = [];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        if (page.type === "file" && page.file) {
          // Upload file and get URL
          const url = await uploadFile(page.file, i);
          pageUrls.push({ url });
        } else if (page.type === "url" && page.url && page.url.trim() !== "") {
          // Use existing URL
          pageUrls.push({ url: page.url });
        }
      }

      if (pageUrls.length === 0) {
        throw new Error("يجب إضافة صفحة واحدة على الأقل");
      }

      const { error } = await supabase.from("chapters").insert({
        manga_id: formData.mangaId,
        chapter_number: parseFloat(formData.chapterNumber),
        title: formData.title,
        description: formData.description,
        pages: pageUrls,
      });

      if (error) throw error;

      toast({
        title: "تم بنجاح!",
        description: "تم إضافة الفصل بنجاح",
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
      <div>
        <label className="block text-sm font-medium mb-2">اختر المانجا *</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedManga ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedManga.manga_type}
                  </Badge>
                  {selectedManga.title}
                </div>
              ) : (
                "اختر مانجا/مانهوا/مانها"
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-[400px] p-0")} align="start">
            <Command>
              <CommandInput
                placeholder="ابحث عن المانجا..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>لا توجد نتائج</CommandEmpty>
                <CommandGroup>
                  {filteredMangaList.map((manga) => (
                    <CommandItem
                      key={manga.id}
                      value={manga.id}
                      onSelect={(currentValue) => {
                        setFormData({ ...formData, mangaId: currentValue });
                        setOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <Check
                        className={`ml-2 h-4 w-4 ${
                          formData.mangaId === manga.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {manga.manga_type}
                        </Badge>
                        {manga.title}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">رقم الفصل *</label>
          <Input
            type="number"
            step="0.1"
            value={formData.chapterNumber}
            onChange={(e) =>
              setFormData({ ...formData, chapterNumber: e.target.value })
            }
            placeholder="1.0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">عنوان الفصل</label>
          <Input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="عنوان الفصل (اختياري)"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">وصف الفصل</label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          placeholder="وصف مختصر للفصل (اختياري)"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">صور الفصل *</label>
          <div className="flex gap-2">
            <Button type="button" onClick={addPage} size="sm" variant="outline">
              <Plus className="h-4 w-4 ml-1" />
              إضافة صفحة
            </Button>
            <div className="relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleMultipleFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="multiple-files"
              />
              <Button type="button" size="sm" asChild>
                <label
                  htmlFor="multiple-files"
                  className="cursor-pointer flex items-center"
                >
                  <FolderOpen className="h-4 w-4 ml-1" />
                  رفع جميع الصفحات
                </label>
              </Button>
            </div>
          </div>
        </div>

        {pages.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              إجمالي الصفحات: {pages.length}
              {pages.filter((p) => p.type === "file").length > 0 &&
                ` | ملفات: ${pages.filter((p) => p.type === "file").length}`}
              {pages.filter((p) => p.type === "url" && p.url).length > 0 &&
                ` | روابط: ${pages.filter((p) => p.type === "url" && p.url).length}`}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {pages.map((page, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الصفحة {index + 1}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => togglePageType(index)}
                    size="sm"
                    variant="outline"
                  >
                    {page.type === "url" ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <Link className="h-4 w-4" />
                    )}
                    {page.type === "url" ? "رفع ملف" : "رابط"}
                  </Button>
                  {pages.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removePage(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {page.type === "url" ? (
                <Input
                  value={page.url || ""}
                  onChange={(e) => updatePageUrl(index, e.target.value)}
                  placeholder={`رابط الصفحة ${index + 1}`}
                  className="w-full"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      updatePageFile(index, e.target.files?.[0] || null)
                    }
                    className="w-full"
                  />
                  {page.preview && (
                    <div className="w-32 h-32 border rounded overflow-hidden">
                      <img
                        src={page.preview}
                        alt={`معاينة الصفحة ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          يمكنك إضافة صور من ملفاتك أو استخدام روابط خارجية
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !formData.mangaId || !formData.chapterNumber}
      >
        {isLoading ? "جاري الإضافة..." : "إضافة الفصل"}
      </Button>
    </form>
  );
};

export default AddChapterForm;
