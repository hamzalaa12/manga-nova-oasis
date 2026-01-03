import React, { useEffect } from "react";

interface PreloadContentProps {
  content?: string;
  images?: string[];
  children?: React.ReactNode;
}

/**
 * Component to preload critical content for better SEO and indexing
 * Ensures content is available immediately when search engines crawl
 */
const PreloadContent = ({ content, images = [], children }: PreloadContentProps) => {
  useEffect(() => {
    // Preload critical images
    images.forEach(src => {
      if (src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      }
    });

    // Add content to a hidden div for search engines to index
    if (content) {
      let hiddenContent = document.getElementById('seo-content');
      if (!hiddenContent) {
        hiddenContent = document.createElement('div');
        hiddenContent.id = 'seo-content';
        hiddenContent.style.position = 'absolute';
        hiddenContent.style.left = '-9999px';
        hiddenContent.style.top = '-9999px';
        hiddenContent.style.visibility = 'hidden';
        hiddenContent.setAttribute('aria-hidden', 'true');
        document.body.appendChild(hiddenContent);
      }
      
      hiddenContent.innerHTML = content;
    }

    // Cleanup
    return () => {
      // Remove preload links to avoid memory leaks
      const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      preloadLinks.forEach(link => {
        if (images.includes((link as HTMLLinkElement).href)) {
          link.remove();
        }
      });
    };
  }, [content, images]);

  return <>{children}</>;
};

export default PreloadContent;
