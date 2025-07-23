export const generatePageMeta = (
  page: 'home' | 'manga' | 'chapter' | 'genre' | 'type',
  data?: any
) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  switch (page) {
    case 'home':
      return {
        title: "مانجا العرب - اقرأ المانجا والمانهوا مترجمة مجاناً",
        description: "أفضل موقع لقراءة المانجا والمانهوا والمانها مترجمة بجودة عالية مجاناً. آلاف الفصول المترجمة من أشهر المانجا مثل ون بيس، ناروتو، أتاك أون تايتان وغيرها الكثير.",
        keywords: "مانجا, مانهوا, مانها, قراءة مانجا, مانجا مترجمة, manga, manhwa, manhua, anime, ون بيس, ناروتو, أتاك أون تايتان",
        url: baseUrl,
        canonical: baseUrl,
        type: "website" as const
      };
      
    case 'manga':
      if (!data) return null;
      return {
        title: `${data.title} - قراءة مانجا مترجمة | مانجا العرب`,
        description: `اقرأ مانجا ${data.title} مترجمة بجودة عالية مجاناً. ${data.description || ''} تابع جميع فصول ${data.title} على مانجا العرب.`,
        keywords: `${data.title}, مانجا ${data.title}, قراءة ${data.title}, ${data.author || ''}, ${data.genres?.join(', ') || ''}`,
        url: `${baseUrl}/manga/${data.slug}`,
        canonical: `${baseUrl}/manga/${data.slug}`,
        image: data.cover_image_url,
        type: "article" as const
      };
      
    case 'chapter':
      if (!data) return null;
      return {
        title: `${data.manga.title} - الفصل ${data.chapter_number} | مانجا العرب`,
        description: `اقرأ الفصل ${data.chapter_number} من مانجا ${data.manga.title} مترجم بجودة عالية مجاناً. ${data.title || ''} تابع آخر الفصول على مانجا العرب.`,
        keywords: `${data.manga.title} الفصل ${data.chapter_number}, مانجا ${data.manga.title}, قراءة الفصل ${data.chapter_number}`,
        url: `${baseUrl}/read/${data.manga.slug}/${data.chapter_number}`,
        canonical: `${baseUrl}/read/${data.manga.slug}/${data.chapter_number}`,
        image: data.manga.cover_image_url,
        type: "article" as const
      };
      
    case 'genre':
      if (!data) return null;
      return {
        title: `مانجا ${data.name} - قراءة مانجا نوع ${data.name} | مانجا العرب`,
        description: `اكتشف أفضل مانجا من نوع ${data.name} مترجمة بجودة عالية. مجموعة كبيرة من المانجا والمانهوا والمانها من نوع ${data.name}.`,
        keywords: `مانجا ${data.name}, ${data.name} مانجا, قراءة مانجا ${data.name}`,
        url: `${baseUrl}/genre/${data.slug}`,
        canonical: `${baseUrl}/genre/${data.slug}`,
        type: "website" as const
      };
      
    case 'type':
      if (!data) return null;
      return {
        title: `${data.name} - اقرأ ${data.name} مترجمة | مانجا العرب`,
        description: `اكتشف أفضل ${data.name} مترجمة بجودة عالية مجاناً. مجموعة كبيرة من ${data.name} المترجمة حصرياً على مانجا العرب.`,
        keywords: `${data.name}, قراءة ${data.name}, ${data.name} مترجمة`,
        url: `${baseUrl}/type/${data.slug}`,
        canonical: `${baseUrl}/type/${data.slug}`,
        type: "website" as const
      };
      
    default:
      return null;
  }
};

export const generateStructuredData = (page: string, data?: any) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  switch (page) {
    case 'home':
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": baseUrl,
        name: "مانجا العرب",
        description: "أفضل موقع لقراءة المانجا والمانهوا والمانها مترجمة بجودة عالية مجاناً",
        url: baseUrl,
        inLanguage: "ar",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        publisher: {
          "@type": "Organization",
          name: "مانجا العرب",
          url: baseUrl,
        },
      };
      
    case 'manga':
      if (!data) return null;
      return {
        "@context": "https://schema.org",
        "@type": "Book",
        "@id": `${baseUrl}/manga/${data.slug}`,
        name: data.title,
        description: data.description || `اقرأ مانجا ${data.title} مترجمة`,
        author: {
          "@type": "Person",
          name: data.author || "مؤلف غير معروف"
        },
        publisher: {
          "@type": "Organization",
          name: "مانجا العرب"
        },
        url: `${baseUrl}/manga/${data.slug}`,
        image: data.cover_image_url,
        inLanguage: "ar",
        genre: data.genres || [],
        bookFormat: "Digital",
        numberOfPages: data.total_chapters || 0
      };
      
    case 'chapter':
      if (!data) return null;
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${baseUrl}/read/${data.manga.slug}/${data.chapter_number}`,
        headline: `${data.manga.title} - الفصل ${data.chapter_number}`,
        description: data.title || `الفصل ${data.chapter_number} من ${data.manga.title}`,
        author: {
          "@type": "Person",
          name: data.manga.author || "مؤلف غير معروف"
        },
        publisher: {
          "@type": "Organization",
          name: "مانجا العرب"
        },
        url: `${baseUrl}/read/${data.manga.slug}/${data.chapter_number}`,
        image: data.manga.cover_image_url,
        datePublished: data.created_at,
        dateModified: data.updated_at || data.created_at,
        inLanguage: "ar",
        isPartOf: {
          "@type": "Book",
          name: data.manga.title,
          url: `${baseUrl}/manga/${data.manga.slug}`
        }
      };
      
    default:
      return null;
  }
};

export const generateSitemapUrls = async () => {
  // هذه دالة لتوليد URLs للـ sitemap
  // يمكن استخدامها في build time لتوليد sitemap.xml
  const urls = [
    {
      loc: '/',
      changefreq: 'daily',
      priority: '1.0',
      lastmod: new Date().toISOString().split('T')[0]
    }
  ];
  
  // يمكن إضافة المزيد من URLs هنا مثل الأنواع والفئات
  const genres = ['أكشن', 'مغامرة', 'كوميديا', 'دراما', 'خيال'];
  const types = ['مانجا', 'مانهوا', 'مانها'];
  
  genres.forEach(genre => {
    urls.push({
      loc: `/genre/${encodeURIComponent(genre)}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: new Date().toISOString().split('T')[0]
    });
  });
  
  types.forEach(type => {
    urls.push({
      loc: `/type/${encodeURIComponent(type)}`,
      changefreq: 'weekly', 
      priority: '0.8',
      lastmod: new Date().toISOString().split('T')[0]
    });
  });
  
  return urls;
};
