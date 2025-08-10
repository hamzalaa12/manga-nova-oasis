import { useEffect } from 'react';
import { PERFORMANCE_CONFIG } from '@/utils/performance';

// مكون لتحسين استخدام الذاكرة وتنظيف البيانات غير المستخدمة
const MemoryOptimizer = () => {
  useEffect(() => {
    let memoryCheckInterval: NodeJS.Timeout;

    const optimizeMemory = () => {
      // تنظيف البيانات المؤقتة للصور
      const cleanupImageCache = () => {
        // البحث عن الصور المحملة وإزالة المخفية
        const images = document.querySelectorAll('img[data-cached="true"]');
        images.forEach((img) => {
          const rect = img.getBoundingClientRect();
          const isVisible = (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
          );
          
          if (!isVisible && img.parentElement) {
            // إزالة الصور البعيدة عن النظر لتوفير الذاكرة
            const distance = Math.min(
              Math.abs(rect.top - window.innerHeight),
              Math.abs(rect.bottom)
            );
            
            if (distance > window.innerHeight * 2) {
              img.setAttribute('src', '/placeholder.svg');
              img.removeAttribute('data-cached');
            }
          }
        });
      };

      // تنظيف Event Listeners غير المستخدمة
      const cleanupEventListeners = () => {
        // تنظيف observers غير النشطة
        const observedElements = document.querySelectorAll('[data-observed="true"]');
        observedElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const isVeryFar = (
            rect.top > window.innerHeight * 3 ||
            rect.bottom < -window.innerHeight * 3
          );
          
          if (isVeryFar) {
            element.removeAttribute('data-observed');
          }
        });
      };

      // فحص استخدام الذاكرة
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memoryUsage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
        
        // إذا تجاوز استخدام الذاكرة 80%، قم بالتنظيف
        if (memoryUsage > 0.8) {
          cleanupImageCache();
          cleanupEventListeners();
          
          // طلب garbage collection إذا أمكن
          if ('gc' in window && typeof window.gc === 'function') {
            window.gc();
          }
        }
      } else {
        // للمتصفحات التي لا تدعم memory API، قم بالتنظيف الدوري
        cleanupImageCache();
        cleanupEventListeners();
      }
    };

    // تحسين دوري للذاكرة كل 30 ثانية
    memoryCheckInterval = setInterval(optimizeMemory, 30000);

    // تحسين عند تغيير الصفحة
    const handlePageChange = () => {
      setTimeout(optimizeMemory, 1000);
    };

    // تحسين عند انخفاض مستوى البطارية (إذا أمكن)
    const handleLowBattery = () => {
      optimizeMemory();
    };

    // تحسين عند فقدان التركيز على النافذة
    const handleVisibilityChange = () => {
      if (document.hidden) {
        optimizeMemory();
      }
    };

    window.addEventListener('beforeunload', optimizeMemory);
    window.addEventListener('pagehide', optimizeMemory);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // API للبطارية إذا كان متاحاً
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener('levelchange', () => {
          if (battery.level < 0.2) {
            handleLowBattery();
          }
        });
      }).catch(() => {
        // تجاهل الأخطاء إذا لم تكن API البطارية متاحة
      });
    }

    return () => {
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
      }
      window.removeEventListener('beforeunload', optimizeMemory);
      window.removeEventListener('pagehide', optimizeMemory);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null; // هذا المكون لا يعرض أي شيء
};

export default MemoryOptimizer;