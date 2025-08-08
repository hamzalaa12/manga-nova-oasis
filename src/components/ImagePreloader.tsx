import { useEffect } from 'react';

interface ImagePreloaderProps {
  imageUrls: string[];
  priority?: number;
}

const ImagePreloader = ({ imageUrls, priority = 0 }: ImagePreloaderProps) => {
  useEffect(() => {
    if (!imageUrls.length) return;

    // تحديد أولوية التحميل
    const loadImages = () => {
      imageUrls.forEach((url, index) => {
        if (url && url !== '/placeholder.svg') {
          const img = new Image();
          img.loading = priority > 0 ? 'eager' : 'lazy';
          img.decoding = 'async';
          
          // تحميل الصور المهمة أولاً
          if (index < 3) {
            img.src = url;
          } else {
            // تأخير تحميل باقي الصور
            setTimeout(() => {
              img.src = url;
            }, index * 50);
          }
        }
      });
    };

    // استخدام requestIdleCallback لتحسين الأداء
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadImages, { timeout: 1000 });
    } else {
      setTimeout(loadImages, 100);
    }
  }, [imageUrls, priority]);

  return null;
};

export default ImagePreloader;