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

    // تحديث meta tags
    const updateMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(
        `meta[name="${name}"]`,
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const updatePropertyTag = (property: string, content: string) => {
      let meta = document.querySelector(
        `meta[property="${property}"]`,
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Meta tags أساسية
    updateMetaTag("robots", robots);
    updateMetaTag("googlebot", "index, follow");
    updateMetaTag("bingbot", "index, follow");

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

    // Language and geo tags
    updateMetaTag("language", "Arabic");
    updateMetaTag("geo.region", "SA");
    updateMetaTag("geo.country", "SA");

    // Canonical URL
    if (canonical || url) {
      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.rel = "canonical";
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = canonical || url || "";
    }

    // Open Graph tags
    if (title) {
      updatePropertyTag("og:title", title);
    }
    if (description) {
      updatePropertyTag("og:description", description);
    }
    if (image) {
      updatePropertyTag("og:image", image);
      updatePropertyTag("og:image:width", "1200");
      updatePropertyTag("og:image:height", "630");
      updatePropertyTag("og:image:type", "image/png");
    }
    if (url) {
      updatePropertyTag("og:url", url);
    }
    updatePropertyTag("og:type", type);
    updatePropertyTag("og:site_name", siteName);
    updatePropertyTag("og:locale", "ar_SA");

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    if (title) {
      updateMetaTag("twitter:title", title);
    }
    if (description) {
      updateMetaTag("twitter:description", description);
    }
    if (image) {
      updateMetaTag("twitter:image", image);
    }

    // Structured Data (JSON-LD)
    if (structuredData) {
      // إزالة الـ structured data السابق إن وجد
      const existingScript = document.querySelector(
        'script[type="application/ld+json"]',
      );
      if (existingScript) {
        existingScript.remove();
      }

      // إضافة الـ structured data الجديد
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup function لإزالة meta tags عند unmount
    return () => {
      // لا نحتاج cleanup في هذه الحالة لأن meta tags يجب أن تبقى
    };
  }, [title, description, image, url, type, siteName, structuredData]);

  return null; // هذا المكون لا يرنتج أي JSX
};

export default SEO;
