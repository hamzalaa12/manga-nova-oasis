import { memo, useMemo, useState, useEffect, useRef } from 'react';
import ChapterCard from './ChapterCard';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  created_at: string;
  views_count: number;
  is_premium: boolean;
  manga: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string;
    author: string;
  };
}

interface VirtualizedChaptersListProps {
  chapters: Chapter[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

const VirtualizedChaptersList = memo(({
  chapters,
  itemHeight = 280,
  containerHeight = 800,
  overscan = 5
}: VirtualizedChaptersListProps) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { visibleItems, totalHeight } = useMemo(() => {
    const itemsPerRow = Math.floor((window.innerWidth - 32) / 200); // Responsive items per row
    const rows = Math.ceil(chapters.length / itemsPerRow);
    const visibleRowCount = Math.ceil(containerHeight / itemHeight);
    
    const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endRow = Math.min(rows, startRow + visibleRowCount + overscan * 2);
    
    const visibleChapters = [];
    for (let row = startRow; row < endRow; row++) {
      const startIdx = row * itemsPerRow;
      const endIdx = Math.min(startIdx + itemsPerRow, chapters.length);
      
      for (let i = startIdx; i < endIdx; i++) {
        if (chapters[i]) {
          visibleChapters.push({
            ...chapters[i],
            row,
            col: i - startIdx,
            top: row * itemHeight
          });
        }
      }
    }

    return {
      visibleItems: visibleChapters,
      totalHeight: rows * itemHeight
    };
  }, [chapters, scrollTop, itemHeight, containerHeight, overscan]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Optimize scroll handling
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    let ticking = false;
    const handleScrollOptimized = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollTop(element.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };

    element.addEventListener('scroll', handleScrollOptimized, { passive: true });
    return () => element.removeEventListener('scroll', handleScrollOptimized);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="relative"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 px-4">
          {visibleItems.map((chapter: any) => (
            <div
              key={chapter.id}
              style={{
                position: 'absolute',
                top: chapter.top,
                left: `${(chapter.col * 100) / 6}%`,
                width: `${100 / 6}%`,
                height: itemHeight
              }}
            >
              <ChapterCard
                id={chapter.id}
                chapter_number={chapter.chapter_number}
                title={chapter.title}
                created_at={chapter.created_at}
                views_count={chapter.views_count}
                is_premium={chapter.is_premium}
                manga={chapter.manga}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedChaptersList.displayName = 'VirtualizedChaptersList';

export default VirtualizedChaptersList;
