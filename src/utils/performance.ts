// تحسينات الأداء للموقع المحدثة لتحسين السرعة القصوى

// تحسين React Query للاستعلامات المتعددة
export const PERFORMANCE_CONFIG = {
  // أوقات التخزين المؤقت المحسنة للسرعة القصوى
  CACHE_TIMES: {
    CHAPTERS: 30 * 60 * 1000, // 30 دقيقة
    MANGA: 45 * 60 * 1000, // 45 دقيقة
    PROFILES: 60 * 60 * 1000, // 60 دقيقة
    STATIC_DATA: 120 * 60 * 1000, // ساعتين
    IMAGES: 240 * 60 * 1000, // 4 ساعات
  },
  
  // أحجام الصفحات المحسنة
  PAGE_SIZES: {
    CHAPTERS: 50, // زيادة حجم الصفحة لتقليل الطلبات
    MANGA: 50,
    COMMENTS: 30,
    SEARCH_RESULTS: 25,
  },
  
  // إعدادات التحميل التدريجي المحسنة
  LAZY_LOADING: {
    INTERSECTION_THRESHOLD: 0.05, // تحميل أسرع
    ROOT_MARGIN: '100px', // مساحة أكبر للتحميل المسبق
    SKELETON_COUNT: 8, // عدد أقل من الهياكل العظمية
  },
  
  // إعدادات تحسين الصور
  IMAGE_OPTIMIZATION: {
    QUALITY: 85,
    MAX_WIDTH: 800,
    MAX_HEIGHT: 600,
    WEBP_SUPPORT: true,
  },
  
  // إعدادات الشبكة
  NETWORK: {
    TIMEOUT: 8000, // 8 ثواني
    RETRY_COUNT: 2,
    BATCH_SIZE: 10,
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
      if (duration > 100) { // فقط للعمليات البطيئة
        console.log(`${name} took ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
};

// دالة لتحسين الصور
export const optimizeImageUrl = (url: string, width?: number, height?: number): string => {
  if (!url || url === '/placeholder.svg') return url;
  
  // إذا كان base64، نحاول تحسينه
  if (url.startsWith('data:image/')) {
    return url; // في المستقبل يمكن ضغطه
  }
  
  return url;
};

// دالة لدمج الطلبات
export const batchRequests = <T>(
  requests: Array<() => Promise<T>>,
  batchSize: number = PERFORMANCE_CONFIG.NETWORK.BATCH_SIZE
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    let completed = 0;
    
    const processBatch = async (startIndex: number) => {
      const batch = requests.slice(startIndex, startIndex + batchSize);
      
      try {
        const batchResults = await Promise.all(batch.map(req => req()));
        results.push(...batchResults);
        completed += batch.length;
        
        if (completed >= requests.length) {
          resolve(results);
        } else {
          processBatch(startIndex + batchSize);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    processBatch(0);
  });
};

// دالة للتحميل الذكي
export const smartPreload = (urls: string[], priority: 'high' | 'normal' | 'low' = 'normal') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  
  urls.slice(0, 5).forEach((url, index) => {
    if (url && !url.startsWith('data:')) {
      const img = new Image();
      img.loading = priority === 'high' ? 'eager' : 'lazy';
      img.decoding = 'async';
      
      // تأخير تدريجي للصور
      setTimeout(() => {
        img.src = url;
      }, index * 50);
    }
  });
};