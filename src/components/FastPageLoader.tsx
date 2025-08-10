import { useState, useEffect, useCallback, useMemo } from 'react';
import OptimizedImage from './OptimizedImage';
import { Skeleton } from '@/components/ui/skeleton';
import { PERFORMANCE_CONFIG } from '@/utils/performance';

interface FastPageLoaderProps {
  pages: any[];
  currentPage: number;
  onPageChange: (page: number) => void;
  readingMode: 'single' | 'full';
}

const FastPageLoader = ({ pages, currentPage, onPageChange, readingMode }: FastPageLoaderProps) => {
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0]));
  const [visiblePages, setVisiblePages] = useState<number[]>([]);

  // حساب الصفحات المرئية بناءً على وضع القراءة
  const calculateVisiblePages = useCallback(() => {
    if (readingMode === 'single') {
      // في وضع الصفحة الواحدة، نحمل الصفحة الحالية والصفحات المجاورة
      const pagesToLoad = [];
      for (let i = Math.max(0, currentPage - 1); i <= Math.min(pages.length - 1, currentPage + 1); i++) {
        pagesToLoad.push(i);
      }
      return pagesToLoad;
    } else {
      // في وضع العرض الكامل، نحمل تدريجياً
      const batchSize = 6; // تحميل 6 صفحات في كل مرة
      const loadedCount = Math.min(loadedPages.size + batchSize, pages.length);
      return Array.from({ length: loadedCount }, (_, i) => i);
    }
  }, [readingMode, currentPage, pages.length, loadedPages.size]);

  // تحديث الصفحات المرئية
  useEffect(() => {
    const newVisiblePages = calculateVisiblePages();
    setVisiblePages(newVisiblePages);
    
    // إضافة الصفحات الجديدة للمحملة
    setLoadedPages(prev => {
      const newSet = new Set(prev);
      newVisiblePages.forEach(page => newSet.add(page));
      return newSet;
    });
  }, [calculateVisiblePages]);

  // تحميل تدريجي للصفحات في وضع العرض الكامل
  useEffect(() => {
    if (readingMode === 'full' && loadedPages.size < pages.length) {
      const timer = setTimeout(() => {
        setLoadedPages(prev => {
          const newSet = new Set(prev);
          const nextPage = Math.min(prev.size, pages.length - 1);
          if (nextPage < pages.length) {
            newSet.add(nextPage);
          }
          return newSet;
        });
      }, PERFORMANCE_CONFIG.PREFETCH.DELAY);

      return () => clearTimeout(timer);
    }
  }, [loadedPages.size, pages.length, readingMode]);

  const getPageUrl = useCallback((page: any) => {
    if (typeof page === 'string') return page;
    return page?.url || page?.image_url || page?.src || '';
  }, []);

  // عرض وضع الصفحة الواحدة
  if (readingMode === 'single') {
    const currentPageData = pages[currentPage];
    if (!currentPageData) return null;

    return (
      <div className="flex flex-col items-center">
        <div className="relative max-w-4xl mx-auto mb-4">
          <OptimizedImage
            src={getPageUrl(currentPageData)}
            alt={`صفحة ${currentPage + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain"
            priority={true}
          />
        </div>
        
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            السابقة
          </button>
          
          <span className="text-sm text-muted-foreground">
            {currentPage + 1} / {pages.length}
          </span>
          
          <button
            onClick={() => onPageChange(Math.min(pages.length - 1, currentPage + 1))}
            disabled={currentPage === pages.length - 1}
            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            التالية
          </button>
        </div>
      </div>
    );
  }

  // عرض وضع العرض الكامل
  return (
    <div className="space-y-2">
      {pages.map((page, index) => (
        <div key={index} className="flex justify-center">
          {loadedPages.has(index) ? (
            <OptimizedImage
              src={getPageUrl(page)}
              alt={`صفحة ${index + 1}`}
              className="w-full max-w-4xl h-auto object-contain"
              priority={index < 3} // أول 3 صفحات ذات أولوية
              onLoad={() => {
                // تحميل مسبق للصفحة التالية
                if (index < pages.length - 1) {
                  setTimeout(() => {
                    setLoadedPages(prev => new Set(prev).add(index + 1));
                  }, PERFORMANCE_CONFIG.PREFETCH.DELAY);
                }
              }}
            />
          ) : (
            <Skeleton className="w-full max-w-4xl h-[600px] rounded-lg" />
          )}
        </div>
      ))}
    </div>
  );
};

export default FastPageLoader;