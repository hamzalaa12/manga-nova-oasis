import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  siteName?: string;
  structuredData?: object;
  keywords?: string;
  author?: string;
  robots?: string;
  canonical?: string;
}

const SEO = ({
  title,
  description,
  image,
  url,
  type = "website",
  siteName = "مانجا العرب",
  structuredData,
  keywords,
  author = "مانجا العرب",
  robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  canonical,
}: SEOProps) => {
  useEffect(() => {
    // تحديث title
    if (title) {
      document.title = title;
    }

    // إضافة viewport meta tag
    const updateViewportTag = () => {
      let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (!viewport) {
        viewport = document.createElement("meta");
        viewport.name = "viewport";
        document.head.appendChild(viewport);
      }
      viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=5.0";
    };
    updateViewportTag();

    // إضافة charset meta tag
    const updateCharsetTag = () => {
      let charset = document.querySelector('meta[charset]') as HTMLMetaElement;
      if (!charset) {
        charset = document.createElement("meta");
        charset.setAttribute("charset", "UTF-8");
        document.head.insertBefore(charset, document.head.firstChild);
      }
    };
    updateCharsetTag();

    // تحديث meta tags
    const updateMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updatePropertyTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Meta tags أساسية لتحسين الفهرسة
    updateMetaTag("robots", robots);
    updateMetaTag("googlebot", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    updateMetaTag("bingbot", "index, follow");
    updateMetaTag("format-detection", "telephone=no");
    
    // Language tags محسنة
    updateMetaTag("language", "ar");
    updateMetaTag("content-language", "ar");
    let htmlLang = document.documentElement.getAttribute('lang');
    if (!htmlLang) {
      document.documentElement.setAttribute('lang', 'ar');
      document.documentElement.setAttribute('dir', 'rtl');
    }

    if (description) {
      updateMetaTag("description", description);
    }

    if (keywords) {
      updateMetaTag("keywords", keywords);
    }

    if (author) {
      updateMetaTag("author", author);
      updateMetaTag("publisher", author);
    }

    // Geo tags محسنة
    updateMetaTag("geo.region", "SA");
    updateMetaTag("geo.country", "SA");
    updateMetaTag("geo.placename", "Saudi Arabia");

    // Canonical URL محسن
    if (canonical || url) {
      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.rel = "canonical";
        document.head.appendChild(linkCanonical);
      }
      const canonicalUrl = canonical || url || "";
      linkCanonical.href = canonicalUrl.startsWith('http') ? canonicalUrl : `https://sanime.site${canonicalUrl}`;
    }

    // تحسين Open Graph tags
    updatePropertyTag("og:site_name", siteName);
    updatePropertyTag("og:locale", "ar_SA");
    updatePropertyTag("og:type", type);
    
    if (title) {
      updatePropertyTag("og:title", title);
    }
    if (description) {
      updatePropertyTag("og:description", description);
    }
    if (image) {
      const fullImageUrl = image.startsWith('http') ? image : `https://sanime.site${image}`;
      updatePropertyTag("og:image", fullImageUrl);
      updatePropertyTag("og:image:width", "1200");
      updatePropertyTag("og:image:height", "630");
      updatePropertyTag("og:image:type", "image/jpeg");
      updatePropertyTag("og:image:alt", title || "مانجا العرب");
    }
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://sanime.site${url}`;
      updatePropertyTag("og:url", fullUrl);
    }

    // تحسين Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:site", "@manga_arab");
    updateMetaTag("twitter:creator", "@manga_arab");
    
    if (title) {
      updateMetaTag("twitter:title", title);
    }
    if (description) {
      updateMetaTag("twitter:description", description);
    }
    if (image) {
      const fullImageUrl = image.startsWith('http') ? image : `https://sanime.site${image}`;
      updateMetaTag("twitter:image", fullImageUrl);
      updateMetaTag("twitter:image:alt", title || "مانجا العرب");
    }

    // إضافة theme-color
    updateMetaTag("theme-color", "#1a1a1a");
    updateMetaTag("msapplication-navbutton-color", "#1a1a1a");
    updateMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent");

    // Structured Data محسن (JSON-LD)
    if (structuredData) {
      // إزالة الـ structured data السابق
      const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
      existingScripts.forEach(script => script.remove());

      // إضافة الـ structured data الجديد
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

  }, [title, description, image, url, type, siteName, structuredData, keywords, author, robots, canonical]);

  return null; // هذا المكون لا يرنتج أي JSX
};

export default SEO;
