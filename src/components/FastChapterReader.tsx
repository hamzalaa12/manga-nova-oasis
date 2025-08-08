import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LazyImage from './LazyImage';

interface FastChapterReaderProps {
  pages: any[];
  readingMode: 'full' | 'single';
  currentPage: number;
  onPageChange: (page: number) => void;
}

const FastChapterReader = ({ 
  pages, 
  readingMode, 
  currentPage, 
  onPageChange 
}: FastChapterReaderProps) => {
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  // تحميل تدريجي محسن
  useEffect(() => {
    const loadMorePages = () => {
      if (loadedPages.size < pages.length) {
        setLoadedPages(prev => {
          const newSet = new Set(prev);
          const nextBatch = Math.min(prev.size + 4, pages.length);
          for (let i = prev.size; i < nextBatch; i++) {
            newSet.add(i);
          }
          return newSet;
        });
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadMorePages, { timeout: 2000 });
    } else {
      setTimeout(loadMorePages, 500);
    }
  }, [pages.length, loadedPages.size]);

  // تحميل مسبق للصفحات المجاورة في الوضع المفرد
  useEffect(() => {
    if (readingMode === 'single') {
      const preloadAdjacent = () => {
        const adjacentPages = [
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2
        ].filter(index => index >= 0 && index < pages.length);

        setLoadedPages(prev => {
          const newSet = new Set(prev);
          adjacentPages.forEach(index => newSet.add(index));
          return newSet;
        });
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadAdjacent);
      } else {
        setTimeout(preloadAdjacent, 50);
      }
    }
  }, [currentPage, readingMode, pages.length]);

  const getPageUrl = (page: any) => {
    if (typeof page === 'string') return page;
    return page?.url || page?.image_url || page?.src || '/placeholder.svg';
  };

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  // معاينة محسنة للصفحات
  const visiblePages = useMemo(() => {
    if (readingMode === 'single') {
      return [currentPage];
    } else {
      return Array.from({ length: Math.min(pages.length, loadedPages.size) }, (_, i) => i);
    }
  }, [readingMode, currentPage, pages.length, loadedPages.size]);

  if (readingMode === 'single') {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative max-w-full overflow-hidden rounded-lg">
          {pages[currentPage] && loadedPages.has(currentPage) && (
            <LazyImage
              src={getPageUrl(pages[currentPage])}
              alt={`صفحة ${currentPage + 1} من ${pages.length}`}
              className="max-w-full h-auto max-h-[90vh] object-contain"
              placeholder="/placeholder.svg"
            />
          )}
        </div>
        
        {/* أزرار التنقل للوضع المفرد */}
        <div className="flex items-center gap-4">
          <Button
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentPage + 1} / {pages.length}
          </span>
          
          <Button
            onClick={goToNextPage}
            disabled={currentPage === pages.length - 1}
            variant="outline"
            className="flex items-center gap-2"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visiblePages.map((pageIndex) => (
        <div key={pageIndex} className="flex justify-center">
          {loadedPages.has(pageIndex) ? (
            <LazyImage
              src={getPageUrl(pages[pageIndex])}
              alt={`صفحة ${pageIndex + 1} من ${pages.length}`}
              className="max-w-full h-auto object-contain rounded-lg shadow-lg"
              placeholder="/placeholder.svg"
            />
          ) : (
            <div 
              className="w-full min-h-[400px] bg-card rounded-lg flex items-center justify-center border border-border"
            >
              <div className="text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <span className="text-sm">جاري التحميل...</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FastChapterReader;