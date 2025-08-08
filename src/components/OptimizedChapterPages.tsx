import { useState, useEffect, useRef, useMemo } from 'react';
import LazyImage from './LazyImage';

interface OptimizedChapterPagesProps {
  pages: any[];
  readingMode: 'full' | 'single';
  currentPage: number;
  onPageChange: (page: number) => void;
}

const OptimizedChapterPages = ({ 
  pages, 
  readingMode, 
  currentPage, 
  onPageChange 
}: OptimizedChapterPagesProps) => {
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0, 1, 2]));
  const containerRef = useRef<HTMLDivElement>(null);

  // تحديد الصفحات المرئية أو القريبة من المنطقة المرئية
  const visiblePages = useMemo(() => {
    if (readingMode === 'single') {
      // في وضع الصفحة الواحدة، نحمل الصفحة الحالية + 2 قبل + 2 بعد
      const start = Math.max(0, currentPage - 2);
      const end = Math.min(pages.length - 1, currentPage + 2);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else {
      // في الوضع الكامل، نحمل الصفحات تدريجياً
      return Array.from({ length: Math.min(pages.length, loadedPages.size + 3) }, (_, i) => i);
    }
  }, [readingMode, currentPage, pages.length, loadedPages.size]);

  // تحميل تدريجي للصفحات عند التمرير
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // تحميل المزيد من الصفحات عند الوصول لـ 70%
      if (scrollPercentage > 0.7) {
        setLoadedPages(prev => {
          const newSet = new Set(prev);
          const nextBatch = Math.min(prev.size + 5, pages.length);
          for (let i = prev.size; i < nextBatch; i++) {
            newSet.add(i);
          }
          return newSet;
        });
      }
    };

    const container = containerRef.current;
    if (container && readingMode === 'full') {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [pages.length, readingMode]);

  const getPageImageUrl = (page: any) => {
    if (typeof page === 'string') return page;
    return page?.url || page?.image_url || page?.src || '/placeholder.svg';
  };

  if (readingMode === 'single') {
    const currentPageData = pages[currentPage];
    if (!currentPageData) return null;

    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <div className="max-w-full">
          <LazyImage
            src={getPageImageUrl(currentPageData)}
            alt={`صفحة ${currentPage + 1}`}
            className="max-w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-lg"
            placeholder="/placeholder.svg"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {pages.map((page, index) => (
        <div key={index} className="flex justify-center">
          {visiblePages.includes(index) ? (
            <LazyImage
              src={getPageImageUrl(page)}
              alt={`صفحة ${index + 1}`}
              className="max-w-full h-auto object-contain rounded-lg shadow-lg"
              placeholder="/placeholder.svg"
            />
          ) : (
            <div 
              className="w-full h-96 bg-gray-800 rounded-lg flex items-center justify-center"
              style={{ minHeight: '400px' }}
            >
              <span className="text-gray-400">جاري التحميل...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OptimizedChapterPages;