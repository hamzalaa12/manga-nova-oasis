import { supabase } from '@/integrations/supabase/client';

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export const generateSitemap = async (): Promise<string> => {
  const baseUrl = 'https://sanime.site';
  const urls: SitemapUrl[] = [];

  // الصفحة الرئيسية
  urls.push({
    loc: baseUrl,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '1.0'
  });

  try {
    // جلب جميع المانجا
    const { data: mangas, error: mangaError } = await supabase
      .from('manga')
      .select('slug, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (!mangaError && mangas) {
      mangas.forEach(manga => {
        urls.push({
          loc: `${baseUrl}/manga/${manga.slug}`,
          lastmod: (manga.updated_at || manga.created_at)?.split('T')[0] || new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.8'
        });
      });
    }

    // جلب جميع الفصول
    const { data: chapters, error: chapterError } = await supabase
      .from('chapters')
      .select(`
        chapter_number,
        updated_at,
        created_at,
        manga:manga_id (
          slug
        )
      `)
      .order('updated_at', { ascending: false });

    if (!chapterError && chapters) {
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

    // إضافة صفحات الأنواع والتصنيفات
    const types = ['manga', 'manhwa', 'manhua'];
    types.forEach(type => {
      urls.push({
        loc: `${baseUrl}/type/${type}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.7'
      });
    });

    // إضافة أهم التصنيفات
    const genres = ['أكشن', 'مغامرة', 'كوميديا', 'دراما', 'خيال', 'رومانسي', 'إثارة', 'رعب'];
    genres.forEach(genre => {
      urls.push({
        loc: `${baseUrl}/genre/${encodeURIComponent(genre)}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.7'
      });
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  // إنشاء XML
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return xmlContent;
};

export const saveSitemap = async () => {
  try {
    const sitemapContent = await generateSitemap();
    
    // في بيئة الإنتاج، يجب حفظ الملف في مجلد public
    // هذا مثال لكيفية إنشاء الـ sitemap
    console.log('Sitemap generated successfully');
    return sitemapContent;
  } catch (error) {
    console.error('Error saving sitemap:', error);
    return null;
  }
};
