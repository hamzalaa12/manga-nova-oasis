import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export const useSitemap = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSitemap = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);
    const baseUrl = 'https://sanime.site';
    const urls: SitemapUrl[] = [];

    try {
      // الصفحة الرئيسية
      urls.push({
        loc: baseUrl,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0'
      });

      // جلب جميع المانجا مع معلومات التحديث
      const { data: mangas, error: mangaError } = await supabase
        .from('manga')
        .select('slug, updated_at, created_at, title')
        .order('updated_at', { ascending: false })
        .limit(1000); // تحديد عدد أقصى لتجنب التحميل الزائد

      if (!mangaError && mangas) {
        console.log(`Adding ${mangas.length} manga pages to sitemap`);
        mangas.forEach(manga => {
          urls.push({
            loc: `${baseUrl}/manga/${manga.slug}`,
            lastmod: (manga.updated_at || manga.created_at)?.split('T')[0] || new Date().toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.8'
          });
        });
      }

      // جلب الفصول مع معلومات المانجا
      const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select(`
          chapter_number,
          updated_at,
          created_at,
          manga:manga_id (
            slug,
            title
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(5000); // تحديد عدد أقصى

      if (!chapterError && chapters) {
        console.log(`Adding ${chapters.length} chapter pages to sitemap`);
        chapters.forEach(chapter => {
          if (chapter.manga?.slug) {
            urls.push({
              loc: `${baseUrl}/read/${chapter.manga.slug}/${chapter.chapter_number}`,
              lastmod: (chapter.updated_at || chapter.created_at)?.split('T')[0] || new Date().toISOString().split('T')[0],
              changefreq: 'monthly',
              priority: '0.6'
            });
          }
        });
      }

      // إضافة صفحات الأنواع
      const types = [
        { slug: 'manga', name: 'مانجا' },
        { slug: 'manhwa', name: 'مانهوا' },
        { slug: 'manhua', name: 'مانها' }
      ];
      types.forEach(type => {
        urls.push({
          loc: `${baseUrl}/type/${type.slug}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.7'
        });
      });

      // إضافة صفحات التصنيفات
      const genres = [
        'أكشن', 'مغامرة', 'كوميديا', 'دراما', 'خيال', 'رومانسي', 
        'إثارة', 'رعب', 'غموض', 'خيال علمي', 'رياضة', 'مدرسي',
        'شونين', 'شوجو', 'سينين', 'جوسي'
      ];
      genres.forEach(genre => {
        urls.push({
          loc: `${baseUrl}/genre/${encodeURIComponent(genre)}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.7'
        });
      });

      // إنشاء محتوى XML
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      console.log(`Sitemap generated with ${urls.length} URLs`);
      
      toast({
        title: 'تم إنشاء الخريطة',
        description: `تم إنشاء خريطة الموقع بنجاح مع ${urls.length} رابط`
      });

      return xmlContent;

    } catch (error) {
      console.error('Error generating sitemap:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء خريطة الموقع',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  return {
    generateSitemap,
    isGenerating
  };
};
