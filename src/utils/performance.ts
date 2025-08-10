// تحسينات الأداء للموقع

// تحسين React Query للاستعلامات المتعددة
export const PERFORMANCE_CONFIG = {
  // أوقات التخزين المؤقت محسنة
  CACHE_TIMES: {
    CHAPTERS: 2 * 60 * 1000, // 2 دقيقة
    MANGA: 3 * 60 * 1000, // 3 دقائق
    PROFILES: 5 * 60 * 1000, // 5 دقائق
    STATIC_DATA: 30 * 60 * 1000, // 30 دقيقة
    IMAGES: 60 * 60 * 1000, // 60 دقيقة للصور
  },
  
  // أحجام الصفحات محسنة
  PAGE_SIZES: {
    CHAPTERS: 24, // تقليل حجم الصفحة للتحميل السريع
    MANGA: 24,
    COMMENTS: 15,
    SEARCH_RESULTS: 15,
  },
  
  // إعدادات التحميل التدريجي محسنة
  LAZY_LOADING: {
    INTERSECTION_THRESHOLD: 0.1,
    ROOT_MARGIN: '100px', // تحميل الصور قبل 100px من ظهورها
    SKELETON_COUNT: 8,
    IMAGE_QUALITY: 0.8, // جودة الصور المضغوطة
  },
  
  // إعدادات التحميل المسبق
  PREFETCH: {
    DELAY: 500, // تأخير 500ms قبل التحميل المسبق
    MAX_CONCURRENT: 3, // أقصى عدد من العمليات المتزامنة
  },
  
  // إعدادات الشبكة
  NETWORK: {
    TIMEOUT: 10000, // 10 ثوان
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000,
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