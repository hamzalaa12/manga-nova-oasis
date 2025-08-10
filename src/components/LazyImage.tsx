import { useState, useRef, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PERFORMANCE_CONFIG } from '@/utils/performance';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  priority?: boolean;
}

const LazyImage = ({ src, alt, className, placeholder, priority = false }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: PERFORMANCE_CONFIG.LAZY_LOADING.INTERSECTION_THRESHOLD,
        rootMargin: PERFORMANCE_CONFIG.LAZY_LOADING.ROOT_MARGIN
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [priority]);

  // تحسين معالجة الصور الكبيرة base64
  const optimizedSrc = src?.length > 50000 ? placeholder || '/placeholder.svg' : src;

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <Skeleton className="w-full h-full absolute inset-0 bg-muted/10" />
      )}
      {isInView && (
        <img
          src={error ? (placeholder || '/placeholder.svg') : optimizedSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}
    </div>
  );
};

export default LazyImage;