// تحسينات الأداء للموقع

// تحسين React Query للاستعلامات المتعددة
export const PERFORMANCE_CONFIG = {
  // أوقات التخزين المؤقت
  // تحديث PERFORMANCE_CONFIG لتحسين أكثر
  CACHE_TIMES: {
    CHAPTERS: 10 * 60 * 1000, // 10 دقائق
    MANGA: 15 * 60 * 1000, // 15 دقيقة
    PROFILES: 20 * 60 * 1000, // 20 دقيقة
    STATIC_DATA: 60 * 60 * 1000, // 60 دقيقة
  },
  
  // أحجام الصفحات
  PAGE_SIZES: {
    CHAPTERS: 36,
    MANGA: 36,
    COMMENTS: 20,
    SEARCH_RESULTS: 20,
  },
  
  // إعدادات التحميل التدريجي
  LAZY_LOADING: {
    INTERSECTION_THRESHOLD: 0.1,
    ROOT_MARGIN: '50px',
    SKELETON_COUNT: 12,
  }
};

// دالة لدمج استعلامات متعددة في استعلام واحد
export const combineQueries = <T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> => {
  return Promise.all(queries.map(query => query()));
};

// دالة تحسين أوقات الاستجابة
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// دالة للتحميل المتدرج للبيانات
export const batchLoader = <T>(
  items: T[],
  batchSize: number = 10
): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
};

// دالة لتحسين الصور
export const optimizeImage = (url: string, options: {
  width?: number;
  height?: number;
  quality?: number;
} = {}): string => {
  // في المستقبل يمكن استخدام خدمة تحسين الصور
  // الآن نعيد الرابط كما هو
  return url;
};

// دالة لقياس الأداء
export const measurePerformance = (name: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`${name} took ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};