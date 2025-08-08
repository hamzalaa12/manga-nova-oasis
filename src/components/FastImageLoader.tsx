import { useState, useEffect, useRef, memo } from "react";

interface FastImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  quality?: 'low' | 'medium' | 'high';
}

// In-memory cache with size limit
const MAX_CACHE_SIZE = 100;
const imageCache = new Map<string, boolean>();
const cacheOrder: string[] = [];

const addToCache = (src: string) => {
  if (imageCache.has(src)) return;
  
  if (cacheOrder.length >= MAX_CACHE_SIZE) {
    const oldestKey = cacheOrder.shift();
    if (oldestKey) imageCache.delete(oldestKey);
  }
  
  imageCache.set(src, true);
  cacheOrder.push(src);
};

// Optimized image preloader with concurrent limit
const concurrentLoads = new Set<string>();
const MAX_CONCURRENT = 4;

const loadImage = async (src: string): Promise<void> => {
  if (imageCache.has(src) || concurrentLoads.has(src)) return;
  if (concurrentLoads.size >= MAX_CONCURRENT) return;
  
  concurrentLoads.add(src);
  
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        addToCache(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  } finally {
    concurrentLoads.delete(src);
  }
};

const FastImageLoader = memo(({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  onLoad,
  quality = 'medium'
}: FastImageLoaderProps) => {
  const [loaded, setLoaded] = useState(imageCache.has(src));
  const [inView, setInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Quality-based loading strategy
  const getLoadingStrategy = () => {
    switch (quality) {
      case 'high':
        return { rootMargin: "200px", threshold: 0.01 };
      case 'low':
        return { rootMargin: "20px", threshold: 0.5 };
      default:
        return { rootMargin: "100px", threshold: 0.1 };
    }
  };

  useEffect(() => {
    if (priority) {
      setInView(true);
      if (src) loadImage(src);
      return;
    }

    if (loaded || !imgRef.current) return;

    const strategy = getLoadingStrategy();
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (src) loadImage(src);
          observerRef.current?.disconnect();
        }
      },
      strategy
    );

    observerRef.current.observe(imgRef.current);

    return () => observerRef.current?.disconnect();
  }, [src, priority, loaded, quality]);

  const handleLoad = () => {
    setLoaded(true);
    addToCache(src);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  // Progressive enhancement based on connection
  const getImageQuality = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection?.effectiveType === '4g') return 'high';
      if (connection?.effectiveType === '3g') return 'medium';
      return 'low';
    }
    return quality;
  };

  const effectiveQuality = getImageQuality();

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        minHeight: priority ? "auto" : "200px",
        backgroundColor: "#1a1a1a"
      }}
    >
      {(inView || loaded) && !error && (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          fetchPriority={priority ? "high" : "auto"}
          style={{
            filter: effectiveQuality === 'low' ? 'blur(0.5px)' : 'none'
          }}
        />
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-gray-400 text-sm">فشل التحميل</div>
        </div>
      )}
      
      {!loaded && inView && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`border-2 border-red-500 border-t-transparent rounded-full animate-spin ${
              effectiveQuality === 'high' ? 'w-8 h-8' : 'w-4 h-4'
            }`}
          />
        </div>
      )}
    </div>
  );
});

FastImageLoader.displayName = "FastImageLoader";

export default FastImageLoader;
