import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddChapterFormProps {
  onSuccess: () => void;
}

interface Manga {
  id: string;
  title: string;
  manga_type: string;
}

const AddChapterForm = ({ onSuccess }: AddChapterFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [formData, setFormData] = useState({
    mangaId: '',
    chapterNumber: '',
    title: '',
    description: '',
  });
  const [pages, setPages] = useState<string[]>(['']);

  useEffect(() => {
    fetchMangaList();
  }, []);

  const fetchMangaList = async () => {
    try {
      const { data, error } = await supabase
        .from('manga')
        .select('id, title, manga_type')
        .order('title');

      if (error) throw error;
      setMangaList(data || []);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل قائمة المانجا',
        variant: 'destructive',
      });
    }
  };

  const addPage = () => {
    setPages([...pages, '']);
  };

  const removePage = (index: number) => {
    if (pages.length > 1) {
      setPages(pages.filter((_, i) => i !== index));
    }
  };

  const updatePage = (index: number, url: string) => {
    const newPages = [...pages];
    newPages[index] = url;
    setPages(newPages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Filter out empty page URLs
      const validPages = pages.filter(page => page.trim() !== '').map(url => ({ url }));
      
      if (validPages.length === 0) {
        throw new Error('يجب إضافة صفحة واحدة على الأقل');
      }

      const { error } = await supabase
        .from('chapters')
        .insert({
          manga_id: formData.mangaId,
          chapter_number: parseFloat(formData.chapterNumber),
          title: formData.title,
          description: formData.description,
          pages: validPages,
        });

      if (error) throw error;

      toast({
        title: 'تم بنجاح!',
        description: 'تم إضافة الفصل بنجاح',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">اختر المانجا *</label>
        <Select value={formData.mangaId} onValueChange={(value) => setFormData({ ...formData, mangaId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مانجا/مانهوا/مانها" />
          </SelectTrigger>
          <SelectContent>
            {mangaList.map((manga) => (
              <SelectItem key={manga.id} value={manga.id}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {manga.manga_type}
                  </Badge>
                  {manga.title}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">رقم الفصل *</label>
          <Input
            type="number"
            step="0.1"
            value={formData.chapterNumber}
            onChange={(e) => setFormData({ ...formData, chapterNumber: e.target.value })}
            placeholder="1.0"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">عنوان الفصل</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="عنوان الفصل (اختياري)"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">وصف الفصل</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="وصف مختصر للفصل (اختياري)"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">صور الفصل *</label>
          <Button type="button" onClick={addPage} size="sm">
            <Plus className="h-4 w-4 ml-1" />
            إضافة صفحة
          </Button>
        </div>
        
        <div className="space-y-3">
          {pages.map((page, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={page}
                onChange={(e) => updatePage(index, e.target.value)}
                placeholder={`رابط الصفحة ${index + 1}`}
                className="flex-1"
              />
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
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          أضف روابط صور الفصل بالترتيب الصحيح
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !formData.mangaId || !formData.chapterNumber}>
        {isLoading ? 'جاري الإضافة...' : 'إضافة الفصل'}
      </Button>
    </form>
  );
};

export default AddChapterForm;